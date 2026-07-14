# DermaHealth Backend — Implementation Progress

Tracks every task T00–T22 from `docs/BACKEND_IMPLEMENTATION_SPEC.md` section 43. Updated at every stage boundary. A task is only marked Done when its migrations apply to an empty database, its seed re-runs without duplication, and its tests pass with real output captured below (see "Actual Test Results").

## Legend

- **Status**: Not started / In progress / Done
- Dates are Asia/Ho_Chi_Minh, matching the spec's analysis timezone.

---

## T00 — Backend workspace and tooling

**Status:** Done (2026-07-14)
**Dependencies:** none

**Files created:** `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.dockerignore`, `.env.example`, `docker-compose.yml`, `docker-compose.test.yml`, `Dockerfile`, `jest.config.ts`, `src/main.ts`, `src/bootstrap.ts`.

**Acceptance evidence:**
- `npm run build` → exit 0, `dist/` produced.
- `npm run lint` → 0 errors (auto-fixed formatting only).
- `npm run typecheck` → 0 errors.
- `docker compose up -d postgres redis` → both containers healthy.
- `GET /health/live` → `200 {"status":"ok"}`; `GET /health/ready` → `200` with DB check (see T01).

**Deviation recorded:** host ports 5432/6379 were already bound by pre-existing native Homebrew `postgresql@15` and `redis-server` processes on this machine — remapped Compose to host ports 5442/6389 (dev) and 5433/6380 (test). See `docs/BACKEND_DEVIATIONS.md`.

---

## T01 — Database and shared foundation

**Status:** Done (2026-07-14)
**Dependencies:** T00

**Files created:** `prisma/schema.prisma` (Organization, ClinicLocation, Department, User, UserMembership, RefreshSession — identity slice used by T03; IdempotencyRecord, OutboxEvent, AuditEvent — platform slice used by T02), `prisma/migrations/20260714082459_init_foundation/`, `src/infrastructure/database/prisma.service.ts`, `src/infrastructure/database/prisma.module.ts`, `src/config/env.validation.ts` (zod schema), `src/config/configuration.ts`, `src/common/errors/error-codes.ts`, `src/common/errors/app-error.ts`, `src/common/http/response.types.ts`, `src/common/http/request-id.middleware.ts`, `src/common/http/global-exception.filter.ts`, `src/common/http/response.interceptor.ts`, `src/common/pagination/pagination.dto.ts`, `src/common/pagination/pagination.util.ts`.

**Database migrations:** `20260714082459_init_foundation` (all tables below), `20260714082505_audit_immutability` (append-only trigger, see T02).

