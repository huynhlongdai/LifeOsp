# LifeOS — Figma AI Prompt Pack V1

Purpose: copy/paste this prompt pack into a Figma AI design agent. Use prompts in order. Do not ask the design agent to generate the whole product in one request.

Primary source of truth: `docs/design/FIGMA_AI_DESIGN_BRIEF_V1.md`.

---

# Prompt 0 — Master Context

You are the principal product designer for **LifeOS**, an AI-native personal operating system for mobile and desktop web/PWA.

LifeOS is NOT a generic task manager, habit tracker, project-management dashboard, Notion clone, or AI chatbot wrapper.

Its core loop is:

**CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT**

Its product promise is:

**Know what matters. Know what to do next.**

LifeOS helps people who may be unclear about direction, overloaded, procrastinating, inconsistent, recovering after missed days, learning without applying, or juggling multiple priorities.

The primary navigation is:

**NOW / DIRECTION / EXECUTE / REFLECT / ME**

Secondary access:

**Inbox / Capture, Incubator / Not Now, Ask LifeOS, Settings / Privacy / Memory**

Do not create Tasks, Habits, Goals, Journal, Calendar, Finance, Health, or AI Chat as top-level MVP navigation.

## Product design principle

Every major screen should reduce at least one of:

1. decisions the user must make;
2. things the user must remember;
3. things competing for attention.

Every major screen should follow this hierarchy:

1. What matters now
2. What LifeOS recommends
3. Why
4. What the user can do
5. Details/evidence only when requested

LifeOS is a decision-support system, not an oracle. The user owns commitments and life direction. AI may propose, explain and summarize, but must not silently activate important commitments or present inference as fact.

## Product tone

Calm, concise, non-judgmental, evidence-aware, premium but restrained.

Avoid motivational-guru language, streak pressure, gamification, giant scores, neon sci-fi AI aesthetics, excessive glassmorphism, and dense dashboards.

## Platforms

Design the same responsive product for:

- Mobile reference: **390×844**, bottom navigation, one-column, large touch targets, sheets for evidence/corrections, full-screen Focus.
- Desktop reference: **1440×1024**, persistent left navigation, controlled central content width, optional right evidence/context panel.

This is a React Web/PWA, not separate native apps.

## Visual character

Calm, intelligent, human, high clarity, spacious, subtle depth, strong typography hierarchy, neutral surfaces, one primary accent, semantic colors, restrained shadows, reusable components, theme-token driven light/dark support.

Use realistic **Vietnamese UI copy** in mock screens. Figma component/layer names can be English.

## Trust requirements

Material recommendations support:

- Accept / Start
- Edit
- Not Now
- Wrong assumption
- Explain / Why this?

`Why this?` shows stored product evidence, never hidden chain-of-thought.

Confidence is semantic:

- Direct evidence
- Strong pattern
- Possible pattern
- Suggestion / hypothesis

Do not show raw model probability.

AI error is a normal designed state. Core capture/manual execution remains usable when AI fails.

## Hard exclusions

Do not invent:

- social feeds;
- followers;
- teams;
- XP/points/streak economy;
- finance dashboard;
- health/wearables dashboard;
- calendar replacement;
- email replacement;
- marketplace/plugins;
- autonomous agent command center;
- many AI personas;
- giant life-score dashboard;
- psychological diagnosis;
- chatbot as the default home screen.

Before designing screens, summarize the product model and list any unresolved assumptions. Do not silently invent answers.

---

# Prompt 1 — IA, Design Principles and Foundations

Using the LifeOS master context above, create the **information architecture and design foundations only**. Do not polish the full app yet.

Deliver:

1. sitemap / information architecture;
2. five primary navigation areas and their responsibilities;
3. secondary navigation/access model;
4. key user flows;
5. responsive mobile-vs-desktop behavior;
6. design principles;
7. visual direction proposal;
8. design tokens / variables;
9. typography system;
10. spacing/radius/elevation system;
11. semantic color model including evidence confidence classes;
12. reusable component inventory;
13. accessibility principles;
14. AI trust/error/correction patterns.

Recommended Figma pages:

- 00 Product Brief
- 01 IA & User Flows
- 02 Foundations
- 03 Components

Create Auto Layout and variables from the start.

Do not create a dense dashboard homepage. NOW must remain action-first.

Pause after this phase for product review.

---

# Prompt 2 — Representative Mobile Screens

Now lock the LifeOS mobile design language on **390×844**.

Design these representative mobile screens before expanding the full app:

1. Welcome / Immediate Need
2. Brain Dump / Capture
3. Interpretation Review
4. Trade-off / Active–Maintain–Not Now
5. NOW — Ready
6. Why This bottom sheet
7. Focus Mode — Active
8. Weekly Reset — Pattern Candidate
9. ME — Operating Preferences

