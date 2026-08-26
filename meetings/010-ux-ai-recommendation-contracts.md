# LifeOS Company Meeting #010 — UX System, Interaction States & AI Recommendation Contracts

**Date:** 2026-08-26  
**Status:** DECIDED / TO VALIDATE  
**Participants:** Product Director, UX Director, Behavioral Science Lead, AI Product Architect, Design Systems Lead, Engineering Lead, Accessibility Reviewer, Skeptical Reviewer

## 1. Objective

Define exact interaction rules so LifeOS can be helpful without feeling controlling, magical, vague or unpredictable.

Research basis reviewed in this meeting includes human-AI interaction guidance from Microsoft HAX and Google PAIR: set expectations, make AI output understandable, support feedback/control, handle errors gracefully, and help users calibrate trust rather than blindly trust automation.

---

## 2. Core UX stance

LifeOS is not an oracle.

It is a decision-support system that:
- compresses complexity;
- proposes a route;
- explains material trade-offs;
- observes what happened;
- accepts correction;
- adapts over time.

The user owns direction. LifeOS owns reducing friction around clarity, prioritization, execution and learning.

---

## 3. Information hierarchy

Every major screen follows the same hierarchy:

```text
1. WHAT MATTERS NOW
2. WHAT LIFEOS RECOMMENDS
3. WHY
4. WHAT I CAN DO
5. DETAILS / EVIDENCE (optional)
```

Do not lead with charts, scores, history or AI prose.

---

## 4. Recommendation Card contract

Every material recommendation is represented by one shared component.

### Required fields
- recommendation title;
- action / decision being suggested;
- estimated effort/time when relevant;
- success condition;
- source context (minimal);
- confidence class;
- primary CTA;
- correction/rejection controls.

### Example

```text
RIGHT NOW

Select 3 products for the first test
40 min · High impact

Done means:
3 products + source links + 1 reason each

Why this?
Your content workflow is blocked until a real product is selected.

[Start]
Edit · Not now · Wrong assumption
```

### Never show
- fake precision such as `92.7% best choice`;
- unexplained life scores;
- pseudo-psychological labels;
- aggressive urgency created by the AI itself;
- AI-generated claims presented as user facts.

---

## 5. Confidence model

Do not expose raw model probability.

Expose semantic confidence based on evidence quality.

### Level A — Direct
Based on explicit user input or hard event data.

Example:
`You postponed this action 3 times.`

### Level B — Strong pattern
Repeated behavior across enough events.

Example:
`In the last 4 weeks, actions estimated over 90 minutes were completed much less often.`

### Level C — Possible pattern
Tentative inference requiring confirmation.

Example:
`One possible pattern: large ambiguous actions may be harder for you to start.`

### Level D — Suggestion / hypothesis
Generated option with limited personal evidence.

Example:
`Would reducing the action to 20 minutes make starting easier?`

The UI wording and visual treatment must clearly distinguish these classes.

---

## 6. Why This interaction

`Why this?` is mandatory for any recommendation that changes prioritization or commitment.

Expanded explanation uses three layers:

```text
WHY THIS

Current goal
→ Publish first affiliate experiments

Current bottleneck
→ No products selected

Capacity fit
→ You said you have ~45 min available

Alternative considered
→ Research more tools
Reason not selected: does not unblock publishing
```

Do not show internal chain-of-thought or hidden model reasoning. Show concise product-level evidence and decision factors only.

---

## 7. User correction controls

### Recommendation feedback
- Start / Accept
- Edit
- Not now
- Wrong assumption
- Explain

### Insight feedback
- Accurate
- Partly accurate
- Incorrect
- Do not use

### Memory controls
- Edit
- Delete
- Do not use for recommendations

### Principle
When a user corrects the system, LifeOS should visibly acknowledge the correction and say what changes.

Example:

```text
Updated.
I will stop treating afternoons as low-focus time.
```

Do not respond with generic `Thanks for your feedback` if the feedback actually changes personalization.

---

## 8. NOW screen states

