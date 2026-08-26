# LifeOS MVP Scope V1

**Status:** ACTIVE  
**Source:** Meetings #007–#010  
**Updated:** 2026-08-26

## Product job

LifeOS helps diverse users move from:
- unclear → oriented;
- overloaded → prioritized;
- drifting → directed;
- stalled → started;
- inconsistent → re-engaged;
- off-course → adjusted;
- distracted → refocused;
- learning → applied.

The shared loop is:

```text
CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT → repeat
```

## Primary navigation

1. NOW
2. DIRECTION
3. EXECUTE
4. REFLECT
5. ME

Secondary:
- Inbox;
- Incubator / Not Now;
- Ask LifeOS;
- Settings.

Tasks, Habits, Goals, Notes, Journal, Calendar, Finance, Health and AI Chat are not top-level MVP navigation.

## Four signature MVP experiences

### 1. Clarity Reset
Brain Dump → interpretation → correction → trade-off → Active/Maintain/Not Now → Next Action.

### 2. NOW
One primary recommended action with duration, done condition, context, Why this?, Start/Edit/Not now/Wrong assumption.

### 3. Get Unstuck
Repeated delay/stall → friction diagnosis → one appropriate intervention: clarify, resize, unblock, reprioritize, replan, pause/drop.

### 4. Weekly Adapt
Plan vs reality → movement → max 3 pattern candidates → evidence/confidence → confirmed adjustments → next week.

## Required P0 screens

1. Welcome / immediate need
2. Quick Life Context
3. Brain Dump / Capture
4. Interpretation review
5. Focus Conflict
6. Current Season builder
7. NOW
8. Next Action detail/edit
9. Focus Mode
10. Complete/postpone/drop result
11. Get Unstuck
12. Daily Close
13. Weekly Reset
14. Insight confirmation
15. Lightweight Projects/Outcomes
16. Incubator / Not Now
17. ME / Operating Preferences
18. Ask LifeOS
19. Settings / privacy / memory controls

## P1 after loop validation

- calendar read integration;
- share/browser capture;
- voice capture;
- basic import;
- notifications;
- offline PWA capture;
- simple routine/habit object only if validated.

## Explicitly out of MVP

- native mobile apps;
- autonomous external agents;
- email agent;
- finance sync;
- wearable/health sync;
- family/shared workspace;
- social/community;
- marketplace;
- complex knowledge base;
- full document editor;
- calendar replacement;
- gamified streak/XP economy;
- advanced dashboard analytics;
- graph database;
- many AI personas;
- plugin ecosystem.

## Core domain objects

- User
- UserProfile
- LifeArea
- NeedState
- Direction
- Season
- Outcome
- Project
- Action
- Capture
- IncubatorItem
- FocusSession
- CheckIn
- DailyClose
- WeeklyReview
- Recommendation
- Insight
- UserMemory
- OperatingPreference
- LifeEvent
- Relation

## AI contract

AI may:
- interpret ambiguous captures;
- propose candidate actions;
- explain trade-offs;
- break down actions;
- generate tentative friction hypotheses;
- summarize evidence;
- draft review insights.

AI may not silently:
- change life direction;
- start/pause/drop meaningful commitments;
- rewrite confirmed memory;
- make major life decisions;
- make psychological/medical diagnoses;
- hide evidence for material recommendations.

Every material recommendation should support:
- Accept/Start;
- Edit;
- Not now;
- Wrong assumption;
- Explain / Why this?

## Experience principles

- Reduce choice.
- Hide system complexity.
- Progressive disclosure.
- Not Now is a successful outcome.
- Recovery over streaks.
- User autonomy is mandatory.
- AI errors are normal designed states.
- Core execution remains usable when AI is unavailable.
- Do not invent work when nothing meaningful needs attention.

## MVP success criteria

The MVP passes only when real users show that:
1. more than one pain-state segment reaches value;
2. useful Next Actions can be reached without maintaining a complex system;
3. users start actions, not only create plans;
4. LifeOS helps recovery after plans break;
5. Weekly Adapt produces user-confirmed useful changes;
6. recommendations improve with personal evidence/corrections;
7. trust and autonomy remain high.

## Primary metrics

- time to first useful Next Action;
- Next Action start rate;
- focus completion/outcome rate;
- clarity change;
- recommendation edit/reject/wrong-assumption rate;
- return after missed day;
- Weekly Reset completion;
- insight confirmation/correction rate;
- Meaningful Progress Days per WAU.
