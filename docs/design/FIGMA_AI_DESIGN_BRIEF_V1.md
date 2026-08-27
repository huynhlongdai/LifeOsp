# LifeOS — Figma AI Design Brief V1

Status: CANONICAL DESIGN INPUT
Updated: 2026-08-27
Audience: Figma AI / product designer / UX agent

## 1. Product in one sentence

LifeOS is a personal operating system that helps a person understand what matters, reduce overload, choose a realistic next action, act, reflect on reality, and adapt without creating more system-management work.

Core loop:

`CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT`

Primary product promise:

> Know what matters. Know what to do next.

The interface should feel like a calm navigator, not a productivity dashboard.

---

## 2. User problem

LifeOS must serve different people who may be in different problem states:

- unclear about direction;
- does not know what to do today;
- overloaded by thoughts/information/commitments;
- procrastinating despite having goals;
- repeatedly starts and abandons goals;
- needs to rebalance life priorities;
- consumes knowledge but does not apply it;
- manages several projects/opportunities;
- is recovering after missing days or falling out of rhythm.

Do not visually design for only founders, AI power users or project-heavy people.

---

## 3. Design philosophy

Every screen should reduce at least one of these:

1. decisions the user must make;
2. things the user must remember;
3. things competing for attention.

If a design increases all three, redesign it.

UX hierarchy for major screens:

1. WHAT MATTERS NOW
2. WHAT LIFEOS RECOMMENDS
3. WHY
4. WHAT THE USER CAN DO
5. DETAILS / EVIDENCE — progressively disclosed

LifeOS is not an oracle. The user owns direction and commitments. The system reduces friction, proposes, explains, observes and adapts.

---

## 4. Product personality

LifeOS should feel:

- calm;
- intelligent;
- precise;
- premium but restrained;
- trustworthy;
- supportive without being sentimental;
- human but not chatty;
- focused;
- spacious;
- evidence-aware.

Avoid:

- motivational-guru tone;
- game-like streak pressure;
- sci-fi AI control-room aesthetic;
- neon gradients everywhere;
- excessive glassmorphism;
- dense KPI dashboards;
- enterprise project-management visual language;
- default chatbot home page;
- giant life-score gauges.

---

## 5. Platform / responsive strategy

LifeOS is currently a responsive React Web/PWA.

### Mobile reference

Primary frame: `390 × 844`.

Behavior:

- bottom navigation;
- one-column content;
- one obvious primary action;
- large tap targets;
- bottom sheets for evidence/correction/lightweight editing;
- full-screen Focus Mode;
- fast Capture;
- safe-area aware;
- never squeeze desktop tables into mobile cards.

### Desktop reference

Primary frame: `1440 × 1024`.

Behavior:

- persistent left navigation;
- controlled central content width;
- optional context/evidence right rail;
- split views only when cognitively helpful;
- keyboard-friendly;
- avoid full-width dashboard walls.

### Responsive rule

Mobile and desktop must express the same product model. Do not design separate applications.

---

## 6. Primary information architecture

Primary navigation:

1. NOW
2. DIRECTION
3. EXECUTE
4. REFLECT
5. ME

Secondary access:

- Inbox / Capture
- Incubator / Not Now
- Ask LifeOS
- Settings / Privacy / Memory

Do not use these as top-level MVP navigation:

- Tasks
- Habits
- Goals
- Journal
- Notes
- Calendar
- Finance
- Health
- AI Chat

These may be underlying objects or later capabilities, not the mental model of the current interface.

---

## 7. Key domain concepts the UI must understand

### Direction
Where the user is intentionally heading.

### Current Season
The current 6–16 week focus period. It protects a limited set of priorities rather than treating all goals equally.

### Outcome
A measurable result under the current Season.

### Project
A bounded body of work supporting an Outcome.

### Action
The executable unit. NOW recommends one primary ready Action.

### Capture
Immutable raw input: thoughts, brain dump, quick note, distraction.

### Interpretation
AI/user-reviewed structured understanding of a Capture. It is editable/versioned and does not replace the original Capture.