**Acceptance evidence:**
- `npx prisma migrate deploy` against a freshly `DROP DATABASE`/`CREATE DATABASE`-reset Postgres 16 instance → both migrations applied cleanly, 0 errors (re-verified 2026-07-14 15:53 as part of this stage's quality gate, not just at initial creation time).
- Standard success envelope `{data,meta,requestId}` and error envelope `{error:{code,message,details,requestId}}` verified live via curl against `/api/v1/auth/login` and `/api/v1/me`.
- `x-request-id` response header present and round-tripped from `X-Request-Id` request header when valid, else server-generated (`src/common/http/request-id.middleware.ts`).
- Prisma errors (`P2002`, `P2025`) mapped to `CONFLICT` / `RESOURCE_NOT_FOUND` in `GlobalExceptionFilter`; no stack trace, SQL text, or Prisma internals ever serialized to the client.

**Known limitation (tracked, not blocking):** the `(userId, organizationId, clinicLocationId, role)` unique constraint on `user_memberships` cannot dedupe rows where `clinicLocationId IS NULL` (Postgres treats NULL as distinct per unique-index row), so org-wide memberships need application-level lookup-before-write instead of relying on the DB constraint for idempotency. Worked around in the seed script (`findFirst` + create/update instead of `upsert`). Revisit with a sentinel non-null "org-wide" clinic row or a partial unique index when T05 (clinics/practitioners) builds out real membership management. Logged in `docs/BACKEND_DECISION_LOG.md`.

---

## T02 — Audit, transactional outbox, and idempotency

**Status:** Done (2026-07-14)
**Dependencies:** T01

**Files created:** `src/common/audit/audit.service.ts`, `src/common/audit/audit.module.ts`, `src/common/outbox/outbox.service.ts`, `src/common/outbox/outbox-dispatcher.service.ts`, `src/common/outbox/outbox.module.ts`, `src/common/idempotency/idempotency.service.ts`, `src/common/idempotency/idempotency-key.decorator.ts`, `src/common/idempotency/idempotency.interceptor.ts`, `src/common/idempotency/idempotency.module.ts`, `src/infrastructure/redis/redis.module.ts`, `prisma/migrations/20260714082505_audit_immutability/migration.sql`.

**Database migrations:** `20260714082505_audit_immutability` — `BEFORE UPDATE`/`BEFORE DELETE` trigger on `audit_events` that raises `insufficient_privilege` unconditionally, so even a bug or a direct psql session cannot mutate audit history (spec section 35).

**Design implemented:**
- **Audit:** `AuditService.write()` accepts an optional `Prisma.TransactionClient` so callers can insert the audit row atomically with the state change it describes (used by `AuthService` for login success/failure and refresh-reuse detection).
- **Outbox:** `OutboxService.write(tx, event)` must be called with the same transaction as the domain write; `OutboxDispatcherService` polls `pending` rows every 5s with `SELECT ... FOR UPDATE SKIP LOCKED` (safe for multiple API instances), hands each to a BullMQ queue keyed by `jobId = outbox row id` (dedupes re-adds), then marks `dispatched`. No channel workers exist yet — those arrive with T16 (notifications) and T18 (integration ops), which will `@Process()` the `outbox-dispatch` queue.
- **Idempotency:** `IdempotencyService.begin()`/`complete()`/`fail()` implement the full contract from spec section 32 — same key + same request-body SHA-256 fingerprint replays the stored response; same key + different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`; a failed transaction's record is marked `failed` (not `completed`), so a retry with the same key/body is allowed to proceed again. `IdempotencyInterceptor` + `@RequireIdempotencyKey()` wire this to any controller method; not yet applied to any T03 endpoint because none of `/auth/login`, `/auth/refresh`, `/auth/logout` are on the idempotency-required list in spec section 32 (that list starts with booking/reschedule/check-in, arriving T06+).

**Acceptance evidence:** covered indirectly via T03's e2e suite (every login/refresh/logout call writes an audit row; verified manually via `docker exec ... psql -c "select action, result from audit_events order by occurred_at desc limit 5;"` after the e2e run — not yet a dedicated automated integration test, tracked as a gap below).

**Gap to close before G0 sign-off:** no dedicated integration test yet asserts (a) the append-only trigger actually rejects an `UPDATE`/`DELETE` against `audit_events`, (b) `IdempotencyService` replay/reuse/failed-record semantics against real Postgres. Added to the T03 follow-up list.

---

## T03 — Identity, organizations, authentication, and RBAC

**Status:** Done (2026-07-14)
**Dependencies:** T01, T02

**Files created:** `src/common/auth/auth.types.ts`, `public.decorator.ts`, `current-user.decorator.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`; `src/common/authorization/roles.decorator.ts`, `roles.guard.ts`, `roles.guard.spec.ts`, `organization-scope.util.ts`; `src/modules/identity/*` (password.service.ts + spec, token.service.ts, users.repository.ts, refresh-sessions.repository.ts, auth.service.ts, auth.controller.ts, me.controller.ts, identity.module.ts, dto/login.dto.ts); `src/modules/organizations/*` (organizations.service.ts, organizations.controller.ts, organizations.module.ts); `prisma/seed/index.ts`; `test/e2e/setup.ts`, `test/e2e/utils/create-test-app.ts`, `test/e2e/auth.e2e-spec.ts`; `test/integration/setup.ts`; `.env.test`.

**Database migrations:** identity tables shipped as part of `20260714082459_init_foundation` (see T01) — `organizations`, `clinic_locations`, `departments`, `users`, `user_memberships`, `refresh_sessions`.

**Endpoints implemented:**
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public, throttled 5/min | Argon2id verify, generic error, lockout after 5 failed attempts (15 min) |
| POST | `/api/v1/auth/refresh` | Public (refresh cookie), throttled 20/min | Rotation + reuse detection, revokes family on reuse |
| POST | `/api/v1/auth/logout` | Public (refresh cookie) | Revokes current session, or whole family with `allDevices:true` |
| GET | `/api/v1/me` | Bearer required | Live DB lookup, not just JWT claims |
| GET | `/api/v1/organizations` | Bearer required | Scoped to caller's memberships, or all orgs for `super_administrator` |
| GET | `/api/v1/organizations/{id}/clinic-locations` | Bearer required | Requires membership in `{id}` |
| GET | `/health/live`, `/health/ready` | Public, version-neutral, unprefixed | `ready` checks `SELECT 1` against Postgres |

**Authorization policies implemented:**
- `JwtAuthGuard` — global `APP_GUARD`; every route protected by default, `@Public()` opts out explicitly (never the reverse).
- `RolesGuard` — global `APP_GUARD`; `@Roles(...)` flat role-membership gate; `super_administrator` always passes (mirrors frontend's `hasRoleAccess` override) but this alone grants **no** clinical-content access — that requires a resource-relationship policy, none of which exist yet (arrives with T04+).
- `requireOrganizationMembership()` / `isSuperAdministrator()` — scope-checking utilities for query/command handlers (used by `OrganizationsService`).

**Tests added:**
- Unit: `password.service.spec.ts` (6 cases — hash/verify roundtrip, wrong password, cross-pepper rejection, min-length/denylist enforcement), `roles.guard.spec.ts` (4 cases — no-metadata pass-through, role match, role denial, super-admin override).
- E2E (real Postgres 16 via `docker-compose.test.yml`, isolated `dermahealth_test` DB): `test/e2e/auth.e2e-spec.ts` — unauthenticated `/me` → 401; wrong password → generic `AUTH_INVALID_CREDENTIALS`; unknown email → same generic error (no user enumeration); full login → `/me` → refresh (rotation) → reused-old-token → `AUTH_REFRESH_REUSED` (and confirms the **entire family** is revoked, not just the reused token) → logout → 204; malformed login body → `400 VALIDATION_FAILED`.

**Actual test results (2026-07-14, re-run against a freshly `DROP DATABASE`-reset test DB at 15:5x):**
```
npm run test           → 2 suites, 10 tests passed
npm run test:e2e       → 1 suite, 5 tests passed
npm run typecheck      → 0 errors
npm run lint           → 0 errors
npm run build          → exit 0
npx prisma migrate deploy (empty DB) → 2 migrations applied cleanly
npm run db:seed (run twice) → 19 users / 19 memberships / 1 org / 1 clinic / 12 departments, unchanged on 2nd run
```

**OpenAPI status:** generated via `npm run openapi:generate` → `docs/openapi.json`, 8 paths (`/api/v1/auth/{login,refresh,logout}`, `/api/v1/me`, `/api/v1/organizations`, `/api/v1/organizations/{id}/clinic-locations`, `/health/live`, `/health/ready`). Bearer + cookie auth schemes registered. DTOs carry `@ApiProperty` examples on `LoginDto`/`LogoutDto`; response DTOs are not yet formally typed with `@ApiResponse` decorators (currently inferred from return shape) — tracked as a follow-up polish item, not blocking.

**Acceptance criteria met (spec section 44, identity-scoped subset):**
- ✅ All protected endpoints reject anonymous calls (`/me` → 401 verified).
- ✅ Login validates credentials; refresh rotates; reuse revokes the whole family.
- ✅ No auth secret (password, refresh token, JWT) appears in logs — verified via pino `redact` config (`req.headers.authorization`, `req.headers.cookie`, `res.headers["set-cookie"]`, and body fields) and by inspecting `/tmp/dermahealth-api.log` during manual testing: `Authorization` and `Set-Cookie` both show `[REDACTED]`.
- ⏳ Cross-clinic/IDOR tests: not yet applicable — no clinically-scoped resources exist until T04+. `requireOrganizationMembership()` is in place and unit-testable once a real consumer exists.

**Open decisions surfaced during T03 (see full detail in `docs/BACKEND_DECISION_LOG.md`):**
1. Organization/clinic tenancy — implemented the spec's documented safe default (one org, explicit clinic memberships), fixing the frontend's implicit single-clinic (`CS-HCM-01`) assumption into real `Organization`/`ClinicLocation`/`Department` tables.
2. Fixed the frontend's confirmed `U-0014`/`U-0015` duplicate-user seed defect (spec section 45 item 1) — every seeded user now has a unique email/identity.
3. `user_memberships` NULL-clinic uniqueness gap (see T01 above).

**Next dependency-safe task:** T04 — patients, care-team relationships, consents, and preferences (depends on T03, now satisfied).

---

## T03 contract realignment to docs/api.md (2026-07-14)

**Status:** Done. `docs/api.md` (2385 lines) was supplied as the authoritative API contract — a strict superset of `docs/BACKEND_IMPLEMENTATION_SPEC.md` with much more precise naming rules and a literal endpoint/DTO catalog. Full before/after endpoint table in `docs/API_CHANGELOG.md`; rationale in decision log entries D-010 through D-013.

**Files changed:** `prisma/schema.prisma` (+`users.phone`, `+users.avatar_file_id`, +`user_preferences` table, +`organizations.status`/`.version`, +`departments.status`), 2 new migrations, `auth.controller.ts` (rewritten to `POST /auth/sessions`, `POST /auth/session-refreshes`, `DELETE /auth/sessions/current`, `DELETE /auth/sessions`), `auth.service.ts` (returns full `UserWithMemberships` instead of a trimmed projection), new `user-response.mapper.ts`, `user-preferences.repository.ts`, `users.controller.ts`, `me.controller.ts` (added `PATCH /me`, preferences endpoints), `organizations.controller.ts` (added pagination), new `clinic-locations.controller.ts`, `departments.controller.ts` (top-level, replacing the nested `/organizations/{id}/clinic-locations`).

**Tests:** both e2e suites rewritten/extended for the new contract — `auth.e2e-spec.ts` (5 tests: session lifecycle, rotation, reuse detection, revoke-all with password re-confirmation), new `me-and-reference-data.e2e-spec.ts` (5 tests: `PATCH /me` with optimistic-lock conflict, preference round-trip including first-write-vs-subsequent-write version semantics, reference data endpoints, admin-only `/users` authorization).

**Actual test results (2026-07-14, re-verified against a freshly dropped/recreated empty test database):**
```
npm run typecheck   → 0 errors
npm run lint        → 0 errors
npm run build        → exit 0
npm run test         → 2 suites, 10 tests passed
npm run test:e2e     → 2 suites, 10 tests passed
npx prisma migrate deploy (empty DB) → 4 migrations applied cleanly
npm run db:seed (run twice on dev DB) → 19 users / 19 memberships unchanged
npm run openapi:generate → 12 paths generated, all matching docs/api.md literal paths
```

**OpenAPI status:** `docs/openapi.json` regenerated — `/api/v1/auth/sessions` (POST, DELETE), `/api/v1/auth/sessions/current` (DELETE), `/api/v1/auth/session-refreshes` (POST), `/api/v1/me` (GET, PATCH), `/api/v1/me/preferences` (GET, PUT), `/api/v1/organizations` (GET), `/api/v1/clinic-locations` (GET), `/api/v1/departments` (GET), `/api/v1/users` (GET), `/api/v1/users/{userId}` (GET), `/health/{live,ready}` (GET).

**Deferred (documented, not blocking):** `POST /password-reset-requests`, `POST /password-resets` — need real email delivery (T16). MFA (`mfaCode` field accepted in the DTO but not enforced) — no MFA infra built yet, tracked as a pre-existing UNKNOWN in the spec's decision list.

**Next dependency-safe task:** T04 — patients, care-team relationships, consents, and preferences, now against the exact `docs/api.md` section 25 "Identity, current user, patients and consent" endpoint table and section 26 DTOs (`PatientResponse`, `PatientDetailResponse`, `ConsentResponse`, etc.).

---

## Foundation gap fixes (F-001 through F-006) — 2026-07-14

Requested before starting T04, to close known gaps from the T00–T03/realignment stages rather than carry them forward. All six done.

| ID | Fix | Files | Verified by |
|---|---|---|---|
| F-001 | Redis open-handle leak | `src/infrastructure/redis/redis.module.ts` — wrapped the raw ioredis client in an `OnModuleDestroy` holder that calls `.quit()` | `npx jest --selectProjects e2e --detectOpenHandles` → 0 warnings, natural exit. `--forceExit` removed from `test:integration`/`test:e2e`/`test:security` in `package.json`. |
| F-002 | Audit immutability integration tests | `test/integration/audit-immutability.spec.ts` (new) | 6 tests: insert allowed; UPDATE rejected (Prisma + raw SQL); DELETE rejected (Prisma + raw SQL); redaction contract documented; request ID/actor context preserved. |
| F-003 | Idempotency integration tests | `test/integration/idempotency.spec.ts` (new) | 8 tests: replay, `IDEMPOTENCY_KEY_REUSED`, failed≠completed, retry-after-fail proceeds, concurrent duplicates → 1 row, principal scoping, target scoping. |
| F-004 | `user_memberships` NULL-clinic uniqueness | `prisma/schema.prisma` (dropped the `@@unique`), migration `20260714101425_membership_partial_unique_indexes` (two partial unique indexes), `test/integration/membership-uniqueness.spec.ts` (new) | 4 tests against real Postgres: duplicate clinic-scoped rejected, duplicate org-wide rejected, org-wide+clinic-scoped coexist, re-grant after revoke succeeds. |
| F-005 | OpenAPI response DTOs for T03 | `src/common/http/api-envelope.decorator.ts` (new — `ApiOkEnvelope`/`ApiCreatedEnvelope`/`ApiOkListEnvelope`), response DTO classes under `src/modules/identity/dto/responses/` and `src/modules/organizations/dto/`, applied to every T03 controller method | `docs/openapi.json` regenerated — every T03 response now has an explicit `$ref`'d schema (verified via `components.schemas` containing `SessionResponseDto`, `CurrentUserResponseDto`, `UserResponseDto`, `OrganizationResponseDto`, `ClinicLocationResponseDto`, `DepartmentResponseDto`, `UserPreferenceResponseDto`, etc.) instead of inferred/untyped shapes. |
| F-006 | Node 22 for quality gates | `.nvmrc` (new, pins `22`) | `nvm install 22` (resolved v22.23.1) + `nvm use 22` + fresh `npm install` (no more `EBADENGINE`/native-module-ABI warning). Every command in this stage and onward run under Node 22 — see `docs/BACKEND_DEVIATIONS.md` DEV-006 for the exact shell incantation used. `package.json` `engines` field unchanged (`>=22 <23`), not relaxed to accommodate the local Node 24 default. |

**Actual test results after all six fixes (2026-07-14, re-verified against a freshly-recreated empty test database, Node v22.23.1):**
```
npm run typecheck        → 0 errors
npm run lint              → 0 errors
npm run build              → exit 0
npm run test                → 2 suites, 10 tests passed
npm run test:integration    → 3 suites, 17 tests passed (no --forceExit)
npm run test:e2e            → 2 suites, 10 tests passed (no --forceExit)
npm run test:security       → 0 suites, 0 tests, exit 0 (--passWithNoTests; no spec files yet)
npx prisma migrate deploy (empty DB) → 5 migrations applied cleanly
npm run db:seed (run twice) → 19 users / 19 memberships, unchanged on 2nd run
npm run openapi:generate    → 12 paths, all response schemas explicitly typed
```

**Not done (explicitly out of scope for this pass):** `test:security` project has no spec files yet — it will gain content as each module's authorization boundaries are built (starting with T04's patient/consent policies). Jest exits 1 on an empty project by default ("No tests found"), so `--passWithNoTests` was added to the `test:security` script to keep it CI-safe until the first spec file lands; this flag must be removed once real security tests exist, so an accidentally-empty security suite fails loudly again.

**Next task:** T04 — patients, care teams, consents, preferences.

---

## T04–T22

**Status:** Not started. Blocked only by sequencing (each depends on the prior stage per spec section 43's table), not by any open product decision beyond the safe defaults already recorded in section 47 and `docs/BACKEND_DECISION_LOG.md`.
