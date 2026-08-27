# Meeting #019 — Full Product Surface & Detailed UX Specification

Date: 2026-08-27
Status: APPROVED FOR DETAILED DESIGN

## Objective

Expand the LifeOS Figma handoff from screen-level guidance into a complete product-surface specification covering:

- every user-facing module;
- small functions and sub-functions inside each module;
- empty/loading/error/offline/AI-failure states;
- notifications and reminders;
- settings, privacy, memory, AI and integration controls;
- internal admin console;
- responsive mobile/desktop behavior;
- permission/trust boundaries;
- design priority P0/P1/P2;
- design-system primitives required to build all surfaces consistently.

This meeting is intended to give Figma AI / a product-design agent enough context to design a coherent system without inventing missing product behavior.

## Roles represented

- Product Director
- UX Director
- Behavioral UX / Cognitive Load Lead
- Information Architecture Lead
- Mobile/PWA UX Lead
- Desktop UX Lead
- Design Systems Lead
- Notification / Engagement Lead
- Trust / Privacy Lead
- AI Product / AI Safety UX Lead
- Growth / Onboarding Lead
- Customer Support / Operations Lead
- Admin Console / Internal Tools Lead
- Analytics Lead
- Accessibility Reviewer
- Engineering Reviewer
- Skeptical Product Reviewer

## Product architecture decision

LifeOS design must be divided into three product surfaces.

### Surface A — User App

The daily personal operating system.

Primary navigation:

- NOW
- DIRECTION
- EXECUTE
- REFLECT
- ME

Secondary:

- Inbox / Capture
- Incubator / Not Now
- Ask LifeOS
- Notifications / Activity
- Settings

### Surface B — System Surfaces

Cross-module controls that should not become primary daily navigation:

- notification center;
- notification preferences;
- settings;
- privacy and data;
- AI controls;
- memory controls;
- integrations;
- appearance;
- accessibility;
- account/session/security;
- export/delete data;
- help/support;
- plan/billing when monetization is introduced.

### Surface C — Admin Console

Internal operational product. Separate shell and permissions from the User App.

Potential sections:

- Overview
- Users
- Support
- AI / Providers
- Prompt / Contract Registry
- Recommendations / AI Quality
- Feature Flags / Experiments
- Notifications / Messaging
- Content / Configuration
- Analytics / Funnels
- Errors / Incidents
- Data / Privacy Operations
- Billing / Plans later
- Audit Log
- Admin Access / Roles

Admin must not appear to normal users.

## Scope governance

The design may be comprehensive, but implementation priority must remain visible.

### P0 — Core loop / near-term MVP

- onboarding / clarity;
- Direction / Season;
- Outcome / Project / Action lightweight context;
- NOW;
- Focus;
- Action result;
- Daily Close;
- Get Unstuck;
- Weekly Reset;
- ME / operating preferences / memory inspector;
- Inbox / Capture;
- Incubator;
- core Settings / Privacy / AI / Notifications;
- essential admin/support/AI operational screens.

### P1 — After loop validation

- Calendar read integration;
- voice capture;
- notification automation improvements;
- richer search/filter;
- data import;
- simple routines if validated;
- billing/plan UI;
- richer admin experiments/content controls.

### P2 — Future / exploratory

- broader integrations;
- richer personal analytics;
- family/shared features only if product strategy later approves;
- marketplace/plugin concepts only if separately approved.

P1/P2 can be designed as foundations but must not visually dominate the MVP.

## Cross-product UX rules

1. NOW never becomes a backlog.
2. Direction is intentional and user-confirmed.
3. Not Now is protected, not failure.
4. AI error is normal, not catastrophic.
5. Manual continuation exists wherever AI is non-essential.
6. Capture raw input is preserved.
7. Important AI-derived conclusions are editable/correctable.
8. No hidden model probability.
9. No fake productivity or life score.
10. No guilt/red-overdue wall after missed days.
11. Focus ending does not mean Action complete.
12. Weekly Review is guided narrative, not dashboard wall.
13. Settings expose control without requiring users to understand internal architecture.
14. Notifications must reduce cognitive load, not become another inbox to manage.
15. Admin tools prioritize auditability and safety over visual polish.

