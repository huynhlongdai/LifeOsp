# LifeOS — Settings & Notifications Specification V1

Status: CANONICAL DESIGN INPUT
Updated: 2026-08-27
Audience: Product Designer / Figma AI / Engineering

## Purpose

Define the cross-product system surfaces that control notifications, personalization, privacy, AI behavior, account/session behavior, appearance, accessibility, integrations, support and future billing.

Settings should feel understandable and safe, not like an engineering control panel.

---

# 1. Notification philosophy

Notifications exist to reorient the user or help them act at the right time.

They must not become:
- a second task list;
- an engagement spam channel;
- a guilt system;
- repeated reminders for unchanged recommendations;
- a marketing feed mixed with important product/security alerts.

Every notification should usually answer:
1. Why am I seeing this now?
2. What is the one useful thing I can do?
3. Can I mute/change this type easily?

---

# 2. Notification Center

## 2.1 Entry points

- bell/icon in secondary app chrome;
- unread dot/count only for meaningful unread items;
- deep link from push/web/email later.

## 2.2 Layout

Mobile:
- full screen or sheet;
- grouped by Today / Earlier;
- one-column.

Desktop:
- side panel or full page;
- optional filters on left/top.

## 2.3 Notification item anatomy

- category icon;
- title;
- one-line context;
- timestamp;
- unread indicator;
- optional entity context;
- one primary action/deep link;
- overflow menu.

Overflow:
- mark read/unread;
- dismiss;
- mute this notification type;
- open notification settings;
- report irrelevant P1.

## 2.4 Categories

### NOW / Recommendation

Examples:
- a useful Next Action is now available;
- recommendation changed because context changed;
- blocked Action needs review.

Do not notify on every deterministic rerank if outcome is effectively unchanged.

### Focus

Examples:
- scheduled Focus reminder P1;
- active Focus resumed/recovery only if useful;
- Focus left active unusually long may show in-app prompt, not aggressive push by default.

### Scheduled Action

Examples:
- explicit user-scheduled Action is approaching;
- scheduling conflict discovered P1.

### Daily Close

- optional evening reminder;
- only if user enabled;
- never guilt language.

### Weekly Reset

- weekly review available;
- reminder if user chose cadence;
- no repeated nags within quiet window.

### Recovery / Re-entry

Example:
`Bạn đã rời nhịp vài ngày. LifeOS có thể giúp bạn bắt đầu lại bằng một việc nhỏ.`

Do not say:
`Bạn đã bỏ lỡ 14 việc.`

### Incubator Revisit

- item reached explicit revisit date;
- action: Review / Keep for later;
- no automatic promotion.

### AI Processing

- analysis completed if user left the flow;
- AI failed only when user action is needed;
- if user remains active in same screen, prefer inline state instead of notification.

### Integration

- calendar disconnected;
- permission expired;
- sync failed;
- reconnect.

### Security / Account

- new session P1;
- password/email change later;
- account recovery;
- critical security notice.

Security notifications have separate visual priority and cannot always be fully muted.

### Product / System

- important maintenance/outage;
- meaningful feature education;
- changelog P1.

Product marketing must remain separable from operational notifications.

---

# 3. Notification item states

- unread;
- read;
- dismissed;
- actionable;
- action completed;
- stale/expired;
- delivery failed internal state;
- security critical.

If a notification becomes stale, it should not deep-link into a broken flow.

---

# 4. Notification Preferences

## 4.1 Master controls

- notifications enabled;
- in-app enabled;
- web push P1;
- email P1;
- product updates separately controlled.

## 4.2 Quiet Hours

Fields:
- start time;
- end time;
- timezone;
- allow critical security messages;
- weekday/weekend distinction P2.

UX:
- show next quiet period;
- explain that reminders will be delayed, not lost.

## 4.3 Delivery style

Possible options:
- immediate;
- digest;
- off.

Do not expose unnecessary granularity at P0.

## 4.4 Category toggles

