# LifeOS Company Meeting #004 — Product & Technical Architecture

**Date:** 2026-08-25  
**Status:** DECIDED FOR PROTOTYPE / SUBJECT TO ALPHA VALIDATION  
**Participants:** Product Director, Head of Product, UX Director, AI Product Lead, AI/Agent Architect, Data Architect, Engineering Lead, Privacy & Safety Lead, QA Lead

## 1. Objective

Define the smallest product and technical architecture that can deliver the full LifeOS loop:

```text
Capture → Understand → Direction → Next Action → Focus → Reflect → Adapt
```

without prematurely building a giant life-management platform.

---

## 2. Architecture principles

1. **NOW-first, not module-first.**
2. **One coherent monolith before microservices.**
3. **Relational database first; graph semantics do not require a graph database at MVP.**
4. **Append meaningful events; do not infer history only from current rows.**
5. **AI proposes structured decisions through explicit contracts.**
6. **Deterministic constraints outrank LLM preference.**
7. **User corrections are first-class data.**
8. **Mobile-first responsive UX; PWA/web first for speed; native mobile after retention evidence.**
9. **Progressive personalization, not giant onboarding forms.**
10. **Privacy/export/delete/auditability are core, not launch-afterthoughts.**

---

## 3. Product navigation

Primary navigation:

```text
NOW
DIRECTION
EXECUTE
REFLECT
ME
```

Secondary utilities:

```text
Inbox
Incubator
Search / Ask LifeOS
Settings
```

### NOW
Daily decision surface. Shows one recommended Next Action, supporting actions, capacity, focus status and things intentionally excluded from attention.

### DIRECTION
Current Season, Outcomes, trade-offs and life-direction decisions.

### EXECUTE
Projects, actions, focus sessions and blockers.

### REFLECT
Daily Close, Weekly Reset, history, insights and corrections.

### ME
User model: values/preferences, current constraints, confirmed patterns, operating preferences, permissions and memory controls.

---

## 4. Core domain model

### User
Account + locale + timezone + privacy preferences.

### LifeArea
Optional thematic area (work, health, family, money, learning, etc.). Not required to create an action.

### Direction
A meaningful medium-term direction.

### Season
Current dominant focus window.

Fields include:
- title;
- intent;
- start/end target;
- status;
- primary/support/maintain allocations;
- user-confirmed rationale.

### Outcome
Observable desired result linked to Season/Direction.

### Project
Bounded effort toward an Outcome.

### Action
Executable work item.

Important fields:
- title;
- status;
- estimate_minutes;
- success_condition;
- project/outcome link;
- blocker state;
- source;
- priority inputs;
- scheduling constraints.

### FocusSession
Actual execution session linked to an Action.

### Capture
Raw user input (text/voice/file reference) before/while classification.

### Idea
Potential future commitment.

### IncubatorItem
Idea/project explicitly removed from current focus competition.

### CheckIn
Small snapshot of available capacity/state.

### Reflection
User reflection associated with day/action/week.

### Insight
Observation/pattern/user-confirmed operating insight with confidence and provenance.

### Recommendation
AI/system recommendation + rationale + evidence + user response.

### LifeEvent
Append-only meaningful event.

### Relation
Typed links among objects when relational foreign keys are insufficient for flexible Life Graph navigation.

---

## 5. Life Graph approach

Do **not** introduce Neo4j or another graph database in MVP.

Use PostgreSQL with:
- normal foreign keys for strong domain relationships;
- a generic `relations` table for flexible semantic edges;
- JSONB only for bounded extensible metadata, not as a replacement for schema;
- indexes for source/target/type.

Example edges:

```text
Season      --focuses_on--> Outcome
Outcome     --advanced_by--> Project
Project     --contains--> Action
Insight     --derived_from--> LifeEvent
Idea        --related_to--> Project
Action      --blocked_by--> ExternalThing
```

We can later move specific workloads to a graph engine only if query evidence requires it.

---

## 6. Event model

Create an append-only `life_events` table for product-significant changes.