## Detailed module map approved

### 1. Global App Shell

Sub-functions:

- responsive primary navigation;
- secondary launcher/menu;
- global quick Capture;
- notification indicator;
- sync/offline state indicator when relevant;
- current context breadcrumb on desktop;
- keyboard navigation / shortcut discoverability;
- global error acknowledgement;
- update/app-version notification;
- account/avatar menu;
- theme-aware surfaces.

Mobile:

- bottom navigation;
- top contextual title/action area;
- floating/quick Capture entry only if it does not compete with primary CTA;
- sheets for secondary menu.

Desktop:

- left rail;
- central workspace;
- optional right context/evidence rail;
- command/search affordance can be P1.

### 2. Onboarding / First Value

Functions:

- welcome;
- immediate need selection;
- optional quick context;
- skip/profile-minimization;
- Brain Dump entry;
- session-safe progress;
- AI unavailable fallback;
- first interpretation review;
- first trade-off;
- first Direction/Season confirmation;
- first NOW recommendation;
- onboarding completion acknowledgement.

Do not force a long personality questionnaire before value.

### 3. Inbox / Capture

Capture functions:

- create text capture;
- quick capture;
- Brain Dump;
- distraction capture from Focus;
- voice entry placeholder P1;
- saved confirmation;
- read raw immutable capture;
- processing state;
- interpretation state;
- processing retry;
- manual interpretation fallback;
- archive capture;
- filter by processing state;
- filter by capture type;
- search P1;
- bulk archive P1;
- privacy/memory-use indicator where relevant.

Capture item states:

- unprocessed;
- interpreted;
- corrected;
- promoted;
- archived.

### 4. Clarity / Interpretation

Functions:

- show original Capture;
- show structured interpretation;
- groups: commitments, possible directions, possible projects, ideas, concerns, questions, references, uncertainties;
- inline edit item;
- add missing item manually;
- remove incorrect item;
- mark ambiguous;
- source/provenance hint;
- confidence class;
- save correction as new version;
- version history;
- conflict/reload if correction version is stale;
- continue manually when AI unavailable;
- proceed to trade-off only when user says interpretation is useful enough.

### 5. Trade-off / Focus Conflict

Functions:

- show candidates derived from reviewed interpretation;
- classify candidate: Active / Maintain / Not Now;
- all candidates start unassigned;
- require explicit active choice;
- show attention/focus budget explanation when useful;
- move item between buckets;
- edit candidate text/context;
- safe Not Now copy;
- preview what becomes Direction/Season;
- cancel/reject proposal;
- confirm proposal.

### 6. DIRECTION

Sub-modules:

#### Direction Overview

- current Direction statement;
- reason/purpose;
- status;
- source context;
- edit;
- pause/close only with explicit confirmation;
- history P1.

#### Current Season

- Season name;
- start/end or approximate horizon;
- purpose;
- active status;
- primary focus;
- supporting/maintenance context;
- progress summary based on recorded outcomes, not arbitrary score;
- edit Season text;
- close/end Season P1;
- start new Season after review.

#### Outcomes

- list current Outcomes;
- create Outcome manually;
- title/description/success signal;
- active/paused/completed/dropped states;
- link to Season;
- progress derived from Projects/Actions where possible;
- edit;
- pause/drop with confirmation;
- no AI auto-activation.

#### Projects

- projects under Outcome;
- create project;
- project goal/context;
- active/paused/completed/dropped;
- actions count/status;
- current bottleneck later;
- edit;
- move/pause/drop;
- Project is not top-level navigation.

### 7. EXECUTE

Sub-modules:

#### Action Candidate / Action Detail

