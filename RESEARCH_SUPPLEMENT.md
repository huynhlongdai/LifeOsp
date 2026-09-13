# LifeOS — Research Supplement

**Ngày tạo:** 2026-09-13  
**Mục đích:** Bổ sung insights từ UX research, competitive analysis, và technical best practices

---

## 1. UX Patterns từ Productivity Apps Hàng Đầu

### 1.1 Notion (Benchmark: Cleanliness)

**Strengths:**
- **Empty states rất helpful:** Mỗi page trống đều có guidance rõ ràng ("Type '/' for commands", template suggestions)
- **Progressive disclosure:** Complexity được ẩn đi cho đến khi user cần
- **Command palette (⌘K):** Power users có thể navigate cực nhanh
- **Breadcrumb navigation:** Luôn biết mình đang ở đâu trong hierarchy
- **Inline editing:** Click anywhere để edit, không cần "Edit mode"

**Áp dụng cho LifeOS:**
- NOW page khi empty: "No clear direction yet? Try a 2-minute Clarity Reset"
- Add ⌘K command palette cho power users (jump to Focus, Daily Close, etc.)
- Inline editing cho Action details (click title để edit)
- Breadcrumb cho Direction → Season → Outcome → Project → Action

**Anti-patterns cần tránh:**
- Too much flexibility (Notion cho phép tạo bất kỳ structure nào → overwhelming)
- LifeOS nên opinionated hơn, guide user theo core loop

---

### 1.2 Linear (Benchmark: Polish)

**Strengths:**
- **Keyboard-first:** Mọi action đều có shortcut
- **Animations smooth:** 60fps, subtle nhưng delightful
- **Loading states:** Skeleton screens thay vì spinners
- **Optimistic updates:** UI responds instantly, sync background
- **Toast notifications:** Non-blocking, auto-dismiss, actionable
- **Context menus:** Right-click hoặc `...` button, không clutter UI

**Áp dụng cho LifeOS:**
- Keyboard shortcuts: `F` = Focus, `D` = Daily Close, `N` = New Action
- Skeleton screens cho loading states
- Optimistic updates khi user clicks "Start Focus" (UI updates ngay, API call background)
- Toast cho confirmations ("Focus started", "Action completed")
- Context menus cho Action cards (right-click → Complete, Postpone, Focus, etc.)

**Technical notes:**
- Use Framer Motion hoặc React Spring cho animations
- Optimistic updates với React Query hoặc SWR
- Toast library: Sonner hoặc React Hot Toast

---

### 1.3 Craft (Benchmark: Warmth)

**Strengths:**
- **Typography hierarchy rõ ràng:** Font sizes, weights, spacing tạo rhythm
- **Color usage tinh tế:** Accent colors chỉ dùng cho CTAs, không overwhelm
- **Whitespace generous:** Breathing room giữa elements
- **Cards với subtle shadows:** Depth mà không heavy
- **Icons custom:** Consistent style, friendly không corporate

**Áp dụng cho LifeOS:**
- Typography scale: Display (32px) → H1 (24px) → H2 (20px) → Body (16px) → Caption (14px)
- Accent orange chỉ cho primary CTAs (Start Focus, Complete Action)
- Padding generous: 24px giữa sections, 16px trong cards
- Box shadows subtle: `0 2px 8px rgba(0,0,0,0.08)`
- Custom icon set (Lucide hoặc Phosphor Icons)

---

## 2. Behavioral Psychology Insights

### 2.1 Zeigarnik Effect

**Finding:** Người ta nhớ incomplete tasks tốt hơn completed tasks → gây mental clutter

**Ứng dụng:**
- Daily Close nên hiển thị "3 tasks still open" để user aware
- Khuyến khích user close hoặc reschedule open tasks
- Weekly Reset show "carried over from last week" tasks

**Implementation:**
```typescript
// Daily Close screen
const openTasks = actions.filter(a => a.status === 'ready' || a.status === 'candidate');
if (openTasks.length > 0) {
  showReminder(`${openTasks.length} tasks still open. Close or reschedule?`);
}
```

---

### 2.2 Implementation Intentions (Gollwitzer, 1999)

**Finding:** "When X, I will do Y" tăng completion rate 2-3x so với vague goals

**Ứng dụng:**
- Action creation form nên có fields:
  - **When:** "Tomorrow at 9am" hoặc "After lunch"
  - **Where:** "At my desk" hoặc "In the office"
  - **What:** Specific action (đã có)
- Focus session nên có pre-commitment: "I will work on X for 40 minutes"

**Implementation:**
```typescript
interface Action {
  // ... existing fields
  implementationIntention?: {
    when?: string; // "Tomorrow 9am"
    where?: string; // "At desk"
    duration?: number; // minutes
  };
}
```

