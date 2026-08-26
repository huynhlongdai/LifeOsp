# Meeting #016 — Vertical Slice A Exit & Vertical Slice B Authorization

Date: 2026-08-26
Status: DECIDED

## Participants / perspectives
- Product / CEO — finish the first complete action loop before expanding breadth.
- Domain — preserve explicit commitment boundaries and canonical Outcome → Project → Action semantics.
- Staff Engineering — small independently mergeable increments, each with DB/API integration evidence.
- Intelligence — deterministic eligibility/ranking before AI; evidence is user-explainable.
- AI — optional missing-action proposal only; provider failure must not block manual execution.
- UX — NOW has one dominant action, not a backlog; user controls recommendation changes.
- QA / Trust — ownership, rollback, restart persistence and LifeEvents remain merge gates.

## Vertical Slice A exit

Vertical Slice A is accepted as complete after PR #35 / CI #113 proved:
- anonymous session → raw Brain Dump → AI interpretation → user correction;
- explicit Active / Maintain / Not Now trade-off;
- Direction + Current Season user confirmation;
- provider outage → manual interpretation → successful completion;
- cross-session read and mutation isolation;
- durable LifeEvent audit across the path;
- app reload/restart persistence;
- real PostgreSQL named-volume container recreation with the original session still able to reload Capture, interpretation and Direction/Season.

Epic #2 and A5 #26 are complete.

## Vertical Slice B authorization

Epic #3 is authorized. The next product path is:

```text
CONFIRMED DIRECTION / CURRENT SEASON
        ↓
USER-CONFIRMED EXECUTION CONTEXT
Outcome → optional/explicit Project
        ↓
ACTION CANDIDATE
manual or AI proposal, always reviewable
        ↓
DETERMINISTIC NEXT ACTION ENGINE
hard constraints → score → recommendation + evidence
        ↓
NOW
one primary recommendation + Why this?
        ↓
FOCUS
        ↓
RESULT
complete | partial | postpone | blocked | drop
        ↓
DAILY CLOSE
        ↓
LIFE EVENTS / EVIDENCE
```

## Hard rules

1. Confirming a Direction/Season does **not** automatically create Outcome, Project or Action records.
2. Outcome/Project commitments require explicit user confirmation.
3. AI may propose an Action candidate but cannot silently activate it.
4. A manual path must exist when AI is unavailable.
5. Hard eligibility constraints run before any AI ranking/explanation.
6. NOW exposes one primary recommendation; it must not become a prettier backlog.
7. `Why this?` comes from stored RecommendationEvidence, never hidden chain-of-thought.
8. Recommendation controls remain: Start/Accept, Edit, Not Now, Wrong assumption, Explain.
9. FocusSession does not imply Action completion.
10. Complete/partial/postpone/blocked/drop are explicit user-result transitions.
11. Every durable execution transition writes a LifeEvent atomically with current state where practical.
12. Private execution state always resolves ownership server-side; client never supplies arbitrary `userId`.
13. No Get Unstuck, Weekly Adapt, opaque personalization or habit system is pulled into Slice B.

## Canonical execution states

### Outcome
`active → achieved | paused | dropped`

### Project
`candidate → active → paused | completed | dropped`

### Action
`candidate → ready → active → completed | partial | postponed | blocked | dropped`

### FocusSession
`active → completed | interrupted | abandoned`

### Recommendation
`draft → shown → accepted | edited | rejected | not_now | wrong_assumption`

Invalid transitions are blocked server-side, not left to UI convention.

## Delivery increments

### B0 — Execution Context V0
Persist user-confirmed Outcome + optional/explicit Project under the active Current Season. Server-owned relationships, atomic LifeEvents, no Action/recommendation yet.

Exit:
- active Season can receive one explicit execution context;
- no context can attach across users or to an inactive Season;
- creation + events are atomic;
- reload returns the persisted execution context.

### B1 — Action Candidate V0
Create/review one Action candidate/ready Action linked to confirmed execution context. Support manual creation first and a provider-neutral optional AI missing-action proposal with strict validation/fallback.

Exit:
- user can reach a concrete Action without AI;
- AI proposal never becomes ready without confirmation;
- action quality fields include observable done condition and bounded duration where supplied.

### B2 — Next Action Engine V0
Deterministic eligibility + ranking of ready Actions, then persist one `next_action` Recommendation with compact RecommendationEvidence.

Exit:
- hard-invalid/blocked/dropped/completed Actions cannot win;
- recommendation is traceable to active Season/execution context and score factors;
- deterministic fixtures explain ranking changes.

### B3 — NOW V0
Implement product-specific `GET /v1/now` and NOW UI states: Ready / No Direction / No Ready Action / Blocked-or-unblockable where supported. Show one dominant recommendation, done condition, estimate, Why this?, and controls.

Exit:
- one primary recommendation dominates;
- persisted reload is server-derived;
- no fake demo backlog or client-side joining.

### B4 — Focus V0
Start a FocusSession from NOW in <=2 taps; pause/end semantics where required; distraction capture creates a real Capture without changing current focus.

Exit:
- focus start is atomic/auditable;
- distraction capture preserves raw text and does not silently reprioritize;
- FocusSession completion never auto-completes the Action.

### B5 — Result + Daily Close V0
Record explicit Action result (completed / partial / postponed / blocked / dropped) and a lightweight DailyClose based only on recorded facts/user input.

Exit:
- result updates state and LifeEvents atomically;
- postpone/drop do not create guilt/backlog debt UI semantics;
- Daily Close does not invent causes, mood, effort or progress.

### B6 — Vertical Slice B E2E / audit
Confirmed Direction/Season → execution context → Action → deterministic recommendation → NOW → Focus → result → Daily Close, including reload/restart, provider failure/manual path, ownership isolation and audit completeness.

Exit:
- Epic #3 criteria are proven end-to-end;
- no AI provider is required for core execution;
- all material state changes have auditable evidence/events.

## Authorization

Engineering may begin B0 immediately. B1 depends on B0 execution-context ownership semantics. B2 depends on stable Action state/quality contracts. B3 consumes B2 read models rather than raw tables. B4/B5 must preserve the FocusSession ≠ Action completion boundary. B6 closes Epic #3 only after all gates pass.