- title;
- done condition;
- estimated minutes;
- priority if explicitly set;
- scheduled-for if present;
- Outcome/Project context;
- candidate/ready/active/completed/partial/postponed/blocked/dropped states;
- manual create;
- AI proposal review;
- confirm candidate → ready;
- edit;
- Not Now via recommendation, not silent action state mutation;
- blocked reason;
- result history later.

#### Lightweight Outcome/Project Context

- enough context to understand why Action exists;
- avoid Jira/project-management UI density.

### 8. NOW

States:

- Ready;
- No Direction;
- No Ready Action;
- Blocked;
- Recovery;
- Nothing Important;
- Recommendation Missing/loading;
- Error/offline.

Ready functions:

- Current Season context;
- one dominant Action;
- estimated time;
- done condition;
- confidence class;
- Why This;
- Accept;
- Edit;
- Not Now;
- Wrong Assumption;
- Explain;
- Start Focus after acceptance, preserving B4 boundary;
- refresh recommendation when allowed;
- do not auto-resurrect a recommendation the user just rejected without new evidence.

Why This:

- evidence list;
- rule/factor labels;
- explicit context;
- alternative only if stored/product-supported;
- no hidden reasoning.

### 9. Focus

Functions:

- start from accepted/edited NOW recommendation;
- Action snapshot/context;
- done condition;
- planned minutes;
- optional timer;
- timer start/pause/continue UX only if semantics permit;
- end Focus;
- interrupt Focus;
- abandon Focus;
- distraction capture;
- quick note during Focus if later approved;
- reload active Focus;
- show recent Focus summary;
- Focus state badge;
- no unrelated backlog;
- no auto-complete Action.

Focus states:

- ready-to-start;
- active;
- interrupted;
- abandoned;
- ended/completed session;
- reload/recovered session;
- API/offline error.

### 10. Action Result

Explicit outcomes:

- Completed;
- Partial;
- Postponed;
- Blocked;
- Dropped.

Functions:

- choose result;
- optional short note;
- reason when useful;
- postpone context/date if supported;
- blocked reason;
- confirm;
- undo/reopen policy requires product approval;
- show effect on NOW after result;
- no guilt language.

### 11. Daily Close

Functions:

- local date;
- factual actions/results recorded;
- focus sessions summary;
- meaningful movement;
- intentional postpones/drops;
- optional user note;
- optional friction field only if user enters it;
- close day;
- edit note;
- previous days P1;
- no invented mood/energy/cause.

### 12. Get Unstuck

Functions:

- trigger from evidence/stall;
- show evidence first;
- ask one friction question;
- friction choices;
- custom other;
- propose one intervention;
- edit intervention;
- accept;
- reject;
- return to NOW;
- later record whether intervention helped.

Interventions:

- clarify first step;
- resize;
- unblock;
- reprioritize;
- replan;
- pause/drop.

### 13. REFLECT / Weekly Reset

Steps:

#### Reality

- planned/expected context;
- actual recorded Actions/Focus/results;
- missed items only as facts, not debt.

#### Movement

- Outcomes advanced;
- stalled/blocked;
- intentionally dropped;
- meaningful progress.

#### Pattern Candidates

- max 3;
- evidence;
- confidence;
- confirm/partly/incorrect/do-not-use;
- explain source evidence.

#### Adjustments

- max 3;
- accept/edit/reject;
- effect preview where possible.

#### Next Week

- confirm Direction/Season;
- protect priorities;
- first Next Action;
- finish review.

### 14. ME / Personal Operating Model

Sections:

- basic profile/context;
- confirmed operating preferences;
- tentative patterns;
- recent corrections;
- recommendation rules currently influenced by preferences;
- memory summary;
- data sources/connections;
- personalization controls.

Functions:

- confirm insight;
- partially confirm;
- reject;
- edit preference;
- delete preference;
- disable use in recommendations;
- view evidence;
- view history P1.