NOW requires designed states, not one happy-path page.

### State 1 — Ready
A high-quality Next Action exists.

Show:
- one primary action;
- optional 1–2 alternatives collapsed;
- Current Season context;
- Not Now protection.

### State 2 — No direction
LifeOS lacks enough context to recommend safely.

Show:
`I do not have enough context to decide what matters most yet.`

CTA:
- 2-minute Clarity Reset;
- choose manually.

### State 3 — Over capacity
Demand exceeds learned/declared capacity.

Show trade-off, not more tasks.

```text
Today currently requires ~4h 20m.
You have ~2h available.

Something needs to move.
```

CTA:
- simplify plan;
- choose what to protect;
- manual edit.

### State 4 — Blocked
Primary action has missing dependency.

Surface the unblock action instead of repeating the blocked action.

### State 5 — Recovery
User has been away / missed days.

No backlog debt.

Show:
- current direction;
- one useful action;
- optional `What changed?`.

### State 6 — Nothing urgent
Do not invent productivity.

Show:
`Nothing important needs your attention right now.`

Optional:
- maintain;
- reflect;
- rest/close app.

---

## 9. Brain Dump states

### Empty
Prompt with examples but avoid teaching users a taxonomy.

`Put everything here. You do not need to organize it.`

### Capturing
Fast plain text first; AI processing is secondary.

### Processing
Never block capture.
Show progress language:
`Organizing 12 items...`

### Interpretation review
AI extraction must be editable before becoming durable structure.

Example groups:
- commitment;
- project/idea;
- concern;
- action;
- question;
- reference.

### Ambiguous
Mark uncertain extraction:
`Not sure what this is.`

Allow:
- keep as capture;
- classify;
- ask AI.

---

## 10. Focus Mode states

Focus Mode removes system noise.

Required:
- action title;
- timer optional;
- done condition;
- `You do not need to do` boundary;
- capture distraction;
- pause;
- finish.

### Pause reasons (optional, low friction)
- interruption;
- blocked;
- energy;
- changed priority;
- other.

### Finish
Ask:
`Did this create the intended result?`

Options:
- Yes;
- Partly;
- No / blocked.

This captures outcome quality rather than only timer completion.

---

## 11. Get Unstuck interaction

Never open with advice.

First present evidence:
`This action has moved 3 times.`

Then ask one diagnostic question:
`What is making it hard to move?`

Possible options:
- unclear first step;
- too large;
- blocked;
- insufficient capacity;
- another priority matters more;
- no longer important;
- other.

Then produce one intervention.

Example:

```text
You chose: Too large

Original
Create launch strategy

Smaller next step
List the 3 launch audiences we would test first

15 min

[Use this]
```

Avoid multi-step coaching conversations unless user asks for more help.

---

## 12. Weekly Reset UI

The Weekly Reset is a guided narrative, not a dashboard wall.

### Step 1 — Reality
- what was planned;
- what actually happened.

### Step 2 — Movement
- meaningful outcomes advanced;
- stalled/blocked work;
- things intentionally dropped.

### Step 3 — Pattern candidates
Max 3.

Each pattern shows:
- evidence;
- confidence class;
- user feedback.

### Step 4 — Adjustment
Max 3 proposed operating changes.

Example:
`Default generated Next Actions to ≤45 min.`

### Step 5 — Next week
Confirm:
- main direction;
- focus allocation;
- first Next Action.

The user should finish with less cognitive load than when they started.

---

## 13. AI loading and latency states

AI should never freeze the whole app.

### Fast operations
Use optimistic/local UI where safe:
- capture save;
- manual task/action edits;
- focus timer;
- check-ins.

### AI operations
Show meaningful status:
- `Finding commitments...`
- `Checking your current priorities...`
- `Comparing plan with what actually happened...`

Avoid theatrical fake thinking steps.

### Timeout
Fallback:
`I could not finish that analysis. Your data is saved.`

Actions:
- Retry;
- Continue manually.

Core execution must remain usable when AI is unavailable.

---

## 14. Wrong-AI recovery

