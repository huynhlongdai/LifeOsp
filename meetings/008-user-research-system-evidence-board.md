# LifeOS Company Meeting #008 — User Research System & Evidence Board

**Date:** 2026-08-25  
**Status:** DECIDED / EXECUTION READY  
**Chair:** Product Director / CEO Agent  
**Participants:** UX Research Lead, Head of Product, Behavioral Science Lead, Data/Analytics Lead, Growth Lead, Monetization Lead, AI Product Lead, Skeptical Reviewer

## 1. Meeting objective

Define the research operating system that will decide whether LifeOS deserves to move from product thesis into an executable prototype and then into heavier engineering.

The company must distinguish:
- evidence;
- interpretation;
- assumption;
- enthusiasm.

---

# 2. Research rule

> **Do not ask whether people like the LifeOS idea. Study what happens when they actually become unclear, overloaded, stalled or off-course.**

We prioritize observed/recalled behavior over hypothetical feature preference.

Bad question:
- “Would you use an AI app that helps manage your life?”

Better questions:
- “Tell me about the last morning you did not know what to work on.”
- “What did you open first?”
- “What did you do next?”
- “What remained unresolved?”
- “What happened later that day?”

---

# 3. Research objectives

We need evidence for five layers.

## Layer A — Problem existence
Do the target states happen often enough to matter?

## Layer B — Shared job
Do different user types actually need a common clarity → action → adaptation loop?

## Layer C — Product effectiveness
Can LifeOS produce a better immediate decision/action than the user’s current method?

## Layer D — Repeat value
Do users want to return when plans change or when they get stuck again?

## Layer E — Commercial value
Does repeated usefulness become valuable enough to pay for?

---

# 4. Research participant matrix

Target initial discovery sample: **30 participants**.

We recruit by pain/state, not by AI fluency.

## Pain-state coverage

Aim for overlapping representation across:

1. Direction Seeker
2. Inconsistent Executor
3. Overloaded Mind
4. Daily Drifter
5. Life Rebalancer
6. Self-Improvement Consumer
7. Project / Opportunity Juggler
8. Transitioning Person

Participants may belong to multiple states.

## Life-context diversity

Where practical include:
- students;
- employed workers;
- freelancers;
- creators;
- founders/small business operators;
- parents/caregivers;
- people changing jobs/careers;
- people learning a new skill or pursuing a personal project.

Avoid defining the whole sample around productivity enthusiasts.

---

# 5. Discovery interview script

## Section 1 — Recent concrete episode

“Think about the most recent time you felt you had a lot to do but were not sure what to do next. Walk me through it from the beginning.”

Probe:
- Where were you?
- What time was it?
- What were you thinking about?
- Which apps/tools were open?
- What was competing for attention?
- What did you choose?
- How did you choose?
- Did you start?
- What happened afterward?

## Section 2 — Existing system

- Where do you keep tasks?
- Where do you keep ideas?
- Where do goals live?
- How do you decide what matters today?
- How do you know if a plan is realistic?
- What happens when you miss a day?
- What happens to old goals/projects?
- How often do you reorganize your system?

## Section 3 — Failure/recovery

“Tell me about something you intended to do recently but kept postponing or stopped doing.”

Probe:
- What did you believe the blocker was?
- Did you make the task smaller?
- Did you change the goal?
- Did you feel the task no longer mattered?
- What would have helped you restart?

Do not force the user into predefined friction categories during the first narrative.

## Section 4 — Direction

- When you are unsure what you want, what do you do?
- Who/what helps you choose a direction?
- How long does uncertainty typically last?
- Does it stop action or only create discomfort?

## Section 5 — Personal growth tools

- Which tools have you tried?
- Which did you stop using?
- When did you stop?
- What became annoying?
- What kept working even after novelty disappeared?

## Section 6 — Reaction test (after behavioral questions)

Show only a lightweight concept:

> “Imagine one system that helps you clarify what matters now, choose a realistic next action, and adjust when the plan breaks.”

Ask:
- What would you expect it to do first?
- What would make you distrust it?
- What should it never decide for you?
- What data would you be willing/unwilling to give it?

Do not ask “Would you buy it?” as the main pricing evidence.

---

# 6. Seven-day diary study

Target: 10–15 participants from discovery pool.

Daily logging should take <2 minutes.

Record only when one of these moments occurs:

```text
I DON'T KNOW WHAT TO DO
I HAVE TOO MUCH IN MY HEAD
I AM AVOIDING SOMETHING
MY PLAN JUST BROKE
I STARTED A NEW COMMITMENT
I CHANGED PRIORITY
I DROPPED/PAUSED SOMETHING
I FELT CLEAR AND MOVED FORWARD
```