Never present personality diagnosis as fact.

### 15. Memory Inspector

Functions:

- list durable memory entries;
- category/filter;
- source;
- why it is stored;
- where it is used;
- confidence/status;
- edit;
- delete;
- do not use for recommendation;
- memory candidate confirmation;
- bulk export/delete later;
- memory privacy explanation.

### 16. Incubator / Not Now

Functions:

- list intentionally inactive items;
- item type;
- reason/source;
- created date;
- revisit date optional;
- search/filter P1;
- promote;
- keep incubated;
- archive;
- change revisit date;
- explain that Not Now is safe storage, not backlog debt.

### 17. Ask LifeOS

Purpose: query personal data/history, not default chatbot home.

Functions:

- ask natural language question;
- suggested query examples;
- answer with evidence references;
- show uncertainty;
- open source records;
- correct answer/source misunderstanding;
- new chat/query history P1;
- delete query history P1;
- provider unavailable fallback;
- no unsupported personal claim.

Examples:

- What do I keep postponing?
- Which actions under 45 minutes do I complete most consistently?
- What changed this week?
- Which projects have not moved?

### 18. Notification Center

Purpose: surface only things that help the user reorient or act.

Notification categories:

- Today / NOW changed;
- Focus reminders;
- planned/scheduled Action reminder;
- blocked/stalled attention;
- Daily Close;
- Weekly Reset;
- Incubator revisit;
- AI analysis completed;
- AI/provider error only if user action is needed;
- integration issue;
- account/security;
- product/system update.

Notification item functions:

- title;
- concise context;
- timestamp;
- read/unread;
- primary deep-link action;
- mark read;
- dismiss;
- mute this type;
- notification preference shortcut;
- grouped/stacked display;
- clear read items P1.

Design rule: notification center is not a second task inbox.

### 19. Notification Preferences

Controls:

- master notifications on/off;
- in-app;
- push/web push P1;
- email P1;
- quiet hours;
- timezone;
- daily digest vs immediate;
- NOW/recommendation changes;
- Action/schedule reminders;
- Focus reminders;
- Daily Close;
- Weekly Reset;
- recovery/re-engagement;
- Incubator revisit;
- AI processing completion;
- product updates;
- security cannot always be fully muted;
- per-category channel selection P1.

Behavior rule: avoid guilt/re-engagement spam after missed days.

### 20. Settings

Settings IA approved:

#### Account

- account/session identity;
- name/display name;
- email when auth added;
- timezone;
- locale/language;
- sign out/session reset;
- connected sessions P1.

#### Appearance

- system/light/dark;
- compact/comfortable where useful;
- text-size compatibility note;
- motion preference / respect OS;
- accent/theme only if later approved.

#### Notifications

- link to full notification preferences.

#### AI & Recommendations

- AI enabled/limited mode;
- provider/model user selection only if product later exposes it — not assumed P0;
- allow AI interpretation;
- allow AI candidate suggestions;
- allow personal evidence in recommendations;
- manual-only fallback preference P1;
- reset rejected suggestion behavior P1;
- explanation/privacy link.

#### Memory & Personalization

- memory enabled;
- inspect memory;
- require confirmation for durable preference;
- use memory for recommendations;
- delete selected/all memories;
- reset operating preferences;
- personalization explanation.

#### Privacy & Data

- what data is stored;
- data export;
- delete account/data;
- retention summary;
- AI data-use explanation;
- integration permissions;
- analytics/telemetry control where legally/product appropriate;
- privacy policy/terms links.

#### Integrations

- Calendar P1;
- browser/share capture P1;
- connection state;
- permission scope;
- last sync;
- reconnect;
- disconnect;
- sync error;
- never imply write permissions when only read access exists.

#### Accessibility

- reduced motion acknowledgement;
- keyboard shortcuts;
- high contrast support notes;
- timer sound/vibration only when implemented;
- screen-reader-friendly copy guidance.

