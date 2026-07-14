# DermaHealth Backend — API Changelog

All endpoints are additive within `/api/v1` until a module passes its delivery gate (spec section 24 — FE–BE contract governance). Entries grouped by implementation task.

## T03 contract realignment to docs/api.md (2026-07-14)

`docs/api.md` was supplied after the initial T03 delivery below and turned out to be a far more precise superset of `docs/BACKEND_IMPLEMENTATION_SPEC.md` (2385 lines vs. 1005 — identical business rules/state machines/database design, but adds mandatory API naming rules, DTO suffix conventions, and a literal, path-by-path endpoint catalog with exact TypeScript DTOs). Since no frontend integration exists yet (T19+ not reached), the T03 identity surface was renamed in place to match `docs/api.md` exactly rather than shipping two competing contracts:

| Before (initial T03) | After (docs/api.md-aligned) |
|---|---|
| `POST /auth/login` | `POST /auth/sessions` (201) |
| `POST /auth/refresh` | `POST /auth/session-refreshes` (200) |
| `POST /auth/logout` | `DELETE /auth/sessions/current` (204) |
| — | `DELETE /auth/sessions` (204, new — revoke all devices, optional password re-confirmation) |
| `LoginDto {email,password,remember?}` | `CreateSessionRequest {email,password,rememberMe,mfaCode?}` |
| `{accessToken,expiresIn,user:{id,email,displayName}}` | `{accessToken,accessTokenExpiresAt,user:CurrentUserResponse}` — full `CurrentUserResponse` shape (`id,name,email,phone,avatarUrl,status,activeOrganizationId,memberships,version`) |
| `GET /me` → `{id,email,displayName,status,mfaEnabled,memberships}` | `GET /me` → full `CurrentUserResponse`; added `PATCH /me` |
| — | `GET /me/preferences`, `PUT /me/preferences` (new `user_preferences` table) |
| — | `GET /users`, `GET /users/{userId}` (new, medical/system admin only) |
| `GET /organizations/{id}/clinic-locations` (nested) | `GET /clinic-locations` (top-level, `organizationId` query param) |
| — | `GET /departments` (new, top-level, `clinicLocationId` query param) |

