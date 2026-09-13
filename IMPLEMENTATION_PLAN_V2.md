# LifeOS — Kế Hoạch Triển Khai Chi Tiết

**Ngày tạo:** 2026-09-13  
**Trạng thái:** DRAFT  
**Người tạo:** Devin AI  
**Dựa trên:** Engineering Blueprint V1, HANDOFF.md, UI Design V2

---

## 1. Tổng Quan Tình Hình Hiện Tại

### 1.1 Đã Hoàn Thành (Foundation + Vertical Slice A + B0-B3)

✅ **Foundation Layer**
- PostgreSQL + Drizzle ORM setup
- Fastify API structure
- React + Vite PWA shell
- Anonymous session identity
- Shared domain contracts (@lifeos/domain)

✅ **Vertical Slice A: Capture → Clarify → Choose**
- Brain Dump capture (immutable raw text)
- AI interpretation (versioned, correctable)
- Clarity promotion flow
- Direction/Season/Outcome creation
- LifeEvent audit trail

✅ **Vertical Slice B: Execute Foundation**
- B0: Execution Context (Outcome/Project under Season)
- B1: Action Candidate V0 (manual candidate → ready)
- B2: Next Action Engine V0 (deterministic ranking)
- B3: NOW V0 (server-derived, single action, Why This?)

### 1.2 Đang Thực Hiện (B4 Focus V0)

🔄 **B4 Focus Session (branch: feat/b4-focus-v0)**
- FocusSession domain contract đã define
- Schema drafted (partial unique index cho active session)
- **BLOCKER:** Migration generation workflow failed, chưa có valid migration
- Chưa có PR, chưa có integration tests

**Scope cần hoàn thành:**
- FocusSession persistence (active/completed/interrupted/abandoned)
- Start Focus từ NOW recommendation (≤2 taps)
- Distraction capture (immutable, không đổi priority)
- Focus reload sau restart
- Audit events (focus.started, outcome, distraction.captured)
- UI: Focus mode entry từ NOW

### 1.3 Chưa Bắt Đầu (B5-B6 + Intelligence + Adapt)

⏳ **B5: Result + Daily Close V0** (phụ thuộc B4)
- Action results: completed/partial/postponed/blocked/dropped
- Focus result vs Action result (distinct nhưng có thể commit cùng nhau)
- Daily Close (factual summary + optional user input)
- Atomic updates + LifeEvents

⏳ **B6: Vertical Slice B E2E** (phụ thuộc B5)
- End-to-end validation: Direction → Outcome → Action → NOW → Focus → Result → Daily Close
- Reload/restart scenarios
- Provider failure handling
- Cross-session isolation

⏳ **Epic #4: Personal Intelligence V0**
- Derived features computation
- Pattern candidate detection
- User confirmation flow
- Operating preferences admission
- Ask LifeOS basic queries

⏳ **Epic #5: Weekly Adapt V0**
- Weekly Reset flow (Reality → Patterns → Adjustments → Next Week)
- Plan-vs-reality analysis
- Max 3 patterns + max 3 adjustments
- User-confirmed changes → Operating Preferences

⏳ **Epic #7: Get Unstuck V0**
- Friction detection (postpone count, inactivity, blockers)
- Diagnosis questions
- Single intervention (clarify/resize/unblock/replan/pause/drop)
- Recovery complete flow

---

## 2. Gap Analysis: UI Design V2 vs Implementation

### 2.1 UI Đã Thiết Kế (25 screens)

**Core Loop (13 screens):**
1. Welcome/Onboarding
2. NeedState Selection
3. Brain Dump
4. AI Processing
5. Interpretation Review
6. Trade-off Buckets
7. NOW (Ready State)
8. Focus Mode
9. Daily Close
10. Weekly Reset (4 steps: Reality → Patterns → Adjustments → Next Week)
11. Get Unstuck
12. Ask LifeOS
13. Action Result

