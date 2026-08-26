# LifeOS Company Meeting #011 — Data Model, Event Taxonomy & Personal Intelligence Engine

**Date:** 2026-08-26  
**Status:** DECIDED / TO VALIDATE  
**Participants:** Product Director, Data Architect, AI Product Architect, Backend Lead, Behavioral Science Lead, Privacy Reviewer, Analytics Lead, Skeptical Reviewer

## 1. Objective

Define the smallest data and learning architecture capable of making LifeOS more useful over time through plan-vs-reality evidence, while avoiding an opaque surveillance-like personal data system.

The engine must answer:

> What did the user intend, what actually happened, what repeatedly helped or blocked progress, what has the user confirmed about themselves, and how should that change the next recommendation?

---

## 2. Architecture principle: state + events + evidence

LifeOS will not use an event log as the only database and will not use a graph database in MVP.

Use three complementary layers:

```text
CURRENT STATE TABLES
fast product state
        +
APPEND-ONLY LIFE EVENTS
what happened over time
        +
EVIDENCE / RELATIONS
why recommendations and insights exist
```

### Current state
Human-readable operational objects:
- projects;
- actions;
- seasons;
- outcomes;
- captures;
- focus sessions;
- memories;
- preferences.

### Event stream
Immutable-ish behavioral history used for analytics and learning.

### Relations/evidence
Typed links connecting recommendation/insight to supporting facts.

---

## 3. Core schema groups

### Identity / context
- users
- user_profiles
- user_settings
- life_areas
- need_states

### Direction
- directions
- seasons
- outcomes

### Execution
- projects
- actions
- action_dependencies
- focus_sessions
- check_ins

### Capture / Not Now
- captures
- incubator_items

### Reflection
- daily_closes
- weekly_reviews

### Intelligence
- recommendations
- recommendation_evidence
- insights
- insight_evidence
- user_memories
- operating_preferences
- model_feedback

### Graph semantics
- relations

### History
- life_events

---

## 4. Life Event contract

Every event should answer:
- who;
- what happened;
- when;
- what object(s) were involved;
- what user intent/context existed;
- source;
- metadata needed for derived analysis.

Proposed shape:

```ts
LifeEvent {
  id
  userId
  type
  occurredAt
  actor: user | system | ai | integration
  objectType?
  objectId?
  parentObjectType?
  parentObjectId?
  sourceSurface?
  sessionId?
  properties: JSONB
  createdAt
}
```

Do not store entire AI prompts/responses in the event table by default.

---

## 5. P0 event taxonomy

### Capture
- capture_created
- capture_edited
- capture_classified
- capture_interpretation_corrected
- capture_moved_to_incubator
- incubator_item_activated
- incubator_item_archived

### Direction
- direction_created
- direction_confirmed
- direction_changed
- season_started
- season_modified
- season_paused
- season_ended
- outcome_created
- outcome_completed
- outcome_dropped

### Project/action
- project_started
- project_paused
- project_resumed
- project_completed
- project_dropped
- action_created
- action_resized
- action_started
- action_completed
- action_postponed
- action_blocked
- action_unblocked
- action_dropped

### Focus
- focus_started
- focus_paused
- focus_resumed
- focus_completed
- focus_aborted
- distraction_captured

### Recommendation
- recommendation_generated
- recommendation_shown
- recommendation_explanation_opened
- recommendation_accepted
- recommendation_edited
- recommendation_rejected
- recommendation_wrong_assumption
- recommendation_result_recorded

### Reflection
- checkin_submitted
- daily_close_completed
- weekly_review_started
- weekly_review_completed

### Insight/memory
- insight_generated
- insight_shown
- insight_confirmed
- insight_partially_confirmed
- insight_rejected
- memory_created
- memory_confirmed
- memory_edited
- memory_deleted
- operating_preference_created
- operating_preference_changed
- operating_preference_disabled

### System
- ai_request_failed
- ai_manual_fallback_used
- sync_failed

---

## 6. Planned vs reality model

LifeOS needs explicit representation of intent and outcome.

### Planned action snapshot
When an action enters NOW or a focus plan, record:
- action id;
- planned start window when applicable;
- expected duration;
- success condition;
- priority/recommendation reason;
- available capacity context;
- project/outcome link.

### Actual execution
Record:
- started or not;
- actual start;
- focus duration;
- completion state;
- outcome: yes / partial / blocked;
- postponement/drop reason;
- interruptions/distractions where user explicitly records them.

### Derived comparisons
- estimated vs actual duration;
- planned vs completed action count;
- recommended vs manually chosen action;
- action age before start;
- number of postponements;
- completion by estimated duration bucket;
- completion by time/context when enough evidence exists;
- active-project load vs completion;
- focus block completion rate;
- return after disruption.

---

