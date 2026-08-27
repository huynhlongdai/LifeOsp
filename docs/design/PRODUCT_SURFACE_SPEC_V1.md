# LifeOS — Product Surface Specification V1

Status: CANONICAL DESIGN INPUT
Updated: 2026-08-27
Audience: Product Designer / Figma AI / UX Agent / Engineering

## Purpose

Define the complete user-facing surface of LifeOS at module → screen → section → control → state level. This document is broader than the current implementation roadmap. Every item is tagged conceptually as P0/P1/P2; comprehensive design coverage does not authorize immediate implementation of all future functionality.

Product loop:

`CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT`

Primary navigation:

`NOW / DIRECTION / EXECUTE / REFLECT / ME`

Secondary:

`Inbox / Incubator / Ask LifeOS / Notifications / Settings`

---

# 1. Global App Shell

## 1.1 Mobile shell

Primary frame: 390×844.

Elements:
- contextual top bar;
- optional back button;
- contextual title;
- optional right action / overflow;
- central one-column content;
- sticky primary CTA only when useful;
- bottom navigation: NOW / DIRECTION / EXECUTE / REFLECT / ME;
- secondary sheet/menu;
- safe-area bottom padding;
- global toast area;
- temporary offline/sync/error banner.

States:
- normal;
- loading route;
- offline;
- session expired;
- update available;
- global error;
- read-only/degraded mode.

## 1.2 Desktop shell

Primary frame: 1440×1024.

Elements:
- persistent left nav;
- product logo/name;
- primary nav;
- secondary nav group;
- account/settings at bottom;
- central workspace with controlled max width;
- optional right context rail;
- page title/context header;
- keyboard focus/shortcut affordance;
- global toast/banner.

Do not stretch every page across the full viewport.

## 1.3 Global quick capture

Entry points:
- secondary nav;
- keyboard shortcut P1;
- optional mobile quick action;
- Focus distraction capture uses a specialized capture flow.

Controls:
- text field/composer;
- save;
- dismiss;
- saved acknowledgment;
- optional “open in Inbox”.

Hard rule: quick capture must never require categorization before save.

---

# 2. Welcome / Onboarding / First Value

## 2.1 Welcome

Goal: reduce anxiety and start value quickly.

Content:
- short LifeOS promise;
- “You do not need a plan already” reassurance;
- primary CTA;
- optional sign-in/account continuation only when auth product is enabled.

Avoid:
- long product tour;
- personality questionnaire;
- feature carousel.

## 2.2 Immediate Need / NeedState

Question concept:
`Bạn cần LifeOS giúp điều gì nhất lúc này?`

Options:
- chưa rõ mình muốn gì;
- không biết hôm nay nên làm gì;
- quá nhiều thứ trong đầu;
- hay trì hoãn;
- thường bắt đầu rồi bỏ;
- muốn cân bằng lại cuộc sống;
- học nhiều nhưng ít áp dụng;
- khác / chưa rõ.

Functions:
- select one;
- continue;
- optional skip / “không chắc”;
- edit later.

State:
- no selection;
- selected;
- validation;
- returning flow.

## 2.3 Quick Life Context

Purpose: capture only what improves immediate recommendation quality.

Possible UI:
- optional free text;
- small chips for available time / immediate concern only if product-approved;
- skip.

Do not turn this into durable profile fields unless canonical schema later defines them.

## 2.4 First value transition

After onboarding:
- Brain Dump;
- save;
- interpretation;
- trade-off;
- Direction/Season confirmation;
- NOW.

Progress indicator should describe journey, not pressure completion.

---

# 3. Inbox / Capture

## 3.1 Inbox overview

Sections:
- needs review;
- recently captured;
- processed/promoted;
- archived P1.

Filters:
- all;
- unprocessed;
- interpreted;
- corrected;
- promoted;
- archived;
- capture kind P1.

Functions:
- new capture;
- open capture;
- retry analysis;
- archive;
- search P1;
- bulk archive P1.

Empty copy:
`Không có gì cần sắp xếp lúc này.`

## 3.2 Capture detail

Fields:
- raw text;
- capture kind;
- created time;
- processing status;
- linked interpretation versions;
- promoted objects if any;
- source context where relevant.

