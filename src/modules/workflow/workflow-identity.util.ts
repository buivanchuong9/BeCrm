import { createHmac, randomBytes } from 'crypto';

/**
 * docs/api.md section 28 ACT-1 / section 45: replaces the frontend
 * prototype's client-side FNV-1a "integrity hash" (explicitly commented in
 * that source as a placeholder for a real server-side HMAC) with a real
 * HMAC-SHA256 keyed by a server-only secret. Verification (GET
 * .../identity-verifications) recomputes this and compares — a mismatch
 * means the instance's pinned identity fields were tampered with outside
 * the API.
 */
export function computeWorkflowIntegrityHash(
  secret: string,
  input: { patientId: string; encounterId: string; templateVersionId: string; instanceId: string },
): string {
  return createHmac('sha256', secret)
    .update(
      `${input.patientId}|${input.encounterId}|${input.templateVersionId}|${input.instanceId}`,
    )
    .digest('hex');
}

export function generateInstanceCode(): string {
  return `WF-${randomBytes(4).toString('hex').toUpperCase()}`;
}
