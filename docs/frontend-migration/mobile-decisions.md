# Mobile Architecture Decisions (Authoritative)

This document records product and architecture decisions already made for the Expo rewrite. When any migration document conflicts with this file, this file is the source of truth.

Related: [Mobile authentication architecture](./mobile-authentication.md)

## Product direction

- The new frontend is a **native mobile app** built with **Expo + React Native**.
- The app must support **Android and iOS from one codebase**.
- Android may be exercised first during development, but architecture must avoid Android-only assumptions.
- Web support is not a first-release priority.
- `legacy/frontend-vite` is a read-only functional/visual reference.
- Mobile admin-user management is out of initial scope.
- Password recovery is deferred until backend support exists.
- Monetization/subscriptions/store billing are out of initial scope.
- Push notifications are out of initial scope.
- Biometric unlock is not required initially, but authentication design must allow adding it later.
- Exercise images must support **gallery selection and camera capture**.

## Main navigation decision

Primary tabs for initial release:

1. Home
2. Workout
3. Exercises
4. History
5. Profile

Administrative functionality, if added later, should be accessed from Profile rather than occupying a permanent main tab.

## Offline-first requirement (active workout)

Offline-first behavior for the active workout is a core requirement.

Required behavior:

1. User can start a workout offline when required exercise data already exists locally.
2. User can add exercises and sets while offline.
3. Active workout survives navigation, app switching, Android process termination, app restart, temporary network loss, and access-token expiration.
4. Submission failure must not clear the active draft.
5. Finishing marks local draft as ready for submission.
6. Submission is attempted when connectivity exists.
7. Draft removal normally occurs only after successful server acknowledgement.
8. Duplicate UUID responses must not silently discard workouts.
9. Authentication expiry must not delete/corrupt workout draft.
10. User-visible draft states must include:
   - in progress
   - finished locally
   - waiting for authentication
   - waiting for connectivity
   - submitting
   - failed and retryable
   - successfully synchronized

`successfully synchronized` may be implemented as a short-lived UI feedback state. It does not need to be part of the persisted `PersistedWorkoutDraft.status` union.

After server acknowledgement, the app should show success feedback and then remove the persisted draft as the normal completion path. If the app crashes after acknowledgement but before local cleanup, recovery must remain safe by relying on workout UUID duplicate protection and explicit retry/recovery handling (no silent discard).

Initial release scope note: this requirement is specific to active-workout creation/edit/finish/submission. A general offline sync engine for every feature is not required in v1.

## Local persistence decision (initial)

Initial persisted workout-draft stack:

- Zustand
- Zustand persist middleware (or equivalent explicit adapter)
- AsyncStorage
- Zod validation

**Decision:** AsyncStorage is the canonical persisted store for the active-workout draft in initial release.
- **AsyncStorage Key:** `gymnotebook.mobile.v1.activeWorkout`
- **Draft Schema Version:** `1`
- **Units:**
  - Local draft weight: grams (`weightGrams`). Displayed as kilograms in the UI (converted by `weightGrams / 1000`, supporting up to 3 decimal places without silent rounding).
  - UI weight: kg. Prefilled from and converted back to grams on save.
  - Backend weight: grams (`CreateWorkoutRequest.workoutSets[].sets[].weight = weightGrams`).
  - Time: seconds (`timeSeconds`).
  - Distance: meters (`distanceMeters`).
  - Reps: count (`reps`).
- **Save behavior:** Empty exercises (zero sets) are filtered out. Empty workouts (zero exercises or zero sets across all exercises) are blocked and cannot be finished or saved. Saving successfully clears the draft, and saving failure preserves the draft.
- **Known Limitations / Deferred features:** Confetti feedback on success, multiple active drafts/history/calendar sync queues, custom templates, charts, and timers are deferred to future phases.

Do not describe AsyncStorage as cache storage.

### Persisted draft envelope (documentation pseudocode)

```ts
type PersistedWorkoutDraft = {
  schemaVersion: number;
  localId: string;
  workoutUuid: string;
  status:
    | 'active'
    | 'finished'
    | 'waiting_for_auth'
    | 'waiting_for_network'
    | 'submitting'
    | 'failed';
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  retryCount: number;
  lastSubmissionAttemptAt: string | null;
  lastSubmissionErrorCode: string | null;
  workout: DraftWorkout;
};
```

This pseudocode is documentation-only and not a locked implementation contract.

### Restoration rules

On startup:

1. Read persisted draft.
2. Parse JSON safely.
3. Validate with versioned Zod schema.
4. Run documented migrations when stored version is older.
5. If recovery is impossible, preserve raw data for diagnostics where practical and offer recovery/reset choice.
6. Malformed persisted data must never crash the app.

### Write behavior

- Persist after each meaningful workout mutation.
- Use short debounce to avoid excessive writes.
- Flush immediately after: start workout, add/confirm set, finish workout, sync-status change, successful acknowledgement.
- Use immutable updates and stable local IDs for workout groups/sets.
- Do not use array indexes or object-reference equality as identifiers.

### Future SQLite trigger

Reconsider SQLite when requirements include one or more of:

- multiple pending workouts;
- durable general synchronization queue;
- partial/queryable local workout history;
- large local datasets;
- transactional updates across several offline entities;
- conflict resolution across multiple devices.

Do not introduce SQLite in anticipation of those future requirements.

## Editable draft model separation

The mobile app must not use `CreateWorkoutRequest` directly as editable UI state.

Conceptual editable models:

- `DraftWorkout`
- `DraftWorkoutGroup`
- `DraftSet`

These local models may include stable local IDs, incomplete editing values, raw text before numeric parsing, local timestamps, sync metadata, and validation state.

Submission pipeline:

`DraftWorkout -> explicit mapper -> CreateWorkoutRequest -> shared Zod validation -> API request`

Mapper responsibilities:

- remove UI-only fields;
- map exercise references to `{ id }`;
- normalize timestamps to valid ISO strings with offset or `Z`;
- parse/validate integer measurements;
- set final workout/group timestamps per selected product rules;
- validate with shared request schema before request dispatch.

## Mobile authentication dependency

Mobile auth must not reuse legacy localStorage assumptions. Target model requires short-lived access token + rotating refresh token + revocable server-side sessions.

Details: [mobile-authentication.md](./mobile-authentication.md)

## Future identity providers

Architecture must allow later Google/Apple sign-in support (Authorization Code + PKCE), provider identity linking, and backend-issued GymNotebook session tokens; provider tokens are not GymNotebook API access tokens.

## Image replacement lifecycle decision

Creating or replacing exercise images must follow safe two-step API sequencing to avoid accidental loss and minimize orphaned uploads:

- upload first, then apply reference,
- never delete previous image before successful exercise update,
- attempt cleanup on failure paths and report orphan-cleanup failures.

See [browser-specific-dependencies.md](./browser-specific-dependencies.md) and [user-workflows.md](./user-workflows.md).
