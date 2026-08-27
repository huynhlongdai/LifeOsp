# Meeting #018 — Figma AI Design Handoff

Date: 2026-08-27
Status: APPROVED FOR DESIGN

## Objective

Prepare a complete, implementation-aware UI/UX handoff that can be given to a Figma AI design agent to design LifeOS across mobile and desktop without replaying historical product conversations.

## Roles represented

- Product Director
- UX Director
- Behavioral UX / Cognitive Load
- Design Systems Lead
- AI / Trust UX Lead
- Mobile/PWA UX Lead
- Desktop Information Architecture Lead
- Accessibility Reviewer
- Engineering / Implementation Reviewer
- Skeptical Product Reviewer

## Sources reviewed

- `HANDOFF.md`
- `docs/MVP_SCOPE_V1.md`
- `meetings/010-ux-ai-recommendation-contracts.md`
- current implemented Vertical Slice A + B0–B3 behavior
- issue #8 UX shell & design system

## Product design decision

LifeOS must not look or behave like a generic task manager, habit tracker, project-management dashboard, or AI chat wrapper.

The interface must communicate one core product job:

> Help the user move from unclear / overloaded / drifting / stalled to clear / prioritized / started / adjusted with the least cognitive overhead possible.

Design hierarchy:

1. What matters now
2. What LifeOS recommends
3. Why
4. What the user can do
5. Optional evidence/details

The interface should hide system complexity by default and expose it progressively.

## Form-factor strategy

### Mobile

Mobile is the fastest daily-use surface and should feel like a personal navigator.

- target frame: 390×844 as the primary mobile reference;
- bottom navigation: NOW / DIRECTION / EXECUTE / REFLECT / ME;
- one-column content;
- one dominant primary CTA per screen;
- bottom sheets for correction, evidence and lightweight edits where appropriate;
- large touch targets;
- Focus Mode should feel immersive and distraction-free;
- no dense dashboard grids.

### Desktop

Desktop is the deeper planning / review / editing surface.

- target frame: 1440×1024;
- persistent left navigation rail;
- main content width should remain controlled, not stretch into a dashboard wall;
- optional right contextual rail for evidence / Not Now / supporting context;
- multi-column layouts only when they reduce switching cost;
- primary action remains visually dominant;
- keyboard navigation and command-friendly flows are important.

### Responsive principle

Mobile and desktop are the same product model, not separate products. Do not create desktop-only concepts that cannot collapse coherently to mobile.

## Visual direction

Approved visual character:

- calm;
- premium but restrained;
- intelligent;
- human;
- high clarity;
- low visual noise;
- evidence-aware;
- not clinical;
- not gamified;
- not futuristic sci-fi;
- not motivational-speaker aesthetic.

Recommended art direction:

- neutral surfaces with subtle depth;
- one primary accent color plus semantic colors;
- generous spacing;
- rounded but not toy-like geometry;
- clear typography hierarchy;
- subtle motion only when it explains state changes;
- both light and dark themes should be possible, but the first design system should be theme-token driven rather than two unrelated visual systems.

Avoid:

- neon AI gradients everywhere;
- excessive glassmorphism;
- giant analytics dashboards;
- streak/fire/XP gamification;
- red overdue guilt UI;
- unexplained life scores;
- fake AI probability percentages;
- chat bubbles as the primary interaction model;
- excessive cards for every line of information.

## Primary information architecture

Primary navigation:

- NOW
- DIRECTION
- EXECUTE
- REFLECT
- ME

Secondary access:

- Inbox / Capture
- Incubator / Not Now
- Ask LifeOS
- Settings / Privacy / Memory

Tasks, habits, goals, journal, notes, calendar, finance and health are not primary navigation labels in MVP.

## Signature experiences

### 1. Clarity Reset

Brain Dump → AI interpretation → correction → trade-off → Active / Maintain / Not Now → Direction / Current Season.

### 2. NOW

One primary recommended Action with success condition, duration, Current Season context, evidence and correction controls.

### 3. Focus / Execution

Start from NOW → Focus Session → capture distraction without changing priority → explicitly finish/interruption → later record Action outcome.

### 4. Get Unstuck

Evidence of stall → one diagnostic question → one intervention → return to NOW.

### 5. Weekly Adapt

Planned vs actual → meaningful movement → max 3 pattern candidates → evidence/confidence → user-confirmed adjustments.