### Incubator / Not Now
A protected place for ideas/possible projects that are intentionally not active now. Not Now is success, not failure.

### Recommendation
A system suggestion backed by stored evidence. The user may Accept, Edit, Not Now, mark Wrong Assumption, or Explain.

### Focus Session
A period of focused work linked to an Action. Ending Focus does not automatically mean the Action is completed.

### Insight / Operating Preference
A pattern or user-confirmed rule learned from real behavior, never a hidden personality diagnosis.

---

## 8. Core user journeys

### Journey A — Unclear → Direction

Welcome
→ immediate NeedState
→ Quick Context
→ Brain Dump
→ AI interpretation
→ user correction
→ trade-off
→ Active / Maintain / Not Now
→ Current Season proposal
→ explicit confirmation
→ NOW

### Journey B — NOW → Focus

NOW Ready
→ Why this? optional
→ Accept
→ Start Focus
→ distraction capture if needed
→ end / interrupt Focus
→ explicit Action result later
→ updated NOW

### Journey C — AI unavailable

Brain Dump saved
→ AI processing fails
→ clear saved-data state
→ Retry OR Continue manually
→ user completes interpretation manually
→ journey continues normally

### Journey D — Stuck → Recovery

Evidence of stall
→ one friction question
→ one intervention
→ user accepts/edits
→ return to NOW

### Journey E — Weekly Adapt

Reality
→ movement
→ max 3 pattern candidates
→ user confirms/corrects
→ max 3 adjustments
→ confirm next-week direction/focus
→ first Next Action

---

## 9. Screen matrix

Design the following screen families. Frames may share components and responsive templates.

| Area | Screen / State | Mobile | Desktop | Priority |
|---|---|---:|---:|---:|
| Clarity | Welcome / immediate need | ✓ | ✓ | P0 |
| Clarity | Quick Life Context | ✓ | ✓ | P0 |
| Clarity | Brain Dump | ✓ | ✓ | P0 |
| Clarity | AI processing | ✓ | ✓ | P0 |
| Clarity | AI unavailable/manual fallback | ✓ | ✓ | P0 |
| Clarity | Interpretation review | ✓ | ✓ | P0 |
| Clarity | Ambiguous interpretation item | ✓ | ✓ | P0 |
| Clarity | Trade-off / Focus Conflict | ✓ | ✓ | P0 |
| Direction | Current Season proposal | ✓ | ✓ | P0 |
| Direction | Current Direction / Season | ✓ | ✓ | P0 |
| NOW | Ready | ✓ | ✓ | P0 |
| NOW | No Direction | ✓ | ✓ | P0 |
| NOW | No Ready Action | ✓ | ✓ | P0 |
| NOW | Blocked | ✓ | ✓ | P0 |
| NOW | Recovery after missed days | ✓ | ✓ | P0 |
| NOW | Nothing important right now | ✓ | ✓ | P0 |
| NOW | Why This / Evidence | ✓ | ✓ | P0 |
| Execute | Action edit | ✓ | ✓ | P0 |
| Execute | Wrong assumption / Not Now | ✓ | ✓ | P0 |
| Execute | Outcome / Project context | ✓ | ✓ | P0 |
| Focus | Active Focus | ✓ | ✓ | P0 |
| Focus | Capture distraction | ✓ | ✓ | P0 |
| Focus | Interrupted / abandoned / ended | ✓ | ✓ | P0 |
| Execute | Result complete / partial / postpone / block / drop | ✓ | ✓ | P0 |
| Reflect | Daily Close | ✓ | ✓ | P0 |
| Recover | Get Unstuck — evidence + friction | ✓ | ✓ | P0 |
| Recover | Get Unstuck — intervention | ✓ | ✓ | P0 |
| Reflect | Weekly Reset — Reality | ✓ | ✓ | P0 |
| Reflect | Weekly Reset — Movement | ✓ | ✓ | P0 |
| Reflect | Weekly Reset — Pattern candidates | ✓ | ✓ | P0 |
| Reflect | Weekly Reset — Adjustment | ✓ | ✓ | P0 |
| Reflect | Weekly Reset — Next week | ✓ | ✓ | P0 |
| Reflect | Insight confirmation/correction | ✓ | ✓ | P0 |
| ME | Personal Operating Model overview | ✓ | ✓ | P0 |
| ME | Operating Preferences | ✓ | ✓ | P0 |
| ME | Memory inspector | ✓ | ✓ | P0 |
| ME | Memory controls | ✓ | ✓ | P0 |
| Secondary | Incubator / Not Now | ✓ | ✓ | P0 |
| Secondary | Inbox / Captures | ✓ | ✓ | P0 |
| Secondary | Ask LifeOS | ✓ | ✓ | P0 |
| Settings | Privacy / Memory / AI controls | ✓ | ✓ | P0 |

