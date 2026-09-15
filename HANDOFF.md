# LifeOS Project Handoff

Updated: 2026-09-15 (status addendum; B4 sections below are historical)
Repository: `huynhlongdai/LifeOsp`

> **Status addendum 2026-09-15.** B4 Focus V0 has merged into `main` (#48). Sections 4, 7–8 and 10 describe the B4 work as it stood on 2026-08-26 and are kept for history.
>
> Two branches are in flight, stacked:
> 1. `feat/ux-shell-design-system-v1` — Epic #8, web presentation layer only (`apps/web/src/**`, `index.html`, manifest) per `docs/design/UI_SHELL_DESIGN_SYSTEM_V1.md`; no domain/db/api/routes changes. Includes `meetings/020-retention-warmth-and-feature-gap.md` (decided: W1–W6 approved).
> 2. `feat/b5-result-daily-close-agent` (on top of 1; PR #52) — **B5 #41 Result + Daily Close V0**: domain `result.ts`; db tables `action_results`, `daily_closes` + migration `0009_b5_result_daily_close`; api `POST /v1/actions/:actionId/result`, `GET/POST /v1/daily-close`; web `ResultPanel` in NOW, `DailyClosePage` on `/reflect`, `docs/design/COPY_VOICE_V1.md`. Contract: an Action leaves `ready`/`active` only through a recorded result; an active FocusSession on that Action is ended in the same commit **only** when the client passes `focusOutcome` (otherwise 409 `active_focus_exists`); Daily Close is keyed by client-supplied local `date` + `offsetMinutes` (getTimezoneOffset semantics), summarizes recorded facts only, upserts once per user per date. `apps/api/src/result.integration.ts` is written but **has not been executed** (no Postgres in the authoring sandbox) — run `pnpm --filter @lifeos/api test:integration` with `DATABASE_URL` before merging. Also on this branch: W5 welcome-back (`NowView.returning`), global quick capture (`QuickCapture`), `meetings/021` first-run feedback, `docs/design/FIGMA_MAKE_RECONCILIATION_V1.md` (decided) and its first port — read-only `GET /v1/captures`, `GET /v1/incubator` with `/inbox` and `/incubator` secondary routes. Next: B6 #42 E2E, Get Unstuck, Weekly Reset, then F1/F3/F5 from meeting #021 (see #020 §6).

> **Branch map 2026-09-15 (decided by product owner).** `git clone --depth` hides these; run `git fetch --all` first.
>
> | Branch | Status | Decision |
> |---|---|---|
> | `feat/ux-shell-design-system-v1` → PR #51 | Epic #8 UI shell (agent) | review & merge first |
> | `feat/b5-result-daily-close-agent` → PR #52 (stacked on #51) | **B5 source of truth** + W5 + quick capture + Inbox/Incubator (agent) | merge after #51; run `result.integration.ts` with Postgres first |
> | `feat/b5-result-daily-close` (bilonglo9x-code, 14/09) | parallel B5, same migration number `0009` | **do not merge**; its unit tests were ported into #52 (`apps/web/src/result-api.test.ts`, `packages/domain/src/result.test.ts`, restart case in `result.integration.ts`) |
> | `feat/ui-redesign-v2` (13/09) | dark mobile redesign + third B5 | **do not merge** (conflicts with Addendum V1 and with the chosen B5) |
> | `feat/ui-design-system-v1` (Viktor, 14/09, 100 files) | AI Coach chat, "Điểm cuộc sống", Admin panel, onboarding, demo dataset, custom AI provider | **do not merge as a whole** (re-confirmed 15/09 after re-inspection — see note below); cherry-pick candidates only |
>
> Only one `0009_*` migration may reach `main`; the one in #52 is `0009_b5_result_daily_close`.

> **Re-inspection of `feat/ui-design-system-v1`, 15/09** — product owner asked me to re-check whether this branch could be merged to `main` as-is because "UI khá đầy đủ." Read the actual diff (not just commit subjects) against `origin/main`: 27 commits, ~100 files. Findings that keep the verdict at **do not merge whole**:
> 1. **`apps/web/src/design/index.css` is the raw Figma Make export CSS, vendored verbatim** — the file's own header comment says "vendored verbatim from the approved Figma Make export... Do not restyle by hand." That bypasses the KEEP/ADAPT/REJECT matrix in `FIGMA_MAKE_RECONCILIATION_V1.md` entirely instead of applying it. It ships a `[data-theme="futuristic"]` variant with `background: ... #0a0a0a` and neon-lime radial gradients (`rgba(170,235,60,...)`) — exactly the dark/neon "AI dashboard" look Addendum V1 bans, not the deferred-to-P1 "dịu, không neon" dark theme the product owner actually approved.
> 2. **Different design stack, not a compatible skin**: adds `tailwindcss` + `@tailwindcss/vite` as new build dependencies, and `main.tsx` imports `design/index.css`/`design/legacy-bridge.css` instead of our token system — `apps/web/src/App.tsx` on this branch has zero references to `tokens.css`/`--los-*`. Merging it would fork the styling architecture, not extend Epic #8's design system.
> 3. **`packages/domain/src/coach.ts` hard-codes a `computeLifeScore`/`LifeScoreView` with weighted percent components** — this is the literal "Điểm cuộc sống / life score %" pattern rejected in `FIGMA_MAKE_RECONCILIATION_V1.md` (cites Meeting #019/Addendum V1/Thesis), plus an AI Coach chat surface, an Admin AI-provider settings page, and a demo-seed/onboarding flow — none of which are approved surfaces.
> 4. **Real migration conflict, not just a naming collision**: this branch's own `0009_b5_result_daily_close.sql` differs from the one in PR #52 (16 insertions / 20 deletions different) — it's an independent third B5 implementation, same problem as `feat/b5-result-daily-close` and `feat/ui-redesign-v2`.
> 5. **What's genuinely salvageable as cherry-picks later** (functionally reasonable, but needs to be rebuilt on our token system, not imported wholesale): `ExecutePage.tsx`/`execute-board.ts` (fills our real Execute-landing-page gap), `DirectionOutlook.tsx`/`direction-outlook.ts` (fills our Direction-milestones gap), `SessionChecklist.tsx`, `reflect-week.ts`/`ReflectWeek.tsx`. Its `InboxPage`/`IncubatorPage`/`result.ts` overlap with what we already shipped in PR #52 and are redundant, not additive.
> **Net**: UI *volume* is real, but it was built by adopting the Figma Make export directly and adding AI-dashboard features the product owner already rejected — it is a regression against the approved direction, not an alternative source of truth. Recommendation stands: merge #51 → #52 first, then selectively port Execute/Direction/session-checklist logic (domain + api, not the CSS) into our design system on a fresh branch.

> **Get Unstuck V0** (also on `feat/b5-result-daily-close-agent`): evidence-only, no new table. `GET /v1/get-unstuck` lists Actions in ready/active/blocked/postponed that qualify (`isStuckEvidence`: blocked status, or ≥2 lifetime postponed+blocked `action_results`, or ≥2 `wrong_assumption` recommendation resolutions — all computed from existing tables). `POST /v1/actions/:id/get-unstuck/diagnose {friction}` logs the choice and returns a deterministic intervention (no AI provider in V0, documented as a deliberate cut in `packages/domain/src/get-unstuck.ts`); `/get-unstuck/edit` applies clarify/resize as an in-place Action edit; `/get-unstuck/revive` is the **first and only** path that moves a `blocked`/`postponed` Action back to `ready` — until now nothing in the system could do that, which is worth knowing if anything downstream assumed those statuses were terminal. `reprioritize`/`pause_drop` reuse the existing B5 `/result` route. `apps/api/src/get-unstuck.integration.ts` is written but not run (same Postgres caveat as B5).

## 1. Purpose

This is the canonical handoff for continuing LifeOS in a fresh chat or with additional agents. Read this file before making product or code decisions. Do not rely on prior chat history as a source of truth when this file, issues, canonical docs, or merged code disagree.

## 2. Product direction

LifeOS is an AI-native personal operating system focused on helping people who may lack clarity, goals, consistent action, or are overloaded by information. It is not intended to become a generic task manager.

Core loop:

`DISCOVER -> DIRECTION -> PLAN -> ACT -> OBSERVE -> REFLECT -> ADAPT`

Primary UX principle:

> Every time the user opens LifeOS, reduce the decisions they must make, the things they must remember, and the things competing for attention.

Primary navigation remains:

`NOW / DIRECTION / EXECUTE / REFLECT / ME`

Hard trust principles:

- user owns commitments and durable personal conclusions;
- AI may propose but must not silently activate important commitments;
- server owns identity/ownership checks;
- material recommendations must be explainable from stored evidence;
- no hidden chain-of-thought is persisted or shown as product evidence;
- provider failure must not destroy user input or block the manual execution loop;
- state transitions that matter must be atomic with LifeEvents.

## 3. Stable main state

Current `main` head at handoff:

`0d4db21a60c5957211316d54d6ed3013d4ba9b53`

This is the squash merge of B3 NOW V0.

No pull request is open at the time of this handoff.

### Completed Foundation / Vertical Slice A

Foundation plus Vertical Slice A are complete. The repository already includes:

- anonymous session identity boundary and ownership model;
- PostgreSQL/Drizzle foundation, migrations, CI, PWA shell;
- durable Capture and immutable raw input;
- versioned interpretation contract with AI/manual/correction paths;
- save-first Clarity UX;
- explicit Clarity promotion into Direction / Current Season / Incubator;
- atomic Recommendation / RecommendationEvidence / LifeEvent auditing;
- Vertical Slice A E2E and DB/container recreation verification.

Vertical Slice A loop completed:

`Capture -> Clarify -> trade-off -> confirmed Direction / Current Season`

### Completed Vertical Slice B increments

B0 #36 — Execution Context: merged.

- explicit user-confirmed Outcome / optional Project under active Season;
- no automatic creation of execution tree;
- ownership, rollback, reload, LifeEvents.

B1 #37 — Action Candidate V0: merged.

- manual `candidate -> ready` path;
- AI can only propose candidate, never silently ready it;
- AI provider failure/invalid output leaves state clean;
- context is revalidated on confirm;
- canonical Action includes `scheduledFor?`.

B2 #38 — Next Action Engine V0: merged.

- deterministic ruleset, no AI ranking;
- hard eligibility first, score second;
- uses observed/explicit factors only;
- one current `next_action` Recommendation;
- stored RecommendationEvidence + historical factor snapshots in LifeEvents;
- rerun refreshes operational recommendation instead of spamming duplicates;
- stale shown recommendation is withdrawn when no longer eligible.

B3 #39 — NOW V0: merged.

- server-derived `GET /v1/now`;
- states: `ready`, `no_direction`, `no_ready_action`, `blocked`;
- one dominant primary Action;
- `Why this?` is rendered from stored RecommendationEvidence;
- Accept / Edit / Not Now / Wrong assumption;
- Accept/Edit do NOT start execution and Action remains `ready`;
- Not Now/Wrong assumption resolve Recommendation without silently changing Action state;
- responsive NOW-first Web UI;
- B4 execution boundary intentionally preserved.

## 4. Current active work: B4 Focus V0

Issue: #40
Branch: `feat/b4-focus-v0`
Branch head at handoff: `7989c409f96bc121ec39f02b5ffda5ea4158d10d`
PR: none yet

Canonical B4 scope:

- FocusSession persistence with `active | completed | interrupted | abandoned`;
- start Focus from accepted NOW recommendation in <=2 taps;
- FocusSession links to owned Action but does NOT imply Action completion;
- snapshot `plannedMinutes` from Action estimate when applicable;
- distraction capture creates immutable `Capture(kind='distraction')` with raw text;
- distraction capture must not change Action / Recommendation / Focus priority;
- audit `focus.started`, focus outcome, and `distraction.captured`;
- reload active/recent Focus safely after app restart;
- no B5 Action-result semantics.

### B4 already changed on feature branch

Work already started on `feat/b4-focus-v0`:

- `FocusSessionId` added to domain IDs;
- `packages/domain/src/focus.ts` added with FocusSession/start/end/distraction contracts;
- domain index exports Focus contract;
- `focusSessions` schema was drafted with:
  - `userId`
  - `actionId`
  - optional `recommendationId`
  - `plannedMinutes`
  - status
  - `startedAt`
  - optional `endedAt`
  - partial unique index: max one `active` FocusSession per user.

### B4 known failure / exact restart point

A temporary workflow was added to let Drizzle generate the FocusSession migration:

`.github/workflows/b4-generate-focus-schema.yml`

The first workflow run failed.

Do NOT assume a valid FocusSession migration exists yet.

First task for the B4 implementation agent:

1. inspect the failed workflow run for the exact failure;
2. fix only migration-generation/tooling or schema issues revealed by the log;
3. let Drizzle generate migration + snapshot/journal;
4. inspect generated SQL, especially the partial unique active-focus index;
5. delete the temporary workflow before opening/finalizing the B4 PR;
6. continue DB service/API/UI/integration only after schema is valid.

Do not merge the temporary generator workflow into `main`.

### B4 required gates before merge

- only an owned Action tied to the user's accepted/edited NOW recommendation can start Focus;
- concurrent/double-active starts cannot create two active FocusSessions;
- invalid/cross-owner starts fail with no partial state;
- start + `focus.started` audit is atomic;
- distraction Capture raw text survives reload and does not alter current Focus or Action priority;
- ending/interruption/abandonment of Focus does not auto-complete the Action;
- active/recent Focus reloads after API/app restart;
- Web can enter Focus from NOW in <=2 taps;
- no B5 result semantics leak into B4;
- final branch has no temporary workflows and full CI is green.

## 5. Remaining Vertical Slice B

### B5 #41 — Result + Daily Close V0

Dependency: B4 #40 must merge first.

Implement only after B4 contract is stable.

Scope:

- Action results: `completed`, `partial`, `postponed`, `blocked`, `dropped`;
- Focus result and Action result remain distinct but may be committed together by explicit user choice;
- result metadata for later plan-vs-reality;
- atomic Action/Focus/Recommendation updates + LifeEvents;
- lightweight Daily Close for a local date;
- Daily Close summarizes only recorded facts + optional user input;
- no Get Unstuck or Weekly Adapt inference yet.

### B6 #42 — Vertical Slice B E2E

Dependency: #36–#41 complete.

End-to-end path to prove:

`confirmed Direction/Season -> Outcome/Project -> ready Action -> deterministic recommendation -> NOW -> accepted recommendation -> Focus -> distraction capture -> Action result -> Daily Close`

Required verification includes reload/app restart, DB/container recreation, provider unavailable manual execution, cross-session isolation, RecommendationEvidence and LifeEvents.

B6 closes Epic #3 only after every gate passes.

## 6. Open epics after Slice B

These remain open but should not be allowed to destabilize B4/B5/B6:

- #4 Personal Intelligence V0
- #5 Weekly Adapt V0
- #6 Trust, analytics, quality & founder dogfood
- #7 Get Unstuck V0
- #8 UX shell & design system

Important dependency logic:

- #5 and #7 need real execution/result history, so do not build their inference logic before B5/B6 produces reliable data.
- #4 can be designed in parallel, but durable personalization admission rules must remain user-inspectable and auditable.
- #6 can prepare quality/eval/dogfood plans in parallel without changing core B4 execution semantics.
- #8 can improve shared primitives, but avoid touching B4-owned files while B4 is in flight unless coordinated.

## 7. Recommended split-agent operating model

### Agent A — Release / Product Integrator

Owns:

- `main` integrity;
- issue dependency order;
- PR scope review;
- final CI/evidence audit;
- merge using exact expected head SHA;
- meeting/handoff docs.

Should NOT implement feature code in parallel unless another agent is blocked.

### Agent B — B4 Focus implementation

Own branch:

`feat/b4-focus-v0`

Owns:

- Focus domain/schema/migration;
- DB transaction service;
- Focus API;
- distraction capture mutation;
- Focus UI and NOW -> Focus entry;
- PostgreSQL/Web contract tests;
- PR for #40.

Avoid touching B5 result semantics.

### Agent C — B5 specification/test planning only until B4 merge

Before B4 merge:

- read #41 + domain docs;
- define Action-result transition matrix;
- define Daily Close read model and factual-only rules;
- prepare test cases / acceptance criteria;
- do NOT merge product code that assumes an unmerged Focus schema.

After B4 merge:

- create a fresh B5 branch from new `main`;
- implement #41.

### Agent D — B6 / QA architect

Can work in parallel now on documentation/test plan only:

- E2E fixture design;
- expected LifeEvent sequence;
- ownership/adversarial cases;
- provider-failure scenario;
- app restart / DB recreation script design.

Actual B6 E2E code should base on `main` only after B5 merges.

### Agent E — Product/UX research lane

Can work independently on:

- Focus UX friction audit;
- Daily Close interaction design;
- shared design-system proposals for #8;
- founder-dogfood checklist for #6.

Deliver docs or isolated components; avoid changing B4 core files without coordination.

## 8. File ownership / merge-conflict guidance

While B4 is active, treat these as B4-owned or conflict-prone:

- `packages/domain/src/ids.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/focus.ts`
- `packages/db/src/schema.ts`
- `packages/db/drizzle/**`
- `packages/db/src/index.ts`
- `apps/api/src/app.ts`
- NOW/Focus Web entry files if modified for Focus launch.

Parallel agents should prefer docs, new test-plan files, or isolated modules.

Do not have two agents independently edit Drizzle migrations/snapshots.

## 9. Branch / PR rules

- Every implementation increment gets its own branch and PR.
- Branch from current `main`, not an old merged feature branch, except the already-started B4 branch.
- Old `feat/a*`, `feat/b0*`, `feat/b1*`, `feat/b2*`, `feat/b3*` branches are historical; do not continue work on them.
- Do not merge with failing/pending CI.
- Keep PR draft until implementation and tests are stable.
- Before merge: changed-file audit, no review threads/change requests, no temporary workflow/tooling, exact-head merge.
- Schema migrations should be generated by Drizzle and reviewed, not hand-edited snapshots.
- Integration behavior that matters must be proven against PostgreSQL, not mocks alone.

## 10. Starting prompt for a fresh B4 chat/agent

Use this verbatim or adapt minimally:

> Work on LifeOS repo `huynhlongdai/LifeOsp`. Read `HANDOFF.md`, issue #40 and Meeting #016 first. Continue only B4 on existing branch `feat/b4-focus-v0`. Current stable main is `0d4db21a60c5957211316d54d6ed3013d4ba9b53`. B4 already has initial Focus domain/schema work, but the temporary Drizzle migration-generation workflow failed and no PR exists. Inspect that failed run first, fix migration generation, generate/audit FocusSession migration, delete the temporary workflow, then implement transactional Focus persistence/API/UI/distraction capture/integration tests. Preserve the hard boundary: Focus does not complete or otherwise resolve Action; Action-result semantics belong to B5. Open a draft PR early, use CI/PostgreSQL as gates, and do not merge until the final clean head is green.

## 11. Definition of done for handoff usage

A new agent/chat should be able to continue by reading, in order:

1. `HANDOFF.md`
2. the active issue (`#40` currently)
3. `meetings/016-vertical-slice-a-exit-and-b-authorization.md`
4. current feature branch diff / CI failure
5. canonical domain/docs only where needed.

It should not need the previous long ChatGPT conversation.