import type { EdgeEnv, NetworkKey } from '../types.js';

export interface AiDraftParams {
  prompt: string;
  network: NetworkKey;
  language: string;
  tone: string;
  targetAudience: string;
  brandVoice: string;
  bannedWords: string;
}

export interface AiDraftResult {
  generatedCopy: string;
  suggestedHashtags: string[];
  suggestedTime: string;
  appliedBrandVoice: string;
  provider: 'workers-ai' | 'gemini' | 'openai' | 'structured-fallback';
}

function nextOptimalScheduleSlot(): string {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setUTCHours(11, 0, 0, 0); // 18:00 WIB (Asia/Jakarta)
  return d.toISOString().slice(0, 16);
}

function sanitizeBannedWords(text: string, bannedCsv: string): string {
  if (!bannedCsv.trim()) return text;
  const banned = bannedCsv
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);
  let output = text;
  for (const word of banned) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '').replace(/\s{2,}/g, ' ');
  }
  return output.trim();
}

function buildSystemInstruction(params: AiDraftParams): string {
  const langMap: Record<string, string> = {
    id: 'Indonesian',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German'
  };
  const langName = langMap[params.language] || params.language || 'Indonesian';
  return [
    `Write a ready-to-publish ${params.network} post in ${langName}.`,
    `Tone: ${params.tone || 'Clear and direct'}.`,
    params.targetAudience ? `Target audience: ${params.targetAudience}.` : '',
    params.brandVoice ? `Editorial guidelines: ${params.brandVoice}.` : '',
    params.bannedWords ? `Never use these words: ${params.bannedWords}.` : '',
    'Never use em dashes. Return plain caption text only without surrounding quotes or markdown headings.'
  ]
    .filter(Boolean)
    .join(' ');
}

function extractHashtags(copy: string, network: string): { cleanCopy: string; tags: string[] } {
  const found = copy.match(/#[a-zA-Z0-9_]+/g) ?? [];
  if (found.length > 0) {
    return {
      cleanCopy: copy.replace(/#[a-zA-Z0-9_]+/g, '').replace(/\s{2,}/g, ' ').trim(),
      tags: Array.from(new Set(found)).slice(0, 5)
    };
  }
  return {
    cleanCopy: copy.trim(),
    tags: [`#${network}`, '#contentstrategy', '#socialanalytics']
  };
}

export async function generateSocialPostDraft(
  env: EdgeEnv | undefined,
  params: AiDraftParams
): Promise<AiDraftResult> {
  const systemInstruction = buildSystemInstruction(params);
  const suggestedTime = nextOptimalScheduleSlot();

  // 1. Cloudflare Workers AI
  if (env?.AI) {
    try {
      const raw = (await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: params.prompt.trim() }
        ],
        max_tokens: 280
      })) as { response?: string };
      if (raw?.response?.trim()) {
        const filtered = sanitizeBannedWords(raw.response.replace(/\u2014/g, ','), params.bannedWords);
        const { cleanCopy, tags } = extractHashtags(filtered, params.network);
        return {
          generatedCopy: cleanCopy,
          suggestedHashtags: tags,
          suggestedTime,
          appliedBrandVoice: params.brandVoice,
          provider: 'workers-ai'
        };
      }
    } catch {
      // Fall through to external API keys or structured builder
    }
  }

  // 2. Gemini API
  if (env?.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: params.prompt.trim() }] }]
          })
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text?.trim()) {
          const filtered = sanitizeBannedWords(text.replace(/\u2014/g, ','), params.bannedWords);
          const { cleanCopy, tags } = extractHashtags(filtered, params.network);
          return {
            generatedCopy: cleanCopy,
            suggestedHashtags: tags,
            suggestedTime,
            appliedBrandVoice: params.brandVoice,
            provider: 'gemini'
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. OpenAI API
  if (env?.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: params.prompt.trim() }
          ],
          max_tokens: 280
        })
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content;
        if (text?.trim()) {
          const filtered = sanitizeBannedWords(text.replace(/\u2014/g, ','), params.bannedWords);
          const { cleanCopy, tags } = extractHashtags(filtered, params.network);
          return {
            generatedCopy: cleanCopy,
            suggestedHashtags: tags,
            suggestedTime,
            appliedBrandVoice: params.brandVoice,
            provider: 'openai'
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // 4. Structured deterministic fallback when no AI provider binding is configured yet
  const rawTopic = sanitizeBannedWords(params.prompt.trim().replace(/\u2014/g, ','), params.bannedWords);
  const audienceLine = params.targetAudience ? ` (${params.targetAudience})` : '';
  const generatedCopy =
    params.language === 'id'
      ? `${rawTopic}${audienceLine}. Simak pembaruan lengkap dan bagikan tanggapan Anda di kolom komentar.`
      : `${rawTopic}${audienceLine}. Read the full update and share your perspective in the comments.`;

  return {
    generatedCopy,
    suggestedHashtags: [`#${params.network}`, '#contentops', '#beeloftmetric'],
    suggestedTime,
    appliedBrandVoice: params.brandVoice,
    provider: 'structured-fallback'
  };
}