**UI enhancement:**
- Khi user tạo Action, show optional prompt: "When and where will you do this?"
- Pre-fill Focus session với Action's implementation intention

---

### 2.3 Fresh Start Effect

**Finding:** Người ta motivated hơn khi bắt đầu ở temporal landmarks (Monday, New Year, birthday)

**Ứng dụng:**
- Weekly Reset nên emphasize "fresh start" framing
- Daily Close có option "Start fresh tomorrow" (clear open tasks)
- Celebrate milestones (7-day streak, 30-day streak)

**Implementation:**
```typescript
// Weekly Reset screen
const freshStartMessage = `
  New week, fresh start.
  Last week: ${completedActions} completed, ${postponedActions} postponed.
  This week: Let's focus on what matters most.
`;
```

---

### 2.4 Loss Aversion

**Finding:** Người ta sợ mất hơn là muốn gain

**Ứng dụng:**
- Show "protected time" thay vì "planned time"
- "You've protected 2 hours for deep work" thay vì "You've planned 2 hours"
- Not Now items: "Safely stored" thay vì "Deferred"

**Copywriting:**
- ✅ "Protected: 3 items safely stored in Not Now"
- ❌ "Deferred: 3 items postponed"

- ✅ "You've completed 5 actions this week"
- ❌ "You've missed 2 actions this week"

---

## 3. AI/ML Approaches cho Personal Intelligence

### 3.1 Pattern Detection Strategies

**Approach 1: Rule-based (MVP)**
```typescript
// Example: Detect "actions > 60 min have lower completion rate"
function detectDurationPattern(events: LifeEvent[]): PatternCandidate | null {
  const actionEvents = events.filter(e => e.type === 'action.completed' || e.type === 'action.postponed');
  
  const shortActions = actionEvents.filter(e => e.data.estimatedMinutes <= 60);
  const longActions = actionEvents.filter(e => e.data.estimatedMinutes > 60);
  
  if (shortActions.length < 5 || longActions.length < 5) return null; // not enough data
  
  const shortCompletionRate = shortActions.filter(e => e.type === 'action.completed').length / shortActions.length;
  const longCompletionRate = longActions.filter(e => e.type === 'action.completed').length / longActions.length;
  
  if (shortCompletionRate - longCompletionRate > 0.3) {
    return {
      statement: "Actions under 60 minutes have higher completion rate",
      confidence: "strong",
      evidence: [
        `${Math.round(shortCompletionRate * 100)}% of short actions completed`,
        `${Math.round(longCompletionRate * 100)}% of long actions completed`,
        `Based on ${actionEvents.length} actions`
      ]
    };
  }
  
  return null;
}
```

**Approach 2: Statistical (Future)**
- Use chi-squared test hoặc t-test để validate patterns
- Require statistical significance (p < 0.05)
- Bootstrap resampling cho small samples

**Approach 3: ML-based (Long-term)**
- Train classifier on user's completion data
- Features: duration, time of day, day of week, project, outcome, etc.
- Predict completion probability cho new actions
- Recommend optimal action size/timing

---

### 3.2 Recommendation Engine Enhancements

**Current (V0): Deterministic scoring**
```typescript
score = 
  directionRelevance * 0.3 +
  urgency * 0.2 +
  effortFit * 0.2 +
  bottleneckValue * 0.15 +
  freshness * 0.15
```

**Future (V1): Context-aware**
```typescript
// Add time-of-day context
const hourOfDay = new Date().getHours();
const userPeakHours = getUserPeakHours(operatingPreferences);
const isPeakTime = userPeakHours.includes(hourOfDay);

score = 
  baseScore * (isPeakTime ? 1.2 : 0.8) +
  // ... other factors
```

**Future (V2): Learning from feedback**
```typescript
// Track recommendation outcomes
interface RecommendationOutcome {
  recommendationId: string;
  actionId: string;
  shown: boolean;
  accepted: boolean;
  completed: boolean;
  timeToComplete?: number;
}

// Use outcomes to adjust weights
function updateScoringWeights(outcomes: RecommendationOutcome[]) {
  const acceptedAndCompleted = outcomes.filter(o => o.accepted && o.completed);
  const rejected = outcomes.filter(o => !o.accepted);
  
  // If many rejected, reduce weight of factors that led to rejection
  // If many accepted but not completed, reduce weight of effortFit
  // ...
}
```

---

### 3.3 Natural Language Queries (Ask LifeOS)

**Approach: RAG (Retrieval-Augmented Generation)**

