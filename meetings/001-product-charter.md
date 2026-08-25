# LifeOS Company Meeting #001 — Product Charter

**Date:** 2026-08-25  
**Status:** DECIDED  
**Chair:** Product Director / CEO Agent  
**Repository:** `huynhlongdai/LifeOsp`

## 1. Mandate

Build LifeOS from idea → validated product → production application → launch → revenue.

The product must primarily help people who:
- do not clearly know what goals to pursue;
- have many ideas, commitments, and information streams competing for attention;
- start plans but abandon them midway;
- sometimes open a day without knowing what to do next;
- need a system that learns from their behavior and helps them continuously adjust.

The target is not another task manager. LifeOS must become an **adaptive personal development operating system**.

---

## 2. Executive agent team

| Agent / Function | Responsibility |
|---|---|
| Product Director / CEO | Own product thesis, priorities, scope, launch and business outcome |
| Head of Product | Product discovery, JTBD, roadmap, product requirements |
| Behavioral Science Lead | Motivation, procrastination, habit formation, cognitive load, behavior-change loops |
| User Research Lead | Interviews, problem validation, personas, user evidence |
| UX Director | Information architecture, interaction system, onboarding, NOW experience |
| AI Product Lead | AI behavior, reasoning boundaries, personalization, user model, explanations |
| AI/Agent Architect | Memory, event engine, planner, agent runtime, tools and permissions |
| Data Architect | Life Graph, event store, state model, analytics and experimentation |
| Engineering Lead | Technical architecture, implementation sequencing, code quality |
| Privacy & Safety Lead | Private-data boundaries, permissions, auditability, user control |
| Growth Lead | Positioning, acquisition, activation, retention loops |
| Revenue Lead | Pricing, packaging, willingness-to-pay experiments, unit economics |
| QA / Reliability Lead | Product quality, regression, AI evaluation and release gates |
| Launch Ops Lead | Beta, support, feedback, release checklist and launch operations |

These are decision roles. Future meetings will invite only the roles relevant to the decision being made.

---

## 3. Problem diagnosis

### Current failure mode in ordinary productivity tools

Most productivity products assume the user already knows:
1. what matters;
2. what the goal is;
3. what tasks should exist;
4. which task should be done now.

The exact target user often lacks this clarity. Giving them more lists, dashboards, tags and projects can increase cognitive load rather than reduce it.

### Core job-to-be-done

> When my life, projects, ideas and obligations feel messy, help me understand what matters now, decide a realistic direction, tell me the next useful action, and keep adapting when I drift or stop.

### Emotional job

The user should feel:
- "I do not need to hold everything in my head."
- "I know what I am focusing on right now."
- "I know what I should do next."
- "Changing course is allowed and understandable."
- "My system learns from me instead of judging me."

---

## 4. Product thesis

**LifeOS = an adaptive personal development operating system.**

Its fundamental loop is:

```text
CAPTURE
  ↓
UNDERSTAND
  ↓
CHOOSE DIRECTION
  ↓
PLAN
  ↓
NEXT ACTION
  ↓
FOCUS
  ↓
OBSERVE
  ↓
REFLECT
  ↓
ADAPT
  └──────────────↺
```

Tasks, goals, habits, notes and journal entries are primitives inside this loop, not the product itself.

---

## 5. North-star user experience

Every time the user opens LifeOS, the system should reduce:
1. the number of decisions they must make;
2. the number of things they must remember;
3. the number of things competing for attention.

The main surface is **NOW**.

NOW must answer:
- What matters right now?
- What should I do next?
- Why this action?
- What should I deliberately ignore for now?

The application should be usable even when the user has no formal goals.

---

## 6. Core product objects

### Direction
A short-to-medium-term life direction, not necessarily a numerical goal.

### Current Season
The dominant focus for roughly 1–6 months. It determines what receives attention and what is intentionally maintained or incubated.

### Outcome
An observable result that would indicate progress in a Season.

### Project
A bounded effort toward an Outcome.

### Next Action
The smallest meaningful executable step the user can perform now.

### Focus Budget
A capacity constraint for active goals/projects. LifeOS should prevent unlimited commitments from entering active focus.