Suggested fields:
- id;
- user_id;
- event_type;
- entity_type;
- entity_id;
- timestamp;
- source (`user`, `system`, `ai`, `integration`);
- payload;
- correlation_id;
- causation_id;
- schema_version.

Events are used for:
- history/timeline;
- analytics;
- user-model learning;
- AI evidence;
- auditability;
- debugging recommendation behavior.

Current state remains in domain tables; event log is not required to fully event-source the entire application.

---

## 7. User State model

Maintain a computed snapshot to reduce repeated AI context construction.

Example:

```json
{
  "currentSeason": "...",
  "activeOutcomes": [],
  "activeProjects": [],
  "nextAction": "...",
  "availableFocusMinutes": 90,
  "plannedDemandMinutes": 180,
  "recentFriction": [],
  "confirmedOperatingPreferences": [],
  "recentProgress": [],
  "pendingFocusConflict": true
}
```

State is derived from source data/events and may be rebuilt.

---

## 8. Next Action Engine

This is a core service, not a prompt.

### Stage 1 — Candidate generation
Candidates come from:
- existing actionable items;
- project bottleneck decomposition;
- AI-generated next steps requiring validation.

### Stage 2 — Hard filtering
Exclude actions that are:
- blocked;
- impossible in available context/time;
- outside active focus unless urgent/mandatory;
- already completed/paused;
- forbidden by permission/policy.

### Stage 3 — Scoring inputs
Candidate score may consider:
- current Season alignment;
- Outcome impact;
- urgency/deadline;
- dependency unlocking;
- estimated effort vs available capacity;
- repeated avoidance/friction;
- user preference/context;
- required energy/context.

### Stage 4 — Recommendation
Return max 1 primary + up to 2 alternatives.

### Stage 5 — Explanation
Explain in human terms which evidence drove the choice.

### Rule
LLM-generated ranking cannot override hard constraints silently.

---

## 9. AI architecture

### AI capabilities
- capture extraction/classification;
- clarification questions;
- Direction synthesis;
- Outcome/project decomposition;
- candidate Next Action generation;
- recommendation explanation;
- friction diagnosis support;
- reflection summarization;
- insight candidate generation;
- Ask LifeOS retrieval and reasoning.

### AI contracts
Every AI operation uses a versioned structured schema.

Example:

```json
{
  "recommendation": {
    "actionId": "...",
    "reason": "...",
    "evidenceRefs": ["event:...", "outcome:..."],
    "confidence": 0.74,
    "alternatives": []
  }
}
```

No feature should depend on parsing arbitrary prose when structured output is required.

### Provider abstraction
Use a provider-neutral interface so model/provider can be changed without rewriting product logic.

### Context builder
AI context should be assembled from:
1. current state;
2. relevant confirmed memory;
3. recent events;
4. relevant entities;
5. explicit user input.

Do not send the user's entire history by default.

---

## 10. Memory architecture

Four memory classes:

### Working memory
Current conversation/session.

### Episodic memory
Relevant past events and completed/reflected experiences.

### Semantic user memory
Confirmed facts/preferences/relationships among life objects.

### Operating preferences
User-approved rules such as:
- keep generated actions under 45 minutes;
- no new active project unless one is paused;
- prefer morning focus.

Each persistent AI-derived memory requires:
- provenance;
- confidence;
- created/updated timestamps;
- user correction/deletion support.

---

## 11. Recommendation policy layer

Before any recommendation is shown:

```text
AI proposal
   ↓
Schema validation
   ↓
Permission/policy checks
   ↓
Hard constraint checks
   ↓
Evidence attachment
   ↓
UI recommendation
   ↓
User accepts / edits / rejects
   ↓
Event recorded
```

This keeps product behavior testable and auditable.

---

## 12. MVP application architecture

Recommended initial structure:

