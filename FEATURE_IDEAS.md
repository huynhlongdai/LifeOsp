# LifeOS — Feature Ideas & UX Improvements

**Ngày tạo:** 2026-09-13  
**Mục đích:** Danh sách các tính năng và cải tiến UX dựa trên research và best practices

---

## 1. Power User Features

### 1.1 Command Palette (⌘K)

**Mô tả:** Keyboard-driven navigation và actions cho power users

**UI:**
- Modal overlay xuất hiện khi press ⌘K (Mac) hoặc Ctrl+K (Windows)
- Search box ở trên, results ở dưới
- Keyboard navigation (↑↓ để chọn, Enter để execute)

**Commands:**
```
Navigation:
- Go to NOW
- Go to Direction
- Go to Execute
- Go to Reflect
- Go to ME

Actions:
- New Brain Dump
- New Action
- Start Focus
- Daily Close
- Weekly Reset

Search:
- Search actions...
- Search captures...
- Ask LifeOS...

Quick Actions:
- Complete current action
- Postpone current action
- Focus for 25 minutes
```

**Implementation:**
```typescript
import { Command } from 'cmdk';

function CommandPalette() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => navigate('/now')}>
            Go to NOW
          </Command.Item>
          <Command.Item onSelect={() => navigate('/direction')}>
            Go to Direction
          </Command.Item>
          {/* ... */}
        </Command.Group>
        
        <Command.Group heading="Actions">
          <Command.Item onSelect={() => createBrainDump()}>
            New Brain Dump
          </Command.Item>
          <Command.Item onSelect={() => startFocus()}>
            Start Focus
          </Command.Item>
          {/* ... */}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

**Benefits:**
- 10x faster navigation cho power users
- Discoverability (show all available actions)
- Accessibility (keyboard-only users)

**Priority:** P1 (sau MVP)

---

### 1.2 Keyboard Shortcuts

**Global shortcuts:**
- `⌘K` — Command palette
- `?` — Show keyboard shortcuts help
- `Esc` — Close modal/focus mode

**Context-specific shortcuts:**

**NOW page:**
- `F` — Start Focus on current action
- `E` — Edit current action
- `C` — Complete current action
- `P` — Postpone current action
- `W` — Show "Why this?" evidence

**Focus mode:**
- `Esc` — Exit focus mode
- `D` — Capture distraction
- `Space` — Pause/resume timer

**Action list:**
- `N` — New action
- `↑↓` — Navigate actions
- `Enter` — Open action details
- `Delete` — Delete action (with confirmation)

**Implementation:**
```typescript
import { useHotkeys } from 'react-hotkeys-hook';

function NowPage() {
  useHotkeys('f', () => startFocus());
  useHotkeys('e', () => editAction());
  useHotkeys('c', () => completeAction());
  useHotkeys('p', () => postponeAction());
  useHotkeys('w', () => showEvidence());
  
  return <div>...</div>;
}
```

**Priority:** P1 (sau MVP)

---

### 1.3 Quick Capture Widget

**Mô tả:** Floating button để capture thoughts từ bất kỳ đâu trong app

**UI:**
- Floating action button (FAB) ở bottom-right
- Click → expand thành text input
- Auto-save sau 2 seconds không typing
- Option "Open in Inbox" sau khi save

**Implementation:**
```typescript
function QuickCapture() {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  
  const autoSave = useDebounce(async () => {
    if (text.trim()) {
      await api.createCapture({ text, type: 'quick_note' });
      setSaved(true);
      setTimeout(() => {
        setExpanded(false);
        setText('');
        setSaved(false);
      }, 2000);
    }
  }, 2000);
  
  useEffect(() => {
    if (text) autoSave();
  }, [text]);
  
  if (!expanded) {
    return (
      <button className="fab" onClick={() => setExpanded(true)}>
        <PlusIcon />
      </button>
    );
  }
  
  return (
    <div className="quick-capture-panel">
      {saved ? (
        <div className="saved-message">
          ✓ Saved
          <button onClick={() => navigate('/inbox')}>Open in Inbox</button>
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quick note..."
          autoFocus
        />
      )}
    </div>
  );
}
```

**Priority:** P1 (sau MVP)

---

## 2. Gamification (Subtle)

### 2.1 Streaks & Milestones

**Mô tả:** Celebrate consistency mà không gây pressure

**Streaks:**
- Daily Close streak: "You've closed your day 7 days in a row 🔥"
- Weekly Reset streak: "4 weeks of reflection in a row 🎯"
- Focus streak: "5 focus sessions this week ⚡"

**Milestones:**
- "First action completed ✓"
- "10 actions completed 🎉"
- "100 actions completed 🏆"
- "First weekly reset completed 📊"
- "30 days of LifeOS 🌟"

**UI:**
```typescript
function StreakBadge({ count, label, icon }: { count: number; label: string; icon: string }) {
  return (
    <div className="streak-badge">
      <span className="icon">{icon}</span>
      <span className="count">{count}</span>
      <span className="label">{label}</span>
    </div>
  );
}

