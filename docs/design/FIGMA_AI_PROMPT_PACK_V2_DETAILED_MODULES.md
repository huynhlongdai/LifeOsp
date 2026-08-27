# LifeOS — Figma AI Prompt Pack V2: Detailed Modules

Status: CANONICAL DESIGN PROMPT ADDENDUM
Updated: 2026-08-27

Use after `FIGMA_AI_DESIGN_BRIEF_V1.md` and `FIGMA_AI_PROMPT_PACK_V1.md`.

This pack tells the design agent to go deeper than screen names and design the actual micro-functions, settings, notifications and admin console.

---

# Prompt A — Expand User App into Detailed Modules

Using the LifeOS master design brief and `PRODUCT_SURFACE_SPEC_V1.md`, expand the user app into a detailed UX map before polishing visuals.

For every module, produce:

1. module purpose;
2. entry points;
3. screen list;
4. sections within each screen;
5. every primary and secondary action;
6. form fields and controls;
7. item/card anatomy;
8. filters/search/sort where applicable;
9. empty state;
10. loading state;
11. save/success state;
12. validation/error state;
13. AI/provider unavailable state;
14. stale/conflict state;
15. destructive confirmation;
16. first-use education;
17. recovery/returning-user state;
18. mobile behavior;
19. desktop behavior;
20. permission/privacy notes;
21. P0/P1/P2 priority;
22. unresolved product questions.

Modules to map:

- Global App Shell
- Onboarding / First Value
- Inbox / Capture
- Interpretation / Clarify
- Trade-off / Focus Conflict
- DIRECTION
- Outcomes
- Projects
- EXECUTE / Actions
- NOW
- Focus
- Action Result
- Daily Close
- Get Unstuck
- Weekly Reset
- ME / Personal Operating Model
- Operating Preferences
- Memory Inspector
- Incubator / Not Now
- Ask LifeOS
- Notifications
- Settings

Do not design these as isolated apps. Keep the LifeOS loop coherent.

Pause after producing the module map for product review.

---

# Prompt B — Detailed DIRECTION / EXECUTE Information Architecture

Design DIRECTION and EXECUTE in enough detail for both a beginner and a returning user.

DIRECTION contains:

- Direction Overview
- Current Season
- Outcome List
- Outcome Detail
- Project List
- Project Detail
- Direction edit/confirmation
- Season edit/close later

EXECUTE contains:

- lightweight execution landing
- Action candidates needing confirmation
- ready Actions
- blocked Actions
- recently finished Actions
- Action Detail
- AI Action Candidate Review

Rules:

- Project is not primary navigation;
- no Jira/Kanban wall as default;
- no giant backlog;
- user explicitly confirms commitments;
- AI candidate does not automatically become ready;
- current Season and Outcome context should explain why work exists;
- only NOW should strongly answer what to do next.

For every screen include default, empty, loading, error, read-only, destructive and responsive states.

Use realistic Vietnamese copy.

---

# Prompt C — Detailed NOW / Focus / Result Microinteractions

Design the complete execution micro-flow:

`NOW → Accept → Start Focus → distraction capture → end/interruption → explicit Action Result → updated state`

Important boundary:

- Accepting recommendation is not the same as starting Focus.
- Ending Focus is not the same as completing Action.

NOW microfunctions:
- current Season context;
- RecommendationCard;
- done condition;
- estimate;
- confidence;
- Why This;
- Accept;
- Edit;
- Not Now;
- Wrong Assumption;
- refresh only when valid;
- No Direction;
- No Ready Action;
- Blocked;
- Recovery;
- Nothing Important;
- provider/recommendation unavailable.

Focus microfunctions:
- ready-to-start;
- planned minutes;
- optional timer;
- Action title;
- done condition;
- optional “you do not need to do” boundary;
- distraction capture;
- interrupt;
- abandon;
- end session;
- resume after reload;
- recent session summary;
- no unrelated backlog.

Result microfunctions:
- Completed;
- Partial;
- Postponed;
- Blocked;
- Dropped;
- optional note/reason;
- consequence preview;
- confirm;
- success acknowledgement;
- return to NOW/Daily Close.