```typescript
async function answerQuery(query: string, userId: string): Promise<Answer> {
  // 1. Retrieve relevant context
  const relevantEvents = await retrieveRelevantEvents(query, userId);
  const relevantActions = await retrieveRelevantActions(query, userId);
  const relevantPatterns = await retrieveConfirmedPatterns(userId);
  
  // 2. Build prompt
  const prompt = `
    User query: ${query}
    
    Relevant data:
    - Events: ${JSON.stringify(relevantEvents)}
    - Actions: ${JSON.stringify(relevantActions)}
    - Patterns: ${JSON.stringify(relevantPatterns)}
    
    Instructions:
    - Answer concisely (2-3 sentences)
    - Cite specific evidence
    - Acknowledge uncertainty if data is limited
    - Suggest follow-up actions if applicable
  `;
  
  // 3. Generate answer
  const answer = await ai.generate(prompt);
  
  // 4. Extract sources
  const sources = extractSources(answer, relevantEvents, relevantActions);
  
  return { answer, sources, confidence: calculateConfidence(relevantEvents.length) };
}
```

**Example queries:**
- "What tasks do I usually postpone?" → Retrieve postponed actions, analyze patterns
- "When am I most productive?" → Retrieve completion times, find peak hours
- "Which projects are stalled?" → Retrieve actions with no progress in 7+ days

---

## 4. Technical Best Practices

### 4.1 State Management

**Current:** React Context + useState (simple but limited)

**Recommendation:** TanStack Query (React Query)

**Benefits:**
- Automatic caching + refetching
- Optimistic updates
- Background refetching
- Query invalidation
- DevTools

**Example:**
```typescript
// Fetch NOW data
const { data: nowView, isLoading } = useQuery({
  queryKey: ['now'],
  queryFn: () => api.getNow(),
  staleTime: 1000 * 60 * 5, // 5 minutes
  refetchOnWindowFocus: true,
});

// Start Focus with optimistic update
const startFocusMutation = useMutation({
  mutationFn: (actionId: string) => api.startFocus(actionId),
  onMutate: async (actionId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['now'] });
    
    // Snapshot previous value
    const previousNow = queryClient.getQueryData(['now']);
    
    // Optimistically update
    queryClient.setQueryData(['now'], (old: NowView) => ({
      ...old,
      focusSession: { actionId, startedAt: new Date().toISOString() }
    }));
    
    return { previousNow };
  },
  onError: (err, actionId, context) => {
    // Rollback on error
    queryClient.setQueryData(['now'], context.previousNow);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['now'] });
  }
});
```

---

### 4.2 Error Handling

**Strategy: Error boundaries + retry + fallback UI**

```typescript
// Error boundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    logError(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    
    return this.props.children;
  }
}

// API error handling
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.message);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle known errors
      if (error.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      } else if (error.status === 503) {
        // AI unavailable, show fallback
        throw new AIUnavailableError();
      }
    } else {
      // Network error, retry
      throw new NetworkError();
    }
    
    throw error;
  }
}
```

---

### 4.3 Performance Optimization

**Code splitting:**
```typescript
// Lazy load heavy components
const WeeklyReset = lazy(() => import('./pages/WeeklyReset'));
const AskLifeOS = lazy(() => import('./pages/AskLifeOS'));

// Use in routes
<Route path="/weekly-reset" element={
  <Suspense fallback={<PageSkeleton />}>
    <WeeklyReset />
  </Suspense>
} />
```

**Virtualization cho long lists:**
```typescript
// For Inbox with 100+ captures
import { useVirtualizer } from '@tanstack/react-virtual';

function InboxList({ captures }: { captures: Capture[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: captures.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // estimated row height
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const capture = captures[virtualRow.index];
          return (
            <div
              key={capture.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CaptureCard capture={capture} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Image optimization:**
```typescript
// Use next/image hoặc sharp for server-side optimization
// Convert to WebP, generate multiple sizes
<picture>
  <source srcset="/avatar-400.webp 400w, /avatar-800.webp 800w" type="image/webp" />
  <source srcset="/avatar-400.jpg 400w, /avatar-800.jpg 800w" type="image/jpeg" />
  <img src="/avatar-400.jpg" alt="User avatar" loading="lazy" />
