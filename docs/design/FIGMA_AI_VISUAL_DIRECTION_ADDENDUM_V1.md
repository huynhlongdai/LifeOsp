# LifeOS — Figma AI Visual Direction Addendum V1

Status: SUPERSEDES overly-AI visual interpretation in earlier prompts
Updated: 2026-08-27

Read together with:
- `docs/design/FIGMA_AI_DESIGN_BRIEF_V1.md`
- `docs/design/VISUAL_REFERENCE_RESEARCH_V1.md`
- `docs/design/FIGMA_AI_PROMPT_PACK_V1.md`

## Critical correction

Design LifeOS as a **beautiful consumer life-planning product with ambient intelligence**, not as an AI dashboard.

The interface must remain visually coherent even if words like `AI`, `agent`, `confidence`, and `evidence` are removed.

### Reference blend

Use these references as inspiration, not cloning targets:

- Tiimo: warmth, whitespace, editorial headings, pastel grouping, floating navigation, approachable everyday feel.
- Things 3: restraint, typography, invisible chrome, quiet interactions.
- Structured: visual day/timeline clarity, friendly icon/color cues.
- Sunsama: guided rituals, calm planning, capacity/trade-off UX.
- Lifestack: selective contextual intelligence visualization, not health-dashboard copying.
- Superlist / Amie: expressive typography, quick create, modern consumer polish.
- Dribbble task-app references: visual polish only, not behavioral/product logic.

## Visual direction

Prefer:
- warm white / soft neutral canvas;
- generous negative space;
- editorial display typography for major context headings;
- clean sans-serif for controls/body;
- soft pastel semantic tints;
- sparse rounded surfaces;
- subtle shadows;
- floating mobile bottom navigation;
- large simple controls;
- icons that feel friendly and human;
- occasional micro-illustration in empty/recovery states;
- gentle motion used for state transitions only.

Avoid:
- persistent purple AI orb;
- AI sparkles on routine screens;
- robot/assistant avatar always visible;
- neon gradients and cyberpunk dark UI;
- permanent AI chat side panel;
- confidence/evidence chips on every row;
- card soup;
- giant analytics dashboards;
- productivity/life scores;
- technical ontology labels exposed to users.

## AI visibility rule

### Invisible/ambient by default

Ordinary screens should use human product language:
- `Gợi ý`
- `Vì sao việc này?`
- `Có vẻ phần này đang bị chặn`
- `Tôi chưa chắc phần này`
- `Muốn chỉnh lại?`
- `Đã lưu`
- `Đã sắp xếp`

### AI provenance becomes visible only when necessary

Show that automation/AI was involved when:
- an interpretation is actively being generated;
- a tentative inference must be distinguished from user-confirmed knowledge;
- a recommendation explanation needs provenance;
- provider/analysis fails and manual fallback is offered;
- personalization/memory settings are being inspected.

Do not place `AI-generated` labels on normal recommendations if provenance is not necessary for the immediate decision.

## Revised NOW direction

NOW should resemble a calm daily surface rather than a recommendation dashboard.

Mobile composition idea:
1. date/day or current-context heading;
2. small Current Season context;
3. one dominant Action;
4. done condition + time as quiet metadata;
5. primary Start/Continue CTA;
6. `Vì sao việc này?` as a low-emphasis disclosure;
7. corrections inside overflow/sheet where appropriate;
8. optional small `Sau đó` section, max 1–2 items;
9. Not Now context visually separated/protected.

Do not show confidence class prominently unless uncertainty materially matters.

## Revised Clarity direction

Brain Dump should feel like a beautiful blank note/capture surface.

Interpretation should feel like the app gently organized the user's thoughts, not like an AI extraction pipeline.

Prefer labels such as:
- `Tôi đã sắp xếp lại thành`
- `Điều bạn đang quan tâm`
- `Có thể là việc cần làm`
- `Ý tưởng để sau`
- `Chưa rõ`

Avoid developer/product labels such as:
- `AI interpretation confidence`
- `extracted entities`
- `inference class`
- `structured output`.

## Revised Direction / Trade-off direction

Take inspiration from Tiimo's soft color grouping and Sunsama's intentional planning.

Active / Maintain / Not Now should feel like three calm destinations, not kanban statuses.

Not Now should visually communicate safety:
`Được giữ lại. Bạn không cần nghĩ về điều này lúc này.`

## Revised Focus direction

Focus should be one of the most visually beautiful and quiet screens.

Take inspiration from Tiimo focus timer and minimal single-task execution surfaces.

Show:
- action title;
- simple success condition;
- planned time / optional timer;
- subtle progress;
- one-tap distraction capture;
- end/interruption controls.

Hide:
- app navigation where possible;
- backlog;
- charts;
- recommendation evidence;
- AI identity;
- project tree.

## Revised REFLECT direction

Daily Close and Weekly Reset should feel editorial and narrative.

Use:
- big calm headings;
- one question/decision per viewport when possible;
- comparison strips or small factual visuals;
- max 1–3 pattern cards;
- strong whitespace.

Do not build an analytics cockpit.

## Revised ME direction

Personal Operating Model should feel like `Things minimalism + selective Lifestack intelligence`, not a psychological profile dashboard.

Use human labels:
- `Cách bạn thường làm việc tốt`
- `Điều LifeOS đang học`
- `Bạn đã xác nhận`
- `Có thể đúng — cần bạn kiểm tra`

Avoid:
- personality radar charts;
- permanent scores;
- psychological labels;
- pseudo-clinical UI.

## Figma AI instruction to prepend before future screen prompts

> VISUAL DIRECTION OVERRIDE: Treat LifeOS as a premium consumer life-planning app with ambient intelligence, not as an AI product interface. Use Tiimo-like warmth and breathing room, Things-like restraint, Structured-like visual day clarity, Sunsama-like guided ritual UX, and selective Lifestack-style contextual intelligence. AI should usually be invisible. Avoid sparkles, AI badges, assistant avatars, technical confidence/evidence UI, card soup, neon gradients and dashboard walls. Use editorial typography, whitespace, soft semantic pastels, friendly icons, restrained rounded surfaces and one dominant action. The user should feel the intelligence before seeing the word AI.

## Approval test

Reject the design if the first impression is:
- `AI assistant app`;
- `project management dashboard`;
- `analytics dashboard`;
- `chatbot wrapper`.

Approve when the first impression is closer to:
- `beautiful daily life planner`;
- `calm personal navigator`;
- `thoughtful planning companion`;
- `simple app that somehow understands what matters`.
