import { createHmac, timingSafeEqual } from 'crypto';

export interface SlotReferencePayload {
  v: 1;
  assignmentId: string;
  assignmentVersion: number;
  practitionerId: string;
  organizationId: string;
  clinicLocationId: string;
  departmentId: string;
  startsAt: string;
  endsAt: string;
}

function signature(encodedPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload).digest();
}

export function issueSlotReference(payload: SlotReferencePayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${signature(encoded, secret).toString('base64url')}`;
}

export function verifySlotReference(
  reference: string,
  secret: string,
): SlotReferencePayload | null {
  const [encoded, suppliedSignature, extra] = reference.split('.');
  if (!encoded || !suppliedSignature || extra) return null;

  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return null;
  }
  const expected = signature(encoded, secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SlotReferencePayload;
    if (
      payload.v !== 1 ||
      !payload.assignmentId ||
      !payload.practitionerId ||
      !payload.organizationId ||
      !payload.clinicLocationId ||
      !payload.departmentId ||
      !payload.startsAt ||
      !payload.endsAt ||
      !Number.isInteger(payload.assignmentVersion)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
