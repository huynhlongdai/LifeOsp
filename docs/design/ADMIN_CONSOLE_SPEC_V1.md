# LifeOS — Admin Console Specification V1

Status: CANONICAL INTERNAL DESIGN INPUT
Updated: 2026-08-27
Audience: Internal Product Designer / Figma AI / Product Ops / Engineering

## Purpose

Define an internal admin console for operating LifeOS safely. Admin is a separate product surface from the user app. It should prioritize auditability, privacy, support safety, configuration correctness and anomaly detection over decorative dashboards.

Admin mobile is not P0. Primary reference: 1440×1024 desktop.

---

# 1. Admin Shell

## Navigation

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

## Global admin elements

- environment badge: dev/staging/prod;
- current admin role;
- global search;
- alert/incident banner;
- support queue count;
- privacy request count;
- provider health summary;
- audit shortcut;
- account/logout.

## Global states

- permission denied;
- read-only role;
- sensitive action confirmation;
- production environment warning;
- stale data;
- API/error;
- partial outage;
- audit logging unavailable — block sensitive writes if needed.

---

# 2. Overview

Goal: show what needs operational attention, not vanity metrics.

## Sections

### Product health

- DAU/WAU later;
- first-value activation;
- Clarity completion;
- Direction confirmed;
- NOW recommendation available;
- Focus started;
- Action result recorded;
- Daily Close;
- Weekly Reset.

### Trust/quality

- recommendation Accept rate;
- Edit rate;
- Not Now rate;
- Wrong Assumption rate;
- Why This open rate;
- AI manual fallback rate;
- AI contract invalid-output rate.

### System health

- API availability;
- DB health;
- AI provider health;
- latency;
- error rate;
- queue/backlog if introduced;
- notification delivery failures.

### Operations

- open incidents;
- support tickets needing attention;
- deletion/export requests;
- failed integrations;
- flags/experiments at risk.

## Filters

- date range;
- environment;
- app version;
- locale;
- platform;
- experiment cohort where appropriate.

Avoid user-sensitive content in Overview.

---

# 3. Users

## User list

Columns:
- user ID/internal reference;
- display name/email only if available;
- created;
- last active;
- locale/timezone;
- account status;
- plan later;
- experiment/flags count;
- support status;
- privacy-request indicator.

Filters:
- active/inactive;
- account status;
- locale;
- plan P1;
- feature flag;
- support case;
- deletion/export pending.

## User detail

Tabs:
- Summary
- Product State
- Sessions
- Feature Flags
- Support
- Privacy/Data
- Audit

### Summary

- account metadata;
- created/last active;
- app version/platform recent;
- onboarding/activation milestone summary;
- current product state at a high level;
- errors affecting user;
- open support/privacy cases.

### Product State

Only minimal support-safe information by default:
- has Direction?;
- current Season status;
- counts of active Outcomes/Projects/ready Actions;
- current recommendation status;
- active Focus?;
- last Daily Close/Weekly Reset date.

Do not display raw Brain Dump/Capture by default.

### Sensitive content access

If support ever needs raw content:
- role-gated;
- explicit reason;
- warning;
- access audit;
- limited session/time;
- copy/download restrictions where appropriate.

### Sessions

- active sessions;
- created/last used;
- revoke;
- revoke all;
- suspicious/new location/device only if data exists.

### User actions

Potential:
- suspend;
- restore;
- revoke sessions;
- resend account action later;
- trigger export workflow;
- start deletion workflow.

Every sensitive action requires confirmation and audit.

### Impersonation

Not P0.
If ever implemented:
- role restricted;
- reason required;
- giant production warning;
- visible “impersonating” banner;
- short expiry;
- immutable audit;
- no access to secrets/security settings without separate authorization.

---

# 4. Support

## Ticket queue

Columns:
- ticket ID;
- user;
- category;
- priority;
- status;
- created;
- assigned;
- SLA later;
- linked incident/error.

Filters:
- open/pending/resolved;
- category;
- priority;
- assigned;
- product area.

## Ticket detail

Sections:
- user message;
- minimal user context;
- app/version/device data;
- related error IDs;
- related LifeEvent IDs if necessary;
- internal notes;
- reply/action history;
- escalation;
- status.

Actions:
- assign;
- change priority;
- add internal note;
- mark waiting;
- resolve;
- link incident;
- request diagnostics.

Do not expose raw personal content unless required and audited.

---

# 5. AI / Provider Operations

## Provider list

Fields:
- provider;
- enabled;
- health;
- model count;
- latency p50/p95;
- error rate;
- timeout rate;
- request volume;
- estimated cost P1;
- fallback rank;
- circuit-breaker state;
- credential configured yes/no.

Never show secret value.

## Provider detail

Sections:
- health history;
- models;
- capabilities;
- routing priority;
- timeout;
- rate limit;
- fallback;
- recent failures;
- contract compatibility;
- configuration history.

