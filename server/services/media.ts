import { randomToken } from '../security/crypto.js';
import type { EdgeEnv, PlatformRepository } from '../types.js';

const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm'
]);

export interface BinaryHttpPayload {
  __binaryResponse: true;
  bytes: Uint8Array;
  contentType: string;
  cacheControl: string;
}

export function isBinaryHttpPayload(val: unknown): val is BinaryHttpPayload {
  return Boolean(val && typeof val === 'object' && (val as BinaryHttpPayload).__binaryResponse === true);
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  const bin = atob(clean.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export async function uploadMediaObject(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  userId: number;
  blogId: number;
  filename: string;
  mimeType: string;
  dataBase64: string;
  origin: string;
}): Promise<{ id: string; url: string; mimeType: string; sizeBytes: number; storage: 'r2' | 'database' } | { error: string }> {
  const mime = params.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    return { error: `Unsupported media type "${mime}". Allowed: PNG, JPEG, WEBP, GIF, MP4, WEBM.` };
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(params.dataBase64);
  } catch {
    return { error: 'Invalid base64 media payload.' };
  }

  if (bytes.byteLength === 0) {
    return { error: 'Uploaded file is empty.' };
  }
  if (bytes.byteLength > 10 * 1024 * 1024) {
    return { error: 'File exceeds 10 MB upload limit.' };
  }

  const hasR2 = Boolean(params.env?.MEDIA_BUCKET);
  if (!hasR2 && bytes.byteLength > 1.5 * 1024 * 1024) {
    return {
      error:
        'Files larger than 1.5 MB require Cloudflare R2 (MEDIA_BUCKET binding). Smaller images work immediately.'
    };
  }

  const id = randomToken('med', 10);
  const safeName = (params.filename || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const r2Key = `brands/${params.blogId}/${id}-${safeName}`;
  const cleanB64 = params.dataBase64.includes(',')
    ? params.dataBase64.slice(params.dataBase64.indexOf(',') + 1).trim()
    : params.dataBase64.trim();

  if (params.env?.MEDIA_BUCKET) {
    await params.env.MEDIA_BUCKET.put(r2Key, bytes, {
      httpMetadata: { contentType: mime }
    });
  }

  await params.repo.saveMediaAsset({
    id,
    userId: params.userId,
    blogId: params.blogId,
    r2Key,
    mimeType: mime,
    sizeBytes: bytes.byteLength,
    filename: safeName,
    dataBase64: hasR2 ? null : cleanB64,
    createdAt: new Date().toISOString()
  });

  const baseOrigin = params.origin.replace(/\/+$/, '');
  return {
    id,
    url: `${baseOrigin}/api/v2/media/${id}`,
    mimeType: mime,
    sizeBytes: bytes.byteLength,
    storage: hasR2 ? 'r2' : 'database'
  };
}

export async function readMediaObject(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  id: string;
}): Promise<BinaryHttpPayload | null> {
  const row = await params.repo.getMediaAsset(params.id);
  if (!row) return null;

  if (params.env?.MEDIA_BUCKET) {
    const obj = await params.env.MEDIA_BUCKET.get(row.r2Key);
    if (obj) {
      const ab = await obj.arrayBuffer();
      return {
        __binaryResponse: true,
        bytes: new Uint8Array(ab),
        contentType: obj.httpMetadata?.contentType || row.mimeType,
        cacheControl: 'public, max-age=31536000, immutable'
      };
    }
  }

  if (row.dataBase64) {
    return {
      __binaryResponse: true,
      bytes: base64ToBytes(row.dataBase64),
      contentType: row.mimeType,
      cacheControl: 'public, max-age=31536000, immutable'
    };
  }

  return null;
}