Requirements:

- bottom navigation: NOW / DIRECTION / EXECUTE / REFLECT / ME;
- single-column hierarchy;
- one dominant CTA;
- 44px+ touch targets;
- safe-area support;
- progressive disclosure;
- avoid card soup;
- realistic Vietnamese copy;
- use shared components and variants;
- design loading/error/empty variant for at least Brain Dump, NOW and Focus.

NOW should visually communicate one primary Action, not a backlog.

Example NOW content:

**RIGHT NOW**

`Chọn 3 sản phẩm đầu tiên để test`

`40 phút`

`Hoàn thành khi: có 3 sản phẩm + nguồn + 1 lý do chọn mỗi sản phẩm`

Primary CTA: `Bắt đầu`

Secondary controls: `Chỉnh sửa · Để sau · Giả định sai`

Link: `Vì sao việc này?`

Do not imply that AI controls the user's life.

---

# Prompt 3 — Representative Desktop Screens

Create the desktop counterparts at **1440×1024** using the same component system and visual language.

Design:

1. Interpretation Review — split view
2. Trade-off / Focus Conflict
3. Current Direction / Current Season
4. NOW — Ready
5. NOW — Blocked
6. Focus Mode
7. Weekly Reset — Reality / Movement
8. Weekly Reset — Pattern Candidates
9. ME — Operating Preferences / Memory

Desktop shell:

- persistent left navigation;
- central primary workspace;
- optional right contextual/evidence rail;
- controlled content width;
- keyboard focus states;
- no dashboard wall.

For Interpretation Review:

- left pane: original Brain Dump, read-only;
- right pane: structured interpretation groups with editable items;
- uncertain items clearly marked;
- manual correction must not require restarting the flow.

For NOW:

- central primary RecommendationCard dominates;
- Current Season context remains secondary;
- `Why this?` can open a contextual right rail;
- optional alternatives stay collapsed.

---

# Prompt 4 — Clarity Flow, Full State Set

Expand the **Clarity / Direction** design using the approved visual system.

Create mobile + desktop variants for:

1. Welcome / immediate need
2. Quick Life Context
3. Brain Dump empty
4. Brain Dump capturing
5. Capture saved
6. AI processing
7. AI timeout/provider unavailable
8. Interpretation Review
9. Ambiguous interpretation item
10. Manual fallback
11. Trade-off / Focus Conflict
12. Current Season proposal
13. Direction confirmation
14. Current Direction / Season

Behavior rules:

- raw Capture remains intact;
- AI interpretation is editable before durable structure;
- AI failure never destroys saved input;
- user explicitly classifies candidates Active / Maintain / Not Now;
- candidates begin unassigned;
- Not Now feels safe/protected, not deleted;
- Direction/Season activation requires explicit confirmation.

Suggested AI failure copy:

`Tôi chưa hoàn tất được phần phân tích. Dữ liệu của bạn đã được lưu.`

Actions:

`Thử lại` / `Tiếp tục thủ công`

---

# Prompt 5 — NOW, Execute and Focus Full State Set

Expand **NOW / EXECUTE / FOCUS** for mobile + desktop.

Create:

### NOW

- Ready
- No Direction
- No Ready Action
- Blocked
- Recovery after missed days
- Nothing important now
- Why This / Evidence
- Edit Action
- Wrong Assumption
- Not Now

### Execution context

- lightweight Outcome / Project view
- ready Action detail

### Focus

- Focus active
- distraction capture
- Focus interrupted
- Focus abandoned
- Focus session ended

### Action result

- Completed
- Partial
- Postponed
- Blocked
- Dropped

### Daily Close

- factual summary
- optional user note
- no invented mood/energy/cause

NOW rules:

- never infinite backlog;
- never invent work when there is nothing meaningful;
- after missed days, no overdue-debt wall;
- blocked state should surface the unblock path;
- evidence is progressive disclosure;
- Accepting a recommendation and starting Focus are separate interactions unless the product flow explicitly combines them in <=2 taps.

Focus rules:

- full-screen or visually isolated;
- no unrelated backlog;
- action title + done condition + planned time;
- optional timer;
- fast distraction capture;
- ending Focus does NOT visually imply Action completion.

---

# Prompt 6 — Reflect, Recovery and Personal Intelligence

Design the **REFLECT / ME** experiences for mobile + desktop.

Create:

### Get Unstuck

1. evidence state
2. friction selector
3. intervention proposal
4. return-to-NOW success state

Friction options:

- chưa rõ bước đầu;
- quá lớn;
- bị chặn;
- không đủ thời gian/năng lượng;
- ưu tiên khác quan trọng hơn;
- không còn quan trọng;
- khác.

Do not open with advice. Show evidence first, ask one question, then offer one intervention.

### Weekly Reset

1. Reality
2. Movement
3. Pattern Candidates — max 3
4. Adjustment — max 3
5. Next Week Confirmation

Weekly Reset must feel like a guided story, not analytics dashboard.

### ME

- Personal Operating Model overview
- confirmed Operating Preferences
- tentative pattern candidates
- Memory Inspector
- edit/delete/do-not-use controls

Tentative inference must be visually distinct from confirmed preference.

Controls for insights:

- Chính xác
- Đúng một phần
- Không đúng
- Không sử dụng

---

# Prompt 7 — Component System and Variants

Create a production-ready Figma component library using Auto Layout, Variables and component variants.

Required components:

Navigation:
- DesktopSideNav
- MobileBottomNav
- ContextHeader
- SecondaryMenu

Decision:
- RecommendationCard
- EvidenceChip
- ConfidenceBadge
- WhyThisPanel
- CorrectionMenu
- ConfirmChangeSheet

Life structure:
- DirectionCard
- SeasonCard
- OutcomeCard
- ProjectCard
- ActionCard
- NotNowCard

Capture / AI:
- CaptureComposer
- InterpretationItem
- AIProcessingState
- AIErrorState

Execution / reflection:
- FocusSessionCard
- FocusTimer
- DistractionCapture
- ResultSelector
- FrictionSelector
- InsightCard
- MemoryCard
- CapacityBar

System:
- EmptyState
- RecoveryState
- InlineError
- Toast
- Skeleton
- BottomSheet
- SidePanel

For each component define relevant variants such as:

- default / hover / focus / pressed / disabled;
- loading / error;
- mobile / desktop density where needed;
- confidence/evidence type;
- recommendation resolution state;
- focus session state.

Do not create separate unrelated components when variants can express the state.

---

# Prompt 8 — Edge States, Accessibility and Responsive Rules

Audit the whole LifeOS design for edge states and implementation readiness.

Create/annotate:

- loading states;
- empty states;
- offline/provider unavailable;
- timeout;
- wrong AI interpretation;
- wrong recommendation;
- stale/rejected recommendation;
- no direction;
- no ready action;
- blocked;
- recovery after absence;
- nothing important now;
- invalid/correction conflict where relevant.

Accessibility audit:

- sufficient contrast;
- 44px+ tap targets;
- keyboard focus;
- screen-reader hierarchy;
- not color-only state;
- text scaling;
- reduced motion;
- optional timer, no forced countdown pressure.

Responsive documentation:

- mobile 390 reference;
- tablet/intermediate collapse logic;
- desktop 1440 reference;
- nav transition;
- content max widths;
- side rail behavior;
- bottom-sheet → side-panel transformations;
- split-view → stacked transformations.

Produce a `Responsive Patterns` Figma page with annotated examples.

---

# Prompt 9 — Required Clickable Prototypes

Create clickable prototypes for these flows using the approved components.

## Prototype A — Unclear → Direction

Welcome
→ NeedState
→ Brain Dump
→ Interpretation
→ correction
→ trade-off
→ Current Season confirm
→ NOW

## Prototype B — NOW → Focus

NOW Ready
→ Why this?
→ Accept
→ Start Focus
→ capture distraction
→ end Focus

## Prototype C — AI failure manual continuation

Brain Dump
→ AI timeout
→ Continue manually
→ interpretation review
→ trade-off
→ continue normally

## Prototype D — Recovery

Return after missed days
→ Recovery NOW
→ one restart Action
→ Focus

## Prototype E — Weekly Adapt

Weekly Reality
→ Movement
→ Pattern Candidate
→ user correction
→ Adjustment
→ Next Week confirm

Use realistic Vietnamese copy and prototype state changes rather than decorative transitions.

---

# Prompt 10 — Final Design QA / Dev Handoff

Perform a final product-design QA before handoff.

Check:

1. Does NOW still show one dominant primary Action?
2. Is desktop free of dashboard-wall behavior?
3. Can AI be wrong without trapping the user?
4. Can the user understand Why This without hidden reasoning?
5. Does Not Now look like a protected choice rather than failure?
6. Does returning after missed days avoid guilt/overdue debt?
7. Does Focus remove unrelated system noise?
8. Is Focus completion visually separate from Action completion?
9. Are tentative insights distinct from confirmed preferences?
10. Are mobile and desktop the same product model?
11. Are all major controls componentized?
12. Are breakpoints/responsive transformations documented?
13. Are loading/error/empty states designed?
14. Are accessibility requirements annotated?
15. Has the design avoided inventing social/gamification/finance/health/agent-control features?