// Usage
<StreakBadge count={7} label="day streak" icon="🔥" />
```

**Psychology:**
- Positive reinforcement (show what user achieved)
- No punishment for breaking streaks (avoid guilt)
- Celebrate comebacks ("Welcome back! Ready to continue?")

**Priority:** P2 (nice-to-have)

---

### 2.2 Progress Visualization

**Mô tả:** Visual representation của progress over time

**Ideas:**

**1. Contribution graph (GitHub-style):**
```typescript
function ContributionGraph({ data }: { data: DailyActivity[] }) {
  return (
    <div className="contribution-graph">
      {data.map((day, i) => (
        <div
          key={i}
          className="cell"
          style={{
            backgroundColor: getColor(day.actionsCompleted),
          }}
          title={`${day.date}: ${day.actionsCompleted} actions`}
        />
      ))}
    </div>
  );
}

function getColor(count: number): string {
  if (count === 0) return '#ebedf0';
  if (count < 3) return '#9be9a8';
  if (count < 6) return '#40c463';
  if (count < 10) return '#30a14e';
  return '#216e39';
}
```

**2. Progress rings (Apple Watch-style):**
- Move ring: Actions completed
- Exercise ring: Focus minutes
- Stand ring: Daily closes

**3. Timeline view:**
- Horizontal timeline showing major events
- Direction changes, season transitions, milestones
- Visual story of user's journey

**Priority:** P2 (nice-to-have)

---

## 3. Social Features

### 3.1 Accountability Partners

**Mô tả:** Share goals với trusted friends/family

**Features:**
- Invite partner (via email/link)
- Share specific goals/outcomes (opt-in)
- See partner's progress (read-only)
- Send encouragement messages
- Weekly summary email

**Privacy:**
- User controls what to share
- Can revoke access anytime
- No public profiles (private by default)

**Implementation:**
```typescript
interface AccountabilityPartner {
  id: string;
  userId: string;
  partnerId: string;
  sharedGoals: string[]; // goal IDs
  invitedAt: Date;
  acceptedAt?: Date;
}

// Share goal
async function shareGoal(goalId: string, partnerId: string) {
  await api.createAccountabilityPartner({
    userId: currentUser.id,
    partnerId,
    sharedGoals: [goalId],
  });
  
  // Send invitation email
  await emailService.sendInvitation(partnerId, currentUser);
}
```

**Priority:** P3 (future consideration)

---

### 3.2 Community Templates

**Mô tả:** User-generated templates cho common workflows

**Template types:**
- Morning routine template
- Weekly reset template
- Project planning template
- Habit building template

**Features:**
- Browse community templates
- Import template vào LifeOS
- Publish own templates
- Rate/review templates
- Fork và customize

**Implementation:**
```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  structure: TemplateStructure;
  useCount: number;
  rating: number;
  reviews: Review[];
}

interface TemplateStructure {
  actions: ActionTemplate[];
  outcomes: OutcomeTemplate[];
  projects: ProjectTemplate[];
  operatingPreferences: OperatingPreference[];
}

// Import template
async function importTemplate(templateId: string) {
  const template = await api.getTemplate(templateId);
  
  // Create actions, outcomes, projects from template
  for (const action of template.structure.actions) {
    await api.createAction({
      ...action,
      userId: currentUser.id,
    });
  }
  
  // Track template usage
  await api.incrementTemplateUseCount(templateId);
}
```

**Priority:** P3 (future consideration)

---

## 4. Integrations

### 4.1 Calendar Sync

**Mô tả:** Sync actions với Google Calendar/Outlook

**Features:**
- Actions với scheduled time → Calendar events
- Calendar events → Read-only actions (optional)
- Focus sessions → Calendar blocks
- Two-way sync hoặc one-way

**Implementation:**
```typescript
// Google Calendar integration
import { google } from 'googleapis';