## Required design surfaces

The Figma system must cover, at minimum:

### Onboarding / Clarity

1. Welcome / immediate need
2. Quick Life Context
3. Brain Dump / Capture
4. AI processing / provider unavailable fallback
5. Interpretation review
6. Ambiguous interpretation item
7. Focus Conflict / trade-off
8. Direction / Current Season proposal
9. Direction confirmation

### NOW / Execute

10. NOW — ready
11. NOW — no direction
12. NOW — no ready action
13. NOW — blocked
14. NOW — recovery after missed days
15. NOW — nothing important right now
16. Why This / Evidence disclosure
17. Action edit
18. Wrong assumption / Not Now correction
19. Outcome / Project lightweight context
20. Focus Mode active
21. Focus distraction capture
22. Focus interrupted / abandoned / completed session state
23. Action result: completed / partial / postponed / blocked / dropped
24. Daily Close

### Reflect / Adapt

25. Get Unstuck evidence + friction selector
26. Get Unstuck intervention proposal
27. Weekly Reset — Reality
28. Weekly Reset — Movement
29. Weekly Reset — Pattern candidates
30. Weekly Reset — Adjustment
31. Weekly Reset — Next week confirmation
32. Insight confirmation / correction

### ME / Memory / Supporting

33. ME / Personal Operating Model overview
34. Operating Preferences
35. Memory inspector
36. Memory edit/delete/do-not-use controls
37. Incubator / Not Now
38. Inbox / captures
39. Ask LifeOS
40. Settings / Privacy / AI controls

The design agent may group these into flows/pages, but must not delete important states simply to reduce frame count.

## Shared component system

Required reusable components:

- AppShell
- MobileBottomNav
- DesktopSideNav
- TopContextBar
- RecommendationCard
- DirectionCard
- SeasonCard
- OutcomeCard
- ActionCard
- FocusSessionCard
- NotNowCard
- CaptureComposer
- InterpretationItem
- EvidenceChip
- ConfidenceBadge
- WhyThisPanel
- CorrectionMenu
- ConfirmChangeSheet
- FrictionSelector
- InsightCard
- MemoryCard
- CapacityBar
- EmptyState
- RecoveryState
- AIProcessingState
- AIErrorState
- InlineError
- Toast / acknowledgement
- BottomSheet / SidePanel

Components should use variants, not duplicated bespoke frames.

## Recommendation UX contract

A material recommendation should visually support:

- title;
- suggested action/decision;
- success condition;
- estimated effort/time where relevant;
- minimal source context;
- confidence class;
- primary CTA;
- Edit;
- Not Now;
- Wrong assumption;
- Explain / Why this?.

`Why this?` must show product-level evidence, not hidden chain-of-thought.

Confidence is semantic:

- Direct evidence
- Strong pattern
- Possible pattern
- Suggestion / hypothesis

Do not render raw model probability.

## AI and trust states

AI errors are first-class UI states.

Design:

- processing;
- timeout;
- invalid interpretation needing manual correction;
- provider unavailable;
- rejected recommendation;
- wrong assumption;
- corrected memory;
- repeated correction leading to a proposed preference.

Core capture and manual execution must remain usable while AI is unavailable.

When AI fails, preferred language:

> I could not finish that analysis. Your data is saved.

Actions:

- Retry
- Continue manually

## Behavioral UX decisions

- Not Now is a successful outcome.
- No guilt UI after missed days.
- Recovery is more important than streaks.
- Do not surface an infinite backlog on NOW.
- Do not invent productivity when nothing meaningful needs attention.
- A user correction must visibly acknowledge what changed.
- Avoid over-coaching; one diagnostic question and one useful intervention is preferred.
- Important commitment activation requires explicit user confirmation.

## Focus Mode design contract

Focus Mode removes system noise.

Must include:

- Action title;
- done condition;
- planned time / optional timer;
- explicit “You do not need to do” boundary when useful;
- Capture distraction;
- End / interrupt controls;
- current Focus state.

Do not visually imply that ending a FocusSession automatically completes the Action.

## Tone of voice

Use calm, concise, non-judgmental copy.

Preferred:

- `This action has moved 3 times.`
- `Something needs to move.`
- `Nothing important needs your attention right now.`
- `This may no longer be worth protecting. Pause it?`

Avoid:

