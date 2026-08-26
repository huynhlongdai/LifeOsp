# LifeOS Domain Model V1

**Status:** ACTIVE  
**Source:** Meetings #009–#012  
**Updated:** 2026-08-26

This model defines the minimum shared vocabulary for MVP engineering. It is intentionally smaller than the full long-term LifeOS ontology.

## 1. Aggregate map

```text
User
 ├─ UserProfile
 ├─ NeedState
 ├─ Direction
 │   └─ Season
 │       └─ Outcome
 │           └─ Project
 │               └─ Action
 ├─ Capture
 │   └─ promoted → Direction / Project / Action / IncubatorItem
 ├─ FocusSession → Action
 ├─ DailyClose
 ├─ Recommendation → RecommendationEvidence
 ├─ Insight
 ├─ UserMemory
 ├─ OperatingPreference
 └─ LifeEvent
```

`Relation` is used for typed cross-links when a direct foreign key is not sufficient for product semantics.

## 2. UserProfile

Purpose: explicit user-provided context, not inferred personality.

Candidate fields:
- id
- userId
- displayName
- timezone
- locale
- onboardingState
- createdAt
- updatedAt

Do not store psychological labels as profile facts.

## 3. NeedState

Represents the current immediate problem the user wants help with.

Initial enum:
- `unclear_direction`
- `dont_know_what_to_do`
- `overloaded`
- `procrastinating`
- `abandoning_goals`
- `rebalance_life`
- `learning_not_applying`
- `other`

NeedState is contextual and may change; it is not a permanent persona.

## 4. Direction

A user-confirmed high-level orientation.

Fields:
- id
- userId
- title
- description
- status: `draft | active | inactive`
- sourceCaptureId?
- confirmedAt?
- createdAt
- updatedAt

Rule: AI may propose but not activate a Direction without user confirmation.

## 5. Season

A bounded period of intentional focus.

Fields:
- id
- userId
- directionId?
- title
- purpose
- startsOn?
- targetEndsOn?
- status: `draft | active | paused | completed | abandoned`
- primaryFocusText?
- createdAt
- updatedAt

Invariant: MVP supports at most one active primary Season per user unless a later decision changes this.

## 6. Outcome

A result the user wants to make true during a Season.

Fields:
- id
- userId
- seasonId?
- title
- successDefinition?
- status: `active | achieved | paused | dropped`
- priority?
- createdAt
- updatedAt

Avoid turning every aspiration into an Outcome automatically.

## 7. Project

A bounded body of work supporting an Outcome.

Fields:
- id
- userId
- outcomeId?
- title
- description?
- status: `candidate | active | paused | completed | dropped`
- priority?
- createdAt
- updatedAt

`candidate` allows captured possibilities without treating them as commitments.

## 8. Action

The executable unit surfaced by NOW.

Fields:
- id
- userId
- projectId?
- outcomeId?
- title
- doneCondition?
- estimatedMinutes?
- status: `candidate | ready | active | completed | partial | postponed | blocked | dropped`
- priority?
- blockedReason?
- scheduledFor?
- createdAt
- updatedAt
- completedAt?

Quality contract:
- concrete enough to start without another planning session;
- observable done condition where possible;
- realistically sized;
- linked to user-confirmed context when recommendation-generated.

## 9. Capture

Immutable original user input plus processing status.

Fields:
- id
- userId
- kind: `text | voice_transcript | quick_note | distraction`
- rawText
- processingStatus: `unprocessed | interpreted | corrected | promoted | archived`
- createdAt

Rule: preserve `rawText`; interpretation never overwrites the original.

## 10. Capture interpretation

For V1, interpretation may be stored as versioned structured JSON associated with the Capture before promotion.

Suggested categories:
- concerns
- ideas
- commitments
- possibleProjects
- possibleDirections
- questions
- uncertainties

Each item should preserve:
- label/text
- category
- confidence class or uncertainty flag
- source span/reference when feasible
- user correction state

Once promoted into a domain object, the new object receives its own ID and a relation/event back to the Capture.

## 11. IncubatorItem

Protects focus without losing ideas.

Fields:
- id
- userId
- sourceCaptureId?
- title
- notes?
- kind: `idea | project_candidate | someday | reference`
- status: `incubated | promoted | archived`
- revisitOn?
- createdAt
- updatedAt