Deliver a Dev Handoff page containing:

- component inventory;
- variables/tokens;
- responsive specs;
- layout widths/gaps;
- component variants;
- interaction/state notes;
- accessibility notes;
- unresolved UX/product questions;
- list of any design decisions that require Product approval before implementation.

Do not silently resolve uncertain product behavior in the visual design.

---

# Quick single-message prompt if Figma AI only accepts one long request

Design a complete responsive UI/UX system for **LifeOS**, an AI-native personal operating system whose core loop is `CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT`. It helps people move from unclear/overloaded/drifting/stalled states to oriented/prioritized/started/adapted states. It is not a generic task manager, habit tracker, project-management dashboard, Notion clone, or chatbot wrapper.

Primary navigation: **NOW / DIRECTION / EXECUTE / REFLECT / ME**. Secondary: Inbox/Capture, Incubator/Not Now, Ask LifeOS, Settings/Privacy/Memory. Do not make Tasks/Habits/Goals/Journal/Calendar/Finance/Health/AI Chat top-level navigation.

Mobile reference 390×844 with bottom nav, one-column hierarchy, large tap targets, bottom sheets, full-screen Focus. Desktop 1440×1024 with persistent left nav, controlled central workspace and optional right evidence/context rail. Same responsive product model for both.

Visual character: calm, intelligent, premium but restrained, spacious, evidence-aware, subtle depth, clear typography, one primary accent plus semantic colors. Avoid neon AI gradients, excessive glassmorphism, dashboard walls, streaks/XP, red overdue guilt, giant life scores, and motivational-guru copy.

NOW is the home and must show one dominant primary Action, not an infinite task list. A material Recommendation shows title, done condition, time, minimal context, semantic confidence, primary CTA, Edit, Not Now, Wrong assumption, Explain/Why this?. Why This shows stored product evidence, not chain-of-thought. Confidence classes: Direct evidence, Strong pattern, Possible pattern, Suggestion/hypothesis; never raw probability.

Core flows to design: Welcome/NeedState → Brain Dump → AI interpretation → correction → trade-off Active/Maintain/Not Now → Current Season confirm → NOW; NOW → Why This → Accept → Focus → distraction capture → end Focus; AI timeout → Continue manually; Get Unstuck evidence → one friction question → one intervention; Weekly Reset Reality → Movement → max 3 Pattern Candidates → max 3 Adjustments → Next Week confirm; ME with Operating Preferences and Memory controls.

Design full states for NOW: Ready, No Direction, No Ready Action, Blocked, Recovery after missed days, Nothing Important Now. No guilt backlog after absence. Not Now is a successful protected choice. Do not invent productivity when nothing needs attention.

Focus Mode: Action title, done condition, planned time, optional timer, distraction capture, end/interruption. Remove unrelated system noise. Ending Focus must not imply Action completion.

AI failure is a first-class state. Copy example: `Tôi chưa hoàn tất được phần phân tích. Dữ liệu của bạn đã được lưu.` Actions: Retry / Continue manually. Core manual flow stays usable.

Build a Figma system with Variables, Auto Layout, reusable components and variants. Required components include App Shell, side/bottom nav, RecommendationCard, EvidenceChip, ConfidenceBadge, WhyThisPanel, Direction/Season/Outcome/Project/Action cards, NotNowCard, CaptureComposer, InterpretationItem, FocusSessionCard, DistractionCapture, ResultSelector, FrictionSelector, InsightCard, MemoryCard, Empty/Recovery/AIError states, BottomSheet and SidePanel.

Use realistic Vietnamese UI copy and English component/layer names. Support light/dark through tokens, not separate systems. Accessibility: contrast, 44px+ touch targets, keyboard focus, screen-reader hierarchy, not color-only state, text scaling and reduced motion.

Organize Figma pages: Product Brief, IA & Flows, Foundations, Components, Mobile Clarity, Mobile NOW/Execute, Mobile Reflect/ME, Desktop Clarity, Desktop NOW/Execute, Desktop Reflect/ME, Responsive Patterns, Prototype Flows, Edge & AI States, Dev Handoff.

Do not invent social feed, teams, XP/streak economy, finance/health dashboard, calendar/email replacement, marketplace/plugins, autonomous agent control center, many AI personas, psychological diagnosis, giant life score or chatbot as the home.

Work in phases: first IA/foundations/components; then 10 representative mobile/desktop screens to lock the design language; only then expand full screen/state matrix; finally clickable prototypes and dev handoff. Surface unresolved product questions instead of inventing answers.