### Incubator
A safe place for ideas that should be preserved but not compete for current attention.

### Capture / Brain Dump
Unstructured user input that LifeOS converts into structured objects and questions.

### Check-in
Small samples of energy, mood, confidence, available time or blockers.

### Reflection
User-confirmed learning from completed or avoided actions.

### Life Event
An append-only record of meaningful changes or actions.

### User Model
A revisable model of preferences, patterns, capacities and behavior. AI-generated conclusions must remain inspectable and correctable.

---

## 7. Product architecture concept

```text
┌──────────────────────────────────────────────┐
│                EXPERIENCE LAYER              │
│ NOW · Direction · Execute · Reflect · Me     │
├──────────────────────────────────────────────┤
│              INTELLIGENCE LAYER              │
│ Clarify · Prioritize · Plan · Learn · Adapt  │
├──────────────────────────────────────────────┤
│                 LIFE KERNEL                  │
│ Life Graph · Events · State · Memory · Rules │
├──────────────────────────────────────────────┤
│                 CONNECTORS                   │
│ Calendar · Mail · Browser · Mobile · APIs    │
└──────────────────────────────────────────────┘
```

The architecture will be validated before implementation. We should reuse proven infrastructure from the previous LifeIO where useful, but not inherit its product information architecture by default.

---

## 8. MVP hypothesis

The MVP should prove one loop exceptionally well:

**messy mind → clarity → current direction → next action → focus → reflection → adjusted next action**

### MVP candidate modules

1. Guided onboarding
2. Brain Dump / Capture
3. AI clarification and classification
4. Direction Session
5. Current Season
6. Focus Budget
7. Goals / Outcomes / Projects (minimal)
8. Next Action Engine
9. NOW
10. Focus Mode
11. Distraction Capture
12. Daily Close
13. Weekly Reset
14. Incubator
15. AI Memory / User Model with correction controls
16. Basic event history

### Explicitly not required for MVP

- full accounting/finance suite;
- complex health dashboard;
- full Notion-style document editor;
- social network;
- marketplace;
- dozens of integrations;
- autonomous high-risk agents;
- gamification-heavy streak systems.

---

## 9. AI principles

1. **Suggest, do not pretend certainty.**
2. Explain important prioritization decisions.
3. Separate observed facts from inferred patterns.
4. Let the user correct the model.
5. Do not punish missed tasks.
6. Treat repeated avoidance as diagnostic information.
7. Reduce plans when the user's demonstrated capacity is smaller than planned capacity.
8. Keep unnecessary ideas out of NOW while preserving them safely.
9. Build a user model progressively; avoid asking for a huge profile upfront.
10. High-impact or external actions require explicit permissions and audit trails.

---

## 10. Behavioral design decisions

### Avoid productivity guilt
Missed work should trigger a recovery flow, not red badges everywhere.

### Handle abandonment explicitly
After repeated delay, ask whether the action is:
- too large;
- unclear;
- low-value;
- blocked;
- no longer desired;
- mismatched to available energy/time.

Then resize, replace, defer, archive or drop it.

### Protect attention
New ideas normally go to Capture/Incubator, not directly to the active plan.

### Work with realistic capacity
LifeOS should learn estimated daily/weekly capacity from actual behavior and use it to prevent impossible plans.

---

## 11. Initial business model hypotheses

We will not lock pricing before validation.

### Free
- capture;
- one Current Season;
- basic NOW;
- simple projects/actions;
- limited AI clarification;
- weekly review basics.

### Pro subscription
Possible value drivers:
- deeper AI planning and adaptive review;
- long-term personal memory;
- advanced behavior insights;
- integrations;
- richer Life Graph;
- automation;
- multiple life domains / advanced planning;
- export / backup / private self-host options where viable.

### Future revenue options
- family / partner plan;
- coach / therapist / mentor collaboration mode with strict permission controls;
- creator-made development programs/templates;
- team/founder edition only if evidence supports it;
- privacy-first self-hosted or BYO-model tier.

**Decision:** subscription is the primary revenue hypothesis, but activation/retention validation comes before monetization optimization.

---

## 12. Product success model