Not Now is a successful state, not a failure bucket.

## 12. FocusSession

Fields:
- id
- userId
- actionId?
- startedAt
- endedAt?
- plannedMinutes?
- actualMinutes?
- status: `active | completed | interrupted | abandoned`
- resultNote?

A FocusSession does not imply Action completion.

## 13. DailyClose

Fields:
- id
- userId
- date
- meaningfulProgressText?
- frictionCode?
- frictionNote?
- energy?
- mood?
- note?
- createdAt

Keep optional fields optional. Daily Close should remain lightweight.

## 14. Recommendation

Fields:
- id
- userId
- kind: `next_action | direction | friction_intervention | weekly_adjustment`
- title
- rationale
- confidenceClass: `direct | strong_pattern | possible_pattern | suggestion`
- status: `draft | shown | accepted | edited | rejected | not_now | wrong_assumption`
- proposedEntityType?
- proposedEntityPayload?
- createdAt
- shownAt?
- resolvedAt?

## 15. RecommendationEvidence

Fields:
- id
- recommendationId
- evidenceType
- entityType?
- entityId?
- label
- valueJson
- strength: `direct | strong | supporting | tentative`
- createdAt

Evidence is compact and user-explainable. Do not store hidden chain-of-thought.

## 16. Insight

Fields:
- id
- userId
- title
- description
- confidenceClass: `strong_pattern | possible_pattern | suggestion`
- status: `candidate | shown | confirmed | corrected | rejected`
- evidenceSummaryJson
- createdAt
- resolvedAt?

An Insight can lead to an OperatingPreference only through explicit admission logic.

## 17. OperatingPreference

A durable product behavior rule accepted or strongly established for the user.

Fields:
- id
- userId
- key
- valueJson
- source: `explicit_user | confirmed_insight | system_default`
- status: `active | disabled`
- createdAt
- updatedAt

Examples:
- `next_action.target_max_minutes = 45`
- `projects.max_primary_active = 2`
- `recommendations.resize_after_postpones = 3`

## 18. UserMemory

Durable contextual memory separate from raw history.

Classes:
- explicit profile fact
- confirmed contextual fact
- confirmed operating context

Fields:
- id
- userId
- memoryType
- key?
- content
- sourceEntityType?
- sourceEntityId?
- status: `active | superseded | deleted`
- createdAt
- updatedAt

Not every Capture becomes memory.

## 19. Relation

Typed semantic edge for cross-object context.

Fields:
- id
- userId
- fromType
- fromId
- relationType
- toType
- toId
- metadataJson?
- createdAt

Initial relation types may include:
- `supports`
- `derived_from`
- `blocks`
- `depends_on`
- `supersedes`
- `evidence_for`

Do not use Relation when a normal required foreign key expresses the relationship better.

## 20. LifeEvent

Append-only behavioral/audit history.

Fields:
- id
- userId
- type
- occurredAt
- source: `user | system | ai | import`
- entityType?
- entityId?
- payloadJson
- correlationId?
- causationId?

Initial event families:
- capture.*
- direction.*
- season.*
- project.*
- action.*
- recommendation.*
- focus.*
- distraction.*
- daily_close.*
- insight.*
- preference.*

## 21. Derived features are not primary truth

Examples:
- completion rate by duration bucket
- postpone count
- start latency
- plan/actual duration error
- active-project load
- recent focus completion rate

They may be computed views/materialized summaries/cached rows later. Do not store them as immutable personal truths.

## 22. Ownership invariant

Every private domain object is scoped to exactly one `userId` in MVP. Cross-user/shared objects are out of scope until collaborative features are intentionally designed.

Server-side repositories/services enforce ownership; the client cannot choose arbitrary `userId` to query.

## 23. Deletion/supersession

Operational current-state records may be soft-deleted/archived where product history matters.

LifeEvents remain append-only but privacy deletion requirements can require deleting/anonymizing user data at account deletion; append-only is an application-history rule, not an excuse to violate deletion obligations.

## 24. Schema evolution rule

Coding agents must not add:
- new top-level life domains;
- psychological trait fields;
- autonomous-agent permissions;
- new permanent statuses;
- opaque score columns;
without a product/domain decision.

Small implementation fields such as indexes, timestamps, version columns or normalized storage helpers may be added when they preserve these semantics.
