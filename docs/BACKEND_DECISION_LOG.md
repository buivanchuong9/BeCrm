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