## 7. Personal Intelligence pipeline

```text
RAW EVENTS
    ↓
DERIVED FEATURES
    ↓
CANDIDATE PATTERN
    ↓
EVIDENCE CHECK
    ↓
AI INTERPRETATION (where useful)
    ↓
USER CONFIRM / CORRECT
    ↓
OPERATING PREFERENCE / MEMORY
    ↓
FUTURE RECOMMENDATION CONSTRAINT
```

Key principle:

> AI does not directly convert a weak statistical coincidence into a durable personal truth.

---

## 8. Derived feature examples

P0 derived features should be understandable and testable.

### Action execution
- action_completion_rate_7d/28d
- median_action_duration_estimate
- median_actual_focus_duration
- postponement_rate
- action_start_latency
- resize_success_rate

### Planning calibration
- estimated_to_actual_duration_ratio
- planned_to_completed_ratio
- daily_capacity_error
- weekly_capacity_error

### Project load
- active_project_count
- primary_project_count
- project_start_to_completion_ratio
- stalled_project_count

### Recommendation quality
- accept_rate
- edit_rate
- reject_rate
- wrong_assumption_rate
- accepted_recommendation_completion_rate
- manual_choice_completion_rate

### Recovery
- return_after_missed_day
- time_to_resume_after_aborted_focus
- stalled_action_recovery_rate

These are operational features, not personality scores.

---

## 9. Candidate pattern generation

Use deterministic detectors first where possible.

Example detector:

```text
IF
  actions with estimate > 90m >= minimum sample
AND
  completion rate materially lower than actions <= 45m
THEN
  candidate pattern:
  "Long actions may be harder to complete."
```

Another:

```text
IF
  active projects rises
AND
  completion throughput falls over repeated weeks
THEN
  candidate:
  "Higher active-project load may be reducing completion."
```

AI can transform evidence into understandable language and generate plausible alternatives, but evidence selection remains inspectable.

---

## 10. Evidence thresholds

Avoid pretending thresholds are scientific universal truths.

MVP uses conservative operational rules:
- minimum sample before pattern generation;
- repeated occurrence across days/weeks when applicable;
- material effect size, not tiny differences;
- no sensitive psychological conclusions;
- user confirmation for durable behavioral preferences.

Thresholds live in versioned configuration so experiments can change them without rewriting history.

---

## 11. Insight object

```ts
Insight {
  id
  userId
  type
  status: candidate | shown | confirmed | partial | rejected
  title
  summary
  confidenceClass
  generatedAt
  validFrom
  validTo?
  detectorVersion?
  aiModelVersion?
  supersededBy?
}
```

`insight_evidence` links to:
- event ids;
- derived feature snapshot ids;
- project/action ids;
- review period.

User must be able to inspect a simple evidence summary.

---

## 12. Operating Preference object

Operating preferences are actionable personalization rules.

Examples:
- generated action target duration <= 45 minutes;
- max 2 primary active projects;
- show no more than one NOW recommendation by default;
- do not recommend deep-focus work in user-marked unavailable periods;
- after 2 postponements, offer resize before reschedule.

Shape:

```ts
OperatingPreference {
  id
  userId
  key
  value: JSONB
  source: explicit | confirmed_insight | experiment
  status: active | disabled | superseded
  createdAt
  updatedAt
}
```

Operating preferences are visible/editable.

---

## 13. Recommendation object and audit trail

Recommendation records should support product-level explainability.

```ts
Recommendation {
  id
  userId
  type
  targetObjectType?
  targetObjectId?
  proposedAction: JSONB
  status
  confidenceClass
  rulesetVersion
  aiModelVersion?
  generatedAt
  shownAt?
  resolvedAt?
}
```

`recommendation_evidence` includes compact factors such as:
- Current Season link;
- outcome bottleneck;
- deadline;
- capacity fit;
- operating preference;
- dependency state;
- previous postponement;
- user correction.

Do not persist hidden chain-of-thought. Store only concise decision factors intended for product audit/explanation.

---

## 14. Next Action Engine v0

Pipeline:

```text
1. Gather eligible actions/candidates
2. Filter invalid/blocked/incompatible items
3. Apply hard constraints
4. Score/rank candidates
5. AI may improve wording or propose missing action
6. Validate candidate contract
7. Store recommendation + evidence
8. Present max 1 primary recommendation
```

### Hard constraints
- not completed/dropped;
- required dependency available;
- not in Not Now unless user requests it;
- user availability/capacity not clearly violated;
- not explicitly rejected repeatedly without new evidence.

### Initial ranking factors
- current direction relevance;
- bottleneck/unblock value;
- urgency;
- effort/capacity fit;
- maintenance necessity;
- user priority;
- freshness/context.

Do not create a complicated ML ranking model for MVP.