Prototype this flow on mobile and desktop.

---

# Prompt D — Detailed Reflection / Personal Intelligence

Design REFLECT and ME as a trust-calibrated learning system, not an analytics dashboard.

REFLECT:
- Daily Close
- Get Unstuck
- Weekly Reset
- Insight confirmation

ME:
- Personal Operating Model overview
- Operating Preferences
- tentative Pattern Candidates
- Memory Inspector
- personalization status
- data source summary

Daily Close:
- factual Action outcomes;
- Focus summary;
- movement;
- optional note;
- no invented mood/energy.

Get Unstuck:
- evidence first;
- one friction question;
- one intervention;
- edit/reject;
- return to NOW.

Weekly Reset:
- Reality;
- Movement;
- max 3 Pattern Candidates;
- max 3 Adjustments;
- Next Week confirmation.

ME:
- clearly distinguish confirmed preference vs tentative pattern;
- show evidence/source;
- Confirm / Partly accurate / Incorrect / Do not use;
- Edit / Delete / Disable for recommendations.

Design both list and detail states, evidence disclosure, AI error, empty states and memory deletion confirmations.

---

# Prompt E — Notifications & Settings Full UX

Use `SETTINGS_NOTIFICATIONS_SPEC_V1.md` as source of truth.

Design full mobile + desktop UX for:

## Notification Center

- grouped notification list;
- unread/read;
- item deep link;
- dismiss;
- mark read/unread;
- mute type;
- stale/expired;
- security alert;
- empty state;
- grouped/digest state;
- notification settings shortcut.

Categories:
- NOW/recommendation;
- Focus;
- scheduled Action;
- Daily Close;
- Weekly Reset;
- Recovery;
- Incubator revisit;
- AI processing;
- integration;
- security/account;
- product/system.

## Notification Preferences

- master switch;
- in-app;
- push P1;
- email P1;
- quiet hours;
- timezone;
- category toggles;
- immediate/digest/off where appropriate;
- critical security exception.

## Settings

Create settings IA and detailed screens for:

- Account
- Appearance
- Notifications
- AI & Recommendations
- Memory & Personalization
- Privacy & Data
- Integrations
- Accessibility
- Help & Support
- About
- Billing P1 placeholder only

For every destructive control, show consequence before confirmation.

Normal users must NOT see provider API keys, prompt registry, feature flags, raw audit logs or internal system routing.

Use plain Vietnamese labels and helper copy.

---

# Prompt F — Admin Console Foundations & Operational IA

Use `ADMIN_CONSOLE_SPEC_V1.md`.

Design a separate internal desktop admin console at 1440×1024.

Do not reuse the normal user navigation.

Create Admin IA:

- Overview
- Users
- Support
- AI / Providers
- AI Contracts / Prompts
- Recommendation Quality
- Feature Flags / Experiments
- Notifications / Messaging
- Product Content / Configuration
- Analytics / Funnels
- Errors / Incidents
- Privacy / Data Operations
- Audit Log
- Admin Roles / Access
- Billing / Plans P1
- System Settings

Admin visual direction:
- denser than user app;
- highly legible;
- tables where appropriate;
- explicit environment badge;
- permission/status badges;
- sensitive action confirmations;
- strong audit affordances;
- not a flashy analytics dashboard.

Create components:
- AdminSideNav
- EnvironmentBadge
- PermissionBadge
- HealthBadge
- MetricCard
- AlertCard
- DataTable
- FilterBar
- DetailDrawer
- DiffViewer
- ConfigEditor
- AuditTimeline
- IncidentTimeline
- SensitiveActionModal
- PermissionDeniedState
- RedactedDataCell

Pause for review after IA + admin foundations before designing all admin pages.

---

# Prompt G — Admin Detailed Screens

After Admin foundations are approved, design these screens/states:

## Overview
- operational health;
- activation/core-loop funnel;
- trust metrics;
- provider health;
- support/privacy queues;
- incident cards.

## Users
- searchable user table;
- user summary;
- product-state summary;
- sessions;
- feature flags;
- support cases;
- privacy requests;
- role-gated sensitive content access;
- suspend/revoke confirmation;
- no casual raw Capture browsing.