async function syncActionToCalendar(action: Action, userId: string) {
  if (!action.scheduledAt) return;
  
  const calendar = google.calendar({ version: 'v3', auth: getOAuthClient(userId) });
  
  const event = {
    summary: action.title,
    description: `LifeOS Action\n\nDone condition: ${action.doneCondition}`,
    start: {
      dateTime: action.scheduledAt.toISOString(),
      timeZone: getUserTimezone(userId),
    },
    end: {
      dateTime: addMinutes(action.scheduledAt, action.estimatedMinutes || 60).toISOString(),
      timeZone: getUserTimezone(userId),
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
      ],
    },
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });
  
  // Store calendar event ID for future updates
  await api.updateAction(action.id, { calendarEventId: response.data.id });
}
```

**Priority:** P2 (sau MVP)

---

### 4.2 Browser Extension

**Mô tả:** Capture web content vào LifeOS Inbox

**Features:**
- Save webpage URL + title
- Highlight và save text snippets
- Screenshot capture
- Tag và organize later

**Implementation:**
```typescript
// Chrome extension background script
chrome.action.onClicked.addListener(async (tab) => {
  const capture = {
    type: 'web_capture',
    url: tab.url,
    title: tab.title,
    capturedAt: new Date().toISOString(),
  };
  
  // Send to LifeOS API
  await fetch('https://api.lifeos.app/captures', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    },
    body: JSON.stringify(capture),
  });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Saved to LifeOS',
    message: tab.title,
  });
});
```

**Priority:** P2 (sau MVP)

---

### 4.3 Mobile Widgets (iOS/Android)

**Mô tả:** Home screen widgets cho quick access

**iOS Widget (WidgetKit):**
```swift
// Widget showing current action
struct LifeOSWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "LifeOSWidget", provider: Provider()) { entry in
      LifeOSWidgetView(entry: entry)
    }
    .configurationDisplayName("Current Action")
    .description("See what matters most right now.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct LifeOSWidgetView: View {
  let entry: SimpleEntry
  
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("NOW")
        .font(.caption)
        .foregroundColor(.secondary)
      
      Text(entry.currentAction?.title ?? "No action")
        .font(.headline)
        .lineLimit(2)
      
      if let minutes = entry.currentAction?.estimatedMinutes {
        Text("\(minutes) min")
          .font(.caption)
          .foregroundColor(.secondary)
      }
      
      Spacer()
      
      Button("Start Focus") {
        // Deep link to focus mode
      }
      .buttonStyle(.borderedProminent)
    }
    .padding()
  }
}
```

**Priority:** P3 (requires native app)

---

## 5. AI Enhancements

### 5.1 Smart Suggestions

**Mô tả:** AI gợi ý actions dựa trên patterns và context

**Suggestion types:**

**1. Missing actions:**
```typescript
// AI detects missing actions for outcome
async function suggestMissingActions(outcomeId: string): Promise<ActionSuggestion[]> {
  const outcome = await api.getOutcome(outcomeId);
  const existingActions = await api.getActionsForOutcome(outcomeId);
  
  const prompt = `
    Outcome: ${outcome.title}
    Success definition: ${outcome.successDefinition}
    
    Existing actions:
    ${existingActions.map(a => `- ${a.title}`).join('\n')}
    
    Suggest 3 additional actions that would help achieve this outcome.
    Focus on concrete, actionable steps.
  `;
  
  const suggestions = await ai.generate(prompt);
  return parseSuggestions(suggestions);
}
```

**2. Action refinement:**
```typescript
// AI helps refine vague actions
async function refineAction(actionId: string): Promise<ActionRefinement> {
  const action = await api.getAction(actionId);
  
  const prompt = `
    Action: ${action.title}
    Done condition: ${action.doneCondition || 'Not specified'}
    
    This action seems vague. Suggest a more specific version with:
    - Clearer title
    - Concrete done condition
    - Realistic time estimate
  `;
  
  return await ai.generate(prompt);
}
```

**3. Break down large actions:**
```typescript
// AI breaks down actions > 2 hours
async function breakDownAction(actionId: string): Promise<Action[]> {
  const action = await api.getAction(actionId);
  
  if (action.estimatedMinutes <= 120) return [];
  
  const prompt = `
    Action: ${action.title}
    Estimated time: ${action.estimatedMinutes} minutes
    
    Break this down into 3-5 smaller actions, each under 60 minutes.
  `;
  
  return await ai.generate(prompt);
}
```

**Priority:** P2 (sau MVP)

---

### 5.2 Natural Language Action Creation

**Mô tả:** Create actions bằng natural language

**Example:**
```
User types: "Call mom tomorrow at 6pm to discuss birthday plans, should take 15 minutes"