---

## 15. Life Graph relation model

Use a typed `relations` table rather than Neo4j.

Examples:
- project SUPPORTS outcome
- outcome SUPPORTS season
- action PART_OF project
- action BLOCKED_BY action/reference
- insight SUPPORTED_BY event
- memory DERIVED_FROM insight
- capture BECAME project
- idea CONFLICTS_WITH focus_allocation

Shape:

```ts
Relation {
  id
  userId
  fromType
  fromId
  relationType
  toType
  toId
  metadata?
}
```

Only add relation types that drive product behavior or explanation.

---

## 16. Privacy architecture

### Data minimization
Collect only data required for the user-facing loop.

### Sensitive inference
Do not infer or store sensitive psychological/medical labels.

### Long-term memory
Not every capture becomes memory.

Memory admission rules:
- user explicitly saves it;
- user confirms an insight/preference;
- clear product utility and transparent source.

### AI provider boundary
Provider-neutral gateway should support:
- minimal context selection;
- prompt redaction where needed;
- no sending entire life history for every request;
- configurable retention/privacy policies;
- per-feature logging controls.

### User controls
- inspect memory;
- delete memory;
- export data;
- delete account/data;
- disable personalization class where feasible.

---

## 17. Context retrieval strategy

Do not dump all user data into the model.

Use context builder:

```text
Request intent
    ↓
Required domain objects
    ↓
Current State summary
    ↓
Relevant recent events
    ↓
Relevant confirmed preferences/memory
    ↓
Evidence budget / token budget
```

For NOW recommendation, likely context:
- Current Season;
- active outcome/project;
- eligible actions;
- dependencies;
- available capacity;
- relevant operating preferences;
- recent postponement/blocking events.

For Weekly Reset:
- aggregated weekly features;
- selected notable events;
- prior week commitments;
- confirmed preferences;
- prior insight outcomes.

---

## 18. AI evaluation strategy

Before public beta, create a regression dataset containing representative situations:
- no direction;
- too many projects;
- repeated postponement;
- blocked task;
- low capacity;
- conflicting deadline;
- returning after absence;
- rejected recommendation;
- incorrect memory;
- no meaningful work required.

Evaluate:
- recommendation contract validity;
- relevance;
- evidence faithfulness;
- no fabricated facts;
- appropriate uncertainty language;
- autonomy controls;
- no harmful/pseudo-diagnostic claims;
- consistency with deterministic constraints.

AI quality must be measured separately from UI acceptance.

---

## 19. Personalization learning experiments

Test whether personalization actually compounds.

### Experiment A — duration preference
Does confirmed preferred action size improve start/completion rate?

### Experiment B — active project limit
Does Focus Budget/active limit reduce silent stalled work?

### Experiment C — recommendation correction
Do explicit corrections reduce repeat wrong assumptions?

### Experiment D — weekly adaptation
Do user-confirmed weekly changes improve plan-vs-reality calibration in following weeks?

### Experiment E — reduced intervention
As user becomes stable, does less AI prompting preserve or improve outcomes?

---

## 20. Skeptical review

### Risk: event data becomes surveillance
Mitigation: explain user value, minimize collection, avoid hidden external tracking, provide controls/export/delete.

### Risk: noisy data creates fake insights
Mitigation: minimum evidence, confidence classes, confirmation workflow, detector versions.

### Risk: AI advice changes due to opaque model behavior
Mitigation: deterministic constraints and stored product-level evidence.

### Risk: complexity explodes
Mitigation: relational Postgres, JSONB only where justified, no graph DB/ML ranking/microservices in MVP.

### Risk: model token costs grow with history
Mitigation: derived state + targeted retrieval, never full-history prompting by default.

### Risk: personalization locks user into old behavior
Mitigation: preferences are editable, time-aware and can be superseded; recent explicit user intent beats stale inferred preference.

---

## 21. Decisions made

1. Use current-state relational tables + append-only Life Events + typed relations/evidence.
2. No graph database or ML ranking model in MVP.
3. Personal intelligence follows evidence → candidate pattern → user confirmation → operating preference.
4. Weak AI inference never becomes durable personal truth automatically.
5. Store product-level recommendation factors, not hidden chain-of-thought.
6. Plan-vs-reality is a first-class data model.
7. Derived features are operational behavior measures, not personality scores.
8. AI context retrieval is targeted and budgeted; never send full life history by default.
9. Memory admission is conservative and user-controllable.
10. Personalization must be experimentally proven to improve future decisions.

## 22. Next meeting

**Meeting #012 — Engineering Plan, Repo Architecture & Vertical Slice Definition**

Main question:

> How do we turn Meetings #009–#011 into an implementation sequence that gets a real end-to-end LifeOS loop running as early as possible, with tests and evaluation from day one?