```text
LifeOsp/
├── apps/
│   ├── web/             # React responsive PWA
│   └── api/             # TypeScript API
├── packages/
│   ├── domain/          # entities, validation, business rules
│   ├── db/              # schema/migrations/repositories
│   ├── ai/              # providers, schemas, context, evals
│   ├── ui/              # shared design system
│   ├── analytics/       # typed product events
│   └── shared/          # common types/utils
├── docs/
├── meetings/
├── research/
└── tests/
```

### Technical preference
Reuse proven pieces of the previous LifeIO implementation where they reduce risk, especially domain-independent infrastructure, but migrate selectively rather than copying the old app wholesale.

---

## 13. Backend direction

For MVP:
- TypeScript end-to-end;
- PostgreSQL;
- one API application;
- background job runner only when needed;
- queue/outbox pattern only for real async workloads;
- object storage for uploads/voice assets;
- server-side AI gateway;
- rate limiting and usage accounting from first beta.

Avoid premature distributed architecture.

---

## 14. Client direction

### Web/PWA first
Reasons:
- faster iteration and deployment;
- easy research/prototype distribution;
- previous LifeIO frontend knowledge can be reused;
- responsive mobile experience can be validated before native cost.

### Native mobile trigger
Build native/React Native only after evidence that mobile notifications, widgets, voice capture or offline behavior materially drive retention.

### Offline support
MVP:
- fast local capture queue;
- cached NOW/current state;
- optimistic action completion;
- resilient sync.

Do not implement full CRDT collaboration in MVP.

---

## 15. Integrations sequence

### Alpha
No mandatory external integration.

### Private beta
1. Google Calendar / calendar import;
2. browser/share capture;
3. optional email/task imports only if research demands.

### Later
Health, finance, IoT, social, messaging and deeper automation are expansion layers, not MVP requirements.

---

## 16. Privacy and safety requirements

Minimum launch requirements:
- clear AI-data disclosure;
- explicit integration permissions;
- per-memory view/edit/delete;
- full account export/delete;
- secrets never exposed to client;
- encryption in transit and standard encrypted storage;
- audit log for agent/external actions;
- no silent external actions;
- data minimization;
- retention policy;
- model/provider data-use settings documented.

LifeOS is a personal-development tool, not a medical or mental-health diagnostic service.

---

## 17. AI evaluation plan

Create test suites before relying on AI recommendations.

### Capture extraction eval
Does AI preserve user intent and avoid inventing commitments?

### Next Action eval
Is the action executable, bounded and linked to an active direction?

### Explanation eval
Does explanation reflect actual evidence?

### Insight eval
Does AI distinguish observation vs inference?

### Safety/permission eval
Does AI avoid proposing unauthorized external action?

### Stability eval
Would small prompt/model changes cause unacceptable plan churn?

Human review sets are required during alpha/beta.

---

## 18. MVP release slices

### Slice A — Static product loop
Onboarding, Brain Dump, Direction, Season, manual Next Action, NOW.

### Slice B — Execution loop
Focus Mode, completion/postpone/drop, distraction capture, Daily Close.

### Slice C — Adaptation loop
Weekly Reset, behavioral events, capacity model, recommendation adjustments.

### Slice D — Personal intelligence
Confirmed memory, insight candidates, Ask LifeOS.

### Slice E — Beta hardening
Auth/security, export/delete, analytics, AI usage limits, onboarding experiments, billing hooks.

---

## 19. Architecture decisions

1. PostgreSQL first; no graph database for MVP.
2. Life Graph semantics implemented through domain relations + flexible typed relation table.
3. Append-only Life Events coexist with conventional current-state tables.
4. Next Action Engine is hybrid deterministic + AI, not a single LLM prompt.
5. Recommendations carry evidence and user feedback.
6. Web/PWA first, designed mobile-first.
7. One TypeScript monolith/monorepo before microservices.
8. Provider-neutral AI gateway + versioned structured schemas.
9. Persistent AI memory is inspectable, correctable and deletable.
10. Integrations are delayed until the core loop shows retention.

---

## 20. Next meeting

**Meeting #005 — Business Model, Go-to-Market & Launch System**

Main question:

> How do we turn validated user value into distribution, a paid product and a staged launch without bloating the MVP?
