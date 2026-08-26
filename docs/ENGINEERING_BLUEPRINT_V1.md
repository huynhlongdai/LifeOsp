# LifeOS Engineering Blueprint V1

**Status:** ACTIVE  
**Source:** Meetings #009–#012  
**Updated:** 2026-08-26

## Mission of the codebase

The codebase exists to implement this loop reliably:

```text
CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT
```

It is not a generic productivity platform and should not accumulate modules that do not improve this loop.

## Runtime architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         WEB / PWA                           │
│ React + Vite + TypeScript                                  │
│ NOW · DIRECTION · EXECUTE · REFLECT · ME                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS / JSON
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     FASTIFY API                             │
│ auth/session · capture · direction · now · focus · review  │
│ orchestration · validation · authorization                 │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌────────────────────────────┐  ┌─────────────────────────────┐
│ DOMAIN / INTELLIGENCE      │  │ AI GATEWAY                  │
│ policies · state machines  │  │ provider-neutral            │
│ ranking · evidence         │  │ structured contracts        │
│ derived features           │  │ validation/fallback         │
└──────────────┬─────────────┘  └──────────────┬──────────────┘
               │                               │
               └──────────────┬────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     POSTGRESQL                              │
│ current-state tables                                       │
│ + append-only life_events                                  │
│ + recommendation evidence                                  │
│ + confirmed memory/preferences                             │
└─────────────────────────────────────────────────────────────┘
```

## Repository

```text
apps/
  web/
  api/
packages/
  domain/
  db/
  ai/
  intelligence/
  analytics/
  ui/
  shared/
tests/
  fixtures/
  e2e/
deploy/
docs/
meetings/
```

## Dependency direction

```text
web ──────────────→ API contracts
api ──────────────→ domain + db + ai + intelligence
intelligence ─────→ domain
ai ───────────────→ domain contracts
analytics ────────→ stable event contracts
ui ───────────────→ no business logic
shared ───────────→ no LifeOS-specific orchestration
```

Domain packages must not depend on React/Fastify/provider SDKs.

## Core read/write model

### Writes
Commands mutate state through server-side domain policies and append LifeEvents in the same transaction when practical.

### Reads
The web UI should consume product-specific read models, especially `GET /v1/now`, rather than joining raw tables in the browser.

## P0 entity set

- User / UserProfile
- NeedState
- Capture
- Direction
- Season
- Outcome
- Project
- Action
- IncubatorItem
- FocusSession
- DailyClose
- Recommendation
- RecommendationEvidence
- Insight
- UserMemory
- OperatingPreference
- LifeEvent
- Relation

## First vertical slice

```text
Brain Dump
  ↓
structured interpretation
  ↓
user correction
  ↓
Direction / Current Season
  ↓
Action candidates
  ↓
Next Action Engine
  ↓
NOW recommendation
  ↓
Focus
  ↓
Result
  ↓
Daily Close
  ↓
LifeEvent evidence
```

## Next Action Engine V0

Hard constraints happen before AI.

```text
candidate actions
→ readiness/blocked filters
→ direction/season scope
→ hard time/context constraints
→ deterministic score
→ optional AI missing-action proposal
→ proposal validation
→ recommendation + evidence
→ one primary NOW action
```

Initial score dimensions:
- direction relevance
- bottleneck/unblock value
- urgency
- effort/capacity fit
- user priority
- maintenance necessity
- operating-preference compatibility
- freshness/context

The score is an implementation heuristic, not a claim of scientific precision.

## AI placement

Use AI for:
- language interpretation;
- candidate structuring;
- missing concrete action proposals;
- summarization;
- tentative pattern wording.

Do not use AI as sole authority for:
- authorization;
- state-transition validity;
- deletion;
- durable memory admission;
- changing current Direction/Season;
- dropping meaningful commitments;
- ranking hard-invalid candidates.

## AI structured-output policy

Every AI operation has:
1. versioned input schema;
2. versioned output schema;
3. prompt/contract identifier;
4. timeout and failure policy;
5. validation;
6. regression fixtures;
7. safe user-visible fallback.

Provider/model is runtime metadata, not part of the product domain contract.

## Personal Intelligence storage model

```text
Current State
+ Life Events
+ Recommendation Evidence
+ Explicit User Input
        ↓
Derived Features
        ↓
Candidate Patterns
        ↓
User Confirm / Correct / Reject
        ↓
Operating Preferences
        ↓
Future Recommendation Inputs
```

No hidden model chain-of-thought is persisted as evidence.

## Transaction invariants

Examples:
- accepting a recommendation and creating its action context must be atomic;
- completing a focus session and recording the corresponding result/event must not diverge;
- user ownership is checked server-side for every write/read of private entities;
- append-only LifeEvents are not silently edited.

## NOW read model

Candidate response shape:

```ts
type NowView = {
  generatedAt: string
  needState?: {...}
  currentSeason?: {...}
  capacity?: {...}
  primaryRecommendation?: {
    id: string
    title: string
    doneCondition?: string
    estimatedMinutes?: number
    rationale: string
    confidenceClass: string
    evidenceSummary: Array<{label: string; value: string}>
  }
  next?: Array<...>
  protectedNotNow?: Array<...>
  attention?: Array<...>
}
```

NOW should expose product intent, not database structure.

## Error/fallback design

### AI unavailable
- preserve capture;
- allow manual classification/action creation;
- show explicit retry;
- never discard user input.

### Invalid structured output
- retry within budget if appropriate;
- otherwise return recoverable validation state;
- record technical failure telemetry without turning invalid output into domain state.

### No meaningful recommendation
Show a valid “nothing urgent / choose manually / reflect” state. Never invent busywork merely to fill NOW.

## Test pyramid

### Domain unit tests
- state transition validity
- ranking constraints
- recommendation eligibility
- memory admission
- evidence/confidence mapping

### DB/API integration
- transaction + event atomicity
- user scoping
- migrations
- orchestration endpoints

### AI contract fixtures
- valid interpretation
- ambiguous capture
- hallucinated unsupported fact
- malformed output
- provider timeout
- wrong assumption correction

### E2E
Only high-value paths first:
1. empty user → Brain Dump → Direction → NOW → Focus → Daily Close
2. AI fails during interpretation → manual fallback
3. wrong recommendation assumption → correction → refreshed NOW

## P0 operational requirements

- environment validation
- database migration command
- local Docker Compose
- health/readiness endpoint
- structured server logs
- AI latency/error metadata
- CI typecheck/test/build
- secrets server-side

## Delivery sequence

1. Foundation (#1)
2. UX shell (#8)
3. Clarity vertical (#2)
4. Execution vertical (#3)
5. Intelligence V0 (#4)
6. Get Unstuck (#7)
7. Weekly Adapt (#5)
8. Trust/analytics/dogfood (#6)

## Merge discipline

Prefer changes that can be reviewed independently:
- schema + migration;
- domain contract + tests;
- endpoint + integration test;
- UI state + component test;
- AI contract + fixtures;
- end-to-end wiring.

Coding agents must not silently invent new domain statuses, navigation items, AI autonomy or MVP modules. Product behavior changes require a documented decision.

## Exit gate for Engineering Milestone 1

Engineering may move from first vertical slice to broader MVP only when:
- real persisted data survives reload/restart;
- one complete loop works end-to-end;
- AI can be corrected and can fail safely;
- NOW exposes one evidence-backed useful action;
- focus result changes subsequent state;
- LifeEvents are complete enough for later plan-vs-reality analysis;
- founder uses the loop on a real day successfully.
