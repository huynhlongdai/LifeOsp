# LifeOS Company Meeting #013 — Implementation Readiness & Agent Work Breakdown

**Date:** 2026-08-26  
**Status:** DECIDED / IMPLEMENTATION START  
**Participants:** Product Director, CTO/Architecture Agent, Staff Backend Agent, Staff Frontend Agent, Data/DB Agent, AI Systems Agent, QA/Eval Agent, DevOps Agent, UX Systems Agent, Skeptical Reviewer

## 1. Objective

Convert the approved product/engineering design into a mergeable implementation sequence. The company must be able to assign coding agents without letting each agent invent product semantics, statuses, navigation, AI autonomy or storage patterns.

## 2. Readiness decision

LifeOS is ready to begin Engineering Milestone 1 because the following canonical decisions exist:

- Product Thesis V2;
- MVP Scope V1;
- Engineering Blueprint V1;
- Domain Model V1;
- Personal Intelligence Engine V1;
- UX/AI recommendation contract decisions;
- P0 Epic backlog.

We are **not** declaring product-market fit or feature completeness. We are declaring the product sufficiently specified to build the first testable vertical loop.

## 3. Engineering Milestone 1

The first milestone is not "build the app shell". It is:

```text
CAPTURE
→ CLARIFY
→ CHOOSE
→ NEXT ACTION
→ NOW
→ FOCUS
→ RESULT
→ DAILY CLOSE
→ LIFE EVENT
```

A foundation task is justified only if it directly enables this loop or production-shaped testing.

## 4. Agent operating model

### Product Director
Owns product semantics, scope, prioritization and acceptance gates.

### CTO / Architecture Agent
Owns dependency direction, runtime boundaries, technical ADRs and merge architecture.

### Backend Agent
Owns Fastify API, domain orchestration, authorization and server-side read models.

### Data Agent
Owns PostgreSQL, Drizzle schema/migrations, event atomicity and data integrity.

### Frontend Agent
Owns PWA shell, state/query integration, responsive routing and accessible interaction states.

### AI Systems Agent
Owns provider-neutral gateway, structured contracts, validation, retry/fallback and eval fixtures.

### Intelligence Agent
Owns deterministic ranking, evidence, derived features, pattern admission and operating preferences.

### QA/Eval Agent
Owns contract tests, integration tests, AI regression fixtures and high-value E2E scenarios.

### DevOps Agent
Owns local environment, Docker, CI, build/release foundations and observability hooks.

### UX Systems Agent
Owns shared design primitives and ensures one primary action remains visually dominant.

## 5. Non-negotiable implementation rules

1. No product behavior may bypass the domain layer simply because it is easier in UI code.
2. Every private object is server-scoped to the authenticated user.
3. Material state transitions produce LifeEvents in the same transaction where practical.
4. AI structured output is never written directly to durable domain state without validation and the required confirmation rule.
5. The frontend consumes product read models such as `/v1/now`; it does not reconstruct product meaning from raw DB tables.
6. No Graph DB, vector DB, microservices, ML ranking or autonomous agent runtime in Milestone 1.
7. No hidden personality scoring or durable psychological labels.
8. Provider/model choices remain infrastructure metadata, not domain semantics.
9. Manual/fallback execution paths must survive AI outage.
10. Coding agents cannot create new top-level modules or permanent statuses without a documented decision.

## 6. Epic #1 decomposition

Epic #1 Foundation is split into PR-sized work:

### F1 — Workspace bootstrap
- pnpm workspace;
- root package scripts;
- shared TypeScript configuration;
- lint/format/test conventions;
- folder skeleton.

### F2 — API bootstrap
- Fastify app factory;
- environment validation;
- structured logging;
- `/health` and `/ready`;
- test harness.

### F3 — Database bootstrap
- PostgreSQL local service;
- Drizzle setup;
- first migration;
- migration command;
- DB integration-test path.

### F4 — Web/PWA bootstrap
- React/Vite/TypeScript;
- router shell;
- NOW-first navigation skeleton;
- query/API client boundary;
- loading/error/empty primitives.

### F5 — Shared domain contracts
- identifiers/base entity types;
- NeedState enum;
- LifeEvent envelope;
- initial read-model/API contract types;
- no persistence-specific types in domain.

### F6 — CI/dev environment
- install/typecheck/test/build workflow;
- dev Docker Compose;
- `.env.example`;
- one documented local boot path.

### F7 — Foundation smoke E2E
- web calls API;
- API can reach DB;
- migration is applied;
- one typed health/readiness smoke path;
- restart does not lose persisted DB data.

## 7. Merge order

```text
F1 workspace
  ├─→ F2 API
  ├─→ F4 Web
  └─→ F5 Domain contracts
F2 + F5 → F3 DB/orchestration integration
F1..F6 → F7 smoke/E2E
```

Parallel work is allowed only when dependency contracts are already stable.

## 8. Branch/PR policy

Implementation starts on a dedicated branch rather than writing unfinished runtime code directly to `main`.

Initial branch:

`feat/foundation-bootstrap`

The branch may contain the minimum coherent workspace skeleton. Subsequent changes should prefer smaller branches/PRs linked to the foundation sub-issues.

## 9. Definition of Done for Foundation Epic

Epic #1 is complete only if:

- `pnpm install` resolves workspace dependencies;
- one documented command starts Postgres + API + web for local development;
- API `/health` and `/ready` return deterministic responses;
- DB migration can be applied from a clean database;
- web can successfully call the API;
- typecheck/test/build run from root;
- CI executes the same essential checks;
- environment variables are validated;
- no feature/domain behavior has been prematurely invented.

## 10. Skeptical Reviewer findings

### Risk: foundation creep
Mitigation: every foundational abstraction must name the first vertical-slice need it enables.

### Risk: monorepo package ceremony
Mitigation: create packages only where dependency boundaries already have product value. Empty placeholder packages are allowed only if a near-term issue owns them.

### Risk: auth distracts early vertical testing
Decision: production-grade auth is required before external alpha, but the earliest local vertical slice may use a clearly isolated development identity seam. The seam must not leak into production contracts.

### Risk: overengineering event sourcing
Decision: current-state relational tables remain primary operational storage; `life_events` is append-only audit/behavior history, not full event-sourced reconstruction.

## 11. Implementation start decision

**APPROVED:** begin codebase bootstrap after this meeting.

The implementation is authorized to create the workspace/runtime skeleton only. Product feature implementation still follows the Epic sequence and acceptance criteria.

## 12. Next meeting

**Meeting #014 — Foundation Review & Vertical Slice A Kickoff**

Trigger: once the foundation branch boots locally in a production-shaped way and the foundation PR is reviewable.
