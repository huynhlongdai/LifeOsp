# LifeOS Personal Intelligence Engine V1

**Status:** ACTIVE  
**Source:** Meetings #003, #010, #011  
**Updated:** 2026-08-26

## Purpose

Make LifeOS progressively more useful from real plan-vs-reality evidence without creating opaque personality scoring or uncontrolled AI memory.

## Architecture

```text
CURRENT STATE
+ LIFE EVENTS
+ EVIDENCE / RELATIONS
        ↓
DERIVED FEATURES
        ↓
CANDIDATE PATTERNS
        ↓
EVIDENCE CHECK
        ↓
AI INTERPRETATION
        ↓
USER CONFIRM / CORRECT
        ↓
OPERATING PREFERENCES
        ↓
BETTER FUTURE RECOMMENDATIONS
```

## Core rules

1. Weak inference never becomes durable personal truth automatically.
2. User-confirmed direction overrides inferred history.
3. Recent explicit intent can supersede stale preference.
4. Do not build psychological/medical labels.
5. Store product-level evidence, not hidden model chain-of-thought.
6. Personalization must be inspectable, editable and deletable.
7. Core product remains usable without AI.

## Data layers

### Current-state tables
Operational objects such as actions, projects, seasons, recommendations and preferences.

### Append-only Life Events
Behavioral history describing what happened.

### Relations / Evidence
Typed connections explaining how objects, insights and recommendations are related.

## Plan-vs-reality model

For intended work capture:
- expected duration;
- success condition;
- current outcome/project;
- recommendation reason;
- capacity context.

For actual result capture:
- started or not;
- focus duration;
- completed/partial/blocked;
- postpone/drop reason;
- explicit interruption when recorded.

Derived comparisons include:
- estimated vs actual time;
- plan vs completion;
- postponement frequency;
- start latency;
- completion by action-size bucket;
- active-project load;
- recovery after disruption;
- recommendation outcome quality.

## Confidence classes

### Direct
Explicit user input or hard recorded event.

### Strong pattern
Repeated evidence over sufficient samples.

### Possible pattern
Tentative interpretation needing confirmation.

### Suggestion
Low-evidence option rather than a claim about the user.

## Memory classes

1. Explicit profile facts
2. Confirmed operating preferences
3. Candidate insights

Not every capture becomes long-term memory.

## Operating preference examples

- generated actions target ≤45 minutes;
- max 2 primary projects;
- offer resize after repeated postponement;
- show one primary NOW recommendation;
- respect user-defined unavailable focus windows.

## Next Action Engine V0

```text
eligible candidates
→ invalid/blocked filters
→ hard constraints
→ deterministic ranking
→ AI wording/missing-action proposal where useful
→ recommendation validation
→ evidence stored
→ one primary recommendation
```

Initial ranking factors:
- current direction relevance;
- bottleneck/unblock value;
- urgency;
- effort/capacity fit;
- maintenance necessity;
- user priority;
- context/freshness.

No ML ranking model in MVP.

## Recommendation audit

Material recommendations store compact factors such as:
- Current Season;
- linked outcome/project;
- bottleneck;
- available capacity;
- deadline;
- relevant operating preference;
- dependency state;
- recent postponement;
- user corrections.

The user-facing `Why this?` uses this evidence.

## Context retrieval

Do not send full history to AI.

```text
intent
→ relevant current objects
→ relevant recent events
→ confirmed preferences/memory
→ compact evidence
→ token/privacy budget
```

## Initial personalization experiments

1. Action-duration preference vs start/completion rate.
2. Active-project limits vs stalled-work rate.
3. Explicit correction vs repeated wrong assumptions.
4. Weekly adjustment vs next-week planning calibration.
5. Reduced AI intervention after stable behavior.

## Evaluation

Regression situations must include:
- no clear direction;
- overload;
- repeated postponement;
- blocked action;
- low capacity;
- conflicting commitments;
- returning after absence;
- rejected recommendation;
- incorrect memory;
- no meaningful work required.

Evaluate:
- contract validity;
- evidence faithfulness;
- relevance;
- hallucinated user facts;
- uncertainty language;
- user control;
- deterministic-rule compliance;
- recovery behavior.

## Privacy controls

- inspect/edit/delete memory;
- export/delete account data;
- conservative memory admission;
- minimal provider context;
- provider-neutral AI gateway;
- no silent sensitive profiling.