AI extracts:
- Title: "Call mom to discuss birthday plans"
- Scheduled: Tomorrow 6pm
- Estimated: 15 minutes
- Context: Family, birthday planning
```

**Implementation:**
```typescript
async function createFromNaturalLanguage(input: string): Promise<Action> {
  const prompt = `
    Extract action details from this text:
    "${input}"
    
    Return JSON with:
    {
      "title": "clear action title",
      "doneCondition": "observable completion criteria",
      "estimatedMinutes": number,
      "scheduledAt": "ISO datetime or null",
      "context": "relevant context or null"
    }
  `;
  
  const extracted = await ai.generate(prompt);
  const parsed = JSON.parse(extracted);
  
  return await api.createAction({
    title: parsed.title,
    doneCondition: parsed.doneCondition,
    estimatedMinutes: parsed.estimatedMinutes,
    scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
    status: 'candidate',
  });
}
```

**Priority:** P2 (sau MVP)

---

### 5.3 Weekly Insights Report

**Mô tả:** AI-generated weekly summary với insights

**Report structure:**
```typescript
interface WeeklyInsightsReport {
  weekStart: Date;
  weekEnd: Date;
  
  summary: string; // "You completed 12 actions this week, 3 more than last week"
  
  highlights: {
    type: 'achievement' | 'pattern' | 'improvement';
    text: string;
  }[];
  
  // Examples:
  // - "You completed all planned actions on Thursday - your most productive day"
  // - "Actions under 30 minutes had 85% completion rate"
  // - "You focused for 8 hours total, 2 hours more than last week"
  
  patterns: PatternCandidate[];
  
  suggestions: {
    text: string;
    rationale: string;
  }[];
  
  // Examples:
  // - "Try scheduling important actions in the morning"
  //   Rationale: "You completed 80% of morning actions vs 40% of afternoon actions"
}

async function generateWeeklyInsights(userId: string, weekStart: Date): Promise<WeeklyInsightsReport> {
  const events = await api.getEventsForWeek(userId, weekStart);
  const actions = await api.getActionsForWeek(userId, weekStart);
  
  const prompt = `
    Analyze this week's data and generate insights.
    
    Events: ${JSON.stringify(events)}
    Actions: ${JSON.stringify(actions)}
    
    Provide:
    1. Summary (1-2 sentences)
    2. 3 highlights (achievements, patterns, improvements)
    3. 2 patterns with evidence
    4. 2 suggestions with rationale
  `;
  
  return await ai.generate(prompt);
}
```

**Priority:** P2 (sau MVP)

---

## 6. Accessibility Features

### 6.1 Voice Commands

**Mô tả:** Control LifeOS bằng voice (Web Speech API)

**Commands:**
- "Start focus" → Begin focus session
- "Complete action" → Mark current action done
- "New action [title]" → Create action
- "What's next?" → Read current action
- "Daily close" → Open daily close

**Implementation:**
```typescript
import { useSpeechRecognition } from 'react-speech-kit';