</picture>
```

---

## 5. Growth & Experimentation Ideas

### 5.1 Onboarding Experiments

**Experiment A: Problem-first vs Solution-first**

**Variant A (Problem-first):**
1. "What's your biggest challenge right now?" (NeedState)
2. Show how LifeOS solves that specific problem
3. Quick win: Brain Dump → Clarity → 1 Action

**Variant B (Solution-first):**
1. Show 30-second demo video
2. "Try it yourself" → Brain Dump
3. Reveal insights from their data

**Metric:** Activation rate (reach first Action)

---

**Experiment B: Guided vs Self-directed**

**Variant A (Guided):**
- Step-by-step wizard
- Tooltips explain each step
- Can't skip ahead

**Variant B (Self-directed):**
- Show all features upfront
- Let user explore
- Optional tooltips

**Metric:** Time to first Action, Day 7 retention

---

### 5.2 Engagement Loops

**Daily Loop:**
1. Morning: Check NOW (1 action)
2. Midday: Focus session (40 min)
3. Evening: Daily Close (2 min)

**Weekly Loop:**
1. Monday: Weekly Reset (10 min)
2. Daily: Execute actions
3. Friday: Review progress

**Monthly Loop:**
1. Month review: Big picture patterns
2. Adjust Direction/Season if needed
3. Celebrate milestones

---

### 5.3 Viral Mechanics

**Idea 1: Shareable insights**
- "I completed 12 actions this week! 🎉" (share to Twitter)
- "My most productive day: Thursday" (share to Instagram story)
- Generate beautiful cards with user's data

**Idea 2: Accountability partners**
- Invite friend to see your weekly goals
- Share progress (opt-in)
- Cheer each other on

**Idea 3: Templates**
- "Weekly Reset template" (share with community)
- "Morning routine template"
- User-generated templates → marketplace

---

## 6. Accessibility Checklist

### 6.1 WCAG 2.1 AA Compliance

**Perceivable:**
- [ ] All images have alt text
- [ ] Color is not the only way to convey information (add icons/text)
- [ ] Text contrast ratio ≥ 4.5:1 (use WebAIM Contrast Checker)
- [ ] Can zoom to 200% without breaking layout

**Operable:**
- [ ] All interactive elements focusable with Tab
- [ ] Focus indicator visible (outline)
- [ ] No keyboard traps
- [ ] Can skip repeated content (skip link)
- [ ] Touch targets ≥ 44x44px

**Understandable:**
- [ ] Page language set (`<html lang="en">`)
- [ ] Form inputs have labels
- [ ] Error messages clear and helpful
- [ ] Consistent navigation

**Robust:**
- [ ] Valid HTML
- [ ] ARIA labels where needed
- [ ] Works with screen readers (test with VoiceOver/NVDA)

---

### 6.2 Testing Tools

**Automated:**
- Lighthouse (Chrome DevTools)
- axe DevTools (browser extension)
- Pa11y (CI integration)

**Manual:**
- Keyboard-only navigation test
- Screen reader test (VoiceOver on Mac, NVDA on Windows)
- Zoom test (200%)
- Color blindness simulator

---

## 7. Security & Privacy

### 7.1 Data Protection

**Encryption:**
- At rest: PostgreSQL encryption (enabled by default)
- In transit: TLS 1.3 (enforced)
- Sensitive fields: AES-256 encryption (e.g., AI prompts)

**Access control:**
- Row-level security (PostgreSQL RLS)
- Every query filters by userId
- API validates session token

**Data retention:**
- Active data: Keep indefinitely
- Deleted accounts: Anonymize after 30 days
- LifeEvents: Keep for 2 years, then archive

---

### 7.2 AI Privacy

**Principle:** User owns their data, AI is a tool

**Implementation:**
- AI prompts logged (for debugging) but encrypted
- User can view/delete AI interaction history
- No cross-user training (each user's data isolated)
- Opt-out: User can disable AI features, use manual mode

**Transparency:**
- "Why this?" shows evidence sources
- "How AI works" page explains data usage
- Clear labeling: "AI-generated" vs "User-confirmed"

---

## 8. Analytics & Metrics

### 8.1 Key Events to Track

**Activation:**
- `onboarding_started`
- `needstate_selected`
- `braindump_completed`
- `first_action_created`
- `first_focus_started`
- `first_daily_close_completed`

**Engagement:**
- `session_started`
- `action_completed`
- `focus_session_completed`
- `daily_close_completed`
- `weekly_reset_completed`

**Retention:**
- `day_1_return`
- `day_7_return`
- `day_30_return`

**Value:**
- `recommendation_accepted`
- `recommendation_corrected`
- `pattern_confirmed`
- `operating_preference_applied`

---

### 8.2 Dashboards

**Product dashboard:**
- DAU/WAU/MAU
- Activation funnel conversion
- Retention curves (Day 1/7/30)
- Feature usage (Focus, Daily Close, Weekly Reset)

**Quality dashboard:**
- Error rates (API, AI)
- Performance (load time, API response time)
- User feedback (NPS, support tickets)

**Business dashboard:**
- Free → Pro conversion
- Revenue (MRR, ARR)
- Churn rate
- LTV (lifetime value)

---

**End of Research Supplement**
