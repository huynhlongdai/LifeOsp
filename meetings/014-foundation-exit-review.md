# Meeting #014 — Foundation Exit Review

Date: 2026-08-26
Status: DECIDED / EXECUTION CONTINUES

## Context

Engineering Milestone 1 is now code-backed rather than document-only.

Merged checkpoints:
- PR #16 — workspace/API/Web/domain bootstrap → `main`
- PR #17 — PostgreSQL/Drizzle/readiness foundation → `main`

Completed foundation issues:
- #9 Workspace bootstrap
- #11 Database bootstrap

Still open:
- #10 API bootstrap
- #12 Web/PWA bootstrap
- #13 Shared domain contracts
- #14 CI + local dev environment
- #15 Foundation smoke E2E
- #1 Foundation epic

## Meeting objective

Decide whether LifeOS is ready to begin the first product vertical slice, and if not, define the smallest remaining increments required to reach a production-shaped Foundation Exit Gate.

## Participants / positions

### Product / CEO

The first product feature must not begin on an unstable skeleton. However, foundation work must remain minimum-necessary: no empty AI/intelligence/analytics packages and no speculative abstractions merely to make an architecture diagram look complete.

### Staff Engineering

The database increment proved the value of production-artifact checks: source-mode smoke initially passed while built JavaScript failed. The remaining foundation must therefore be verified through the same deployable artifact path.

A single PR closing #10–#15 would be too broad. Reviewability is more important than reducing PR count.

### Platform / API

#10 is not complete because environment parsing/validation is still implicit. API startup must fail fast on malformed HOST/PORT/DATABASE_URL configuration while allowing the testable app factory to remain dependency-injected.

Health and readiness semantics are accepted:
- `/health` = process liveness
- `/ready` = downstream readiness; DB failure returns 503

### Domain Architecture

#13 is partially implemented but not complete. NeedState, LifeEvent and health/readiness contracts exist; the remaining work is:
- stable ID conventions where useful
- an intentionally minimal `NowView` read-model placeholder
- contract tests
- runtime-safe package exports

The domain package must remain independent of React, Fastify, Drizzle and provider SDKs.

### Web / UX

#12 is not complete. The current NOW-first shell proves Web↔API wiring but lacks real route ownership, shared request states and minimal PWA installation metadata. No fake feature content should be added to make empty routes look finished.

### QA / Release

#14/#15 cannot close until the final smoke path proves:
- documented fresh-clone setup
- local Postgres persistence across restart
- typed Web→API connectivity
- API→DB readiness
- clean migration
- clear failure when a dependency is unavailable
- production-built API artifact boot

## Decision: Foundation is NOT yet exited

Vertical Slice A is not authorized yet.

The remaining work is split into three reviewable increments.

### Increment A — API + Domain completion

Owns: #10, #13

Deliverables:
- validated API environment contract
- deterministic startup error behavior
- app factory remains testable without process globals
- branded/opaque ID conventions only where they reduce category mistakes
- minimal `NowView` contract without invented business data
- domain contract tests
- built runtime package exports remain enforced

Exit gate:
- strict typecheck/test/build green
- malformed env test proves fail-fast behavior
- health/readiness tests remain deterministic
- no persistence/framework types leak into domain

### Increment B — Web/PWA shell completion

Owns: #12
Depends on: Increment A contracts

Deliverables:
- NOW default route
- DIRECTION / EXECUTE / REFLECT / ME route shells
- typed API client boundary
- shared loading/error/empty states
- minimal manifest/PWA setup
- responsive shell mobile → desktop

Exit gate:
- built web artifact succeeds
- typed API health consumption works
- no synthetic LifeOS product dataset exists

### Increment C — Foundation integration exit

Owns: #14, #15 and closes #1 if all gates pass
Depends on: A + B

Deliverables:
- one documented local setup/boot path
- root verification path
- persisted local Postgres volume/restart proof
- Web→API→DB smoke
- clean migration and dependency-failure checks
- production artifact smoke remains mandatory

Exit gate:
- all child issues meet their written acceptance criteria
- Foundation epic exit criteria are demonstrably satisfied

## Engineering rules reaffirmed

1. No feature tables for Capture/Direction/Action before Foundation Exit.
2. No empty top-level packages solely to satisfy an old architecture checklist.
3. Runtime verification must execute built JavaScript, not only TSX source mode.
4. Migration drift is CI-failing.
5. Test data must clean up transactionally or through deterministic teardown.
6. Liveness and readiness remain separate contracts.
7. PRs remain reviewable; do not trade review quality for fewer PRs.

## Immediate execution order

1. Start Increment A on `feat/foundation-api-domain`.
2. Complete #10 + #13 and merge only after CI is green.
3. Start Increment B on fresh `main`.
4. Complete Increment C and Foundation Exit Review.
5. Only then authorize Vertical Slice A: Brain Dump → Clarify → Direction → NOW.

## Outcome

APPROVED: continue engineering immediately.

NOT APPROVED: beginning product feature implementation before the Foundation Exit Gate.
