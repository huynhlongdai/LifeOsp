# LifeOS Company Meeting #009 — MVP Scope & Experience Architecture

**Date:** 2026-08-26  
**Status:** DECIDED / TO VALIDATE  
**Participants:** Product Director, Head of Product, UX Director, Behavioral Science Lead, AI Product Architect, Engineering Lead, Growth Lead, Skeptical Reviewer

## 1. Objective

Turn the LifeOS thesis into a buildable MVP experience without recreating a generic productivity suite.

The MVP must prove one thing:

> Can LifeOS repeatedly move a user from confusion / overload / stalling into a clear, realistic next action, then learn from what actually happened and improve the next recommendation?

The MVP is not required to manage every domain of life.

---

## 2. Core product contract

LifeOS should be valuable even when the user has no perfectly defined long-term goal.

The product contract is:

```text
I can tell LifeOS what is going on.
        ↓
LifeOS helps me clarify it.
        ↓
We choose what matters now.
        ↓
LifeOS gives me a realistic next action.
        ↓
I act or explain why I did not.
        ↓
LifeOS learns from reality.
        ↓
The next plan becomes more realistic.
```

If the app cannot complete this loop, additional modules do not matter.

---

## 3. MVP navigation

Primary navigation is intentionally limited to five areas:

1. **NOW** — what matters now and the next useful action;
2. **DIRECTION** — current season, outcomes, priorities and trade-offs;
3. **EXECUTE** — projects/actions/focus sessions;
4. **REFLECT** — daily close, weekly reset, insights;
5. **ME** — life profile, operating preferences, confirmed memory.

Secondary destinations:
- Inbox;
- Incubator / Not Now;
- Search / Ask LifeOS;
- Settings.

### Explicitly rejected navigation

Do not make these top-level MVP destinations:
- Tasks;
- Habits;
- Goals;
- Notes;
- Journal;
- Calendar;
- Finance;
- Health;
- Knowledge base;
- AI Chat.

These may exist as objects/capabilities under the main flows, but must not define the product architecture.

---

## 4. Four MVP experiences

### Experience A — Clarity Reset

Use when the user is mentally overloaded, uncertain or cannot identify a priority.

```text
Capture / Brain Dump
        ↓
AI extracts candidates
        ↓
User corrects interpretation
        ↓
LifeOS groups:
- concern
- idea
- commitment
- project
- action
- question
- reference
        ↓
Focus conflict / trade-off
        ↓
ACTIVE / MAINTAIN / NOT NOW
        ↓
one recommended Next Action
```

Success metric:
- user reports greater clarity;
- at least one item is intentionally deprioritized;
- user reaches a specific executable action.

### Experience B — NOW

The most important recurring screen.

Inputs:
- Current Season / current need;
- active outcomes/projects;
- time/capacity;
- blocked/repeatedly delayed actions;
- recent focus/history;
- explicit user preferences.

Output:
- one primary recommendation;
- up to two secondary actions only when useful;
- "Why this?" explanation;
- estimated duration;
- observable done condition;
- Start / Edit / Not now controls.

NOW must reduce decisions rather than expose a backlog.

### Experience C — Get Unstuck

Triggered when:
- user postpones an action repeatedly;
- action survives multiple planning cycles;
- user explicitly says "I am stuck";
- focus session repeatedly aborts.

Friction hypotheses:
- unclear;
- too large;
- blocked;
- low capacity;
- competing priority;
- low value / changed mind;
- emotional resistance reported by user;
- external condition changed.

Interventions:
- clarify first step;
- shrink action;
- identify dependency;
- reschedule realistically;
- pause/drop;
- replace with a different route.

Never use guilt/streak loss as the intervention.

### Experience D — Weekly Adapt

Inputs:
- planned vs actual actions;
- focus time;
- completed/resized/dropped/postponed work;
- new captures/ideas;
- project progress;
- user check-ins;
- recommendation acceptance/correction.

Output:
- what actually happened;
- max 3 useful patterns;
- explicit confidence/evidence;
- proposed changes for next week;
- user confirm/edit/reject.

This is the main moat-validation experience.

---

## 5. Entry journeys

The MVP supports multiple user pain states while converging on the same kernel.

### Find Direction
```text
Need selection
→ guided reflection
→ Brain Dump
→ candidate themes
→ priority trade-off
→ Current Season
→ Next Action
→ NOW
```

