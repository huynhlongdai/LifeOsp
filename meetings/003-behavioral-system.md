# LifeOS Company Meeting #003 — Behavioral System & Intervention Design

**Date:** 2026-08-25  
**Status:** DECIDED / TO VALIDATE  
**Participants:** Product Director, Behavioral Science Lead, Head of Product, UX Director, AI Product Lead, Data Architect

## 1. Meeting objective

Define how LifeOS should react to ambiguity, overload, procrastination, abandonment and unrealistic planning without becoming punitive, manipulative or over-controlling.

---

## 2. Behavioral design stance

LifeOS is not a discipline machine.

It should support three conditions that are broadly consistent with self-determination research:
- **Autonomy:** the user retains meaningful choice and ownership;
- **Competence:** actions should feel understandable and achievable;
- **Relatedness/support:** the system should communicate as a supportive collaborator rather than a judge.

LifeOS may recommend strongly, but important personal-direction decisions remain user-confirmed.

---

## 3. Behavior model

We will not label every failure as "lack of motivation".

When an intended action does not happen, LifeOS first classifies possible friction:

```text
NO ACTION
  │
  ├─ UNCLEAR       → user does not know the first concrete step
  ├─ TOO LARGE     → action exceeds practical session size
  ├─ OVERLOADED    → too many competing commitments
  ├─ BLOCKED       → missing information/resource/dependency
  ├─ LOW VALUE     → user no longer believes it matters
  ├─ LOW CAPACITY  → time/energy was lower than planned
  ├─ CONTEXT LOSS  → interruption/context switching
  ├─ FEAR/AVOIDANCE→ user reports emotional resistance
  └─ CHANGED WORLD → priorities or external conditions changed
```

AI must treat these as hypotheses until the user confirms or enough behavioral evidence exists.

---

## 4. Intervention ladder

Use the least intrusive intervention likely to help.

### Level 0 — Observe
Do nothing visible; collect event data.

### Level 1 — Nudge
Example: "You have 25 minutes free. Continue the current Next Action?"

### Level 2 — Clarify
Ask one small question to remove ambiguity.

### Level 3 — Resize
Break an action into a smaller executable step.

### Level 4 — Reprioritize
Recommend moving lower-value work out of NOW.

### Level 5 — Re-plan
Change the weekly/day plan after user review.

### Level 6 — Challenge commitment
Ask whether a goal/project should be paused, changed or dropped.

### Rule
Never escalate merely because a streak was broken.

---

## 5. Core intervention patterns

### Pattern A — "I don't know what to do"
Inputs:
- no active Next Action;
- many candidate tasks/projects;
- user opens NOW.

Response:
1. identify Current Season;
2. identify active Outcome;
3. locate bottleneck;
4. generate max 3 candidate Next Actions;
5. recommend one with explanation;
6. allow user to select/edit.

### Pattern B — Repeated postponement
Trigger hypothesis: same action postponed ≥ 3 times or repeatedly survives daily planning without progress.

Prompt:
"This action keeps moving. What is actually blocking it?"

Options:
- unclear;
- too large;
- no longer important;
- blocked;
- insufficient time/energy;
- other.

Then resize/re-plan/archive instead of adding guilt.

### Pattern C — New idea during focus
Default behavior:
- capture instantly;
- send to Inbox/Incubator;
- do not alter Current Focus;
- surface later during review.

### Pattern D — Overcommitted week
If planned demand substantially exceeds learned capacity:
- show the conflict;
- rank commitments by direction/urgency/impact;
- recommend removing or delaying work;
- explicitly protect whitespace/buffer.

### Pattern E — User repeatedly starts new projects
LifeOS should not infer a personality trait immediately.

Instead surface evidence:
"In the last four weeks, 6 projects were started and 1 reached its intended outcome. Would you like to reduce the active-project limit?"

### Pattern F — User misses a day
Do not create a recovery debt.

Return with:
- current direction;
- one useful Next Action;
- optional short reflection.

No "make up" tasks by default.

---

## 6. Focus Budget model

Focus is treated as a limited resource.

### Initial model
Each active Project has a weekly attention allocation:
- primary project;
- support project(s);
- maintain-only commitments;
- incubated ideas.

### Focus Budget score
Do not pretend this is a precise scientific measurement.

It is an operational planning indicator derived from:
- available focused hours;
- number of active projects;
- estimated task demand;
- historical completion capacity;
- hard calendar commitments;
- user-confirmed energy/capacity changes.

Display the inputs, not only a mysterious score.

---

## 7. Next Action quality contract

