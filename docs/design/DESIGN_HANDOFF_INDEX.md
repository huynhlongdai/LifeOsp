# LifeOS — Design Handoff Index

Updated: 2026-08-27

Use this reading order for Figma AI / product-design agents.

## Required reading order

1. `docs/design/FIGMA_AI_DESIGN_BRIEF_V1.md`
   - product model;
   - design philosophy;
   - IA;
   - mobile/desktop strategy;
   - screen matrix;
   - component foundations.

2. `docs/design/PRODUCT_SURFACE_SPEC_V1.md`
   - detailed user-app modules;
   - every major sub-function;
   - screen states;
   - controls;
   - responsive guidance.

3. `docs/design/SETTINGS_NOTIFICATIONS_SPEC_V1.md`
   - notification center;
   - reminder categories;
   - notification preferences;
   - account/appearance/AI/memory/privacy/integrations/accessibility/support settings.

4. `docs/design/ADMIN_CONSOLE_SPEC_V1.md`
   - internal admin console;
   - users/support;
   - AI/provider operations;
   - prompt/contracts;
   - recommendation quality;
   - flags/experiments;
   - notifications;
   - analytics;
   - incidents;
   - privacy/audit/roles.

5. `meetings/010-ux-ai-recommendation-contracts.md`
   - trust UX;
   - recommendation card contract;
   - semantic confidence;
   - Why This;
   - correction controls;
   - AI error states.

6. `meetings/018-figma-ai-design-handoff.md`
   - approved Figma strategy and visual direction.

7. `meetings/019-full-product-surface-detailed-ux.md`
   - detailed design decisions and scope governance.

## Prompt usage

Start with:

- `docs/design/FIGMA_AI_PROMPT_PACK_V1.md`

Then deepen with:

- `docs/design/FIGMA_AI_PROMPT_PACK_V2_DETAILED_MODULES.md`

## Recommended Figma AI workflow

### Phase 1 — Product model

Use Prompt 0 + Prompt 1 from V1.

Deliver:
- IA;
- flows;
- visual direction;
- tokens;
- component inventory.

Do not design all screens yet.

### Phase 2 — Representative design language

Use Prompt 2 + Prompt 3 from V1.

Lock:
- mobile design language;
- desktop design language;
- RecommendationCard;
- Capture;
- NOW;
- Focus;
- Weekly Reset;
- ME.

Product review before expansion.

### Phase 3 — Full user app

Use V2 Prompt A–D.

Expand every user module and detailed state.

### Phase 4 — System surfaces

Use V2 Prompt E.

Design Notifications + Settings + Privacy.

### Phase 5 — Admin

Use V2 Prompt F–G.

Design Admin foundations first, then detailed admin screens.

### Phase 6 — Responsive/edge states/prototypes

Use V1 Prompt 8–10 and V2 Prompt H–I.

## Figma file page structure

- 00 Product Brief
- 01 IA & User Flows
- 02 Foundations
- 03 Components
- 04 Mobile / Clarity
- 05 Mobile / NOW & Execute
- 06 Mobile / Reflect & ME
- 07 Desktop / Clarity
- 08 Desktop / NOW & Execute
- 09 Desktop / Reflect & ME
- 10 Responsive Patterns
- 11 Prototype Flows
- 12 Edge & AI States
- 13 Notifications
- 14 Settings & Privacy
- 15 Admin / Foundations
- 16 Admin / Users & Support
- 17 Admin / AI & Quality
- 18 Admin / Experiments & Messaging
- 19 Admin / Privacy & Audit
- 20 Dev Handoff

## Scope warning

The design handoff is intentionally comprehensive.

It does NOT mean every screen is authorized for immediate engineering implementation.

Every frame should be tagged:
- P0 / MVP;
- P1 / after core-loop validation;
- P2 / future/exploratory.

Do not allow Figma AI to silently invent product behavior when a specification explicitly marks something as future or unresolved.