- NOW/recommendations;
- scheduled Actions;
- Focus;
- Daily Close;
- Weekly Reset;
- Recovery;
- Incubator revisit;
- AI processing completion;
- integration issues;
- product updates;
- security/system.

P1 channel matrix:
- In-app;
- Push;
- Email.

## 4.5 Per-notification shortcut

From notification overflow:
`Tắt loại thông báo này`

Then acknowledgement:
`Đã tắt nhắc Daily Close. Bạn có thể bật lại trong Cài đặt.`

---

# 5. Settings Home

## 5.1 Mobile

List grouped sections:
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

## 5.2 Desktop

Left settings sub-navigation + right detail pane.

Do not mix normal user settings with admin settings.

---

# 6. Account Settings

## 6.1 Profile

Fields:
- display name;
- preferred language;
- timezone;
- optional locale.

Future auth fields:
- email;
- verified state;
- account recovery.

## 6.2 Session

P0 anonymous/session model may show only essential session/account state.

P1 authenticated product:
- active sessions/devices;
- last active;
- sign out this device;
- sign out all other devices;
- revoke session.

## 6.3 Sign out / Reset local session

Confirmation explains consequence.

Do not make destructive account deletion visually adjacent to ordinary sign out.

---

# 7. Appearance

Controls:
- System / Light / Dark;
- comfortable density default;
- compact density P1 desktop;
- respect OS reduced motion;
- text scaling compatibility message;
- accent customization P2 only if approved.

Preview:
- optional small sample card.

Do not create a theme marketplace.

---

# 8. AI & Recommendations

## 8.1 AI availability mode

User-friendly controls may include:
- Use AI-assisted interpretation;
- Use AI-assisted Action suggestions;
- Use personal evidence to improve recommendations;
- Continue manually when AI unavailable.

Do not expose provider keys/models to normal users in P0.

## 8.2 Recommendation behavior

Explain:
- LifeOS may suggest;
- important commitments require confirmation;
- recommendation can be rejected/corrected;
- evidence can be inspected.

Potential P1 controls:
- reduce suggestion frequency;
- manual-only candidate mode;
- reset recommendation corrections/preferences.

## 8.3 AI Data Use Explanation

Show plain-language answers:
- what data is sent to AI when needed;
- what is stored;
- what remains local/server state;
- that hidden reasoning is not stored as evidence;
- provider/privacy links later.

## 8.4 AI unavailable/degraded state

If provider disabled/outage:
- show status;
- explain manual flows remain available;
- Retry when appropriate.

---

# 9. Memory & Personalization

## 9.1 Master personalization controls

Possible controls:
- memory enabled;
- use confirmed memories for recommendations;
- require confirmation for durable preference;
- tentative insights require review;
- disable all personalized rules temporarily P1.

## 9.2 Memory Inspector entry

Shows count/categories and CTA `Xem bộ nhớ LifeOS đang dùng`.

## 9.3 Operating Preferences

CTA:
- view;
- edit;
- reset selected;
- reset all with destructive confirmation.

## 9.4 Delete all memory

Confirmation steps:
1. explain effect;
2. optional typed/explicit confirmation depending risk;
3. processing;
4. success.

Copy:
`Các đề xuất tương lai sẽ không còn sử dụng những bộ nhớ đã xóa.`

## 9.5 Personalization off

Explain what remains functional:
- Capture;
- manual planning;
- execution;
- deterministic rules from current state where allowed.

Do not imply entire product becomes unusable.

---

# 10. Privacy & Data

## 10.1 Privacy Overview

Sections:
- data LifeOS stores;
- AI usage;
- personalization;
- integrations;
- analytics;
- export/delete.

## 10.2 Data Export

Flow:
- request export;
- explain contents;
- processing state;
- ready notification/download later;
- expired link state P1.

P0 design can be prepared before implementation.

## 10.3 Delete Data / Account

Separate levels if product supports:
- delete memories;
- delete captures/history subset P1;
- delete entire account/data.

Account deletion flow:
- consequence summary;
- what will be deleted;
- what may be retained legally if applicable;
- explicit confirmation;
- processing;
- completed.