**Secondary (12 screens):**
14. Direction (Current Season + Outcomes)
15. Execute (Actions list)
16. Reflect (Overview)
17. ME (Operating Preferences)
18. Memory Inspector
19. Inbox
20. Incubator/Not Now
21. Settings
22. Notifications
23. Privacy Controls
24. Data Export
25. Account Management

### 2.2 Implementation Hiện Tại (Theo HANDOFF.md)

**Đã code:**
- Clarity flow (Brain Dump → Interpretation → Trade-off → Promotion)
- Direction page (Current Direction + Season)
- NOW page (Ready state, Why This?, Evidence)
- Focus panel (B4 draft, chưa hoàn thiện)
- Basic navigation (NOW/DIRECTION/EXECUTE/REFLECT/ME)

**Chưa code:**
- Daily Close UI
- Weekly Reset UI (4 steps)
- Get Unstuck flow
- Ask LifeOS interface
- Memory Inspector
- Action Result selector
- Notifications center
- Settings detail pages
- Incubator management UI

### 2.3 Design System Mismatch

| Aspect | UI Design V2 | Current Code | Action Needed |
|--------|--------------|--------------|---------------|
| **Theme** | Dark (#0a0a0b) | Light (#f7f8fc) | Complete theme overhaul |
| **Accent** | Orange (#FF6B4A) | Purple/Blue | Update CSS variables |
| **Typography** | Space Grotesk (display) + Inter (body) | Inter only | Add Space Grotesk, update font stack |
| **Border Radius** | 52px (phone), 14-20px (cards) | 20-24px (cards) | Adjust CSS |
| **Layout** | Bottom nav (mobile-first) | Sidebar + top nav | Responsive redesign |
| **Components** | Pill buttons, soft cards | Sharp buttons, hard cards | Component library update |

---

## 3. Technical Roadmap

### Phase 1: Hoàn Thiện B4 Focus (1-2 tuần)

**Mục tiêu:** Merge B4 vào main, có full Capture → Clarify → Choose → Act → Focus loop

**Tasks:**
1. Fix migration generation workflow
2. Generate + review FocusSession migration
3. Implement FocusSession CRUD operations
4. API endpoints:
   - `POST /v1/focus/start` (from recommendation)
   - `POST /v1/focus/:id/end` (completed/interrupted/abandoned)
   - `POST /v1/focus/:id/distraction` (capture distraction)
   - `GET /v1/focus/active` (reload active session)
5. UI integration:
   - Focus button trên NOW page
   - Focus mode overlay (minimal UI)
   - Distraction capture (quick add)
   - Timer display (optional)
6. Atomic transactions + LifeEvents
7. Integration tests
8. E2E test: NOW → Focus → End → Event recorded
9. Delete temporary workflow
10. Open draft PR, pass CI

**Definition of Done:**
- Focus session persists across API restart
- Distraction capture không thay đổi Action/Recommendation
- Active session reload sau refresh
- No B5 result semantics leak
- CI green, PR approved

---

### Phase 2: B5 Result + Daily Close (2 tuần)

**Mục tiêu:** Hoàn thành Act → Observe → Reflect loop (Daily Close)

**Tasks:**
1. Domain contracts:
   - ActionResult enum (completed/partial/postponed/blocked/dropped)
   - FocusResult (distinct từ ActionResult)
   - DailyClose entity
2. Schema + migrations:
   - `action_results` table
   - `focus_results` table
   - `daily_closes` table
3. API endpoints:
   - `POST /v1/actions/:id/result`
   - `POST /v1/focus/:id/result`
   - `POST /v1/daily-close` (for specific date)
   - `GET /v1/daily-close/:date`
4. State transitions:
   - Action result → update Action status
   - Focus result (optional) + Action result (required)
   - Atomic updates + LifeEvents
5. UI screens:
   - Action Result selector (5 options)
   - Daily Close summary
   - Optional user input (note, mood, energy)
6. Integration tests
7. E2E test: Focus → Result → Daily Close → Events

**Definition of Done:**
- User có thể record result cho Action
- Daily Close hiển thị factual summary
- No Get Unstuck logic yet
- Events complete for future analytics

---

### Phase 3: UI/UX Redesign V2 (3-4 tuần)

**Mục tiêu:** Implement dark theme + new design system

**Sub-phase 3.1: Design System Foundation (1 tuần)**
1. Setup CSS variables (colors, spacing, typography)
2. Create theme switcher (light/dark toggle)
3. Update base components:
   - Button (pill shape, orange accent)
   - Card (softer borders, dark background)
   - Input (dark theme)
   - Navigation (bottom nav for mobile)
4. Typography:
   - Add Space Grotesk font
   - Define type scale (display/h1/h2/h3/body)
5. Responsive breakpoints (mobile-first)

**Sub-phase 3.2: Core Screens Redesign (2 tuần)**
1. NOW page (Ready state)
   - Dark card design
   - Pill badges (confidence, time)
   - Evidence panel (accordion)
   - Focus button (prominent)
2. Focus mode (full-screen overlay)
   - Minimal UI
   - Timer (large, orange)
   - Distraction capture (quick)
3. Daily Close
   - Summary cards
   - Mood/energy selectors
   - Note textarea
4. Action Result
   - 5 option cards
   - Expandable details
   - Confirm button

**Sub-phase 3.3: Secondary Screens (1 tuần)**
1. Direction page (Current Season + Outcomes)
2. Execute page (Actions list)
3. Inbox/Capture list
4. Settings (basic)

**Definition of Done:**
- Dark theme consistent across all screens
- Mobile-first responsive
- Typography matches design spec
- All P0 screens redesigned

---

### Phase 4: Intelligence Engine V0 (3-4 tuần)

**Mục tiêu:** Derived features + pattern detection + user confirmation

**Tasks:**
1. Derived features package (@lifeos/intelligence):
   - Plan-vs-reality metrics
   - Postpone frequency
   - Start latency
   - Completion by size bucket
   - Active project load
   - Recovery after disruption
2. Pattern detection engine:
   - Rule-based pattern candidates
   - Confidence scoring (direct/strong/possible/suggestion)
   - Evidence linking (LifeEvents)
3. User confirmation flow:
   - Pattern cards (max 3)
   - Confirm/Partly/Reject buttons
   - Convert confirmed → Operating Preference
4. Operating preferences:
   - Schema + CRUD
   - Apply to Next Action Engine
   - User edit/delete
5. Ask LifeOS (basic):
   - Natural language queries
   - Evidence-backed answers
   - Source links
6. UI:
   - ME page (Operating Preferences)
   - Memory Inspector
   - Pattern cards in Weekly Reset

**Definition of Done:**
- Derived features computed from LifeEvents
- Patterns detected with evidence
- User can confirm/reject patterns
- Operating preferences affect recommendations
- Ask LifeOS answers basic queries

---

### Phase 5: Weekly Adapt V0 (2-3 tuần)

**Mục tiêu:** Weekly Reset flow (Reflect → Adapt)

**Tasks:**
1. Weekly Reset flow (4 steps):
   - Step 1: Reality (planned vs actual)
   - Step 2: Patterns (max 3, from Intelligence Engine)
   - Step 3: Adjustments (max 3, user-confirmed)
   - Step 4: Next Week (direction, focus, first action)
2. Data aggregation:
   - Week date range calculation
   - Action results summary
   - Focus sessions summary
   - Derived features for week
3. Pattern integration:
   - Fetch from Intelligence Engine
   - Display with evidence
   - User voting (Confirm/Partly/Reject)
4. Adjustment proposals:
   - Based on confirmed patterns
   - Operating preference changes
   - User edit/accept/reject
5. Next week planning:
   - Confirm Direction/Season
   - Set focus areas
   - Choose first action
6. UI:
   - Weekly Reset wizard (4 screens)
   - Reality comparison view
   - Pattern cards
   - Adjustment cards
   - Next week summary
7. E2E test: Full Weekly Reset flow

**Definition of Done:**
- User completes Weekly Reset in <10 minutes
- Patterns based on real evidence
- Adjustments affect future recommendations
- Events recorded for longitudinal analysis

---

### Phase 6: Get Unstuck V0 (2 tuần)

**Mục tiêu:** Friction diagnosis + intervention

**Tasks:**
1. Friction detection:
   - Postpone count threshold (e.g., 3+)
   - Inactivity detection (e.g., 7+ days no progress)
   - Blocker tracking
   - Repeated correction signals
2. Diagnosis flow:
   - Trigger surface (evidence display)
   - Friction question (7 options)
   - Single intervention proposal
3. Interventions:
   - Clarify (break down action)
   - Resize (reduce scope)
   - Unblock (identify dependency)
   - Replan (change approach)
   - Pause/Drop (intentional closure)
4. Recovery complete:
   - Apply intervention
   - Update Action/Project
   - Return to NOW
5. UI:
   - Get Unstuck modal/wizard
   - Evidence strip
   - Friction options
   - Intervention card
   - Confirm button

**Definition of Done:**
- System detects friction automatically
- User gets single, relevant intervention
- Intervention applies without data loss
- Events recorded for pattern learning

---

### Phase 7: Polish + Integration (2-3 tuần)

**Mục tiêu:** Hoàn thiện UX, testing, documentation

**Tasks:**
1. UI polish:
   - Loading states (skeletons, spinners)
   - Empty states (helpful messages)
   - Error states (recovery actions)
   - Success states (confirmation)
   - Transitions/animations
2. Mobile optimization:
   - Touch targets (44x44px minimum)
   - Swipe gestures
   - Haptic feedback (optional)
   - Offline mode (PWA)
3. Accessibility:
   - ARIA labels
   - Keyboard navigation
   - Screen reader testing
   - Color contrast (WCAG AA)
4. Performance:
   - Lazy loading
   - Code splitting
   - Image optimization
   - Bundle size analysis
5. Testing:
   - Unit tests (domain, API)
   - Integration tests (DB, transactions)
   - E2E tests (critical paths)
   - Manual QA checklist
6. Documentation:
   - User guide (in-app tooltips)
   - Developer guide (README, CONTRIBUTING)
   - API documentation (OpenAPI)
   - Deployment guide

**Definition of Done:**
- All screens polished
- Mobile experience smooth
- Accessibility audit passed
- Performance budget met
- Test coverage >80%
- Documentation complete

---

## 4. Sprint Planning (12 tuần)

### Sprint 1-2: B4 Focus Completion (2 tuần)
- **Week 1:** Fix migration, implement CRUD, API endpoints
- **Week 2:** UI integration, tests, PR review, merge

**Deliverable:** B4 merged, Focus functional

---

### Sprint 3-4: B5 Result + Daily Close (2 tuần)
- **Week 3:** Domain contracts, schema, Action/Focus result APIs
- **Week 4:** Daily Close API + UI, integration tests

**Deliverable:** Full loop Capture → Clarify → Choose → Act → Observe → Reflect

---

### Sprint 5-6: UI Redesign V2 - Foundation (2 tuần)
- **Week 5:** Design system (CSS variables, components, typography)
- **Week 6:** NOW + Focus + Daily Close redesign

**Deliverable:** Dark theme, new design system, 3 core screens redesigned

---

### Sprint 7-8: UI Redesign V2 - Complete (2 tuần)
- **Week 7:** Action Result + Direction + Execute redesign
- **Week 8:** Secondary screens (Inbox, Settings, etc.)

**Deliverable:** All P0 screens redesigned

---

### Sprint 9-10: Intelligence Engine V0 (2 tuần)
- **Week 9:** Derived features, pattern detection
- **Week 10:** User confirmation, operating preferences, Ask LifeOS

**Deliverable:** Intelligence Engine functional, ME page, Memory Inspector

---

### Sprint 11: Weekly Adapt V0 (1 tuần)
- **Week 11:** Weekly Reset wizard, pattern integration, adjustments

**Deliverable:** Weekly Reset flow complete

---

### Sprint 12: Get Unstuck + Polish (1 tuần)
- **Week 12:** Get Unstuck flow, final polish, testing

**Deliverable:** MVP feature complete, ready for alpha testing

---

## 5. Resource Allocation

### Team Structure (Recommended)

**Agent A: Product/Integrator (1 person)**
- Owns main branch integrity
- Reviews PRs, manages dependencies
- Updates HANDOFF.md, meeting notes
- Coordinates parallel work

**Agent B: B4/B5 Implementation (1 person)**
- Focus Session + Result + Daily Close
- Schema migrations
- API endpoints
- Integration tests

**Agent C: UI/UX Redesign (1 person)**
- Design system foundation
- Screen redesign (Sprint 5-8)
- Mobile optimization
- Accessibility

**Agent D: Intelligence Engine (1 person)**
- Derived features package
- Pattern detection
- Ask LifeOS
- Memory Inspector

**Agent E: Weekly Adapt + Get Unstuck (1 person)**
- Weekly Reset flow
- Get Unstuck diagnosis
- Integration with Intelligence Engine

### Parallel Work Strategy

**Sprint 1-4 (Sequential):**
- Agent B: B4 → B5
- Agent A: Support, review, documentation
- Agent C/D/E: Planning, spec review, test case design

**Sprint 5-8 (Parallel):**
- Agent C: UI redesign
- Agent D: Intelligence Engine (backend, no UI)
- Agent E: Weekly Adapt spec + test planning
- Agent A: Integration, dependency management

**Sprint 9-12 (Parallel):**
- Agent D: Intelligence Engine UI integration
- Agent E: Weekly Adapt + Get Unstuck
- Agent C: Polish, mobile optimization
- Agent A: E2E testing, documentation

---

## 6. Risk Assessment

### High Risk

**R1: B4 Migration Failure**
- **Impact:** Blocks all subsequent work
- **Mitigation:** Inspect failed workflow, fix tooling, manual migration if needed
- **Contingency:** Create migration manually, skip workflow automation

**R2: UI Redesign Scope Creep**
- **Impact:** Delays Sprint 5-8, blocks parallel work
- **Mitigation:** Strict P0 screen list, defer P1/P2 to later
- **Contingency:** Redesign only NOW + Focus + Daily Close, defer others

**R3: Intelligence Engine Complexity**
- **Impact:** Pattern detection harder than expected, delays Sprint 9-10
- **Mitigation:** Start with simple rules, defer ML to later
- **Contingency:** Ship basic derived features only, patterns in Sprint 11-12

### Medium Risk

**R4: Integration Complexity**
- **Impact:** Parallel work creates merge conflicts, integration bugs
- **Mitigation:** Clear ownership, frequent integration, CI gates
- **Contingency:** Sequential work if parallel becomes too chaotic

**R5: Performance Issues**
- **Impact:** Derived features slow, UI laggy
- **Mitigation:** Performance budget, profiling, optimization sprint
- **Contingency:** Defer expensive features, add caching

**R6: Testing Coverage**
- **Impact:** Bugs in production, data corruption
- **Mitigation:** Test pyramid, E2E for critical paths, manual QA
- **Contingency:** Extend Sprint 12 for testing, defer non-critical features

### Low Risk

**R7: Design System Inconsistency**
- **Impact:** UI feels disjointed
- **Mitigation:** Component library, design tokens, visual regression tests
- **Contingency:** Manual review, polish sprint

**R8: Documentation Gaps**
- **Impact:** Hard to onboard, maintain
- **Mitigation:** Update docs as we go, HANDOFF.md, README
- **Contingency:** Documentation sprint after MVP

---

## 7. Success Metrics

### Technical Metrics

**Code Quality:**
- Test coverage >80%
- Zero critical bugs in production
- CI green time >95%
- PR review time <24h

**Performance:**
- API response time <500ms (p95)
- UI load time <2s (p95)
- Derived features computation <5s
- Database query time <100ms (p95)

**Reliability:**
- Uptime >99%
- Zero data loss incidents
- Successful backup/restore tested
- Error rate <1%

### Product Metrics

**Activation:**
- Time to first useful Action <5 minutes
- Brain Dump completion rate >70%
- NOW recommendation accept rate >50%
- Focus session start rate >30%

**Engagement:**
- Daily active users (DAU)
- Weekly active users (WAU)
- Session frequency (sessions/week)
- Session duration (minutes/session)

**Retention:**
- Day 1 retention >40%
- Day 7 retention >20%
- Day 30 retention >10%
- Weekly Reset completion rate >30%

**Value:**
- Meaningful Progress Days per WAU >2
- Recommendation correction rate <30%
- Action completion rate >60%
- Focus completion rate >70%

---

## 8. Milestones & Exit Gates

### Milestone 1: B4 Complete (End of Sprint 2)

**Exit Gate:**
- Focus session persists across restart
- Distraction capture functional
- No B5 semantics leak
- CI green, PR merged
- E2E test: NOW → Focus → End passes

**Demo:** Start Focus từ NOW, capture distraction, end session, reload

---

### Milestone 2: Full Loop Complete (End of Sprint 4)

**Exit Gate:**
- Action result recording functional
- Daily Close shows factual summary
- Events complete for analytics
- E2E test: Full loop passes

**Demo:** Brain Dump → Clarity → Direction → Action → NOW → Focus → Result → Daily Close

---

### Milestone 3: UI Redesign V2 Complete (End of Sprint 8)

**Exit Gate:**
- Dark theme consistent
- Mobile-first responsive
- All P0 screens redesigned
- Accessibility audit passed

**Demo:** Navigate through all screens on mobile + desktop

---

### Milestone 4: Intelligence Engine V0 (End of Sprint 10)

**Exit Gate:**
- Derived features computed
- Patterns detected with evidence
- User can confirm/reject patterns
- Operating preferences affect recommendations
- Ask LifeOS answers basic queries

**Demo:** Show patterns from real data, confirm pattern, see preference applied

---

### Milestone 5: MVP Feature Complete (End of Sprint 12)

**Exit Gate:**
- Weekly Reset functional
- Get Unstuck functional
- All P0 features polished
- Test coverage >80%
- Documentation complete
- Ready for alpha testing

**Demo:** Full product walkthrough, alpha tester onboarding

---

## 9. Dependencies & Prerequisites

### External Dependencies

**AI Provider:**
- OpenAI API (GPT-4) or equivalent
- Structured output support
- Rate limiting + error handling
- Fallback to manual mode

**Infrastructure:**
- PostgreSQL 18+ (local + production)
- Node.js 24+ (runtime)
- Docker + Docker Compose (local dev)
- CI/CD pipeline (GitHub Actions)

**Third-party Services:**
- Error monitoring (Sentry or equivalent)
- Analytics (PostHog, Mixpanel, or custom)
- Email service (optional, for notifications)

### Internal Dependencies

**B4 → B5:**
- Focus session must be complete before result semantics
- Schema migrations must not conflict

**B5 → Intelligence Engine:**
- Daily Close events needed for derived features
- Action results needed for plan-vs-reality

**UI Redesign → Intelligence Engine UI:**
- Design system must be stable before ME/Memory Inspector
- Component library must include new patterns

**Intelligence Engine → Weekly Adapt:**
- Pattern detection must be functional
- Operating preferences must be applicable

---

## 10. Next Steps (Immediate Actions)

### This Week

1. **Fix B4 migration workflow** (Agent B)
   - Inspect failed run logs
   - Fix tooling issues
   - Generate migration
   - Review SQL (partial unique index)

2. **Create B4 implementation plan** (Agent B + A)
   - Break down into tasks
   - Estimate effort
   - Identify blockers

3. **Start UI redesign planning** (Agent C)
   - Audit current components
   - Plan CSS variable structure
   - List all screens to redesign

4. **Update HANDOFF.md** (Agent A)
   - Document B4 status
   - Add implementation plan reference
   - Update file ownership

### Next Week

1. **Complete B4 implementation** (Agent B)
2. **Start B5 domain contracts** (Agent B)
3. **Begin design system foundation** (Agent C)
4. **Spec Intelligence Engine derived features** (Agent D)

---

## 11. Appendix

### A. File Ownership (During Implementation)

**B4-owned (conflict-prone):**
- `packages/domain/src/focus.ts`
- `packages/db/src/schema.ts` (FocusSession table)
- `packages/db/drizzle/` (migrations)
- `apps/api/src/routes/focus.ts`
- `apps/web/src/FocusPanel.tsx`

**B5-owned (after B4 merge):**
- `packages/domain/src/result.ts` (new)
- `packages/domain/src/daily-close.ts` (new)
- `packages/db/src/schema.ts` (result tables)
- `apps/api/src/routes/results.ts` (new)
- `apps/web/src/ActionResult.tsx` (new)
- `apps/web/src/DailyClose.tsx` (new)

**UI-owned (during redesign):**
- `apps/web/src/styles/` (CSS)
- `apps/web/src/components/` (shared components)
- `apps/web/src/pages/` (all screens)

**Intelligence-owned:**
- `packages/intelligence/` (new package)
- `apps/api/src/routes/intelligence.ts` (new)
- `apps/web/src/pages/Me.tsx`
- `apps/web/src/pages/MemoryInspector.tsx` (new)

### B. Test Plan Summary

**Unit Tests:**
- Domain state transitions
- Ranking constraints
- Pattern detection rules
- Evidence mapping

**Integration Tests:**
- Database transactions + events
- API endpoints + validation
- User ownership checks
- Migration idempotency

**E2E Tests:**
- Empty user → full loop
- AI failure → manual fallback
- Wrong assumption → correction
- Focus reload after restart
- Weekly Reset flow
- Get Unstuck diagnosis

**Manual QA:**
- Mobile responsive
- Accessibility (keyboard, screen reader)
- Performance (load time, smoothness)
- Edge cases (no data, errors, offline)

### C. Deployment Checklist

**Pre-production:**
- [ ] All migrations applied
- [ ] Environment variables set
- [ ] AI provider configured
- [ ] Error monitoring enabled
- [ ] Backups configured
- [ ] Health checks passing

**Production:**
- [ ] Domain + SSL configured
- [ ] CDN for static assets
- [ ] Database connection pooling
- [ ] Rate limiting enabled
- [ ] Logging to external service
- [ ] Alerting configured

**Post-launch:**
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Collect user feedback
- [ ] Plan hotfix process
- [ ] Update documentation

---

## 12. References

- **HANDOFF.md** — Current state, B4 status, agent coordination
- **Engineering Blueprint V1** — Architecture, domain model, test pyramid
- **MVP Scope V1** — Feature priorities, P0/P1/P2
- **Domain Model V1** — Entity definitions, relationships
- **Personal Intelligence Engine V1** — Derived features, patterns, preferences
- **Product Surface Spec V1** — Screen inventory, states
- **Figma AI Design Brief V1** — Visual direction, component library
- **UI Design V2** — Dark theme, 25 screens, design system

---

**End of Document**
