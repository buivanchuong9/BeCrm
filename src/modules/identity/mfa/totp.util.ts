import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * RFC 4226 (HOTP) / RFC 6238 (TOTP) — 6-digit codes, 30s step, SHA-1, the
 * universal default every authenticator app (Google/Microsoft/Authy) expects.
 * No external dependency: this is ~40 lines of well-specified crypto over
 * Node's built-in `crypto`, not worth a package for.
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept the previous/current/next 30s step to absorb clock drift

export function generateBase32Secret(byteLength = 20): string {
  const bytes = randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
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

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: bigint): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function generateTotp(base32Secret: string, at: Date = new Date()): string {
  const counter = BigInt(Math.floor(at.getTime() / 1000 / STEP_SECONDS));
  return hotp(base32Decode(base32Secret), counter);
}

/** Accepts the current step and ±WINDOW steps so a code entered a few
 * seconds late (or with modest client/server clock skew) still verifies. */
export function verifyTotp(base32Secret: string, code: string, at: Date = new Date()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(base32Secret);
  const currentCounter = BigInt(Math.floor(at.getTime() / 1000 / STEP_SECONDS));
  const codeBuffer = Buffer.from(code);
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    const candidate = Buffer.from(hotp(secret, currentCounter + BigInt(delta)));
    if (candidate.length === codeBuffer.length && timingSafeEqual(candidate, codeBuffer)) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri(params: {
  secret: string;
  accountEmail: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountEmail}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