A proposed Next Action should ideally be:
- executable without another planning session;
- small enough for a realistic focus block;
- clearly linked to an Outcome/Project;
- explicit about what "done" means;
- accompanied by an effort estimate;
- revisable by the user.

Example:

Bad: `Work on affiliate project`

Better: `Select 3 products for the first test and save each source link + one reason for selection.`

---

## 8. Implementation-intention support

Where useful, LifeOS can convert accepted actions into a concrete cue-plan:

```text
When [time/context], I will [specific action] for [duration],
and success means [observable result].
```

This is optional. It should not turn the product into rigid calendar micromanagement.

---

## 9. Autonomy guardrails

Every meaningful AI recommendation needs at least one of:
- **Why this?** explanation;
- underlying evidence;
- edit option;
- reject option;
- "do not suggest this again" where applicable.

Never frame model inference as fact.

Use language such as:
- "I noticed..."
- "One possible pattern is..."
- "Does this fit?"

Avoid:
- "You are the kind of person who..."
- "You always..."
- "You failed because..."

---

## 10. Anti-dependence principle

The system should help the user become better at self-direction, not require AI approval for every action.

Therefore:
- show reasoning behind trade-offs;
- periodically ask the user to choose before showing AI recommendation in experiments;
- allow manual Next Actions;
- allow AI to become less intrusive when the user demonstrates stable routines;
- reviews should teach recognizable patterns.

Success is not "maximum AI interactions".

---

## 11. Reflection model

### Daily Close — under ~60 seconds by default
Capture:
- meaningful progress;
- friction/blocker;
- optional mood/energy/confidence;
- optional free note.

### Weekly Reset
Compute:
- planned vs actual focus;
- Outcome progress;
- time/effort estimation error;
- repeated delays;
- new ideas created;
- projects started/paused/completed;
- candidate behavioral insights.

AI proposes at most a few high-confidence changes for next week.

---

## 12. Personal learning model

We divide knowledge into four confidence levels:

### Observation
Direct event: `Action X postponed 3 times.`

### Pattern candidate
Derived: `Long tasks may be postponed more often.`

### User-confirmed insight
User agrees: `Tasks over ~60 minutes are hard to start.`

### Operating preference
Actionable rule accepted by user: `Default generated Next Actions to ≤ 45 minutes.`

Only confirmed/strong preferences should significantly alter future planning by default.

---

## 13. Feedback controls

On recommendations:
- Accept
- Edit
- Not now
- Wrong assumption
- Explain

On insights:
- Accurate
- Partly accurate
- Incorrect
- Do not use

AI must learn from explicit corrections.

---

## 14. Minimum event instrumentation

Events required for behavioral adaptation:
- capture_created;
- direction_confirmed;
- season_started/paused/ended;
- project_started/paused/completed;
- next_action_created/accepted/edited/rejected;
- focus_started/paused/completed;
- action_completed/postponed/dropped;
- distraction_captured;
- checkin_submitted;
- daily_close_completed;
- weekly_review_completed;
- ai_recommendation_shown/accepted/edited/rejected;
- ai_insight_confirmed/corrected/rejected.

---

## 15. Behavioral metrics

Do not optimize raw task count.

Candidate metrics:
- time to start after Next Action recommendation;
- proportion of actions completed/resized/dropped vs silently overdue;
- active project count trend;
- plan-to-actual effort calibration;
- recommendation correction rate;
- weekly user-reported clarity;
- Meaningful Progress Days;
- return rate after a missed day;
- percentage of incubated ideas that later become intentional projects.

---

## 16. Decisions made

1. LifeOS will diagnose friction before recommending more discipline.
2. Repeated delay triggers clarification/resizing, not punishment.
3. Focus Budget is an explainable planning indicator, not a pseudo-scientific score.
4. User autonomy is a product requirement.
5. AI behavioral conclusions use confidence levels and user confirmation.
6. Daily reflection is intentionally lightweight.
7. Weekly Reset is the main adaptation checkpoint.
8. AI interaction volume is not a success metric.
9. LifeOS must teach self-direction while assisting it.

---

## 17. Research basis noted in meeting

Product principles were informed by established work on implementation intentions / goal attainment and self-determination theory. These inform hypotheses; they do not justify assuming every intervention will work for every LifeOS user. Product-specific outcomes must be tested.

---

## 18. Next meeting

**Meeting #004 — Product & Technical Architecture**

Main question:

> What is the smallest data model, event system, AI architecture and UX architecture capable of delivering the complete LifeOS adaptation loop safely and reliably?
