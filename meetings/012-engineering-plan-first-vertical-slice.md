# LifeOS Company Meeting #012 — Engineering Plan & First Vertical Slice

**Date:** 2026-08-26  
**Status:** DECIDED / READY FOR IMPLEMENTATION  
**Participants:** Product Director, CTO, Principal Architect, Frontend Lead, Backend Lead, AI Systems Lead, Data/Intelligence Lead, QA Lead, Security Lead, DevOps Lead, UX Lead

## 1. Objective

Translate the validated product thesis and MVP scope into an implementation architecture that can be shipped incrementally without turning LifeOS into another large CRUD productivity suite.

The first engineering milestone is not “build all MVP screens.” It is one complete vertical loop:

```text
UNSTRUCTURED THOUGHT
      ↓
CAPTURE
      ↓
INTERPRET / CORRECT
      ↓
DIRECTION / SEASON
      ↓
NEXT ACTION
      ↓
NOW
      ↓
FOCUS
      ↓
RESULT
      ↓
DAILY CLOSE
      ↓
LIFE EVENTS / EVIDENCE
```

When this works with real data, later experiences such as Get Unstuck and Weekly Adapt can build on the same kernel.

---

## 2. Engineering principles

1. **Vertical value before horizontal completeness.** A thin end-to-end experience is more valuable than five unfinished modules.
2. **Deterministic core, AI at ambiguous boundaries.** Rules own permissions, state transitions, eligibility and hard constraints. AI helps interpret language, propose missing actions and summarize evidence.
3. **Current state + append-only events.** CRUD tables serve the product; `life_events` preserves history for adaptation and debugging.
4. **Evidence before personalization.** Recommendations and insights must be traceable to compact evidence.
5. **AI is optional infrastructure, not the database.** The app must still capture, edit, select and execute actions when an AI provider is unavailable.
6. **User-confirmed direction wins.** No model may silently change Direction, Season or meaningful commitments.
7. **One codebase for responsive web/PWA first.** Native mobile is deferred until the core loop proves retention.
8. **Self-host friendly.** No mandatory vendor lock-in for core data or AI provider.
9. **Do not port LifeIO feature-for-feature.** Reuse code selectively only when it serves the new domain model.

---

## 3. Chosen stack

### Monorepo
- pnpm workspaces
- TypeScript end-to-end
- Turborepo optional for task orchestration/cache; architecture must not depend on it

### Web
- Vite + React + TypeScript
- React Router
- TanStack Query for server state
- lightweight local UI/session state only where necessary
- Tailwind + shadcn-style primitives
- PWA shell after basic loop is stable

### API
- Fastify + TypeScript
- explicit route/service/domain separation
- OpenAPI generated from validated schemas where practical

### Database
- PostgreSQL
- Drizzle ORM + SQL migrations
- conventional relational current-state tables
- append-only `life_events`
- typed relation/evidence tables; no graph database in MVP

### Validation/contracts
- Zod schemas at external boundaries
- shared domain types generated or imported from one canonical package

### AI
- provider-neutral server-side gateway
- structured output contracts
- timeout/retry/budget policies
- no client-side provider secrets
- provider failure returns explicit recoverable state

### Testing
- unit tests for domain rules/ranking
- integration tests for API + DB transactions
- contract/eval fixtures for AI structured outputs
- end-to-end tests only for the critical vertical loop initially

### Delivery
- Docker development/production images
- Docker Compose for local Postgres + API + web
- GitHub Actions for typecheck/test/build
- production target remains compatible with Coolify or ordinary container hosting

---

## 4. Monorepo layout