### Know What To Do Today
```text
quick check-in
→ capacity
→ current commitments
→ recommendation
→ NOW
```

### Clear Overload
```text
Brain Dump
→ organize/correct
→ active vs maintain vs not now
→ recommendation
→ NOW
```

### Get Moving Again
```text
select stalled goal/project/action
→ diagnose friction
→ resize/replan/drop
→ Start Focus
```

### Rebalance
MVP only supports lightweight rebalance:
```text
life-area snapshot
→ identify one neglected/overloaded area
→ choose a temporary adjustment
→ reflect it in Current Season / weekly allocation
```

Do not build specialized health/finance/family modules in MVP.

---

## 6. Screen inventory

### Required P0 screens
1. Welcome / choose immediate need
2. Quick Life Context
3. Brain Dump / Capture
4. AI interpretation review
5. Focus Conflict / trade-off
6. Current Season builder
7. NOW
8. Next Action detail/edit
9. Focus Mode
10. Complete / postpone / drop outcome
11. Get Unstuck diagnosis
12. Daily Close
13. Weekly Reset
14. Insight confirmation
15. Projects / Outcomes lightweight workspace
16. Incubator / Not Now
17. ME / Operating Preferences
18. Ask LifeOS lightweight query surface
19. Settings / privacy / memory controls

### P1 after core loop works
- calendar read integration;
- share/browser capture;
- voice capture;
- import basic task list;
- notifications;
- PWA offline capture;
- simple habit/routine object if validated.

### Not MVP
- native iOS/Android apps;
- autonomous external agents;
- email agent;
- financial account sync;
- wearable/health sync;
- family/shared workspace;
- social/community;
- marketplace;
- complex knowledge base;
- document editor;
- full calendar replacement;
- full habit gamification;
- XP/levels/streak economy;
- advanced analytics dashboards;
- graph database;
- dozens of AI personas;
- user scripting/plugin ecosystem.

---

## 7. Domain objects for MVP

P0 objects:
- User
- UserProfile
- LifeArea
- NeedState
- Direction
- Season
- Outcome
- Project
- Action
- Capture
- IncubatorItem
- FocusSession
- CheckIn
- DailyClose
- WeeklyReview
- Recommendation
- Insight
- UserMemory
- OperatingPreference
- LifeEvent
- Relation

### Action states
- candidate
- ready
- active
- completed
- postponed
- blocked
- dropped
- archived

### Project states
- candidate
- active
- maintain
- paused
- incubated
- completed
- dropped

---

## 8. Next Action Engine contract

A recommendation must pass deterministic constraints before AI can surface it.

Minimum quality checks:
- executable;
- linked to a user-confirmed direction/need or explicitly marked as maintenance;
- duration is plausible;
- prerequisites are available or stated;
- success condition is observable;
- not already completed/dropped;
- does not exceed user capacity without explanation.

Ranking signals may include:
- direction relevance;
- urgency/deadline;
- bottleneck value;
- unblock value;
- effort/capacity fit;
- recency/context;
- user-confirmed priorities;
- repeated postponement penalty unless the action has been resized/unblocked.

AI may:
- interpret ambiguous captures;
- propose candidate actions;
- explain trade-offs;
- break down actions;
- infer tentative friction;
- summarize evidence;
- draft Weekly Reset insights.

AI may not silently:
- change major direction;
- start/pause/drop projects;
- rewrite confirmed memories;
- make high-impact life decisions for the user;
- claim psychological diagnoses;
- hide the reasoning behind material recommendations.

---

## 9. AI interaction model

AI is ambient, not a separate chatbot-first product.

Primary AI surfaces:
- interpretation card;
- recommendation card;
- Why this?;
- Get Unstuck helper;
- Weekly Insight;
- Ask LifeOS.

Every material recommendation supports:
- Accept;
- Edit;
- Not now;
- Wrong assumption;
- Explain.

Every pattern/insight supports:
- Accurate;
- Partly accurate;
- Incorrect;
- Do not use.

---

## 10. Memory model

Three memory classes:

### A. Explicit profile facts
Entered directly by user.

### B. Confirmed operating preferences
Examples:
- prefer generated actions under ~45 min;
- avoid scheduling deep work after 16:00;
- keep max 2 primary projects.

### C. Candidate insights
Derived from events but not trusted as operating truth until confirmed or strongly evidenced.

Memory UI must let the user:
- inspect;
- edit;
- delete;
- mark wrong;
- disable future use.

---