Actions:
- analyze/retry;
- open interpretation;
- archive;
- copy;
- delete subject to data policy;
- privacy/memory usage explanation if applicable.

Raw text is read-only after durable save in current model.

## 3.3 Brain Dump composer

Copy:
`Đưa mọi thứ trong đầu bạn ra đây. Bạn không cần sắp xếp.`

Controls:
- large text area;
- save;
- optional examples;
- voice input P1;
- attach/import P1.

States:
- empty;
- typing;
- saving;
- saved;
- save error;
- offline future state.

## 3.4 Processing

States:
- queued;
- processing;
- completed;
- provider unavailable;
- timeout;
- invalid AI output/manual review required.

Copy when AI fails:
`Phần phân tích chưa hoàn tất. Dữ liệu của bạn đã được lưu.`

Actions:
- retry;
- continue manually.

---

# 4. Interpretation / Clarify

## 4.1 Interpretation Review

Desktop:
- left = original Capture, read-only;
- right = structured interpretation.

Mobile:
- original Capture collapsible;
- structured groups stacked.

Groups:
- commitments;
- possible directions;
- possible projects;
- ideas;
- concerns;
- questions;
- references;
- uncertainties.

Each item:
- label/category;
- text;
- confidence class;
- source/provenance indicator;
- edit;
- remove;
- recategorize if product supports;
- ambiguous marker.

Global actions:
- add missing item;
- save correction;
- review changes;
- continue;
- cancel/back.

## 4.2 Ambiguous item

Visual treatment:
- lower confidence;
- neutral caution icon;
- copy like `Chưa rõ mục này thuộc loại nào.`

Actions:
- keep as capture;
- choose category;
- edit;
- remove.

## 4.3 Version history

P0 minimal:
- current version marker;
- “corrected” acknowledgement.

P1:
- version list;
- source AI/user;
- timestamp;
- compare changes.

## 4.4 Conflict state

If another correction exists:
- explain newer version exists;
- keep user’s unsaved draft visible;
- reload latest;
- compare/merge only if later supported.

Do not silently overwrite user edits.

---

# 5. Trade-off / Focus Conflict

## 5.1 Candidate list

Eligible candidates:
- possible directions;
- possible projects;
- commitments;
- ideas.

Context-only, not commitment candidates:
- concerns;
- questions;
- uncertainties;
- references.

Each candidate begins `unassigned`.

## 5.2 Buckets

- Active;
- Maintain;
- Not Now.

Active:
- visually strongest;
- limited attention message;
- explicit user selection.

Maintain:
- neutral;
- “keep stable, not push aggressively”.

Not Now:
- protected/safe;
- never styled like trash or failure.

## 5.3 Controls

- assign to bucket;
- move between buckets;
- edit label;
- expand source context;
- reset classification;
- cancel;
- continue.

## 5.4 Focus budget explanation

Optional compact message:
`Bạn đang cố bảo vệ nhiều hướng cùng lúc. Chọn điều đáng được ưu tiên chủ động; phần còn lại vẫn được giữ an toàn.`

Do not auto-select Active.

---

# 6. DIRECTION

## 6.1 Direction Overview

Header:
- current Direction title/statement;
- status badge;
- purpose/rationale;
- Current Season card.

Actions:
- edit Direction;
- explain source/history P1;
- pause/close P1 with confirmation;
- create new Direction only after intentional transition.

States:
- no Direction;
- draft proposal;
- active;
- paused P1;
- closed P1.

## 6.2 Current Season

Fields:
- name;
- purpose;
- start;
- target end / horizon;
- status;
- linked Direction;
- Outcomes;
- optional focus allocation language.

Actions:
- edit name/purpose/dates;
- add Outcome;
- close/end Season P1;
- review Season;
- view previous Seasons P1.

States:
- draft;
- active;
- closed/ended P1.

Progress UI:
- based on factual Outcome/Action movement;
- avoid arbitrary “72% life progress”.

## 6.3 Outcomes

List/card fields:
- title;
- success signal/description;
- status;
- linked Project count;
- ready/in-progress Action context;
- factual progress summary.

Actions:
- create;
- edit;
- pause;
- complete;
- drop;
- open details.

