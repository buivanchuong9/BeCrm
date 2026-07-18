import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM at-rest encryption for `User.mfaSecretEnc`. Keyed by
 * SHA-256(auth.fieldEncryptionKey) rather than a new env var — that secret
 * already exists precisely to derive server-only symmetric keys (see its use
 * in workflow-runtime.service.ts / practitioners.service.ts for HMAC
 * signing); reusing it here keeps key management to one rotation point
 * instead of two.
 */
const IV_LENGTH = 12;

function deriveKey(fieldEncryptionKey: string): Buffer {
  return createHash('sha256').update(fieldEncryptionKey).digest();
}

export function encryptMfaSecret(plainSecret: string, fieldEncryptionKey: string): string {
  const key = deriveKey(fieldEncryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptMfaSecret(encoded: string, fieldEncryptionKey: string): string {
  const key = deriveKey(fieldEncryptionKey);
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = raw.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