- `Crush your goals!`
- `You failed your streak.`
- `AI knows what is best for you.`
- `You are 92% productive.`

## Accessibility / cognitive load

Design must demonstrate:

- sufficient contrast;
- visible keyboard focus;
- state not communicated by color alone;
- large touch targets;
- screen-reader-compatible hierarchy;
- reduced motion support;
- text scaling tolerance;
- no countdown pressure unless the user selected timer behavior;
- meaningful empty/loading/error states.

## Design token direction

Figma variables should include:

### Color

- surface / surface-raised / surface-subtle
- text-primary / secondary / tertiary
- accent-primary
- semantic-success / caution / danger / info
- evidence-direct / strong / possible / suggestion
- border-default / subtle / focus

### Typography

- display
- heading-1 / 2 / 3
- body
- body-strong
- label
- caption
- numeric/timer

### Spacing

Use an 4/8-based scale and define layout tokens rather than arbitrary per-screen gaps.

### Radius

Use a small set of semantic radii: control / card / sheet.

### Elevation

Use restraint: base / raised / overlay only.

## Figma file structure

Recommended pages:

1. `00 — Product Brief`
2. `01 — Foundations`
3. `02 — Components`
4. `03 — Mobile / Clarity`
5. `04 — Mobile / NOW & Execute`
6. `05 — Mobile / Reflect & ME`
7. `06 — Desktop / Clarity`
8. `07 — Desktop / NOW & Execute`
9. `08 — Desktop / Reflect & ME`
10. `09 — Responsive Patterns`
11. `10 — Prototype Flows`
12. `11 — Edge & AI States`
13. `12 — Dev Handoff`

## Prototype flows required

At least these clickable flows:

### Flow A — Unclear to Direction

Welcome → NeedState → Brain Dump → Interpretation → correction → trade-off → Current Season confirm → NOW.

### Flow B — NOW to Focus

NOW ready → Why this? → Accept → Start Focus → capture distraction → end Focus.

### Flow C — AI failure manual continuation

Brain Dump → AI timeout → continue manually → confirm interpretation → proceed.

### Flow D — Recovery

Return after missed days → recovery NOW → choose one action → Focus.

### Flow E — Weekly adaptation

Weekly Reality → patterns → correction → adjustment → next-week confirm.

## Desktop-specific guidance

Desktop may use:

- persistent navigation rail;
- a central primary workspace;
- an optional context/evidence rail;
- split view for Interpretation + original Capture;
- split view for Weekly Reality + evidence;
- side panel for Why This / Memory details.

Do not turn desktop into a multi-widget dashboard homepage. NOW remains action-first.

## Mobile-specific guidance

Mobile should use:

- bottom navigation;
- focused single task hierarchy;
- bottom sheets for correction/evidence;
- sticky primary CTA only when it reduces effort;
- full-screen Focus mode;
- fast Capture from multiple contexts;
- safe-area aware layout;
- no desktop tables squeezed into cards.

## Engineering-aware constraints

Current product is a responsive Web/PWA, not separate native mobile apps.

Design should therefore:

- use responsive patterns implementable in React/CSS;
- avoid platform-specific controls that require separate native implementations unless clearly optional;
- prefer shared components/variants;
- provide breakpoint behavior and min/max widths;
- annotate interaction state changes;
- avoid designs dependent on unavailable OS-level integrations.

## Things the Figma AI agent must not invent

Do NOT add without explicit product approval:

- social feed;
- public profiles;
- points/XP/streak economy;
- finance dashboard;
- health wearable dashboard;
- email/calendar replacement;
- team workspace;
- marketplace/plugins;
- many AI personas;
- autonomous agent control center;
- giant life-score dashboard;
- psychological diagnosis;
- gamified pressure;
- default chatbot home screen.

## Delivery expected from design agent

1. Information architecture diagram
2. User-flow map
3. Design foundations + variables
4. Reusable component library
5. Mobile screens and variants
6. Desktop screens and variants
7. Important empty/loading/error/AI-failure states
8. Responsive rules
9. Clickable prototypes for required flows
10. Accessibility annotations
11. Dev handoff notes
12. A short list of product/UX questions or risks discovered during design — do not silently invent answers to unresolved product questions.

## Decision

Approved. The Figma AI agent should receive the canonical brief plus the prompt pack generated from this meeting. Product/release should review IA and component primitives before allowing the design agent to spend most effort polishing all 40 screens.