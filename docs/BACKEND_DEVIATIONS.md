# DermaHealth Backend — Deviations from Naive Spec Reading

Records places where the literal instructions could not be followed exactly as written, why, and what was done instead. Distinct from `BACKEND_DECISION_LOG.md` (which covers UNKNOWN product decisions given a documented safe default) — this file covers environment/repository realities that forced a different path.

---

## DEV-001 — Task instructions assumed a different working directory

**What the instructions said:** "The current working directory is the new DermaHealth backend repository," and separately, "Do not read from, modify, restore, copy, or reuse code from the unrelated legacy backend located at `../be`."

**What was actually true:** This session's working directory (`/Users/chuong/Documents/CareFollow/be`) contained only a single stray file (`tailieu.md`, the spec itself, misplaced) and no project scaffolding — it was not an existing "new DermaHealth backend repository" in progress. Meanwhile, a sibling directory `/Users/chuong/Documents/CareFollow/dermahealth-be` already contained a partial NestJS scaffold matching the spec's T00–T03 folder layout almost exactly (`src/common/{auth,idempotency,authorization}`, `src/infrastructure/{redis,storage,queue,mail,ai,sms,integrations}`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `prisma/`). Relative to `dermahealth-be`, the actual working directory (`CareFollow/be`) resolves to exactly `../be` — the path the instructions named as the *legacy backend to avoid*.

**Resolution:** Surfaced the conflict to the user directly (`AskUserQuestion`) rather than guessing. The user chose to proceed in `CareFollow/be` as the real target, explicitly setting aside `dermahealth-be`. All work in this document assumes that decision. `dermahealth-be` was never read from or modified during this session beyond the initial `ls`/`find` performed to detect the conflict.

**Residual risk:** if `dermahealth-be` in fact represents real prior work product the user wants preserved or merged, it now diverges further from this implementation with every session. Flagging again here in case a future session needs to reconcile the two.

---

## DEV-002 — Git repository root is the user's home directory

**What was expected:** A git repository scoped to the backend project, matching "one runnable backend repository/workspace" (spec section 1).

**What was actually true:** `git rev-parse --show-toplevel` from `CareFollow/be` resolved to `/Users/chuong` — the entire home directory is tracked as a single git repository (containing hundreds of unrelated dotfiles: `.ssh/`, `.aws/`-style config directories, other projects' caches, etc.), with one existing commit ("gg").

**Resolution:** Ran `git init` inside `CareFollow/be` itself, creating a nested/independent repository boundary scoped to just this project, rather than staging backend files into the home-directory-wide repo (which risked accidentally committing unrelated sensitive files from the rest of the home directory). The outer home-directory repo was not touched, modified, or committed to.

**Residual risk:** none for this project's history, but the pre-existing home-directory repository itself is unusual and worth the user's separate attention outside this task's scope.

---

## DEV-003 — Docker Desktop was not running at task start

**What was expected:** Docker Compose services startable on demand.

**What was actually true:** `docker compose up` initially failed with "Cannot connect to the Docker daemon" — Docker Desktop was not running.

**Resolution:** Started Docker Desktop (`open -a Docker`), waited for the daemon socket to become available (2s), then proceeded normally. No data or configuration was lost; this was a zero-risk, easily-reversible action (launching an already-installed application).

---

## DEV-004 — Host ports 5432/6379 pre-occupied by native services

Covered in detail as decision D-002 in `docs/BACKEND_DECISION_LOG.md`. Summarized here because it is an environment deviation, not a product decision: a native Homebrew `postgresql@15` and a native `redis-server` were already running and bound to the standard ports on this machine, unrelated to this project. `docker-compose.yml` now maps Postgres to host `5442` and Redis to host `6389` instead of the conventional `5432`/`6379`, and `.env.example`/`.env` reflect this. **Anyone else running this Compose file on a machine without that conflict will still work correctly** — the container-internal ports are untouched, only the host-side mapping changed.

---

## DEV-005 — Jest e2e process required `--forceExit` (RESOLVED — see F-001)

**What was expected:** `npm run test:e2e` exits cleanly on its own once all tests finish.

**What was actually true:** The first e2e run hung indefinitely after all 5 tests passed — an open-handle teardown issue.

**Root cause found (2026-07-14):** `src/infrastructure/redis/redis.module.ts`'s `REDIS_CLIENT` provider was a bare `useFactory: () => new Redis(...)` with no lifecycle hook. The raw ioredis connection (plus its reconnect timers) was never closed on `app.close()`, keeping the Node process alive. Confirmed via `grep -rn "REDIS_CLIENT" src` that the client had zero consumers yet — it was purely inert, open infrastructure.

**Fix:** Wrapped the ioredis instance in an injectable `RedisClientHolder implements OnModuleDestroy` that calls `client.quit()` on module teardown, and provide `REDIS_CLIENT` via a factory reading `holder.client`. Verified with `npx jest --selectProjects e2e --detectOpenHandles` (no `--forceExit`) — zero open-handle warnings, process exits naturally. `--forceExit` removed from `test:integration`, `test:e2e`, `test:security` in `package.json`.

**Reference:** decision — this file, item F-001 in the session's foundation-gap fix list; `src/infrastructure/redis/redis.module.ts`.

---

## DEV-006 — Node 22 quality-gate execution via nvm (RESOLVED — see F-006)

**What was expected:** Quality gates run under Node.js 22 LTS per the spec's stack requirement, without changing `package.json`'s `engines` field to accommodate whatever Node happens to be active locally.

**What was actually true:** This machine's default/active Node was v24.14.1 (see decision D-009/D-014); `npm install` under Node 24 emitted `EBADENGINE` warnings and, more importantly, native modules (`argon2`) built against the Node 24 ABI would not portably match a Node 22 deployment target.

**Resolution:** `nvm` was already installed on this machine (`command -v nvm` resolved). Installed Node 22 via `nvm install 22` (resolved to v22.23.1, the latest 22.x LTS point release), added a `.nvmrc` pinning `22` to the repo root, and re-ran `npm install` after `nvm use 22` — the native-module `EBADENGINE` warning disappeared entirely. All quality-gate commands from this point forward were run as:
```
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22
```
prepended to each command (or `nvm use` once per shell session). `node --version` confirmed `v22.23.1` for every subsequent `typecheck`/`lint`/`build`/`test*`/`prisma migrate`/`db:seed` run in this session.

**Reference:** `.nvmrc`, decision D-014 (renumbered from D-009 in the decision log).