Never use dark patterns.

## 10.4 Analytics / Telemetry

If optional legally/product-wise:
- usage analytics toggle;
- crash diagnostics toggle;
- concise explanation.

Do not promise a toggle unless implementation/legal policy supports it.

## 10.5 Privacy documents

- Privacy Policy;
- Terms;
- data processor/provider links P1;
- contact/privacy request.

---

# 11. Integrations

Current/P1 focus:
- Calendar read integration;
- Browser/share Capture.

## 11.1 Integration card

Fields:
- provider/app;
- connected/disconnected;
- permission scope;
- last sync;
- status;
- error;
- reconnect/disconnect.

## 11.2 Connect flow

Steps:
- value explanation;
- requested permission scope;
- continue to provider;
- success;
- initial sync state.

## 11.3 Disconnect

Confirmation:
- what stops syncing;
- what historical imported data remains/deletes depending policy;
- disconnect.

## 11.4 Calendar permission wording

If read-only:
`LifeOS dùng lịch để hiểu thời gian đã bận. LifeOS không thay đổi sự kiện nếu bạn chưa bật quyền ghi.`

Never visually imply broader permissions than actually granted.

## 11.5 Integration errors

States:
- expired token;
- permission revoked;
- sync delayed;
- provider outage;
- reconnect required.

---

# 12. Accessibility

## 12.1 Preferences / information

- respect OS text size;
- reduced motion;
- visible keyboard focus;
- keyboard shortcuts guide;
- timer sound options only when implemented;
- high contrast compatibility;
- screen-reader labels.

## 12.2 Reduced Motion

If OS asks reduced motion:
- remove decorative transitions;
- timer/state changes remain understandable.

## 12.3 Timer Accessibility

Focus timer must not be the only way to understand Focus state.

No forced countdown pressure.

---

# 13. Help & Support

## 13.1 Help Center

Categories:
- Getting started;
- Clarity;
- NOW;
- Focus;
- Weekly Reset;
- AI & Memory;
- Privacy;
- Troubleshooting.

## 13.2 Report a Problem

Fields:
- category;
- short description;
- optional details;
- attach screenshot/log only with explicit consent;
- diagnostic ID;
- submit.

## 13.3 Feedback

Types:
- product feedback;
- incorrect recommendation;
- confusing UI;
- feature request.

Do not mix critical support with public feature voting unless later approved.

## 13.4 Diagnostics

Show:
- app version;
- build;
- environment only if useful;
- session diagnostic ID;
- copy diagnostics;
- API/provider health summary P1.

Do not reveal secrets/tokens.

---

# 14. About

- LifeOS version;
- changelog;
- licenses;
- Privacy;
- Terms;
- support contact;
- website.

---

# 15. Billing / Plan P1

Design-ready only; monetization details are not finalized.

Possible screens:
- current plan;
- usage/limits only if product has real limits;
- upgrade;
- billing history;
- payment method;
- cancel;
- restore subscription where applicable.

Do not invent pricing or artificial feature gates in Figma without Product approval.

---

# 16. Notification / Settings state checklist

Design applicable states:
- first use;
- enabled;
- disabled;
- permission denied by OS/browser;
- permission requested;
- quiet hours active;
- no notifications;
- notification stale;
- save in progress;
- saved;
- validation error;
- offline;
- destructive confirmation;
- partial service outage;
- integration permission expired;
- account/session expired.

---

# 17. Responsive patterns

Mobile:
- settings list → detail page;
- notification list full screen;
- destructive confirmations via sheet/modal;
- toggles full-width rows.

Desktop:
- two-column settings nav/detail;
- notification center may be side panel;
- complex privacy/export states in centered content pane;
- integration cards in controlled grid max 2 columns.

---

# 18. Hard exclusions

Normal user Settings must NOT expose:
- provider API secrets;
- prompt registry;
- feature flags;
- raw audit logs;
- admin impersonation;
- internal cost metrics;
- database configuration;
- model routing internals unless a future explicit advanced-user mode is approved.