States:
- active;
- paused;
- completed;
- dropped.

## 6.4 Outcome Detail

Sections:
- outcome statement;
- why it matters;
- success definition;
- Projects;
- Actions;
- recent movement;
- blockers later;
- linked Season.

Primary CTA depends on missing next step, not generic “add task”.

## 6.5 Projects

Card:
- title;
- linked Outcome;
- status;
- active Action summary;
- latest movement.

Actions:
- create;
- edit;
- pause;
- complete;
- drop;
- open.

Project should feel lightweight, not enterprise project management.

---

# 7. EXECUTE

## 7.1 Execute landing

Purpose: inspect execution structure without competing with NOW.

Sections:
- ready Actions;
- candidates needing confirmation;
- blocked Actions;
- recently finished;
- Outcome/Project filter.

Do not place a huge backlog by default.

## 7.2 Action Detail

Fields:
- title;
- status;
- done condition;
- estimated minutes;
- priority if explicit;
- scheduledFor if present;
- Outcome;
- Project optional;
- blocked reason;
- recent recommendation/context;
- activity/result history P1.

Actions:
- edit;
- confirm candidate → ready;
- start through NOW/Focus flow;
- mark blocked only via validated result flow later;
- drop/postpone via result semantics;
- explain recommendation relationship.

## 7.3 AI Action Candidate Review

Display:
- proposed title;
- done condition;
- estimated time;
- reason;
- assumptions;
- target Outcome/Project.

Actions:
- confirm as ready;
- edit then confirm;
- reject;
- manual create instead.

AI cannot silently create ready Action.

---

# 8. NOW

## 8.1 Ready State

Hierarchy:
1. subtle Current Season context;
2. one dominant Action;
3. done condition;
4. estimated time;
5. confidence/evidence class;
6. primary CTA;
7. Why This;
8. correction controls.

Controls:
- Accept;
- Start Focus when eligible;
- Edit;
- Not Now;
- Wrong Assumption;
- Why This;
- refresh only where allowed.

Recommendation state may be shown compactly:
- shown;
- accepted;
- edited.

## 8.2 Why This

Mobile: sheet.
Desktop: side rail or expandable context.

Show:
- explicit Outcome/Season relation;
- rule/factor labels;
- scheduled urgency if present;
- effort fit if explicit;
- factual evidence;
- ruleset/version only in debug/developer context, not user-facing unless useful.

Never show hidden reasoning or fake probability.

## 8.3 No Direction

Message:
`Tôi chưa có đủ ngữ cảnh để biết điều gì quan trọng nhất.`

Actions:
- 2-minute Clarity Reset;
- choose manually.

## 8.4 No Ready Action

Explain missing execution step.

Actions:
- create Action manually;
- review candidate;
- open Outcome/Project context.

## 8.5 Blocked

Show:
- blocked primary context;
- why blocked if explicit;
- unblock step if one exists;
- Get Unstuck entry later.

Do not keep recommending an impossible Action.

## 8.6 Recovery

For return after missed days:
- Current Direction;
- one restart Action;
- optional “What changed?”;
- no overdue count wall;
- no streak loss.

## 8.7 Nothing Important

Message:
`Không có điều gì quan trọng cần bạn xử lý ngay lúc này.`

Optional:
- maintain;
- reflect;
- close app.

No invented work.

## 8.8 Error / Recommendation unavailable

Explain:
- Action data remains;
- recommendation could not refresh;
- manual execution still possible.

Actions:
- retry;
- choose from ready Actions.

---

# 9. Focus

## 9.1 Focus Start

Source:
- accepted/edited NOW recommendation.

Content:
- Action title;
- done condition;
- planned minutes;
- optional “you do not need to do” boundary;
- Start.

## 9.2 Active Focus

Content:
- focused Action;
- elapsed/remaining timer only if enabled;
- done condition;
- Focus state;
- distraction capture;
- interrupt/end controls.

Hide:
- backlog;
- unrelated navigation;
- analytics;
- other recommendations.

## 9.3 Distraction Capture

Flow:
- tap Capture distraction;
- single text field;
- save;
- brief acknowledgement;
- return immediately to Focus.

Result:
- immutable Capture(kind=distraction);
- no change to Action/Recommendation priority.