#### Help & Support

- help center;
- report problem;
- feedback;
- diagnostics copy/report ID;
- version/build;
- status page P1.

#### About

- product version;
- changelog;
- privacy;
- terms;
- licenses.

### 21. Search / Command P1

Possible future function:

- search Actions/Projects/Captures/Incubator/Memory;
- command shortcuts;
- quick navigate;
- quick Capture;
- do not create a command-center UI as homepage.

### 22. Offline / Sync Surfaces

Functions/states:

- offline banner;
- capture locally if supported later;
- pending sync;
- sync success;
- conflict requiring review;
- provider unavailable independent of network state;
- retry;
- diagnostics.

Do not claim offline support until implementation exists; Figma may design P1 states but label them future.

## Admin Console specification decision

Admin Console is necessary for product operations but is an internal tool. It uses separate role-based access and separate IA.

### Admin 1 — Overview

Cards/sections:

- active users;
- activation funnel;
- core loop completion;
- Next Action generated;
- recommendation accept/edit/not-now/wrong-assumption;
- Focus started/completed session;
- Daily Close / Weekly Reset completion;
- AI error rate;
- provider health;
- critical incidents;
- support queue;
- privacy/data requests.

Avoid vanity dashboard overload; emphasize operational anomalies and user-impacting issues.

### Admin 2 — Users

Functions:

- search user;
- account status;
- created/last active;
- plan later;
- locale/timezone;
- feature flags assigned;
- support notes;
- high-level product-state summary;
- data export request status;
- deletion request status;
- session revoke later;
- suspend/restore only with role/confirmation;
- impersonation, if ever implemented, requires explicit audit and strong warning — not default.

Privacy rule: admin should not casually browse sensitive raw Capture text. Sensitive content access must be permissioned and audited if support workflows ever require it.

### Admin 3 — Support

Functions:

- ticket list;
- status/priority;
- user context with minimal necessary data;
- linked error/event IDs;
- reproduce/diagnostic information;
- internal note;
- response status;
- escalation;
- resolved;
- audit history.

### Admin 4 — AI / Provider Operations

Functions:

- provider list;
- enabled/disabled;
- health;
- latency;
- error rate;
- request volume;
- cost estimate later;
- model registry;
- capability mapping;
- fallback order;
- timeout configuration;
- rate limits;
- circuit breaker state;
- credential status indicator only — never display secret value;
- test provider;
- incident banner;
- disable provider confirmation.

### Admin 5 — AI Contract / Prompt Registry

Functions:

- contract name/version;
- purpose;
- schema version;
- prompt/template version;
- model/provider target;
- test fixtures;
- validation pass rate;
- staged/draft/active/retired;
- compare version;
- publish/rollback;
- change note;
- audit who changed it.

Do not allow direct uncontrolled prompt edits in production without versioning/audit.

### Admin 6 — Recommendation Quality

Functions:

- recommendation volume;
- acceptance/edit/not-now/wrong-assumption rates;
- Why This open rate;
- repeated rejection patterns;
- ruleset version;
- sample anonymized/permission-safe traces;
- evidence completeness;
- rule/factor distributions;
- stale recommendation incidents;
- drilldown by product version/segment without exposing unnecessary personal raw text.

### Admin 7 — Feature Flags / Experiments

Functions:

- flag list;
- key/name/description;
- owner;
- environment;
- status;
- percentage rollout;
- user/segment targeting;
- prerequisites;
- start/end;
- experiment metric;
- kill switch;
- audit history;
- conflict warning;
- preview affected users count.

### Admin 8 — Notifications / Messaging

Functions:

- notification template registry;
- category;
- channels;
- localized copy;
- deep link;
- eligibility rule;
- quiet-hour compliance;
- preview;
- test send;
- schedule P1;
- delivery/error metrics;
- opt-out rate;
- enable/disable;
- version history.