```text
LifeOsp/
├─ apps/
│  ├─ web/
│  │  ├─ src/app/
│  │  ├─ src/features/
│  │  │  ├─ onboarding/
│  │  │  ├─ capture/
│  │  │  ├─ direction/
│  │  │  ├─ now/
│  │  │  ├─ focus/
│  │  │  ├─ reflect/
│  │  │  └─ me/
│  │  └─ src/components/
│  └─ api/
│     ├─ src/routes/
│     ├─ src/services/
│     ├─ src/plugins/
│     └─ src/jobs/
├─ packages/
│  ├─ domain/          # entities, state machines, policies
│  ├─ db/              # schema, migrations, repositories
│  ├─ ai/              # providers, contracts, prompts, validators
│  ├─ intelligence/    # ranking, evidence, derived features
│  ├─ analytics/       # product event contracts
│  ├─ ui/              # shared primitives/design tokens
│  └─ shared/          # generic utilities only
├─ docs/
├─ meetings/
├─ tests/
│  ├─ fixtures/
│  └─ e2e/
├─ deploy/
└─ .github/workflows/
```

Feature code should stay close to the feature. Do not create generic abstractions until at least two real consumers need them.

---

## 5. First domain model

Only entities required for the vertical slice are P0-A.

### Identity/context
- `users`
- `user_profiles`
- `need_states`

### Direction
- `directions`
- `seasons`
- `outcomes`
- `projects`

### Execution
- `actions`
- `focus_sessions`
- `daily_closes`

### Capture/clarity
- `captures`
- `capture_items` or structured interpretation payload with normalized promoted objects
- `incubator_items`

### Intelligence/audit
- `recommendations`
- `recommendation_evidence`
- `life_events`
- `insights`
- `operating_preferences`
- `user_memories`
- `relations`

A table is not created merely because a future feature might need it.

---

## 6. Key state machines

### Action
```text
candidate
→ ready
→ active
→ completed
  | partial
  | postponed
  | blocked
  | dropped
```

### Recommendation
```text
draft
→ shown
→ accepted | edited | rejected | not_now | wrong_assumption
```

### Season
```text
draft
→ active
→ paused
→ completed | abandoned
```

### Insight
```text
candidate
→ shown
→ confirmed | corrected | rejected
→ optional operating_preference
```

Invalid state transitions are blocked in the domain layer, not left to UI convention.

---

## 7. LifeEvent envelope

Every meaningful state transition emits a durable event.

```ts
type LifeEvent = {
  id: string
  userId: string
  type: LifeEventType
  occurredAt: string
  source: 'user' | 'system' | 'ai' | 'import'
  entityType?: string
  entityId?: string
  payload: Record<string, unknown>
  correlationId?: string
  causationId?: string
}
```

Initial event types include:
- `capture.created`
- `capture.interpreted`
- `capture.corrected`
- `direction.confirmed`
- `season.started`
- `action.created`
- `recommendation.shown`
- `recommendation.accepted`
- `recommendation.edited`
- `recommendation.rejected`
- `recommendation.wrong_assumption`
- `focus.started`
- `focus.completed`
- `action.completed`
- `action.partial`
- `action.postponed`
- `action.dropped`
- `distraction.captured`
- `daily_close.completed`

Events are append-only. If source data is corrected, emit a correction event; do not rewrite history silently.

---

## 8. Recommendation object

Material recommendations need a stable product contract independent of model provider.

```ts
type Recommendation = {
  id: string
  kind: 'next_action' | 'direction' | 'friction_intervention' | 'weekly_adjustment'
  title: string
  rationale: string
  confidenceClass: 'direct' | 'strong_pattern' | 'possible_pattern' | 'suggestion'
  proposedEntity?: Record<string, unknown>
  evidenceIds: string[]
  status: 'draft' | 'shown' | 'accepted' | 'edited' | 'rejected' | 'not_now' | 'wrong_assumption'
}
```

The UI-visible `Why this?` is generated from stored evidence, not a hidden chain-of-thought.

---

## 9. AI contracts for first slice

### A. Brain Dump interpretation
Input:
- raw capture text
- minimal user context

Output:
```json
{
  "concerns": [],
  "ideas": [],
  "commitments": [],
  "possibleProjects": [],
  "possibleDirections": [],
  "questions": [],
  "uncertainties": []
}
```

