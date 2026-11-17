const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function randomToken(prefix = '', byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  const hex = bytesToHex(bytes);
  return prefix ? `${prefix}_${hex}` : hex;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

export async function sha512Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-512', data);
  return bytesToHex(new Uint8Array(digest));
}

export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data));
  let binary = '';
  for (let i = 0; i < digest.length; i += 1) {
    binary += String.fromCharCode(digest[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bytesToHex(new Uint8Array(sig));
}

export async function hashPassword(
  password: string,
  existingSaltHex?: string
): Promise<{ hashHex: string; saltHex: string }> {
  const saltBytes = existingSaltHex
    ? hexToBytes(existingSaltHex)
    : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(saltBytes);
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return {
    hashHex: bytesToHex(new Uint8Array(derived)),
    saltHex
  };
}

export async function verifyPassword(
  password: string,
  expectedHashHex: string,
  saltHex: string
): Promise<boolean> {
  if (!expectedHashHex || !saltHex) return false;
  const computed = await hashPassword(password, saltHex);
  return timingSafeEqualStr(computed.hashHex, expectedHashHex);
}

export function generateTotpSecret(byteLength = 20): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(byteLength));
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function computeHotp(secretBytes: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    secretBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const hmac = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, buf));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export async function generateCurrentTotpCode(
  secretBase32: string,
  nowMs = Date.now()
): Promise<string> {
  const counter = Math.floor(nowMs / 1000 / 30);
  return computeHotp(decodeBase32(secretBase32), counter);
}

export async function verifyTotpCode(
  secretBase32: string,
  code: string,
  windowSteps = 1,
  nowMs = Date.now()
): Promise<boolean> {
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode) || !secretBase32) return false;
  const secretBytes = decodeBase32(secretBase32);
  const currentCounter = Math.floor(nowMs / 1000 / 30);
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const candidate = await computeHotp(secretBytes, currentCounter + offset);
    if (timingSafeEqualStr(candidate, cleanCode)) {
      return true;
    }
  }
  return false;
}

export function buildTotpUri(email: string, secretBase32: string): string {
  const issuer = encodeURIComponent('BeeloftMetric');
  const label = encodeURIComponent(`BeeloftMetric:${email}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