No bulk marketing blast capability should be implied without separate approval/compliance work.

### Admin 9 — Product Content / Configuration

Possible managed content:

- onboarding NeedState labels;
- help text;
- empty-state copy;
- friction option labels;
- notification copy;
- feature education cards;
- supported locales.

Use versioning for product-critical decision text.

### Admin 10 — Analytics / Funnels

Funnels:

- first capture → interpretation → trade-off → Direction → NOW;
- NOW → accept → Focus;
- Focus → Action result → Daily Close;
- Week → Weekly Reset;
- recommendation explain/correct flows.

Breakdowns:

- platform;
- locale;
- acquisition/experiment later;
- user problem state when explicitly known;
- product version;
- provider/model for AI quality.

Avoid pseudo-psychographic segmentation from inferred personal content.

### Admin 11 — Errors / Incidents

Functions:

- incident list;
- severity;
- impacted service;
- start/end;
- user impact count;
- provider/API/DB/client category;
- linked logs/traces;
- acknowledged/investigating/resolved;
- status message;
- timeline;
- owner;
- postmortem link.

### Admin 12 — Privacy / Data Operations

Functions:

- export requests;
- delete requests;
- status;
- requester identity verification status;
- scope;
- created/deadline/completed dates;
- failure/retry;
- retention exception if legally required;
- audit event;
- restricted access.

### Admin 13 — Audit Log

Events:

- admin login;
- permission change;
- user account action;
- provider enable/disable;
- prompt/contract publish;
- feature flag change;
- notification template publish;
- privacy request action;
- system config change.

Filters:

- actor;
- action;
- resource;
- time;
- environment;
- severity.

Audit records should be immutable from normal admin UI.

### Admin 14 — Admin Roles / Access

Potential roles:

- Super Admin;
- Product Ops;
- Support;
- AI Ops;
- Analyst Read-only;
- Privacy Ops.

Design permission-denied states and sensitive-action confirmation.

## Notification design principles approved

- notify only when timing/context changes what the user should know/do;
- one notification should usually have one obvious action;
- avoid repeating an unchanged recommendation;
- no shame language;
- support quiet hours;
- recovery message after absence should orient, not pressure;
- security/account notifications are visually distinct;
- AI processing completion may be silent/in-app when user is already active;
- notification preference controls must be reachable from the notification itself.

## Settings design principles approved

- plain-language categories;
- progressive disclosure;
- dangerous/destructive controls separated visually;
- show consequence before destructive action;
- explain what personalization toggle actually changes;
- never expose internal provider configuration to normal users unless product later chooses a power-user mode;
- privacy controls should not be buried.

## Figma delivery structure amendment

Add these pages to the existing Figma brief:

- `13 — Notifications`
- `14 — Settings & Privacy`
- `15 — Admin / Foundations`
- `16 — Admin / Users & Support`
- `17 — Admin / AI & Quality`
- `18 — Admin / Experiments & Messaging`
- `19 — Admin / Privacy & Audit`

Recommended admin desktop frame: `1440×1024`.

Admin mobile is not P0; only responsive emergency/read-only views if needed later.

## Detailed-state requirement

For each screen/module designed, Figma AI should annotate at least where relevant:

- default;
- empty;
- loading;
- saved/success;
- validation error;
- permission denied;
- offline/network failure;
- provider unavailable;
- destructive confirmation;
- stale/conflict;
- disabled;
- read-only;
- first-use education;
- returning/recovery;
- responsive transformation.

## Decision

Approved.

The canonical design handoff should now include:

1. Figma AI Design Brief V1;
2. Figma AI Prompt Pack V1;
3. Full Product Surface Specification;
4. Settings + Notifications Specification;
5. Admin Console Specification;
6. a detailed-module prompt addendum for Figma AI.

The design agent must distinguish implemented/near-term behavior from future surfaces and must not treat comprehensive design coverage as authorization to implement every P1/P2 feature immediately.