function VoiceCommands() {
  const { listen, stop, listening } = useSpeechRecognition({
    onResult: (transcript: string) => {
      const command = transcript.toLowerCase();
      
      if (command.includes('start focus')) {
        startFocus();
      } else if (command.includes('complete action')) {
        completeAction();
      } else if (command.startsWith('new action')) {
        const title = command.replace('new action', '').trim();
        createAction(title);
      }
    },
  });
  
  return (
    <button onClick={listening ? stop : listen}>
      {listening ? '🎤 Listening...' : '🎙️ Voice commands'}
    </button>
  );
}
```

**Priority:** P3 (experimental)

---

### 6.2 High Contrast Mode

**Mô tả:** Alternative theme cho users với visual impairments

**CSS:**
```css
@media (prefers-contrast: high) {
  :root {
    --bg-deep: #000000;
    --bg-surface: #1a1a1a;
    --text-primary: #ffffff;
    --accent: #ffff00; /* High contrast yellow */
    --border: #ffffff;
  }
  
  button, a {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}
```

**Priority:** P1 (accessibility requirement)

---

### 6.3 Reduced Motion

**Mô tả:** Respect user's motion preferences

**CSS:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Priority:** P1 (accessibility requirement)

---

## 7. Data & Privacy

### 7.1 Data Export

**Mô tả:** Export all user data trong standard formats

**Formats:**
- JSON (structured data)
- CSV (actions, events)
- Markdown (notes, captures)

**Implementation:**
```typescript
async function exportUserData(userId: string, format: 'json' | 'csv' | 'markdown') {
  const data = {
    user: await api.getUser(userId),
    actions: await api.getAllActions(userId),
    captures: await api.getAllCaptures(userId),
    events: await api.getAllEvents(userId),
    // ... all other data
  };
  
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else if (format === 'csv') {
    return convertToCSV(data);
  } else if (format === 'markdown') {
    return convertToMarkdown(data);
  }
}
```

**Priority:** P1 (GDPR requirement)

---

### 7.2 Account Deletion

**Mô tả:** Complete account và data deletion

**Process:**
1. User requests deletion
2. Confirm via email
3. 30-day grace period (can cancel)
4. After 30 days:
   - Anonymize user data (keep for analytics)
   - Delete personal identifiers
   - Remove from active database
5. Send confirmation email

**Implementation:**
```typescript
async function requestAccountDeletion(userId: string) {
  // Mark account for deletion
  await api.updateUser(userId, {
    deletionRequestedAt: new Date(),
    deletionScheduledAt: addDays(new Date(), 30),
  });
  
  // Send confirmation email
  await emailService.sendDeletionConfirmation(userId);
  
  // Schedule deletion job
  await scheduleJob('delete-account', {
    userId,
    executeAt: addDays(new Date(), 30),
  });
}

async function executeAccountDeletion(userId: string) {
  // Anonymize data
  await api.anonymizeUserData(userId);
  
  // Send final confirmation
  await emailService.sendDeletionComplete(userId);
}
```

**Priority:** P1 (GDPR requirement)

---

## 8. Performance Features

### 8.1 Offline Mode

**Mô tả:** Use LifeOS without internet connection

**Implementation:**
```typescript
// Service worker for offline support
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('lifeos-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/now',
        '/direction',
        '/execute',
        '/reflect',
        '/me',
        '/static/app.js',
        '/static/app.css',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Queue API calls when offline
async function queueApiCall(endpoint: string, data: any) {
  if (!navigator.onLine) {
    const queue = await getOfflineQueue();
    queue.push({ endpoint, data, timestamp: Date.now() });
    await saveOfflineQueue(queue);
  } else {
    await api.call(endpoint, data);
  }
}

// Sync when back online
window.addEventListener('online', async () => {
  const queue = await getOfflineQueue();
  for (const item of queue) {
    await api.call(item.endpoint, item.data);
  }
  await clearOfflineQueue();
});
```

**Priority:** P2 (PWA requirement)

---

### 8.2 Background Sync

**Mô tả:** Sync data in background cho better performance

**Implementation:**
```typescript
// Use Background Sync API
async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-actions');
  }
}

// Service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncActions());
  }
});

async function syncActions() {
  const pendingActions = await getPendingActions();
  for (const action of pendingActions) {
    await api.updateAction(action.id, action);
  }
  await clearPendingActions();
}
```

**Priority:** P3 (advanced PWA)

---

## 9. Priority Matrix

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Data Export | High | Low | P1 | MVP |
| Account Deletion | High | Low | P1 | MVP |
| High Contrast Mode | High | Low | P1 | MVP |
| Reduced Motion | High | Low | P1 | MVP |
| Command Palette | High | Medium | P1 | Phase 2 |
| Keyboard Shortcuts | High | Medium | P1 | Phase 2 |
| Quick Capture Widget | Medium | Low | P1 | Phase 2 |
| Streaks & Milestones | Medium | Medium | P2 | Phase 3 |
| Progress Visualization | Medium | Medium | P2 | Phase 3 |
| Calendar Sync | High | High | P2 | Phase 3 |
| Browser Extension | Medium | High | P2 | Phase 3 |
| Smart Suggestions | High | High | P2 | Phase 3 |
| Natural Language Actions | Medium | Medium | P2 | Phase 3 |
| Weekly Insights Report | Medium | Medium | P2 | Phase 3 |
| Offline Mode | Medium | High | P2 | Phase 3 |
| Accountability Partners | Medium | High | P3 | Future |
| Community Templates | Medium | High | P3 | Future |
| Mobile Widgets | Medium | High | P3 | Future |
| Voice Commands | Low | High | P3 | Future |
| Background Sync | Low | High | P3 | Future |

---

**End of Feature Ideas**