Do not try to make every state visually unique. Reuse system primitives.

---

## 10. Representative screens to design FIRST

Before expanding the full matrix, lock the design language with these representative screens:

1. Mobile Welcome / NeedState
2. Mobile Brain Dump
3. Mobile Interpretation Review
4. Mobile NOW Ready
5. Mobile Focus Active
6. Mobile Weekly Reset Pattern Candidate
7. Desktop Interpretation Review split view
8. Desktop NOW Ready with optional evidence rail
9. Desktop Weekly Reset Reality/Movement
10. Desktop ME / Operating Preferences

Only after product review of these representative screens should the agent polish the rest of the system.

---

## 11. NOW — detailed UX contract

NOW is the default home and must never become an infinite task list.

### Ready

Show:

- Current Season context — subdued;
- one primary Action — dominant;
- done condition;
- estimated time;
- semantic confidence;
- primary CTA;
- `Why this?`;
- Edit;
- Not Now;
- Wrong assumption.

Optional alternatives are collapsed and should not compete visually.

### No Direction

Copy idea:

`I do not have enough context to decide what matters most yet.`

CTA:

- Start a 2-minute Clarity Reset
- Choose manually

### No Ready Action

Do not invent work. Explain what is missing and offer the smallest useful setup action.

### Blocked

Surface the unblock action rather than repeatedly showing a blocked task.

### Recovery

After missed days, do not create overdue debt.

Show:

- current direction;
- one useful restart action;
- optional `What changed?`.

### Nothing important now

Copy idea:

`Nothing important needs your attention right now.`

Optional actions:

- maintain;
- reflect;
- close the app.

---

## 12. Recommendation Card contract

Required content:

- recommendation title;
- proposed action/decision;
- success condition;
- effort/time if relevant;
- minimal context;
- semantic confidence;
- primary CTA;
- correction actions.

Actions:

- Accept / Start
- Edit
- Not Now
- Wrong assumption
- Explain / Why this?

Never show fake precision such as `92.7% best choice`.

---

## 13. Why This / evidence model

`Why this?` is required when prioritization or commitment is materially affected.

Show product evidence such as:

- current Outcome;
- explicit current bottleneck;
- available capacity when explicitly known;
- observed history;
- alternative considered when useful;
- direct user input.

Confidence classes:

1. Direct evidence
2. Strong pattern
3. Possible pattern
4. Suggestion / hypothesis

Do not expose raw model probability or hidden reasoning.

Suggested visual pattern:

Mobile: bottom sheet / full-height sheet.
Desktop: contextual right panel or expandable section.

---

## 14. Brain Dump / Clarity design details

Prompt:

`Put everything here. You do not need to organize it.`

Capture should feel immediate and safe.

Design states:

- empty with lightweight examples;
- typing/capturing;
- saved;
- processing;
- processing timeout;
- interpretation review;
- ambiguous item;
- manual fallback.

The raw Capture remains visible/read-only during interpretation review.

Desktop interpretation may use split view:

- left: raw Capture;
- right: structured interpretation.

Mobile should use progressive sections rather than cramped split panes.

---

## 15. Trade-off / Focus Conflict

Goal: reduce active commitments.

Candidate items begin unassigned. The user explicitly classifies them:

- Active
- Maintain
- Not Now

Active should be visually strongest.
Maintain should be neutral.
Not Now should feel protected/safe, never like deletion/failure.

