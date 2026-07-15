# DermaHealth Backend — Decision Log

Every UNKNOWN or ambiguous requirement resolved during implementation, in order encountered. Format: **Decision** — what was chosen. **Why** — the forcing evidence or spec default. **Reference** — spec section / task.

---

### D-001 — Repository location for the new backend

**Decision:** Build the DermaHealth backend directly in `/Users/chuong/Documents/CareFollow/be` (the directory this session's tools resolved to as "the current DermaHealth backend repository"), rather than in the sibling `/Users/chuong/Documents/CareFollow/dermahealth-be`, which already contained a partial scaffold matching the spec's T00–T03 module layout.

**Why:** Preflight discovered a conflict: the spec text asserted the current directory was "the new DermaHealth backend repository" and that `../be` was "the unrelated legacy backend" to avoid — but this session's actual working directory, relative to `dermahealth-be`, *is* `../be`. The directory also contained only a single stray file (`tailieu.md`, the spec itself, misplaced) with no project scaffolding. This was surfaced to the user as a blocking ambiguity via `AskUserQuestion`; the user explicitly chose "Build fresh here in CareFollow/be," overriding the apparent scaffold-continuity signal from `dermahealth-be`. `dermahealth-be` was left completely untouched.

**Reference:** Preflight checks, spec "Repository boundaries" section of the task instructions.

---

### D-002 — Docker host port remapping

**Decision:** Postgres mapped to host `5442` (not `5432`); Redis mapped to host `6389` (not `6379`) in `docker-compose.yml`. Test-suite Postgres/Redis (`docker-compose.test.yml`) use `5433`/`6380`, already non-conflicting.

**Why:** This machine already runs a native Homebrew `postgresql@15` bound to `127.0.0.1:5432` and `[::1]:5432`, and a native `redis-server` bound to `127.0.0.1:6379` and `[::1]:6379`. Docker's port-forwarding for `5432:5432`/`6379:6379` did not error at `docker compose up` time but silently lost the IPv4 binding race to the native services, so `DATABASE_URL=...@localhost:5432` from `.env.example` was intermittently routing to the wrong Postgres server (surfaced as Prisma `P1010: User app was denied access`). Remapping avoids ambiguity entirely rather than depending on IPv4-vs-IPv6 resolution order.

**Reference:** T00 preflight, `docs/BACKEND_DEVIATIONS.md`.

---

### D-003 — Organization/clinic tenancy model

**Decision:** Implemented the spec's documented safe default exactly: one `Organization` row (code `dermahealth`), one `ClinicLocation` row (code `CS-HCM-01`, matching the frontend's only-ever-referenced clinic string), with `UserMembership` rows carrying explicit `organizationId` + optional `clinicLocationId` + `role` + optional `departmentId`.

**Why:** Frontend evidence (confirmed via Explore agent inspection of `src/domain/core/entities.ts`, `enums.ts`, `seed.ts`) has **zero** `Organization`/`Clinic`/`Department` types — `clinicLocationId`, `clinicName`, and `department` are untyped free-text strings hardcoded to `'CS-HCM-01'` / `'DermaHealth TP.HCM'` at every call site, implying exactly one clinic. Spec section 47 documents "one org, explicit clinic memberships" as the safe default precisely for this situation.

**Reference:** Spec section 21 (database design), section 47 (missing decisions row 1), section 45 defect list.

---

### D-004 — Fixing the U-0014/U-0015 duplicate-seed defect

**Decision:** Every seeded user gets a unique email-keyed identity. The frontend's two colliding `U-0014` entries (`super_administrator` "Đào Văn Dương" vs. `clinical_process_designer` "Đặng Thị Thu") and two colliding `U-0015` entries (`super_administrator` "Nguyễn Mạnh Cường" vs. `doctor` "Bs. Trần Văn Nam") are now four distinct users with four distinct emails.