Rules:
- preserve original text;
- include uncertainty rather than inventing classification;
- nothing becomes durable Direction/Project until user confirms.

### B. Missing Next Action proposal
Input:
- confirmed Season/Outcome/Project
- bottleneck/state
- capacity constraints
- confirmed preferences

Output:
```json
{
  "title": "...",
  "doneCondition": "...",
  "estimatedMinutes": 30,
  "reason": "...",
  "assumptions": []
}
```

The deterministic engine still validates eligibility and constraints.

### C. Daily Close summary
AI may summarize user-entered/result data but may not invent effort, mood or causes not recorded.

---

## 10. Next Action Engine V0

```text
confirmed Direction / Season
        ↓
active outcomes/projects
        ↓
ready candidate actions
        ↓
remove blocked/invalid/out-of-scope
        ↓
hard constraints
        ↓
score/rank
  direction relevance
  bottleneck value
  urgency
  capacity fit
  user priority
  operating preferences
  recency/context
        ↓
if no good candidate:
AI may PROPOSE one missing concrete action
        ↓
validate proposal
        ↓
store recommendation + evidence
        ↓
show ONE primary action in NOW
```

No ML ranking model in V0.

---

## 11. API boundary for first slice

Representative endpoints:

```text
POST /v1/captures
POST /v1/captures/:id/interpret
PATCH /v1/captures/:id/interpretation

GET  /v1/direction/current
POST /v1/directions
POST /v1/seasons

GET  /v1/now
POST /v1/recommendations/:id/accept
POST /v1/recommendations/:id/edit
POST /v1/recommendations/:id/reject
POST /v1/recommendations/:id/wrong-assumption

POST /v1/focus-sessions
POST /v1/focus-sessions/:id/complete
POST /v1/actions/:id/result

POST /v1/daily-close
GET  /v1/events
```

`GET /v1/now` is an orchestration endpoint returning the minimum read model required to render NOW; the client should not reconstruct recommendation logic from many raw tables.

---

## 12. Transaction rule

A state mutation and its corresponding LifeEvent must be committed atomically when possible.

Example:

```text
accept Next Action recommendation
  ├─ update recommendation.status
  ├─ create/update action
  ├─ set current execution context
  └─ append recommendation.accepted event

COMMIT
```

Never allow event history to claim an action occurred when state mutation failed.

---

## 13. UI implementation sequence

### Slice 0 — shell
- responsive app shell
- NOW placeholder
- DIRECTION/EXECUTE/REFLECT/ME routes
- error boundary
- toast/feedback primitives

### Slice 1 — Clarity
- Welcome/Need State
- Brain Dump
- Interpretation Review
- Focus Conflict / Not Now
- Direction/Season confirmation

### Slice 2 — Execute
- NOW read model
- Recommendation card
- Why this?
- Action editor
- Focus Mode
- distraction capture
- result sheet
- Daily Close

### Slice 3 — Adapt
- plan-vs-reality derived features
- candidate insight confirmation
- Weekly Reset
- Get Unstuck interventions

---

## 14. UX shell contract

Mobile-first bottom navigation:

```text
NOW | DIRECTION | EXECUTE | REFLECT | ME
```

Desktop becomes left rail using the same information architecture.

NOW should never become a dashboard grid. The hierarchy is:

1. current state/capacity if relevant;
2. one primary recommendation;
3. immediate secondary context;
4. Not Now protected items;
5. optional insights.

One visually dominant primary CTA maximum.

---

## 15. Authentication decision

For the first developer slice, an explicit dev single-user adapter may exist behind an auth interface to avoid blocking domain work.

Before external alpha:
- replace dev adapter with real multi-user auth/session implementation;
- every repository query must be user-scoped server-side;
- auth cannot be postponed beyond design-partner alpha.

We will not invent a custom cryptographic auth scheme simply to avoid using a mature library/service.

---

## 16. Security/privacy boundaries