Each entry:
- trigger;
- what they were trying to accomplish;
- what they did;
- tool/person used;
- result;
- optional voice note.

Goal: measure context and recurrence, not productivity score.

---

# 7. Concierge LifeOS study

Before building full automation, run 5–10 users through a semi-manual experience.

The researcher/AI system may prepare suggestions, but the user should experience the intended product loop.

## Session A — Clarity Reset

Input:
- current concerns/commitments/brain dump.

Output:
- clarified items;
- immediate direction/priority;
- explicit Not Now;
- one Next Action.

## Session B — NOW

24–48 hours later:
- check current capacity/context;
- recommend/confirm next action;
- observe whether user starts.

## Session C — Get Unstuck

When a selected action stalls:
- classify blocker with user;
- resize/unblock/replan/drop;
- observe restart.

## Session D — Weekly Adapt

End of week:
- compare plan vs reality;
- surface 1–3 useful adjustments;
- user accepts/edits/rejects.

---

# 8. Evidence Board schema

Every major product assumption gets a record.

```yaml
id: HYP-001
hypothesis: "Users across multiple pain states benefit from one shared NOW loop"
status: untested | weak | mixed | supported | rejected
segment: [states]
evidence_for:
  - interview / diary / behavior / payment
counter_evidence:
  - ...
confidence: low | medium | high
risk_if_wrong: low | medium | high
next_test: ...
decision: ...
owner: ...
updated_at: ...
```

## Evidence quality hierarchy

Higher weight:
1. repeated real behavior;
2. observed prototype behavior;
3. repeated usage;
4. payment/retention;
5. concrete past-event interviews.

Lower weight:
6. stated preference;
7. survey rating;
8. social-media comment;
9. founder intuition;
10. team opinion.

None are useless; they simply carry different weights.

---

# 9. Initial hypothesis registry

## HYP-001 — Shared loop
Different segments can benefit from the same Capture → Clarify → Choose → Act → Reflect → Adapt kernel.

**Risk:** HIGH

## HYP-002 — NOW creates immediate value
Showing a small number of context-aware options reduces time/effort required to choose what to do next.

**Risk:** HIGH

## HYP-003 — Not Now reduces attention conflict
Safely parking non-priority commitments lowers perceived mental load without causing fear of forgetting.

**Risk:** MEDIUM

## HYP-004 — Friction diagnosis improves recovery
When an action repeatedly stalls, diagnosis + resize/unblock/drop is more useful than reminder pressure.

**Risk:** HIGH

## HYP-005 — Weekly adaptation compounds value
Users perceive increasing value when the system learns from plan-vs-reality history.

**Risk:** VERY HIGH / MOAT-RELATED

## HYP-006 — Minimal logging is sufficient
LifeOS can learn enough from events + lightweight check-ins without requiring extensive journaling/data maintenance.

**Risk:** HIGH

## HYP-007 — Users accept AI guidance with control
Users will use meaningful recommendations when they can see why, edit/reject and correct assumptions.

**Risk:** HIGH

## HYP-008 — Failure recovery drives retention
A system that is useful after a missed day/failed plan can retain users better than one centered on perfect streaks.

**Risk:** HIGH

## HYP-009 — Problem-led acquisition works across segments
Different problem landing pages can route users into a shared product kernel without confusing positioning.

**Risk:** MEDIUM

## HYP-010 — Compounding intelligence can monetize
Long-term adaptive intelligence is valuable enough for a paid tier after users experience repeated improvement.

**Risk:** VERY HIGH / BUSINESS

---

# 10. Interview analysis tags

Tag evidence by:

## Trigger
- morning planning;
- new task arrives;
- deadline;
- unexpected event;
- low capacity;
- many options;
- life transition;
- failed previous plan;
- new idea/opportunity.

## Problem state
- unclear;
- overloaded;
- drifting;
- stalled;
- inconsistent;
- off-course;
- distracted;
- unbalanced.

## Existing workaround
- mental memory;
- paper;
- notes;
- task manager;
- calendar;
- journal;
- AI chat;
- friend/partner/coach;
- avoidance;
- no system.

## Desired outcome
- clarity;
- confidence;
- start action;
- reduce anxiety/mental load;
- protect focus;
- make realistic plan;
- recover;
- decide to stop;
- see progress.

## Friction
- setup burden;
- too many options;
- giant backlog;
- reminders ignored;
- inaccurate plan;
- tool fragmentation;
- no prioritization;
- plan not connected to goals;
- system does not adapt;
- loss of trust;
- privacy concern.

---

# 11. Prototype test plan

Prototype only the four experiences approved in Meeting #007.

## Clarity Reset test