## 11. Experience principles

### Reduce choice
Do not turn NOW into a prettier backlog.

### Hide system complexity
Users should not need to understand ontology, event sourcing or AI memory.

### Progressive disclosure
Show the immediate decision first; details are optional.

### Always provide an escape
Any recommendation can be rejected/edited.

### Not Now is a first-class state
Deprioritization is a successful product outcome.

### Recovery > streak
Returning after disruption is more important than maintaining artificial perfection.

### Teach self-direction
Explain useful trade-offs so long-term users become better at making decisions themselves.

---

## 12. P0 analytics

Instrument from first prototype:
- onboarding_need_selected;
- capture_created;
- capture_interpretation_corrected;
- item_deprioritized;
- season_confirmed;
- next_action_shown;
- next_action_accepted;
- next_action_edited;
- next_action_rejected;
- focus_started;
- focus_completed;
- action_completed;
- action_postponed;
- action_dropped;
- unstuck_flow_started/completed;
- daily_close_completed;
- weekly_review_started/completed;
- insight_confirmed/corrected/rejected;
- recommendation_explanation_opened;
- memory_edited/deleted;

Primary experiment metrics:
- time to first useful Next Action;
- Next Action start rate;
- recommendation edit/reject rate;
- focus completion rate;
- clarity change before/after;
- return after missed day;
- weekly review completion;
- percentage of proposed insights confirmed;
- progress days per WAU.

---

## 13. Skeptical Review

### Risk 1 — too much onboarding
Decision: onboarding must produce value before asking for a full profile. Detailed profile is progressive.

### Risk 2 — AI recommendation feels generic
Decision: recommendation must cite current user context/evidence and allow correction.

### Risk 3 — LifeOS becomes another system to maintain
Decision: default views minimize manual categorization; AI assists organization; reviews must be short.

### Risk 4 — broad audience creates generic experience
Decision: vary entry journey by immediate need but converge to one core loop.

### Risk 5 — learning model produces fake sophistication
Decision: separate observation, candidate pattern, confirmed insight and operating preference. Never present weak inference as fact.

### Risk 6 — scope grows into life super-app
Decision: all new features require a demonstrated contribution to Clarify → Choose → Act → Reflect → Adapt.

---

## 14. Build order

### Slice 0 — clickable prototype
- Need selection
- Brain Dump
- Interpretation correction
- NOW
- Focus
- Get Unstuck
- Weekly Reset

### Slice 1 — functional founder dogfood
- auth/profile
- core domain objects
- capture
- direction/season
- action/project
- NOW engine v0 rules
- focus
- life events
- daily close

### Slice 2 — learning loop
- recommendation events
- weekly review calculations
- insight candidates
- memory confirmation
- operating preferences
- recommendation adaptation

### Slice 3 — multi-segment alpha
- adaptive entry journeys
- lightweight rebalance
- Ask LifeOS
- reliability/privacy controls
- analytics/evaluation

---

## 15. MVP exit gate

MVP is not considered successful because all screens are built.

It passes only when real users show evidence that:
1. multiple pain-state segments can reach useful value;
2. users can get a useful Next Action without maintaining a complex system;
3. users actually start actions, not just admire plans;
4. the product helps users recover when plans break;
5. Weekly Adapt produces at least some confirmed useful changes;
6. recommendations improve measurably with user-specific evidence/corrections;
7. the system retains user autonomy and trust.

---

## 16. Decisions made

1. Five-item primary navigation: NOW / DIRECTION / EXECUTE / REFLECT / ME.
2. Four MVP signature experiences: Clarity Reset, NOW, Get Unstuck, Weekly Adapt.
3. Not Now / Incubator is a core primitive, not an afterthought.
4. AI is ambient and explainable; not primarily a chat tab.
5. Tasks/Habits/Goals/Journal will not define top-level navigation.
6. MVP excludes specialized life-domain suites and autonomous agents.
7. Next Action Engine is hybrid deterministic constraints + AI interpretation/reasoning.
8. Memory is editable and confidence-tiered.
9. The product is measured by state transition and meaningful action, not number of records created.
10. Build order prioritizes the complete adaptation loop before integrations or feature breadth.

## 17. Next meeting

**Meeting #010 — UX System, Interaction States & AI Recommendation Contracts**

Main question:

> What exact UI states, component patterns, recommendation formats and error/recovery interactions are needed so users trust and understand LifeOS without feeling controlled by it?