P0 requirements:
- provider API keys server-side only;
- strict user data scoping;
- structured request validation;
- no raw prompt logging by default in production;
- captured content and memory are separate concepts;
- inspect/edit/delete durable memory;
- export/delete foundations before private beta;
- rate/size limits on captures and AI endpoints;
- recommendation evidence stores compact facts, not private hidden reasoning.

---

## 17. Observability

Minimum technical telemetry:
- API latency/error rate
- DB migration version
- AI provider/model/latency/error/category
- structured output validation failures
- recommendation fallback rate
- queue/job failures if background jobs are later added

Minimum product telemetry:
- time to first useful Next Action
- recommendation shown → start/edit/reject
- focus start/completion
- wrong assumption rate
- clarity pre/post where tested
- Daily Close completion
- return after missed day

Analytics must use stable product event names and must not be conflated with the richer private LifeEvent payload.

---

## 18. First E2E scenario

Seed/user input:

> “Tôi muốn kiếm thêm thu nhập, đang nghĩ affiliate, AOP chưa xong, LifeOS cũng muốn làm, tôi cứ đổi việc liên tục và hôm nay không biết nên ưu tiên gì.”

Expected path:
1. raw capture preserved;
2. interpretation identifies several candidate concerns/projects with uncertainty;
3. user corrects any classification;
4. user confirms a Direction/Season;
5. non-current items can move to Not Now;
6. engine produces one concrete action with done condition;
7. NOW displays it with `Why this?`;
8. user starts focus;
9. user records result;
10. Daily Close captures outcome/friction;
11. all important transitions appear in event history.

This scenario becomes a regression fixture.

---

## 19. Definition of Done for Vertical Slice V0

The slice is done only when:
- it runs from an empty database to Daily Close;
- refresh/restart does not lose state;
- AI wrong interpretation is correctable;
- AI unavailable state has manual fallback;
- one material recommendation has evidence/Why this?;
- every state mutation is user-scoped;
- critical state transitions emit LifeEvents;
- domain and API integration tests pass;
- E2E happy path passes;
- founder can use it for a real decision/action rather than demo data.

---

## 20. Explicit non-goals for first engineering milestone

Do not implement:
- full habit tracker;
- calendar sync;
- native mobile;
- finance/health modules;
- social/community;
- generic note editor;
- autonomous agents;
- vector-memory platform;
- graph database;
- complex notifications;
- full weekly analytics dashboard;
- template marketplace;
- gamification/streak economy;
- dozens of AI tools/personas.

---

## 21. Epic order

1. **#1 Foundation**
2. **#8 UX shell/design system** (can overlap late #1)
3. **#2 Capture → Clarify → Direction**
4. **#3 Next Action → NOW → Focus → Result**
5. **#4 Personal Intelligence V0**
6. **#7 Get Unstuck V0**
7. **#5 Weekly Adapt V0**
8. **#6 Trust/analytics/quality + founder dogfood**

Some plumbing from #4 and #6 is required earlier, but their full acceptance criteria come later.

---

## 22. Decisions

1. New clean implementation architecture; LifeIO is reference/reuse source, not product architecture constraint.
2. Vite/React PWA + Fastify + PostgreSQL/Drizzle retained as the primary direction.
3. Current state + append-only LifeEvents is mandatory.
4. Structured AI contracts and deterministic validation are mandatory.
5. `GET /v1/now` becomes a core orchestration/read-model boundary.
6. One complete vertical slice must ship before broad module development.
7. Dev single-user auth adapter is allowed only as a temporary implementation seam; real user-scoped auth is mandatory before external alpha.
8. No vector DB, graph DB, ML ranking or autonomous agent requirement for MVP.
9. GitHub Issues are now the execution backlog; meetings/docs hold decisions and architecture.

## 23. Next meeting

**Meeting #013 — Implementation Readiness & Task Decomposition**

Question:

> Can each epic be decomposed into merge-sized tasks with explicit dependencies, contracts, fixtures and acceptance tests so coding agents can execute without inventing product behavior?
