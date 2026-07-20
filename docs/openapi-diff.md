# OpenAPI Diff

## Status: ✅ COMPLETED — regenerated and diffed for real

Earlier drafts of this document reported this as blocked by "no Docker in this sandbox." That diagnosis was only half right: `npm run openapi:generate` failed for an unrelated reason — a real bug (see below) — not a Docker dependency. Once that bug was found and fixed, `NestFactory.create(AppModule)` boots cleanly **without needing Postgres/Redis at all**, because Nest's `onModuleInit` lifecycle hooks (which is where `PrismaService` opens its DB connection) only fire on `app.init()`/`app.listen()`, not on `create()` alone — and `generate-openapi.ts` never calls `.listen()`. This distinction matters and is documented precisely in `docs/production-readiness.md`.

```
$ npm run openapi:generate
OpenAPI document written to docs/openapi.json (180 paths)

$ npm run contract:audit
{ "version": "2.5.0", "paths": 180, "operations": 208, "duplicateOperationIds": 0,
  "unresolvedReferences": 0, "genericSuccessSchemas": 117, "failures": [] }
```

## The bug that was actually blocking this the whole time

`src/core/configuration/configuration.ts`'s `packageVersion()` resolved `package.json` via `join(__dirname, '../../package.json')` — a path that was correct only for this file's pre-refactor location (`src/config/configuration.ts`, two directory levels under `src/`). The Phase 1 `core/` rename moved it to `src/core/configuration/configuration.ts` (three levels deep) without updating the relative path, so it silently resolved to `dist/package.json` instead of the real `/app/package.json`, throwing `ENOENT` on every single boot attempt — in this sandbox *and*, as the user discovered, in the real production deployment (`./scripts/deploy-prod.sh` — container crash-looped, "Deployment failed: dermahealth-api did not become healthy"). See `docs/security-audit.md`'s new Critical finding #10 for full detail. Every prior "OpenAPI generation is blocked by Docker" statement in this document set, going back to Phase 1, was actually this bug, misdiagnosed as an infrastructure limitation because the failure was silent (no stack trace surfaced in this sandbox) and Docker was independently *also* unavailable, making the wrong explanation plausible.

## Real diff results (old baseline = `git show HEAD:docs/openapi.json`, pre-dating this entire engagement)

**Route inventory: identical.** 208 operations in both the old and newly-regenerated spec — a structured set-diff on `(METHOD, path)` pairs found:
- **0 routes removed**
- **0 routes added**
- **0 status-code mismatches** across all 208 operations

**Registration contract (explicitly protected):** `POST /auth/registrations` still returns `201`; `CreateAccountRequest` still has `displayName` as the primary field with the legacy `name` alias still present and marked `deprecated` (not removed).

**`genericSuccessSchemas` dropped from 127 → 117** (a 10-operation improvement) — confirms the `notifications`/`care-plans` extractions' typed response DTOs are correctly reflected in the generated spec, exactly as predicted in the (now-superseded) earlier draft of this document.

**Raw JSON diff is large** (1140 insertions / 617 deletions in `docs/openapi.json`) but this is expected and not concerning: it reflects (a) new named schemas for `notifications`/`care-plans` response DTOs replacing generic-envelope placeholders, (b) the `owner-governance` `role` field now typed as the `UserRole` enum instead of a free string, (c) internal `operationId`/tag bookkeeping shifts from the module reorganization. None of it changes a route path, HTTP method, or (per the structured diff above) a status code.

## Still not verified (this diff proves the *shape* of the API is unchanged; it does not prove runtime *behavior* against live data)
Actual request/response bodies under real data, database migration state, and Redis/BullMQ-dependent behavior (idempotency keys, outbox dispatch, MFA, rate limiting backed by Redis) still require a live `docker compose up -d postgres redis` environment to verify — this sandbox can now boot the app process itself, but not serve real traffic. See `docs/production-readiness.md` for the exact remaining commands.