Success signals:
- user says resulting map reflects reality;
- user can identify what matters now;
- user is comfortable with items moved to Not Now;
- user reaches a concrete action without needing to understand the whole system.

## NOW test

Measure:
- time to first useful action;
- number of choices shown;
- accept/edit/alternative rate;
- action-start behavior;
- clarity before/after.

## Get Unstuck test

Measure:
- does the user agree with blocker hypothesis?
- does intervention create a smaller/better action?
- does the user restart?
- does user feel judged/controlled?

## Weekly Adapt test

Measure:
- accuracy of plan-vs-reality summary;
- useful vs obvious/noisy insight;
- accepted edits;
- actual next-week behavior.

---

# 12. Research anti-bias rules

1. Do not recruit only productivity enthusiasts.
2. Do not show polished UI before problem interviews.
3. Do not interpret feature enthusiasm as product demand.
4. Record negative evidence prominently.
5. The founder/user is a valid dogfood case but not market proof.
6. Do not force all segments into one kernel if evidence shows they need materially different jobs.
7. Do not discard a segment because it dislikes AI; AI is implementation, not the job.
8. Do not treat neurodivergence or mental-health labels as required segmentation for the general product.
9. Do not use task count as success.
10. Every major conclusion needs counter-evidence review by Skeptical Reviewer.

---

# 13. Provisional evidence gates

These are decision aids, not universal scientific thresholds.

## Gate A — Build interactive prototype
Proceed when:
- repeated evidence exists for at least 3 state transitions;
- at least 2–3 different user contexts describe a shared clarity/action problem;
- current workarounds show meaningful friction;
- team can articulate one narrow value event.

## Gate B — Build executable alpha
Proceed when prototype/concierge studies show:
- users can reach a useful Next Action with little explanation;
- users from multiple states understand NOW;
- at least some stalled users successfully restart after intervention;
- Not Now is understood as safe parking, not deletion;
- no major autonomy/trust pattern blocks use.

## Gate C — Private beta
Proceed when:
- users return without researcher prompting;
- Weekly Adapt produces changes users actually carry forward;
- logging burden remains low;
- recommendation quality begins to improve with history;
- at least one repeated-value cohort emerges.

## Gate D — Paid beta
Proceed when:
- repeated value is visible over multiple weeks;
- users can explain what they would lose if Pro disappeared;
- payment experiments produce real transactions;
- AI/infrastructure cost is measured.

---

# 14. Recruitment strategy

Initial channels may include:
- existing personal network;
- student/community groups;
- creator/freelancer communities;
- productivity/self-improvement communities;
- career-transition groups;
- small business/founder communities;
- organic problem-led content.

Recruit by the problem story, not “help us test an AI productivity app.”

Example:

> “We’re researching moments when people have many important things to do but still don’t know what to do next. We want to understand what actually happens, not sell you an app.”

---

# 15. Data to capture from research

For each participant:
- anonymized participant ID;
- relevant life context;
- pain-state tags;
- current tool stack;
- concrete episodes;
- workarounds;
- friction;
- frequency estimate;
- severity estimate;
- prototype actions;
- trust/correction behavior;
- value moment;
- willingness-to-pay evidence only when tested;
- consent notes.

Avoid collecting unnecessary sensitive personal data.

---

# 16. Decisions made

1. Research starts from concrete past behavior, not LifeOS feature reactions.
2. Initial discovery sample target remains 30 diverse participants.
3. Add a 7-day diary study to observe recurrence/context.
4. Run a Concierge LifeOS study before full adaptive automation.
5. Create an Evidence Board with explicit counter-evidence.
6. Ten major hypotheses are now registered.
7. Prototype only Clarity Reset, NOW, Get Unstuck and Weekly Adapt.
8. Heavy engineering is gated by behavior evidence, not meeting enthusiasm.
9. Negative evidence must be preserved and reviewed.
10. Research data collection should be privacy-minimal.

---

# 17. Immediate work assignments

### UX Research Lead
- participant screener;
- interview guide;
- consent/research note template;
- recruitment matrix.

### Product Analytics
- Evidence Board schema;
- hypothesis registry;
- research tagging taxonomy.

### UX Director
- low-fidelity prototype for four experiences.

### AI Product Lead
- concierge prompt/structured output contracts.

### Behavioral Science Lead
- intervention hypothesis cards.

### Growth
- problem-led recruitment copy and channels.

### Skeptical Reviewer
- counter-evidence review after every 5 interviews.

### CEO/Product Director
- do not authorize full product build before Gate B evidence.

---

# 18. Next company meeting

**Meeting #009 — MVP Scope & Experience Architecture**

Question:

> Assuming the research hypotheses are directionally correct, what is the smallest coherent LifeOS product we can prototype and later build without recreating a giant productivity suite?
