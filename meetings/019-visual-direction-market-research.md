# Meeting #019 — Visual Direction Market Research

Date: 2026-08-27
Status: APPROVED FOR FIGMA ITERATION

## Objective

Review Tiimo screenshots supplied by the product owner and research contemporary planner/task/productivity interfaces to correct the LifeOS visual direction before Figma AI expands the design system.

## Roles represented

- Product Director
- UX Director
- Visual Design Lead
- Behavioral UX / Cognitive Load
- Design Systems Lead
- Mobile UX Lead
- Desktop UX Lead
- AI / Trust UX Lead
- Market / Competitive Research
- Engineering Reviewer

## References reviewed

Primary supplied reference:
- Tiimo mobile screenshots supplied by product owner.

Market references:
- Tiimo
- Things 3
- Structured
- Sunsama
- Lifestack
- Superlist
- Amie
- Todoist
- Routine
- Akiflow
- Morgen
- Dribbble `app-task` search references

## Main finding

The earlier LifeOS design brief described AI trust/evidence correctly but risked producing an interface that visually over-communicates the AI system itself.

Decision:

> LifeOS must look like a beautiful consumer life-planning application first. Intelligence should be ambient and usually invisible.

The desired impression is not:
- AI dashboard;
- chatbot wrapper;
- recommendation engine UI;
- productivity analytics cockpit.

The desired impression is:
- calm personal navigator;
- beautiful daily life planner;
- thoughtful planning companion;
- a simple product that appears to understand what matters.

## Tiimo findings

Strong reference traits:
- large breathing room;
- editorial/serif context headings;
- clean sans-serif functional type;
- pastel semantic grouping;
- pill-like section headers;
- floating bottom navigation;
- obvious quick-create control;
- friendly, human iconography;
- minimal chrome;
- settings that feel native rather than technical;
- AI/co-planning does not dominate the whole visual language.

Do not clone Tiimo branding/mascot/color system.

## Market synthesis

### Things 3
Use as restraint benchmark:
- invisible chrome;
- hierarchy through typography/spacing;
- few cards;
- one accent;
- controls revealed only when needed.

### Structured
Use for temporal clarity:
- visual day/timeline;
- friendly icons;
- meaningful color;
- tasks represented as activities rather than database rows.

### Sunsama
Use for ritual UX:
- guided planning;
- workload awareness;
- explicit `what can wait?` behavior;
- Today/focus surfaces;
- shutdown/review as guided narratives.

### Lifestack
Use selectively:
- intelligence shown as context/observed pattern;
- compact, understandable visuals.

Do not copy biometric/health dashboard semantics or invent life/energy scores.

### Superlist / Amie / Todoist
Use for:
- typography;
- quick capture;
- consumer polish;
- pastel orientation;
- low-friction everyday interactions.

Do not inherit list-centric IA as LifeOS mental model.

### Routine / Akiflow / Morgen
Use mainly for desktop planning interaction patterns, keyboard-friendly workflows, and contextual rails. Do not turn LifeOS into a calendar replacement.

### Dribbble
Use only for visual craft:
- composition;
- spacing;
- cards/sheets;
- color;
- micro-illustration;
- polished empty states.

Do not treat portfolio shots as validated UX logic.

## New visual formula

`Tiimo warmth + Things restraint + Structured temporal clarity + Sunsama intentional rituals + selective Lifestack context intelligence + modern consumer-app polish`

## AI visibility decision

AI is invisible by default.

Ordinary user-facing language should prefer:
- Gợi ý
- Vì sao việc này?
- Tôi chưa chắc phần này
- Đã sắp xếp
- Có vẻ việc này đang bị chặn
- Muốn chỉnh lại?

AI provenance should be visible only when it materially affects trust:
- interpretation generation;
- tentative inference;
- explanation provenance;
- provider failure/manual fallback;
- memory/personalization controls.

Avoid:
- persistent AI orb;
- sparkles everywhere;
- assistant avatar on every screen;
- permanent chat panel;
- confidence badge on every row;
- evidence chip overload;
- visible technical ontology.

## Component density decision

Reduce `card soup`.

Prefer hierarchy using:
- whitespace;
- typography;
- section labels/pills;
- dividers;
- inline metadata;
- one dominant interaction surface.

A card must represent a meaningful semantic/interaction boundary, not merely decorate content.

## Mobile direction

Primary mobile reference remains 390×844.

Preferred patterns:
- floating or visually soft bottom nav;
- editorial current-day/context heading;
- one-column hierarchy;
- semantic pastel grouping;
- large tap targets;
- bottom sheets;
- quick capture;
- immersive Focus;
- contextual icons;
- minimal AI branding.

## Desktop direction

Desktop remains the same product model.

Preferred patterns:
- restrained side nav;
- narrow/controlled primary reading column;
- optional evidence/context rail;
- editorial planning/review surfaces;
- split view only for clarity, review or comparison;
- fewer persistent cards/widgets.

## Screen-specific inspiration mapping

- Welcome: Tiimo + Superlist typography
- Brain Dump: Todoist capture speed + Tiimo space
- Interpretation: Things restraint + modern split editor on desktop
- Trade-off: Tiimo soft groups + Sunsama `what can wait?`
- NOW: Things simplicity + Tiimo warmth + focused agenda principles
- Focus: Tiimo focus timer + Sunsama isolation
- Daily Close: Sunsama ritual
- Weekly Reset: Sunsama guided narrative + sparse Lifestack evidence
- ME: Things minimalism + selective Lifestack intelligence
- Incubator: Superlist editorial list + safe Tiimo-style color
- Settings: Tiimo native-feeling simplicity

## Design acceptance question

Before approving a screen ask:

> If every word AI/agent/confidence/evidence disappeared, would this still feel like a complete, beautiful and understandable LifeOS screen?

If not, redesign it.

## Deliverables created

- `docs/design/VISUAL_REFERENCE_RESEARCH_V1.md`
- `docs/design/FIGMA_AI_VISUAL_DIRECTION_ADDENDUM_V1.md`

## Decision

Approved.

The Visual Direction Addendum supersedes any interpretation of the previous Figma brief that makes LifeOS look overly AI-centric. Future Figma iterations must apply the consumer-first visual rule before expanding screens.