New database migrations: `20260714092615_add_user_phone_avatar_preferences` (adds `users.phone`, `users.avatar_file_id`, new `user_preferences` table), `20260714093141_add_org_status_version_department_status` (adds `organizations.status`/`.version`, `departments.status` — previously-missing columns the contract's response DTOs require; values were **not** hardcoded/faked to satisfy the DTO shape).

`User.status` enum values are unchanged internally (`pending_activation|active|suspended|deactivated`) but now map to the contract's `invited|active|locked|disabled` at the API boundary (`user-response.mapper.ts`) — see decision D-010.

## T03 — Identity, organizations, authentication, and RBAC (2026-07-14, superseded above)

**New endpoints:**

| Method | Path | Request | Response (`data`) | Notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | `{email, password, remember?}` | `{accessToken, expiresIn, user:{id,email,displayName}}` | Sets `refresh_token` HttpOnly cookie, path `/api/v1/auth`. Rate-limited 5/min. Generic `AUTH_INVALID_CREDENTIALS` for unknown email, wrong password, or inactive account (no user enumeration). |
| POST | `/api/v1/auth/refresh` | (refresh cookie only) | same shape as login | Rotates the refresh token; reuse of an already-rotated token revokes the entire session family and returns `401 AUTH_REFRESH_REUSED`. Rate-limited 20/min. |
| POST | `/api/v1/auth/logout` | `{allDevices?: boolean}` | `204 No Content` | Revokes current session, or every session in the family if `allDevices:true`. Idempotent — no error if the cookie is already invalid. |
| GET | `/api/v1/me` | — (Bearer required) | `{id,email,displayName,status,mfaEnabled,memberships:[{organizationId,clinicLocationId,departmentId,role}]}` | Live DB lookup, not decoded-JWT passthrough. |
| GET | `/api/v1/organizations` | — (Bearer required) | `Organization[]` | Scoped to caller's memberships; unscoped for `super_administrator`. |
| GET | `/api/v1/organizations/{id}/clinic-locations` | — (Bearer required) | `ClinicLocation[]` | 403 `CLINIC_SCOPE_DENIED` if caller has no membership in `{id}`. |
| GET | `/health/live` | — (public, unversioned) | `{status:"ok"}` | Process liveness only. |
| GET | `/health/ready` | — (public, unversioned) | `{status,database}` | `503` if `SELECT 1` fails. |

**New error codes introduced:** `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`, `AUTH_SESSION_EXPIRED`, `AUTH_REFRESH_REUSED`, `AUTH_FORBIDDEN`, `CLINIC_SCOPE_DENIED`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED` (framework wired; not yet triggerable by any T03 endpoint since none require an idempotency key — see decision D-008).

**New canonical entities exposed:** `Organization`, `ClinicLocation` (both new to the backend — no frontend precedent; see decision D-003). `User`/`UserMembership` are internal (never returned as raw Prisma rows; `/me` and future admin endpoints will project explicit DTOs once T04+ needs richer profile data).

**Frontend fields intentionally NOT carried over:** `User.department`/`User.specialty` (frontend, free-text strings on `User`) become `UserMembership.departmentId` (FK) — a normalized relationship replaces a denormalized string, per spec's "technical debt to avoid: free-text departments/specialties" (section 46). `User.online` (frontend presence flag) has no backend equivalent yet — presence/online status is not addressed until a realtime module exists (T07 SSE at the earliest); omitted rather than faked.

**Breaking-change note:** none — this is the first API surface; nothing to break yet.

## T04 — Patients, care teams, consents (2026-07-14)

**New endpoints:**

| Method | Path | Request | Response (`data`) | Notes |
|---|---|---|---|---|
| GET | `/api/v1/patients` | `page,limit,search,clinicId,primaryDoctorId,sortBy,sortOrder` | `PatientResponse[]` | Patient role forced to own record; staff roles org-scoped; `clinicId` accepted but currently inert (D-021) |
| GET | `/api/v1/patients/{patientId}` | — | `PatientDetailResponse` | 404 for both not-found and not-visible (IDOR-safe); audited |
| PATCH | `/api/v1/patients/{patientId}` | `UpdatePatientRequest` | `PatientResponse` | Field-level policy — 403 (not silent drop) on a disallowed field |
| GET | `/api/v1/patients/{patientId}/consents` | `page,limit,type` | `ConsentResponse[]` | Self or medical_administrator (read-only) |
| POST | `/api/v1/patients/{patientId}/consent-grants` | `CreateConsentGrantRequest{type,policyVersion,grantedAt?}` | `ConsentResponse` | Self only; `Idempotency-Key` required; **200** not 201 (D-018) |
| POST | `/api/v1/patients/{patientId}/consent-withdrawals` | `CreateConsentWithdrawalRequest{type,reason?,version}` | `ConsentResponse` | Self only; `Idempotency-Key` required; optimistic version check |

**New error codes triggerable for the first time:** `OPTIMISTIC_LOCK_FAILED` (stale `version` on patient update or consent withdrawal), `IDEMPOTENCY_KEY_REQUIRED`/`IDEMPOTENCY_KEY_REUSED` (now actually reachable via consent-grants/withdrawals — the first T03 idempotency-required endpoints).

**New canonical entities exposed:** `Patient`, `Consent`. `PatientCareTeamMember` is internal-only (no endpoint — see D-019).

**Frontend fields intentionally NOT carried over verbatim:** `Patient.profile.gender` (frontend Vietnamese string `'Nam'`) → normalized to canonical `'male'|'female'|'other'|'unknown'`. `Patient.profile.dob` (frontend `DD/MM/YYYY` string, e.g. `'15/03/1995'`) → canonical `LocalDate` (`YYYY-MM-DD`). No `Consent.policyVersion` existed on the frontend at all — new required field for legal/compliance version tracking (spec section 36).

**Breaking-change note:** none — additive endpoints only.