Copy concept:

`You are currently trying to protect several directions at once. Choose what deserves active attention now; the rest will stay safe.`

Do not automatically select Active for the user.

---

## 16. Focus Mode contract

Focus Mode removes system noise.

Required:

- Action title;
- done condition;
- planned minutes;
- optional timer;
- `You do not need to do` boundary when useful;
- Capture distraction;
- End / interrupt controls.

Distraction Capture should be extremely fast and return the user to Focus immediately.

Avoid showing:

- backlog;
- unrelated navigation;
- motivational pressure;
- analytics during focus.

Finishing Focus is not visually equal to completing the Action.

---

## 17. Get Unstuck contract

Do not start with advice.

Step 1 — Evidence:

`This action has moved 3 times.`

Step 2 — One question:

`What is making it hard to move?`

Options:

- unclear first step;
- too large;
- blocked;
- insufficient capacity;
- another priority matters more;
- no longer important;
- other.

Step 3 — One intervention.

Example:

Original: `Create launch strategy`

Smaller next step: `List the 3 launch audiences we would test first`

`15 min`

CTA: `Use this`

---

## 18. Weekly Reset contract

Weekly Reset is a guided story, not a dashboard.

### Reality
What was planned vs what happened.

### Movement
What actually advanced / stalled / was intentionally dropped.

### Pattern candidates
Maximum 3. Every pattern has evidence, confidence and user correction.

### Adjustment
Maximum 3 proposed operating changes.

### Next week
Confirm direction, focus allocation and first Next Action.

The user should leave with less cognitive load.

---

## 19. ME / Personal Operating Model

This page should not look like a personality test.

Possible sections:

- confirmed working preferences;
- observed patterns requiring confirmation;
- planning tendencies;
- focus/time patterns;
- recommendation rules currently active;
- memories used for personalization.

A tentative insight must look different from a confirmed preference.

Controls:

- Confirm
- Partly accurate
- Incorrect
- Edit
- Delete
- Do not use

---

## 20. Component library

Create reusable Figma components with Auto Layout and variants:

### Navigation

- DesktopSideNav
- MobileBottomNav
- ContextHeader
- SecondaryMenu

### Decision

- RecommendationCard
- EvidenceChip
- ConfidenceBadge
- WhyThisPanel
- CorrectionMenu
- ConfirmChangeSheet

### Life structure

- DirectionCard
- SeasonCard
- OutcomeCard
- ProjectCard
- ActionCard
- NotNowCard

### Capture / AI

- CaptureComposer
- InterpretationItem
- AIProcessingState
- AIErrorState

### Execution / reflection

- FocusSessionCard
- FocusTimer
- DistractionCapture
- ResultSelector
- FrictionSelector
- InsightCard
- MemoryCard
- CapacityBar

### System

- EmptyState
- RecoveryState
- InlineError
- Toast
- Skeleton
- BottomSheet
- SidePanel

Use variants instead of creating new one-off components per screen.

---

## 21. Design tokens / variables

Use Figma Variables.

### Colors

- `surface/base`
- `surface/raised`
- `surface/subtle`
- `text/primary`
- `text/secondary`
- `text/tertiary`
- `border/default`
- `border/subtle`
- `border/focus`
- `accent/primary`
- `semantic/success`
- `semantic/caution`
- `semantic/danger`
- `semantic/info`
- `evidence/direct`
- `evidence/strong`
- `evidence/possible`
- `evidence/suggestion`

Do not let semantic state depend only on color.

### Typography

Create styles/tokens:

- Display
- H1
- H2
- H3
- Body
- Body Strong
- Label
- Caption
- Numeric / Timer

Typography should support Vietnamese diacritics cleanly.

### Spacing

Use 4/8-based semantic spacing scale.

### Radius

Use a limited semantic set:

- Control
- Card
- Sheet

### Elevation

- Base
- Raised
- Overlay

Do not overuse shadows.

---

## 22. Theme

Build foundations so both light and dark themes are possible using variables.

The first design exploration may show one primary theme plus a representative dark/light counterpart, but do not create two unrelated systems.