### Activation event
A new user:
1. completes a Brain Dump;
2. chooses/confirms a Direction or Current Season;
3. accepts/creates a Next Action;
4. starts or completes one Focus Session.

### Candidate north-star metric
**Meaningful Progress Days / Weekly Active User**

A Meaningful Progress Day requires at least one action linked to a confirmed direction/outcome plus an explicit completion or reflection signal.

### Supporting metrics
- onboarding completion;
- time to first Next Action;
- first Focus Session rate;
- Day 1 / Day 7 / Day 30 retention;
- percentage of planned actions resized rather than silently abandoned;
- weekly review completion;
- user-reported clarity before vs after session;
- recommendation acceptance/edit/rejection rates;
- number of concurrent active projects;
- AI correction rate;
- subscription conversion after proven retained value.

---

## 13. Delivery phases

### Phase 0 — Product discovery
Problem evidence, target segment, JTBD, competitor mapping, behavioral research, pricing interviews.

### Phase 1 — Experience prototype
Prototype onboarding → Brain Dump → Direction → NOW → Focus → Daily Close → Weekly Reset.

### Phase 2 — Technical foundation
Life ontology, event model, user-state model, AI contracts, permissions, app architecture.

### Phase 3 — Alpha
Working end-to-end loop for internal/dogfood use.

### Phase 4 — Private beta
Small external cohort, high-touch research, activation and retention measurements.

### Phase 5 — Public beta / launch
Stable onboarding, pricing experiment, support, analytics, public launch.

### Phase 6 — Retention and revenue
Improve adaptation quality, memory, integrations, willingness-to-pay and conversion.

---

## 14. Key risks

| Risk | Countermeasure |
|---|---|
| Product becomes another feature-heavy planner | Protect the core loop and NOW-first architecture |
| AI advice feels generic | Ground suggestions in user-confirmed data/events |
| User spends more time configuring than living | Progressive setup, strong defaults, capture-first |
| AI overreaches | permissions, explanations, audit logs, correction UI |
| Too much personal data required | progressive disclosure, local/privacy options, minimum-data design |
| Initial novelty but poor retention | validate repeated weekly value before broad feature expansion |
| Overplanning | one next action + realistic capacity constraints |
| User becomes dependent on AI for every choice | teach reflection, show reasoning, support user agency |

---

## 15. Decisions made

1. LifeOS is **not** positioned as a task/habit manager.
2. Primary market problem is **clarity + direction + execution + adaptation**.
3. NOW is the primary daily interface.
4. Current Season and Focus Budget are first-class concepts.
5. Incubator is a core focus-protection mechanism.
6. The MVP validates one closed behavioral loop before broad LifeOS modules.
7. AI recommendations must be explainable and correctable.
8. The company will validate retention before maximizing monetization.
9. Existing LifeIO code is reference/reusable infrastructure, not the source of truth for product design.
10. Every future company meeting must produce a committed meeting record in `/meetings` and update the relevant product documents when decisions change.

---

## 16. Next company meetings

### Meeting #002 — Problem & User Research
Participants: Product, User Research, Behavioral Science, Growth.

Output:
- target beachhead segment;
- JTBD tree;
- problem interview script;
- evidence assumptions;
- competitor alternatives;
- validation plan.

### Meeting #003 — Behavioral System
Participants: Behavioral Science, AI Product, UX, Data.

Output:
- procrastination / abandonment model;
- focus overload model;
- intervention rules;
- reflection and learning loop;
- anti-guilt UX principles.

### Meeting #004 — Product Architecture
Participants: Product, UX, AI Architect, Data Architect, Engineering.

Output:
- object model;
- Life Graph / event schema;
- NOW decision engine;
- memory architecture;
- AI tool contracts;
- MVP technical boundaries.

### Meeting #005 — Business & Launch Thesis
Participants: CEO, Growth, Revenue, Research, Product.

Output:
- ICP and positioning;
- free/pro packaging hypotheses;
- acquisition loops;
- beta recruitment;
- launch channels;
- revenue experiments.

---

## 17. Immediate action

Proceed to Meeting #002 before implementation. No production coding until the target user, behavioral problem, activation loop and MVP hypothesis are sufficiently validated.
