# Meeting #017 — Handoff and Split-Agent Work Plan

Date: 2026-08-26
Status: Approved for execution

## Purpose

Reduce coordination load and make LifeOS continuable from fresh chats/agents without replaying the full historical conversation.

## Participants / represented roles

- Product / Release Integrator
- Architecture / Backend
- Behavioral UX
- QA / E2E
- Data / Trust
- Delivery coordination

## Verified repository state

Stable `main` head:

`0d4db21a60c5957211316d54d6ed3013d4ba9b53`

This includes B3 NOW V0.

Open implementation PRs at handoff: none.

Active in-progress feature branch:

`feat/b4-focus-v0`

Branch head at handoff:

`7989c409f96bc121ec39f02b5ffda5ea4158d10d`

Open Vertical Slice B issues:

- #40 B4 Focus V0
- #41 B5 Result + Daily Close V0
- #42 B6 Vertical Slice B E2E
- #3 Vertical Slice B epic

## Completed work confirmed

Vertical Slice A is complete.

Vertical Slice B completed increments:

- B0 #36 Execution Context
- B1 #37 Action Candidate V0
- B2 #38 Next Action Engine V0
- B3 #39 NOW V0

The current execution chain is therefore:

`confirmed Direction / Season -> Outcome / Project -> ready Action -> deterministic Next Action recommendation -> server-derived NOW`

Execution has intentionally NOT started yet; Focus begins in B4.

## B4 current state

B4 has initial domain/schema work on `feat/b4-focus-v0`:

- FocusSessionId
- FocusSession domain contract
- initial FocusSession schema
- intended one-active-focus-per-user partial unique constraint

A temporary workflow was added for Drizzle migration generation:

`.github/workflows/b4-generate-focus-schema.yml`

Its first run failed. A valid FocusSession migration is not yet proven.

Decision: B4 agent must inspect and fix this failure before continuing deeper implementation. The temporary workflow must not reach `main`.

## Work splitting decision

### Lane A — Release / Product Integrator

Maintains `main`, dependencies, PR evidence, merge gates and meeting/handoff documentation. Does not compete with feature agents for the same files.

### Lane B — B4 Focus implementation

Exclusive code owner for the active `feat/b4-focus-v0` branch until #40 is merged.

Owns schema/migration, DB transaction semantics, API, Focus UI, distraction Capture, integration tests and B4 PR.

Hard boundary: Focus does not complete the Action. Action-result semantics stay in B5.

### Lane C — B5 specification / transition-matrix preparation

May work in parallel only on specs/tests/documentation until B4 merges. Must not merge code based on an unmerged Focus schema.

After B4 merge, B5 starts from fresh `main`.

### Lane D — B6 E2E / QA planning

May prepare E2E scenarios, expected event sequence, ownership attacks, provider-outage/manual loop and DB recreation strategy. Actual B6 executable E2E code waits for B5 merge.

### Lane E — UX / research / dogfood preparation

May work independently on Focus UX, Daily Close design, #8 reusable UI proposals and #6 founder-dogfood checklist. Avoid B4 conflict-prone files unless coordinated.

## Merge-conflict policy

During B4, these paths are reserved for the B4 implementation lane or Release Integrator with explicit coordination:

- `packages/domain/src/ids.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/focus.ts`
- `packages/db/src/schema.ts`
- `packages/db/drizzle/**`
- `packages/db/src/index.ts`
- `apps/api/src/app.ts`
- NOW/Focus Web entry files touched by B4

No parallel agent may independently regenerate/edit Drizzle snapshots or migration journal.

## Repository source of truth decision

A new root document `HANDOFF.md` is now the short-form source of truth for fresh chats/agents.

Continuation order:

1. `HANDOFF.md`
2. active issue
3. Meeting #016
4. current branch diff and CI
5. canonical docs as needed

Chat history is no longer required to continue implementation.

## Next executable action

B4 implementation agent:

1. inspect failed B4 migration-generation workflow;
2. fix failure;
3. generate/audit FocusSession migration;
4. remove temporary generator workflow;
5. implement DB/API/UI/integration;
6. open B4 draft PR;
7. final clean CI + scope review;
8. merge #40;
9. release B5 to implementation lane.

## Decision

Approved. From this point, work should be coordinated through issues/branches/PRs plus `HANDOFF.md`, rather than relying on a single long-running chat context.