**Why:** Spec section 37 explicitly requires this fix ("generate unique users for currently duplicated U-0014/U-0015"); section 45 documents it as Confirmed Defect #1.

**Reference:** Spec sections 37, 45.

---

### D-005 — `users` table has no human-readable `code` column

**Decision:** Users are upserted/keyed by `email` (unique, `citext`) rather than a separate stable `code` field. Organizations, clinic locations, and departments *do* have `code` columns (per spec section 21's explicit column list for those tables); the `users` row template in the same section does not list one.

**Why:** Spec section 21's per-table column list for `users` is `id, email citext, password_hash, display_name, status, mfa fields` — no code field. `email` already serves as the natural stable key the seed script upserts against, satisfying "Upsert by stable code; repeated runs create no duplicates" (section 37) without inventing an unspecified column.

**Reference:** Spec section 21 (`users` row), section 37.

---

### D-006 — `user_memberships` NULL-clinic uniqueness limitation

**Decision:** The declared Prisma/Postgres unique constraint `(userId, organizationId, clinicLocationId, role)` is known to not dedupe rows where `clinicLocationId IS NULL` (org-wide memberships — admins, designers, patients), because Postgres treats NULL as distinct per unique-index row. Rather than block T03 on a schema redesign, the seed script works around it with an explicit `findFirst` + `create`/`update` instead of relying on `upsert`'s `ON CONFLICT`.

**Why:** This is a genuine, previously-undocumented edge case discovered while implementing the seed script (verified duplicate rows would otherwise appear on a second seed run). A sentinel non-null "org-wide clinic" row or a partial unique index (`WHERE clinic_location_id IS NULL`) both fix it properly, but doing so now would mean guessing at T05's real clinic/membership management shape before that task is scoped.

**Why not blocking:** all *application* write paths for `user_memberships` in T03 (the seed script) already implement the correct idempotent pattern; only a raw `prisma.userMembership.upsert()` call against this constraint would be unsafe, and none exists yet outside the seed script.

**Reference:** T01 implementation notes in `docs/BACKEND_IMPLEMENTATION_PROGRESS.md`. Revisit at T05.

---

### D-007 — Access token algorithm and storage

**Decision:** RS256 (asymmetric) access tokens signed with a locally-generated 2048-bit RSA keypair (dev-only, stored in `.devkeys/`, gitignored), 10-minute TTL, returned in the JSON response body (not a cookie) for the frontend to hold in memory. Refresh tokens are opaque random 384-bit values, `HttpOnly; SameSite=Lax` cookies scoped to `/api/v1/auth`, hashed (SHA-256) before storage, with rotation-family reuse detection.

**Why:** Directly matches spec section 28's authentication design ("short-lived access token ... in memory", "rotated refresh token ... in HttpOnly; Secure; SameSite=Lax cookie scoped to /api/v1/auth", "Refresh records store only Argon2/SHA-256 token hashes ... Rotation detects reuse and revokes the family"). RS256 (vs. HS256) was chosen over the spec's unstated preference because it lets a future resource server / SSE gateway verify tokens with only the public key, without holding the signing secret — a reasonable production-shaped default consistent with "PROPOSED production recommendation" latitude given no explicit algorithm was mandated.

**Reference:** Spec section 28, section 40 (`ACCESS_TOKEN_PRIVATE_KEY`/`ACCESS_TOKEN_PUBLIC_KEY` env vars confirm asymmetric-key intent).

---

### D-008 — Login/refresh/logout exempted from Idempotency-Key requirement

**Decision:** `/auth/login`, `/auth/refresh`, `/auth/logout` do not require the `Idempotency-Key` header.

**Why:** Spec section 32's high-risk command list (booking/reschedule/cancel, check-in, AI submission, plan/order/result/prescription issuance, workflow activation/commands, record signing/reopen/addendum, alert/request decisions, file intent completion, support submission) does not include auth endpoints, and explicitly states "Refresh rotation uses token family semantics, not the general header."

**Reference:** Spec section 32.

---

### D-010 — `docs/api.md` treated as authoritative over `docs/BACKEND_IMPLEMENTATION_SPEC.md` for API surface

**Decision:** After T00–T03 shipped, the user pointed to `docs/api.md` (2385 lines) as the source to complete the API against. Diffing it against `docs/BACKEND_IMPLEMENTATION_SPEC.md` (1005 lines) confirmed they share identical business rules, state machines, and database design (sections 1–23, 27–50 are near-verbatim) — `api.md` only adds far more precise API conventions: mandatory naming rules (REST noun-subresource actions like `/cancellations` instead of RPC verbs), DTO suffix rules, and a literal per-path endpoint catalog with exact TypeScript request/response interfaces (sections 24–26, plus an expanded migration map). Treated `api.md` as authoritative for anything path/DTO-shaped; fell back to the shorter spec for everything else (they don't conflict).

**Why:** `api.md` is strictly more specific and was supplied later in the same engagement as a refinement, not a contradiction — e.g., section 25's literal `POST /api/v1/auth/sessions` vs. the shorter spec's looser `POST /auth/login`. Per this project's own governance rule ("if two higher-priority sources still conflict, do not guess silently... implement the safest backward-compatible contract"), since no frontend consumes the API yet, realigning immediately (rather than shipping the looser contract and migrating later) is the safest path — it avoids ever shipping a contract that would need a breaking change once T19 frontend integration begins.

**Reference:** `docs/api.md` sections 24–26, 38; see the T03 realignment entry in `docs/API_CHANGELOG.md` for the exact before/after endpoint table.

---

### D-011 — `User.status` internal/external enum mapping

**Decision:** Kept the internal Prisma `UserStatus` enum as `pending_activation|active|suspended|deactivated` (matches this project's own login-lockout design: `suspended` plus a separate `lockedUntil` timestamp distinguish admin action from transient failed-login throttling) and added an explicit mapper (`toApiUserStatus` in `user-response.mapper.ts`) translating to the contract's `invited|active|locked|disabled` at every response boundary.

**Why:** `docs/api.md`'s `CurrentUserResponse`/`UserResponse` DTOs fix a 4-value status enum that doesn't distinguish "admin-suspended" from "temporarily locked by failed logins" — collapsing both internal concepts to the contract's `locked` is a lossy-but-intentional simplification at the API boundary, not a data-model compromise. This mirrors the `doctor`/`practitioner_profile` internal-vs-external naming split the spec explicitly sanctions (section 24: "the backend may keep the broader internal ... concept, but it must not leak that rename into the FE contract").

**Reference:** `docs/api.md` section 26 (`CurrentUserResponse.status`), `src/modules/identity/user-response.mapper.ts`.

---

### D-012 — `User.displayName` (DB) vs. `name` (API)

**Decision:** Kept the Prisma column `display_name` / TypeScript field `displayName` unchanged internally, but every response DTO projects it as `name` (matching `docs/api.md`'s `CurrentUserResponse.name` / `UserResponse.name` / `UpdateCurrentUserRequest.name`), via the same `user-response.mapper.ts`.

**Why:** Renaming the DB column and every internal reference (`AuthService`, `UsersRepository`, the seed script) to `name` for a single-field, non-conceptual rename was judged higher-churn than value versus a one-line projection at the DTO boundary — consistent with D-010's "internal name may differ from the FE contract" allowance.

**Reference:** `docs/api.md` section 26, `src/modules/identity/user-response.mapper.ts`.

---

### D-013 — Password-reset endpoints deferred to T16 (notifications)

**Decision:** `POST /password-reset-requests` and `POST /password-resets` (listed in `docs/api.md` section 25's identity table) are **not yet implemented**.

**Why:** Both endpoints are only meaningful with real email delivery (spec section 33: outbox → BullMQ → channel worker → Mailpit), which is explicit T16 scope and doesn't exist yet. Building the token-issuance half now without a delivery mechanism would mean either faking success or leaving a partially-functional endpoint; both are worse than deferring the whole feature to when its dependency (T16) is actually built. Documented here rather than silently omitted.

**Reference:** `docs/api.md` section 25, spec section 33, task dependency table (T16 depends on T02–T03, T06+).

---

### D-014 — Node.js version mismatch (local dev tool, not app config)

**Decision:** `package.json` declares `"engines": {"node": ">=22 <23"}` per spec's Node 22 LTS requirement, but this machine's active Node is v24.14.1 (npm warns `EBADENGINE`, non-fatal). No application code changed to accommodate v24; this is purely a local-machine tooling note, not a product decision.

**Why:** Spec section 40 / stack list mandates "Node.js 22 LTS." Deployment images (`Dockerfile FROM node:22-slim`) correctly pin 22; only this developer's local shell has a newer Node installed. Recorded here so it isn't mistaken for a silent scope change.

**Reference:** Spec "Primary implementation stack" (section 19), `Dockerfile`.
### D-015 — Membership uniqueness enforced by two partial unique indexes, not a Prisma `@@unique`

**Decision:** Dropped the Prisma-declared `@@unique([userId, organizationId, clinicLocationId, role])` on `user_memberships` (which never actually prevented org-wide-membership duplicates — see D-006) and replaced it with two handwritten partial unique indexes in migration `20260714101425_membership_partial_unique_indexes`: `uniq_membership_clinic_scoped` (`WHERE status='active' AND clinic_location_id IS NOT NULL`) and `uniq_membership_org_wide` (`WHERE status='active' AND clinic_location_id IS NULL`).

**Why:** Postgres unique constraints/indexes treat NULL as distinct per row, so no single plain unique index can correctly dedupe both "this user has role X at clinic Y" and "this user has role X org-wide" cases simultaneously. Prisma's `@@unique` syntax has no `WHERE` clause support, so the fix had to be a handwritten SQL migration (consistent with spec section 21's explicit allowance: "handwritten SQL migrations where needed for ... partial indexes"). Both indexes are scoped to `status='active'` so a revoked membership never blocks re-granting the same role later.

**Verified by:** `test/integration/membership-uniqueness.spec.ts` (4 tests against real Postgres) — duplicate clinic-scoped rejected, duplicate org-wide rejected, org-wide + clinic-scoped for the same role coexist correctly, and re-granting after revocation succeeds.

**Reference:** F-004 in the foundation-gap fix list; supersedes the workaround noted in D-006.

---

### D-016 — `GET /patients` doubles as the patient's own-record lookup

**Decision:** `docs/api.md` documents `GET /patients` as "Authorized staff only" and gives patients no dedicated `/patients/me`-style endpoint, yet `GET /patients/{patientId}` explicitly allows "self" access and the frontend's entire Patient module exists only to let the seeded patient view their own profile. Resolved by extending `GET /patients`'s scope resolution: a caller holding only the `patient` role (no staff role) is force-scoped to their own single row, mirroring the exact pattern `docs/api.md` already documents for `GET /appointments` ("Patient list is forced to self; staff scoped").

**Why:** This is not a new endpoint — it reuses the literal, already-documented path with role-conditional scoping, consistent with the one analogous pattern the contract does spell out elsewhere. Inventing a new `/patients/me` path was avoided per the explicit instruction not to add endpoints beyond `docs/api.md`.

**Reference:** `src/modules/patients/policies/patient-policies.ts` (`resolvePatientListScope`), `docs/api.md` section 25 (`GET /appointments` row).

---

### D-017 — No field-level redaction on `PatientResponse` for receptionist/admin viewers

**Decision:** Every role authorized to view a patient (self, primary doctor, active care-team member, medical_administrator, receptionist) currently receives the identical `PatientResponse` shape — no field is nulled out per-role.

**Why:** The parent task instructions ask for "field-level policies" and to ensure "receptionist and customer-care responses omit clinical information," but `docs/api.md`'s `PatientResponse` has exactly one field that is even borderline clinical (`bloodType`), and it is declared **non-nullable** in the contract (`'A+' | 'A-' | ... | 'unknown'`, no `| null`) — redacting it to `null` would violate the documented DTO shape. Every other field (name/dob/gender/phone/email/address) is administrative/contact data, which spec section 29 explicitly says reception *should* see ("reception sees contact/appointment/check-in"). `customer_care_employee` is not granted `CanViewPatient` access at all (see D-019's authorization table), which is the actual mechanism satisfying "customer-care cannot access clinical notes" — full exclusion, not partial redaction. Genuine clinical redaction has a real home once T08 (encounters)/T11 (diagnoses) introduce fields that are actually clinical.

**Reference:** `docs/api.md` section 26 `PatientResponse`; spec section 29 field-serializer note; T04 task's field-level-policy requirement.

---

### D-018 — Consent grant/withdrawal return `200`, not `201`

**Decision:** `POST /patients/{id}/consent-grants` and `.../consent-withdrawals` both return HTTP 200, set via explicit `@HttpCode(HttpStatus.OK)` (Nest's POST default would otherwise be 201).

**Why:** `docs/api.md` section 26's general HTTP rule is "create returns 201 ... reads/updates/commands return 200," and a consent-grant is a command on the existing `(patient, type)` consent aggregate (upsert semantics — the DB row for that type either already exists or is created transparently) rather than fresh, always-novel resource creation. This matches every other noun-subresource command in the spec (`/cancellations`, `/signatures`, `/completions`, etc.), none of which return 201.

**Reference:** `docs/api.md` section 26 HTTP rules; `src/modules/patients/consents.controller.ts`.

---

### D-019 — `patient_care_team` has no dedicated CRUD endpoint

**Decision:** The `patient_care_team` table and its authorization role (feeding `CanViewPatient`'s "active care-team" check) are implemented exactly per spec section 21/29, but there is no `GET/POST /patients/{id}/care-team`-style endpoint. The only write path is automatic: `PATCH /patients/{id}` with a `primaryDoctorId` change atomically closes any existing `relationship='primary_doctor'` row and opens a new one, inside the same transaction as the Patient field update.

**Why:** Full-text search of `docs/api.md`'s complete endpoint catalog (section 25) confirms zero care-team-specific paths exist — "care-team" appears only as a database table (section 21) and an authorization-policy input (sections 11, 29). Broader care-team membership (secondary assigned doctors/nurses beyond the primary) will be populated by T06 (appointments)/T08 (encounters) once those modules exist to generate real assignment events; T04 only needs the primary-doctor case to exist.

**Reference:** `docs/api.md` sections 11, 21, 25, 29; `src/modules/patients/patients.repository.ts` (`replacePrimaryDoctorCareTeamRow`).

---

### D-020 — `Patient.primaryDoctorId` references `users.id`, not a future `practitioner_profiles.id`

**Decision:** `patients.primary_doctor_id` is a foreign key straight to `users.id`, not to the `practitioner_profiles`/"Doctor" concept `docs/api.md`'s naming table (section 24) describes as the eventual backing table for the public `doctors` collection.

**Why:** T05 (practitioners/schedules), which would introduce `practitioner_profiles`, has not shipped yet and T04's only dependency is T03 (identity) — they're parallel branches in the task graph, not sequential. Since every "doctor" is fundamentally a `User` with a `doctor` role membership, and `practitioner_profiles` is expected to be a 1:1 extension of `users` (not a replacement identity), pointing at `users.id` now is forward-compatible: T05 can add `practitioner_profiles.user_id` without requiring any change to `patients.primary_doctor_id` or the `PatientResponse.primaryDoctor` projection.

**Reference:** `docs/api.md` section 24 naming table; spec section 21 database design (T05 row).

---

### D-021 — `GET /patients`'s `clinicId` filter is accepted but currently inert

**Decision:** The `ListPatientsQuery.clinicId` parameter (documented in `docs/api.md` section 25's `GET /patients` row) is validated as a UUID and accepted, but has no effect on the query — `Patient` has no clinic-location relation in the current schema.

**Why:** Spec section 21's own `patients` row lists only `org_id`, not a clinic column — patients are organization-scoped, not clinic-scoped, in this data model (matching the frontend, which never showed a patient tied to more than one clinic). A real clinic filter will become meaningful once T06 (appointments) gives patients an actual relationship to specific clinic locations to filter through. Silently dropping the query param from the DTO would break contract validation for FE code that sends it per the documented shape; accepting-but-ignoring preserves forward compatibility.

**Reference:** `docs/api.md` section 25; spec section 21 `patients` row; `src/modules/patients/patients.controller.ts`.

---

### D-022 — Consent type catalog restricted to the 3 frontend-confirmed values via DB CHECK constraint

**Decision:** `consents.type`/`consent_events.type` are free-text columns but constrained by a `CHECK (type IN ('data_processing','research_data_sharing','telemedicine'))` — not an open string, and not a Prisma enum either (to avoid an enum-identifier-vs-API-literal translation layer, same reasoning as blood type).

**Why:** These are exactly the three literals confirmed in the frontend (`SettingsPage.tsx`'s `CONSENT_LABEL` map and `seed.ts`'s three `Consent` fixtures) — `docs/api.md`'s `ConsentResponse.type` is typed as a bare `string` with no enum, but consent types are a legal/compliance surface (spec section 36) where silently accepting arbitrary client-supplied strings would be unsafe. Extending the catalog is a reviewed migration, not a runtime config value.

**Reference:** Explore-agent frontend evidence (`SettingsPage.tsx` `CONSENT_LABEL`, `seed.ts` consent fixtures); spec section 36 (legal/compliance review items).

---

### D-023 — Production nginx configs rewritten to match this backend's actual routes

**Decision:** The user supplied two nginx config drafts for deploying to `dermahealth.fitdnu.id.vn` (a host-nginx variant and a docker-compose-network variant), both written against an unrelated backend's route structure (`upstream carefollow_be`/`carefollow-be` container name; location blocks for `/authenticator`, `/adminapi`, `/bpmapi`, `/notification`, `/sale`). Confirmed with the user (via `AskUserQuestion`) that these were meant for *this* DermaHealth backend but needed fixing, not that a different backend was intended. Rewrote both as `nginx/dermahealth.host.conf.example` and `nginx/dermahealth.compose.conf.example`, routing only `/api/...` (REST + Swagger UI at `/api/docs`) and unprefixed `/health/{live,ready}` — this backend's actual surface per `src/bootstrap.ts`/`src/main.ts`. Added `docker-compose.prod.yml` (separate from the dev `docker-compose.yml`) so the host-nginx variant's assumed `127.0.0.1:43000 -> 3000` mapping actually exists somewhere; MinIO/Mailpit (dev-only stand-ins) are intentionally excluded from it.

**Why:** Proxying to nonexistent routes would have made the deployed API completely unreachable through nginx (every request either 404s inside the app past the global `/api` prefix mismatch, or hits nginx's fallback `/` block). Fixing the location blocks to match reality was necessary for the stated goal ("deploy BE so the docs are reachable") to actually work.

**Also fixed while here:** `.gitignore` did not actually cover `.env.production` or other `.env.*` variants (only `.env` exactly and `.env.*.local` — a real gap, since a real secrets file matching that exact pattern could have been committed). Broadened to `.env.*` with an explicit `!.env.example` negation.

**Reference:** `nginx/dermahealth.host.conf.example`, `nginx/dermahealth.compose.conf.example`, `docker-compose.prod.yml`, `.gitignore`.

---

