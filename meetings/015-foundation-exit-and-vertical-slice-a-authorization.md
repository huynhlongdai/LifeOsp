# Meeting #015 — Foundation Exit & Vertical Slice A Authorization

Date: 2026-08-26
Status: DECIDED

## Participants / perspectives
- Product / CEO — authorize only the smallest path that reaches real user value.
- Domain — preserve Capture, Direction, Season, LifeEvent and ownership invariants.
- Staff Engineering — merge independently reviewable increments; no mega-PR.
- AI / Intelligence — structured, versioned, correctable output; safe manual fallback.
- Web / UX — Brain Dump first, progressive disclosure, no fake dashboard data.
- QA / Trust — every durable state change auditable; AI failure and correction are designed states.

## Foundation exit

Foundation is accepted as complete after PR #20 / CI run #39 proved:
- strict typecheck, tests and production build;
- PWA build artifacts;
- malformed API environment fails fast;
- migration drift is clean;
- clean + idempotent migration path;
- DB transaction rollback integration;
- built API → DB readiness;
- built Web → API → DB same-origin smoke;
- degraded readiness when DB is unavailable;
- PostgreSQL 18 named-volume persistence across container recreation.

Epic #1 is authorized to close.

## Vertical Slice A authorization

Epic #2 is now authorized. The product path remains:

```text
Welcome / immediate need
→ Quick Life Context
→ Brain Dump
→ structured interpretation
→ user correction
→ Active / Maintain / Not Now trade-off
→ Direction / Current Season confirmation
```

Hard rules remain:
- original Capture text is immutable;
- AI interpretation is versioned and editable before promotion;
- invalid/failed AI output never becomes domain state;
- no silent durable memory admission;
- no automatic Project/Action explosion;
- every durable state transition appends a LifeEvent;
- client never chooses arbitrary `userId`.

## Identity Boundary V0 decision

Vertical Slice A requires server-side ownership before private Capture endpoints exist, but full account/auth-provider selection is not part of Clarity.

Decision: implement an anonymous dogfood session adapter:
- server creates the User and session;
- server generates a cryptographically random opaque session token;
- only a token hash is stored in PostgreSQL;
- browser receives an HttpOnly, SameSite=Lax cookie;
- private routes resolve `userId` server-side from the session;
- client request bodies/query params never carry ownership `userId`;
- the adapter is isolated so a later auth provider can replace session issuance without changing Capture/Direction domain contracts.

This is an ownership/security boundary for first-party dogfood, not a claim that final account/auth UX is decided.

## Delivery increments

### A0 — Identity Boundary V0
Anonymous server-issued session + ownership resolver + integration tests.

### A1 — Capture Core
Capture domain contract, schema/migration, create/read API, immutable raw text, `capture.created` LifeEvent in the same transaction.

### A2 — Interpretation Contract
Versioned structured interpretation schema, correction/versioning, AI gateway boundary + fixtures, manual fallback. No promotion yet.

### A3 — Brain Dump + Interpretation Review UX
Welcome/NeedState entry, Brain Dump input, save-first behavior, interpretation loading/error/manual states, correction UI.

### A4 — Trade-off → Direction / Season
Active/Maintain/Not Now classification, Direction/Season draft/confirm flow, atomic promotion + LifeEvents.

### A5 — Vertical Slice A E2E / audit
Empty user → session → Brain Dump → corrected interpretation → confirmed Direction/Season; reload persistence; AI failure fallback; ownership isolation.

## Authorization

Engineering may begin A0 immediately. A1 depends on A0 ownership resolution. A2 may define contracts in parallel only after Capture storage semantics are stable. A3/A4 must not invent fields or statuses beyond canonical docs.