Actions:
- test provider;
- enable/disable;
- change fallback order;
- edit timeout;
- edit limits;
- mark maintenance;
- view incident.

Sensitive action confirmation includes estimated impact.

## Model Registry

Fields:
- model ID/internal alias;
- provider;
- capabilities;
- enabled;
- context/limits only if used;
- cost class P1;
- allowed contracts;
- fallback model;
- rollout environment.

---

# 6. AI Contract / Prompt Registry

Purpose: version every production AI behavior.

## Contract list

Fields:
- contract name;
- domain purpose;
- contract/schema version;
- prompt/template version;
- status: draft/staged/active/retired;
- target provider/model;
- last publish;
- owner;
- validation rate;
- fallback type.

## Contract detail

Tabs:
- Overview
- Schema
- Prompt/Template
- Fixtures
- Evaluation
- Versions
- Rollout
- Audit

## Prompt editor

Requirements:
- versioned draft;
- syntax/variable validation;
- preview variables;
- test fixture run;
- diff vs active;
- change note;
- save draft;
- stage;
- publish;
- rollback.

Production prompt must not be silently edited in place.

## Fixture runner

- fixture input;
- expected valid/invalid behavior;
- provider/model;
- raw response access restricted if contains sensitive data;
- schema validation;
- latency;
- pass/fail;
- compare versions.

---

# 7. Recommendation Quality

## Overview metrics

- recommendations generated;
- shown;
- accepted;
- edited;
- Not Now;
- Wrong Assumption;
- rejected;
- stale/withdrawn;
- Why This opens;
- refresh count;
- recommendation reversal after accept later.

## Ruleset monitoring

- ruleset version;
- winner distribution;
- factor distribution;
- no-eligible-action rate;
- evidence completeness;
- stale recommendation incidents;
- duplicate prevention;
- latency.

## Trace sample

Permission-safe trace:
- user anonymized reference;
- recommendation ID;
- action ID masked/reference;
- factor labels/scores;
- evidence classes;
- resolution;
- no raw hidden reasoning.

## Quality flags

- unusually high Wrong Assumption;
- no evidence;
- repeated resurfacing after reject;
- action no longer eligible;
- impossible/stale link;
- outlier latency.

---

# 8. Feature Flags / Experiments

## Flag list

Fields:
- key;
- name;
- description;
- owner;
- environment;
- status;
- rollout percentage;
- targeting summary;
- created/updated;
- kill switch availability.

## Flag detail

Controls:
- off/on;
- rollout %;
- targeted user IDs;
- segment targeting;
- prerequisites;
- mutually exclusive experiment warning;
- schedule P1;
- rollback;
- audit.

## Experiment detail

- hypothesis;
- owner;
- start/end;
- variants;
- allocation;
- primary metric;
- guardrail metric;
- sample size notes later;
- current status;
- stop/rollback.

Do not allow experiments to override privacy/safety controls.

---

# 9. Notifications / Messaging Admin

## Template registry

Fields:
- template key;
- category;
- channel;
- locale;
- status;
- version;
- deep link;
- quiet-hour rule;
- last changed.

## Template editor

- title;
- body;
- variables;
- localization;
- deep link;
- CTA;
- eligibility explanation;
- preview mobile/desktop/email later;
- test send;
- version diff;
- publish/rollback.

## Delivery metrics

- attempted;
- delivered;
- opened;
- action taken;
- muted type;
- opt-out;
- failed;
- provider error.

No bulk marketing broadcast UI without separate approval/compliance scope.

---

# 10. Product Content / Configuration

Managed content candidates:
- NeedState labels;
- onboarding help;
- empty-state copy;
- friction options;
- explanation copy;
- help center content;
- notification copy;
- locale strings later.

For product-critical decision text:
- version;
- preview;
- staging;
- publish;
- rollback;
- audit.

Avoid building a generic CMS unless product needs it.

---

# 11. Analytics / Funnels

## Core funnels

### Activation

Session → NeedState → Capture → Interpretation → Trade-off → Direction confirmed → NOW ready.

### Execution

NOW shown → Why This → Accept/Edit → Focus Start → Focus End → Action Result → Daily Close.

### Adaptation

Weekly Reset start → Reality → Pattern review → Adjustment → Next Week confirm.

## Metrics

- time to first useful Next Action;
- Next Action start rate;
- Focus completion/outcome rate;
- recommendation correction rates;
- return after missed days;
- Weekly Reset completion;
- confirmed insight rate;
- Meaningful Progress Days per WAU later.

## Breakdowns

- platform;
- app version;
- locale;
- explicit NeedState;
- experiment cohort;
- AI provider/model for AI-specific quality.

Do not create inferred psychographic segments from private content.

---

# 12. Errors / Incidents

## Incident list