## 9.4 Focus Interruption

Optional reason:
- interrupted;
- blocked;
- energy/capacity;
- changed priority;
- other.

Reason should be optional/low friction in B4 unless product decides otherwise.

## 9.5 Focus End

End session state only.

Message must not imply Action completion.

Follow-up B5:
`Kết quả của việc này là gì?`

## 9.6 Focus reload

If active session exists:
- resume active Focus;
- show started time/planned minutes;
- do not create duplicate session.

If recent ended session:
- summary;
- proceed to result if unresolved.

---

# 10. Action Result

## 10.1 Result Selector

Options:
- Completed;
- Partial;
- Postponed;
- Blocked;
- Dropped.

Each option has distinct consequence copy.

## 10.2 Completed

Optional note.

Confirm:
- Action becomes completed;
- record event;
- NOW recalculates later.

## 10.3 Partial

Fields:
- what moved optional;
- remaining context optional;
- next step may be created/reframed only via explicit user choice.

## 10.4 Postponed

Fields:
- optional reason;
- new date/context if product supports;
- no red overdue debt.

## 10.5 Blocked

Fields:
- blocked reason;
- optional dependency;
- Get Unstuck later.

## 10.6 Dropped

Copy:
`Bỏ việc này có thể là một quyết định hợp lý nếu nó không còn đáng bảo vệ.`

Optional reason.

No guilt.

---

# 11. Daily Close

## 11.1 Summary

Factual sections:
- Actions completed/partial/postponed/blocked/dropped;
- Focus sessions;
- Outcomes moved;
- intentional decisions;
- captured distractions count only if useful.

## 11.2 User input

Optional:
- note;
- what mattered;
- friction.

Do not require mood or energy fields.

## 11.3 Close day

Actions:
- save/close;
- edit note;
- skip optional reflection;
- go to NOW.

## 11.4 Previous Daily Close P1

- date list;
- factual summaries;
- search/filter P2.

---

# 12. Get Unstuck

## 12.1 Trigger Surface

Show evidence:
- postpone count;
- inactivity;
- explicit block;
- repeated correction.

Do not diagnose before evidence.

## 12.2 Friction question

Question:
`Điều gì đang khiến việc này khó tiến lên?`

Options:
- chưa rõ bước đầu;
- quá lớn;
- bị chặn;
- không đủ thời gian/năng lượng;
- ưu tiên khác quan trọng hơn;
- không còn quan trọng;
- khác.

## 12.3 Intervention

One intervention only:
- clarify;
- resize;
- unblock;
- reprioritize;
- replan;
- pause/drop.

Actions:
- use this;
- edit;
- reject;
- ask for another option only if needed.

## 12.4 Recovery Complete

Show:
- changed Action/context;
- what LifeOS changed;
- return to NOW.

---

# 13. REFLECT / Weekly Reset

## 13.1 Weekly Reset start

Content:
- week/date range;
- estimated duration;
- purpose;
- resume if interrupted.

## 13.2 Reality

Show:
- planned context;
- actual Action results;
- Focus reality;
- factual time estimates where recorded.

## 13.3 Movement

Groups:
- advanced;
- stalled;
- blocked;
- intentionally dropped;
- unexpected meaningful work if recorded.

## 13.4 Pattern Candidates

Max 3.

Each:
- statement;
- evidence;
- semantic confidence;
- Why this/evidence;
- Accurate;
- Partly accurate;
- Incorrect;
- Do not use.

## 13.5 Adjustment

Max 3.

Each:
- proposed operating change;
- expected effect;
- evidence basis;
- accept;
- edit;
- reject.

## 13.6 Next Week

Confirm:
- current Direction;
- Season remains/changes;
- protected focus;
- first Next Action.

Completion screen should feel lighter, not celebratory/gamified.

---

# 14. ME

## 14.1 ME overview

Sections:
- Current personal context;
- Operating Preferences;
- Pattern Candidates;
- Memory summary;
- Personalization controls;
- Data sources/integrations;
- recent user corrections.

## 14.2 Operating Preferences

Examples:
- preferred generated Action duration;
- time windows only if confirmed;
- recommendation constraints;
- protected context rules.