Design for AI error as a normal state.

### Wrong interpretation
Inline edit and `Wrong assumption`.

### Wrong recommendation
User can reject without penalty.
Ask optional reason only when valuable.

### Repeated correction
If the same type of correction repeats, propose an operating preference.

Example:
`You have moved morning recommendations later 4 times. Should I default your focus window to 10:00–12:00?`

### Never
- argue with the user;
- hide contradictory evidence;
- repeatedly resurface rejected advice without new evidence.

---

## 15. Privacy-in-context

Explain data use where it matters, not only in settings.

Examples:

On Memory:
`Used to personalize future recommendations.`

On Calendar integration later:
`Used to estimate available time; LifeOS does not change events unless you explicitly enable that capability.`

On sensitive free text:
Give user control over whether an item enters long-term memory.

---

## 16. Design system primitives

P0 components:
- RecommendationCard
- EvidenceChip
- ConfidenceBadge
- DirectionCard
- SeasonCard
- OutcomeCard
- ActionCard
- NotNowCard
- CaptureComposer
- InterpretationItem
- FocusSessionCard
- FrictionSelector
- InsightCard
- MemoryCard
- CapacityBar
- EmptyState
- RecoveryState
- AIErrorState
- ConfirmChangeSheet

### UI rule
Do not create a unique visual language for every module. Reuse the same decision patterns so users learn the system quickly.

---

## 17. Tone system

LifeOS voice should be:
- calm;
- specific;
- non-judgmental;
- concise;
- evidence-aware;
- never motivational-speaker-like by default.

Preferred:
`You planned 5 focus blocks and completed 2. Your available time was lower than expected.`

Avoid:
`You crushed only 2 of 5 goals — let's hustle harder!`

Preferred:
`This may no longer be worth protecting. Pause it?`

Avoid:
`Do not give up! Keep your streak alive!`

---

## 18. Accessibility / cognitive load

Requirements:
- keyboard accessible web/PWA flows;
- clear focus states;
- sufficient contrast;
- do not encode state only by color;
- reduced motion support;
- large tap targets;
- screen reader labels;
- avoid dense multi-chart screens;
- default copy should be short;
- offer text size compatibility;
- avoid countdown pressure unless user explicitly chooses a timer.

---

## 19. Trust metrics

Track not only acceptance.

Important:
- `Why this?` open rate;
- recommendation edit rate;
- wrong-assumption rate;
- repeated-rejection rate;
- insight confirmation rate;
- memory correction/deletion;
- AI timeout/manual continuation;
- user-reported confidence;
- user-reported autonomy;
- recommendation reversal after acceptance.

High recommendation acceptance is not automatically good; users may over-trust AI.

---

## 20. Prototype acceptance tests

A prototype should demonstrate:

1. user can correct AI interpretation without restarting;
2. user can see why a recommendation was made;
3. user can reject AI and continue manually;
4. AI failure does not block core execution;
5. returning after missed days does not create guilt/backlog debt;
6. Weekly Reset can convert evidence into a user-confirmed rule;
7. Not Now reduces visible commitments;
8. NOW never becomes an infinite task list;
9. no important inference is presented as certain without evidence;
10. user can inspect/delete important memory.

---

## 21. Decisions made

1. Shared RecommendationCard becomes the core AI decision surface.
2. `Why this?` is required for material prioritization recommendations.
3. Confidence uses evidence classes, not raw model probability.
4. AI errors are first-class UX states.
5. Core product remains usable when AI fails.
6. User corrections must visibly change future behavior when applicable.
7. Weekly Reset is a guided story, not an analytics dashboard.
8. No backlog debt after absence.
9. No recommendation spam when nothing meaningful requires action.
10. UI must optimize trust calibration, not maximum AI acceptance.

## 22. Next meeting

**Meeting #011 — Data Model, Event Taxonomy & Personal Intelligence Engine**

Main question:

> What exact schema and event-derived logic are required for LifeOS to learn from plan-vs-reality without creating an opaque, invasive or over-engineered personal data system?