## Support
- ticket queue;
- ticket detail;
- internal notes;
- diagnostics;
- escalation;
- linked incident.

## AI / Providers
- provider list;
- health metrics;
- model registry;
- fallback routing;
- timeout/rate limits;
- test provider;
- enable/disable confirmation;
- credentials configured indicator, never secret value.

## AI Contracts / Prompts
- version list;
- schema;
- prompt/template;
- fixtures;
- evaluation;
- diff;
- draft/staged/active/retired;
- publish/rollback;
- audit.

## Recommendation Quality
- Accept/Edit/Not Now/Wrong Assumption;
- Why This opens;
- ruleset versions;
- evidence completeness;
- stale incidents;
- anonymized/permission-safe trace.

## Feature Flags / Experiments
- flag table;
- rollout;
- targeting;
- kill switch;
- experiment metrics;
- conflict warning;
- audit.

## Notifications / Messaging
- template registry;
- localization;
- deep link;
- eligibility;
- preview;
- test send;
- delivery metrics;
- publish/rollback.

## Analytics
- Activation funnel;
- Execution funnel;
- Adaptation funnel;
- filters/breakdowns;
- no psychographic inference from private content.

## Errors / Incidents
- incident list/detail;
- timelines;
- linked logs;
- impact;
- status updates;
- error groups.

## Privacy Operations
- export requests;
- delete requests;
- verification;
- deadlines;
- failures/retries;
- immutable audit.

## Audit Log
- actor/action/resource/time/environment;
- diff/detail;
- no delete/edit.

## Roles / Access
- role matrix;
- admin user detail;
- permission denied;
- sensitive role-change confirmation.

For every admin section include empty/loading/error/read-only/permission-denied/production-warning/conflict states.

---

# Prompt H — Figma File Expansion

Expand the Figma file pages to:

00 Product Brief
01 IA & User Flows
02 Foundations
03 Components
04 Mobile / Clarity
05 Mobile / NOW & Execute
06 Mobile / Reflect & ME
07 Desktop / Clarity
08 Desktop / NOW & Execute
09 Desktop / Reflect & ME
10 Responsive Patterns
11 Prototype Flows
12 Edge & AI States
13 Notifications
14 Settings & Privacy
15 Admin / Foundations
16 Admin / Users & Support
17 Admin / AI & Quality
18 Admin / Experiments & Messaging
19 Admin / Privacy & Audit
20 Dev Handoff

Annotate every screen with:
- module;
- priority P0/P1/P2;
- user role;
- entry point;
- state;
- main CTA;
- secondary actions;
- API/data dependency when known;
- responsive pattern;
- unresolved question.

Do not silently turn P1/P2 design coverage into MVP implementation scope.

---

# Prompt I — Final Detailed Product QA

Audit the complete design against these questions:

1. Can every module be understood without knowing database/domain terminology?
2. Is NOW still action-first and not a backlog?
3. Can the user always recover when AI is unavailable?
4. Are durable commitments explicitly confirmed?
5. Is Not Now protected rather than punished?
6. Are Focus and Action Result visually distinct?
7. Does Weekly Reset remain a guided story?
8. Are tentative insights visually different from confirmed preferences?
9. Can the user inspect/delete personalization?
10. Are notification controls easy to reach?
11. Do notifications avoid guilt and repeated spam?
12. Are destructive settings separated and explained?
13. Does Privacy & Data remain discoverable?
14. Does Admin avoid exposing sensitive raw content by default?
15. Are admin writes permissioned, confirmed and auditable?
16. Are provider secrets never displayed?
17. Are prompt/contract changes versioned?
18. Are feature flags and experiments reversible?
19. Are user app and admin console clearly separate products?
20. Are P0/P1/P2 labels preserved in the Figma handoff?
21. Are all empty/loading/error/offline/permission/conflict states represented?
22. Are mobile and desktop the same responsive model?
23. Are all recurring UI patterns componentized?
24. Does the design avoid social/gamification/life-score/productivity-guru patterns?
25. Does the final Dev Handoff identify unresolved product questions instead of inventing answers?