Each:
- active/inactive;
- source/evidence;
- edit;
- delete;
- disable for recommendations.

## 14.3 Pattern Candidates

Distinguish visually from confirmed preference.

Actions:
- confirm;
- partly confirm;
- reject;
- explain evidence.

## 14.4 Personalization status

Explain:
- what LifeOS currently uses;
- what is only tentative;
- what is disabled.

No personality score.

---

# 15. Memory Inspector

## 15.1 Memory list

Columns/cards:
- memory statement;
- category;
- source;
- created/confirmed date;
- use status;
- where it is used.

Filters:
- preferences;
- explicit facts;
- confirmed patterns;
- disabled;
- source.

## 15.2 Memory detail

Show:
- statement;
- why stored;
- source evidence;
- related correction;
- used for recommendations?;
- last used P1.

Actions:
- edit;
- delete;
- disable use;
- re-enable;
- export P1.

## 15.3 Delete confirmation

Explain consequence:
`LifeOS sẽ ngừng dùng thông tin này cho các đề xuất tương lai.`

---

# 16. Incubator / Not Now

## 16.1 Incubator list

Sections/filters:
- ideas;
- project candidates;
- someday;
- references;
- revisit soon.

Card:
- title;
- type;
- source;
- created date;
- revisit date;
- status.

Actions:
- promote;
- keep;
- archive;
- edit;
- set revisit date;
- open source Capture.

## 16.2 Promote

Must require intentional confirmation.

Potential targets:
- Direction candidate;
- Project;
- Action only if execution context valid.

Do not auto-promote because revisit date arrived.

---

# 17. Ask LifeOS

## 17.1 Query surface

Elements:
- natural language input;
- suggested questions;
- privacy/evidence explanation;
- previous queries P1.

## 17.2 Answer

Structure:
- concise answer;
- evidence/source cards;
- uncertainty;
- open referenced records;
- Wrong assumption/correct source;
- ask follow-up.

Never present unsupported personal inference as fact.

## 17.3 Empty examples

- `Tôi thường trì hoãn loại việc nào?`
- `Dự án nào gần đây không tiến triển?`
- `Tuần này điều gì thực sự đã thay đổi?`
- `Các việc dưới 45 phút có dễ hoàn thành hơn không?`

## 17.4 AI unavailable

Explain data is intact and queries can be retried later.

---

# 18. Notification Center

Detailed in `SETTINGS_NOTIFICATIONS_SPEC_V1.md`.

Entry:
- secondary navigation / bell;
- unread indicator only when meaningful.

Do not make notifications another backlog.

---

# 19. Settings

Detailed in `SETTINGS_NOTIFICATIONS_SPEC_V1.md`.

Categories:
- Account;
- Appearance;
- Notifications;
- AI & Recommendations;
- Memory & Personalization;
- Privacy & Data;
- Integrations;
- Accessibility;
- Help & Support;
- About;
- Billing P1.

---

# 20. Cross-module activity and audit UX

User-facing activity should be selective.

Possible P1 Activity surface:
- Direction changed;
- Season started;
- Recommendation accepted/rejected;
- Focus session;
- Action result;
- preference changed.

Do not expose raw technical LifeEvent stream as primary UX.

Developer/debug view may exist separately.

---

# 21. Cross-module state checklist

Every applicable module should design:
- first use;
- populated/default;
- empty;
- loading;
- saving;
- saved;
- validation error;
- provider unavailable;
- network error;
- permission/session error;
- stale/conflict;
- read-only;
- destructive confirmation;
- success acknowledgement;
- recovery after absence;
- mobile/desktop transformation.

---

# 22. Priority summary

P0 design/implementation loop:
- Clarity;
- Direction;
- Outcome/Project/Action lightweight;
- NOW;
- Focus;
- Result;
- Daily Close;
- Get Unstuck;
- Weekly Reset;
- ME/Memory basic;
- Inbox;
- Incubator;
- core settings/notifications/privacy.

P1 design-ready but implementation later:
- search;
- richer history;
- calendar read integration;
- voice capture;
- browser/share capture;
- richer notification channels;
- billing;
- previous review analytics;
- more advanced integrations.

P2 should be visually reserved only if explicitly needed later.