---

## 23. Copy style

Tone:

- concise;
- calm;
- evidence-based;
- non-judgmental;
- not over-friendly;
- not motivational by default.

Preferred examples:

- `This action has moved 3 times.`
- `Something needs to move.`
- `Your data is saved.`
- `Nothing important needs your attention right now.`
- `This may no longer be worth protecting. Pause it?`

Avoid:

- `Crush your goals!`
- `Keep your streak alive!`
- `AI knows what is best.`
- `You are only 62% productive.`

Use realistic Vietnamese product copy in mock screens, while Figma layer/component naming can remain English.

---

## 24. AI failure / correction states

Design explicitly:

- loading / processing;
- timeout;
- provider unavailable;
- malformed interpretation;
- user correction;
- Wrong assumption;
- recommendation rejected;
- memory corrected/deleted;
- repeated correction → proposed Operating Preference.

When AI fails:

`I could not finish that analysis. Your data is saved.`

CTA:

- Retry
- Continue manually

Never freeze the entire app behind AI processing.

---

## 25. Accessibility requirements

- WCAG-oriented contrast;
- 44px+ touch targets where applicable;
- visible keyboard focus;
- proper heading hierarchy;
- not color-only status;
- reduced-motion variant;
- text scaling tolerance;
- screen reader labels/annotations;
- avoid small low-contrast metadata;
- optional timer must not create pressure by default.

---

## 26. Figma file organization

Pages:

1. `00 — Product Brief`
2. `01 — IA & User Flows`
3. `02 — Foundations`
4. `03 — Components`
5. `04 — Mobile / Clarity`
6. `05 — Mobile / NOW & Execute`
7. `06 — Mobile / Reflect & ME`
8. `07 — Desktop / Clarity`
9. `08 — Desktop / NOW & Execute`
10. `09 — Desktop / Reflect & ME`
11. `10 — Responsive Patterns`
12. `11 — Prototype Flows`
13. `12 — Edge & AI States`
14. `13 — Dev Handoff`

---

## 27. Prototype requirements

Create clickable prototypes for:

### Prototype A
Welcome → Brain Dump → Interpretation → correction → trade-off → Season confirm → NOW.

### Prototype B
NOW → Why this? → Accept → Focus → distraction capture → end Focus.

### Prototype C
Brain Dump → AI timeout → Continue manually → finish Clarity flow.

### Prototype D
Recovery after missed days → one restart Action → Focus.

### Prototype E
Weekly Reset → candidate insight → correction → adjustment → next week.

---

## 28. Do not invent

Do not add without product approval:

- public social feed;
- followers;
- teams;
- XP/points/streak economy;
- finance dashboard;
- health/wearable dashboard;
- calendar replacement;
- email inbox replacement;
- marketplace;
- plugin manager;
- autonomous agent control center;
- many AI personas;
- psychological diagnosis;
- giant life-score / radar dashboard;
- chatbot as home;
- gamified punishment;
- notification overload.

---

## 29. Design delivery phases

### Phase 1 — Structure

Deliver:

- IA;
- user-flow map;
- design principles;
- visual direction options;
- token proposal;
- component inventory.

Do not polish all screens yet.

### Phase 2 — Design-language lock

Design the 10 representative screens listed above for mobile/desktop.

Product review gate:

- hierarchy;
- cognitive load;
- NOW dominance;
- Clarity flow;
- AI trust;
- responsive logic;
- component consistency.

### Phase 3 — Full system

Expand to the full screen/state matrix using approved components and tokens.

### Phase 4 — Prototype / handoff

- connect required flows;
- annotate responsive behavior;
- accessibility notes;
- component states;
- dev measurements/tokens;
- unresolved product questions.

---

## 30. Definition of a successful design

The design succeeds when a first-time observer can understand that LifeOS is primarily about:

- clarity;
- choosing what matters;
- knowing what to do next;
- doing it with focus;
- recovering without guilt;
- learning from reality;

and does NOT mistake it for:

- Todoist;
- Notion;
- a habit tracker;
- a project management tool;
- an AI chatbot with side navigation.
