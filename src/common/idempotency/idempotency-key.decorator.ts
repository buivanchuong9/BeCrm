import { SetMetadata } from '@nestjs/common';

export const REQUIRE_IDEMPOTENCY_KEY = 'requireIdempotencyKey';

/** Marks a command endpoint as requiring the `Idempotency-Key` header (spec
 * section 32's high-risk command list). Pass `{ clinical: true }` to extend the
 * stored record's TTL to 7 days instead of 24 hours. */
export const RequireIdempotencyKey = (options: { clinical?: boolean } = {}) =>
  SetMetadata(REQUIRE_IDEMPOTENCY_KEY, { clinical: options.clinical ?? false });