Fields:
- severity;
- status;
- title;
- impacted subsystem;
- start time;
- duration;
- impacted users count;
- owner;
- linked provider/error group.

## Incident detail

Sections:
- summary;
- timeline;
- affected services;
- user impact;
- linked logs/traces;
- mitigations;
- status message;
- owner;
- postmortem P1.

Actions:
- acknowledge;
- investigate;
- update status;
- resolve;
- link support cases;
- disable provider/flag where allowed.

## Error groups

- API;
- DB;
- AI provider;
- AI validation;
- web client;
- integration;
- notification.

Fields:
- count;
- first/last seen;
- affected users;
- versions;
- stack trace/technical details;
- linked incident;
- status.

PII/redaction required for diagnostics where applicable.

---

# 13. Privacy / Data Operations

Restricted role surface.

## Data export requests

Fields:
- request ID;
- user;
- identity verification status;
- requested scope;
- created;
- due/deadline;
- status;
- processing errors;
- completion;
- delivery state.

Actions:
- verify;
- start/retry;
- mark completed;
- revoke generated artifact if needed;
- audit note.

## Deletion requests

- user;
- request type;
- verification;
- scope;
- dependencies;
- legal retention exception if applicable;
- status;
- retry/failure;
- completed.

Every step audited.

## Sensitive data access log

- admin;
- user/resource;
- purpose/reason;
- timestamp;
- duration;
- action.

---

# 14. Audit Log

Immutable operational view.

## Events

- admin login/logout;
- role/permission change;
- user suspend/restore/session revoke;
- provider enable/disable/config;
- prompt contract publish/rollback;
- feature flag change;
- notification template publish;
- privacy request action;
- content config publish;
- billing override later;
- system settings change.

## Filters

- actor;
- action type;
- resource;
- environment;
- date/time;
- severity/risk;
- user reference.

## Detail

- before/after diff where safe;
- reason/change note;
- request/correlation ID;
- source IP/device only if policy permits;
- linked ticket/incident.

No normal delete/edit action for audit rows.

---

# 15. Admin Roles / Access

Potential roles:
- Super Admin;
- Product Ops;
- Support;
- AI Ops;
- Analyst Read-only;
- Privacy Ops.

## Role matrix page

Rows = permissions/resources.
Columns = roles.

Permissions examples:
- view users;
- view sensitive user content;
- suspend user;
- revoke session;
- manage providers;
- manage prompts;
- publish flag;
- publish notification template;
- view analytics;
- manage privacy request;
- view audit log;
- manage admin roles.

## Admin user detail

- role;
- status;
- last login;
- MFA status when implemented;
- access history;
- revoke access;
- change role.

Sensitive role change requires confirmation + audit.

---

# 16. Billing / Plans P1

Only after monetization model is finalized.

Possible admin functions:
- plans;
- entitlements;
- usage limits;
- subscriptions;
- invoices;
- failed payment;
- manual comp/credit with audit;
- cancellation/refund workflows.

Do not design arbitrary pricing/limits now.

---

# 17. System Settings

Restricted to high-privilege roles.

Possible settings:
- environment info;
- maintenance mode;
- minimum app version later;
- feature defaults;
- notification provider status;
- AI global circuit breaker;
- integration global enable/disable;
- support contact config;
- retention policy display.

Dangerous settings must use:
- clear impact summary;
- typed/explicit confirmation;
- change note;
- audit;
- rollback where possible.

---

# 18. Admin Design System

Reuse brand foundations but differentiate operational density.

Components:
- AdminSideNav;
- EnvironmentBadge;
- PermissionBadge;
- HealthBadge;
- MetricCard;
- AlertCard;
- DataTable;
- FilterBar;
- SearchField;
- DetailDrawer;
- DiffViewer;
- ConfigEditor;
- AuditTimeline;
- IncidentTimeline;
- SensitiveActionModal;
- PermissionDeniedState;
- RedactedDataCell;
- EmptyState;
- ErrorState;
- LoadingTable;
- Pagination.

Admin can be denser than user app, but maintain clear hierarchy.

---

# 19. Admin State Checklist

Design applicable states:
- loading;
- empty;
- filtered empty;
- error;
- permission denied;
- read-only;
- stale data;
- partial outage;
- destructive confirmation;
- production warning;
- validation error;
- save/publish in progress;
- publish succeeded;
- rollback;
- conflict/version changed;
- redacted data;
- audit unavailable;
- provider unhealthy.

---

# 20. Hard Privacy Rules

Admin UI must not normalize casual access to sensitive personal content.

Principles:
- least privilege;
- minimal necessary context;
- explicit reason for sensitive access;
- immutable audit;
- redact by default;
- no secrets displayed;
- no copying raw tokens/provider credentials;
- production writes visibly distinct from staging/dev;
- analytics use aggregates whenever possible.
