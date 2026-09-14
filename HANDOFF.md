# LifeOS Project Handoff

Updated: 2026-09-14
Repository: `huynhlongdai/LifeOsp`

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

`a714fda861c25f7d2f77e8db2f61f38c4004b6b7`

This is the docs commit after the B4 Focus V0 merge.

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

B4 #40 — Focus V0: merged (PR #48).

- FocusSession persistence with one active session per user;
- start from an accepted/edited NOW recommendation;
- distraction Capture that changes nothing else;
- Focus never completes the Action.

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

## 4. Current active work: B5 Result + Daily Close V0

Issue: #41
Branch: `feat/b5-result-daily-close`
PR: draft

B4 Focus V0 is **merged** (PR #48, 2026-08-27). The temporary Drizzle
migration-generation workflow is gone and `packages/db/drizzle/0008_b4_focus_sessions.sql`
is on `main`. Issue #40 is still open only because it was never closed manually.

Canonical B5 scope in flight:

- `action_results` table: one immutable result per Action
  (`completed | partial | postponed | blocked | dropped`), previous status,
  optional note/reason, optional user revisit date, Focus/planned minutes;
- `daily_closes` table: one row per user and local date with a factual summary;
- `POST /v1/actions/:actionId/result`, `GET /v1/daily-close`, `POST /v1/daily-close`;
- Action result and Focus result stay distinct but may be committed in one
  transaction when the user asks for it;
- postponing/dropping clears `scheduled_for` unless the user picked a revisit
  date, so no synthetic overdue debt is created;
- recording a result resolves the open `next_action` recommendation
  (`recommendation.resolved`) and audits `action.result.recorded` /
  `daily_close.recorded`;
- no AI call anywhere in the path: a provider outage cannot block a result or a
  Daily Close;
- no Get Unstuck / Weekly Adapt inference.

Web surface added with B5: result controls under NOW and a Daily Close view on
the `REFLECT` route.

### UI adoption of the approved prototype (`feat/ui-design-system-v1`)

Branched from `feat/b5-result-daily-close` (PR #50, draft). The owner's Figma
prototype is the design source of truth for the web app:

- `apps/web/src/design/index.css` is the prototype stylesheet vendored verbatim —
  re-export it from Figma instead of hand-editing;
- screens are ported from the prototype markup and then wired to real API data;
  no mock data ships in `apps/web`;
- NOW, DIRECTION, EXECUTE, REFLECT, ME and the full-screen Focus session are done.

Read-only EXECUTE board API added with this branch: `GET /v1/execute` returns the
active Season grouped Outcome -> Project -> Action (Actions without a Project stay
visible at the Outcome level). `GET /v1/me` returns recorded counters only
(focus sessions, focus minutes and completed Actions over 7 days, open Actions,
captures, daily-close streak) — ME never estimates or scores the user.

## 5. Remaining Vertical Slice B

### B5 #41 — Result + Daily Close V0

Status: implementation in flight on `feat/b5-result-daily-close` (see section 4).

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

### Agent B — B5 Result + Daily Close implementation

Own branch:

`feat/b5-result-daily-close`

Owns:

- result/Daily Close domain contracts, schema, migration `0009`;
- transactional result service and Daily Close read model;
- result + Daily Close API;
- NOW result controls and the REFLECT Daily Close surface;
- PostgreSQL integration tests;
- PR for #41.

Must not add Weekly Adapt or Get Unstuck inference.

### Agent C — B6 planning until B5 merge

Before B5 merge: E2E fixtures, expected LifeEvent sequence and adversarial
ownership cases only. After B5 merge: branch from new `main` and implement #42.

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

While B5 is active, treat these as B5-owned or conflict-prone:

- `packages/domain/src/ids.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/focus.ts`
- `packages/domain/src/result.ts`
- `packages/db/src/result.ts`
- `apps/api/src/result.ts`
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

## 10. Starting prompt for a fresh B5/B6 chat/agent

> Work on LifeOS repo `huynhlongdai/LifeOsp`. Read `HANDOFF.md`, the active issue and
> Meeting #016 first. Foundation, Vertical Slice A and B0–B4 are merged; B5 Result +
> Daily Close is implemented on `feat/b5-result-daily-close` (#41) and B6 (#42) is the
> Vertical Slice B E2E. Preserve the hard boundaries: results are user-stated and never
> inferred, Focus result and Action result stay distinct, and no Weekly Adapt or Get
> Unstuck inference belongs in Slice B. Use CI with PostgreSQL as the gate and do not
> merge until the final clean head is green.

## 11. Definition of done for handoff usage

A new agent/chat should be able to continue by reading, in order:

1. `HANDOFF.md`
2. the active issue (`#41` currently)
3. `meetings/016-vertical-slice-a-exit-and-b-authorization.md`
4. current feature branch diff / CI failure
5. canonical domain/docs only where needed.

It should not need the previous long ChatGPT conversation.