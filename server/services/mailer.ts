import type { EdgeEnv } from '../types.js';

export interface EmailSendParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  senderEmail?: string;
  customRelayUrl?: string;
}

export interface EmailSendResult {
  delivered: boolean;
  provider: 'resend' | 'mailchannels' | 'webhook-relay' | 'unconfigured';
  detail: string;
}

export async function sendTransactionalEmail(
  env: EdgeEnv | undefined,
  params: EmailSendParams
): Promise<EmailSendResult> {
  const fromEmail =
    params.senderEmail?.trim() ||
    env?.EMAIL_FROM?.trim() ||
    'noreply@beeloftmetric.biz.id';

  if (env?.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `BeeloftMetric <${fromEmail}>`,
          to: [params.to],
          subject: params.subject,
          text: params.text,
          html: params.html
        })
      });
      if (res.ok) {
        const body = (await res.json()) as { id?: string };
        return {
          delivered: true,
          provider: 'resend',
          detail: `Delivered via Resend (id: ${body.id || 'ok'})`
        };
      }
      const errTxt = await res.text();
      return {
        delivered: false,
        provider: 'resend',
        detail: `Resend rejected message (${res.status}): ${errTxt.slice(0, 140)}`
      };
    } catch (err) {
      return {
        delivered: false,
        provider: 'resend',
        detail: err instanceof Error ? err.message : 'Resend network error'
      };
    }
  }

  if (env?.MAILCHANNELS_API_KEY) {
    try {
      const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: {
          'X-Api-Key': env.MAILCHANNELS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.to }] }],
          from: { email: fromEmail, name: 'BeeloftMetric' },
          subject: params.subject,
          content: [
            { type: 'text/plain', value: params.text },
            { type: 'text/html', value: params.html }
          ]
        })
      });
      if (res.ok || res.status === 202) {
        return {
          delivered: true,
          provider: 'mailchannels',
          detail: `Accepted by MailChannels for ${params.to}`
        };
      }
      const errTxt = await res.text();
      return {
        delivered: false,
        provider: 'mailchannels',
        detail: `MailChannels error (${res.status}): ${errTxt.slice(0, 140)}`
      };
    } catch (err) {
      return {
        delivered: false,
        provider: 'mailchannels',
        detail: err instanceof Error ? err.message : 'MailChannels network error'
      };
    }
  }

  const relay = params.customRelayUrl?.trim() || env?.SMTP_RELAY_URL?.trim();
  if (relay && /^https?:\/\//i.test(relay)) {
    try {
      const res = await fetch(relay, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html
        })
      });
      if (res.ok) {
        return {
          delivered: true,
          provider: 'webhook-relay',
          detail: `Dispatched to mail relay (${relay})`
        };
      }
      return {
        delivered: false,
        provider: 'webhook-relay',
        detail: `Mail relay returned HTTP ${res.status}`
      };
    } catch (err) {
      return {
        delivered: false,
        provider: 'webhook-relay',
        detail: err instanceof Error ? err.message : 'Mail relay unreachable'
      };
    }
  }

  return {
    delivered: false,
    provider: 'unconfigured',
    detail:
      'No transactional email provider configured yet. Set RESEND_API_KEY, MAILCHANNELS_API_KEY, or SMTP_RELAY_URL in Cloudflare environment variables.'
  };
}
