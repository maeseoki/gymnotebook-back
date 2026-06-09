# State and Persistence Inventory

## Current state ownership

| State category | Current owner | Notes |
|---|---|---|
| Authentication state | `useUser` + `AuthContext` | derived from localStorage token each render |
| Workout draft state | `WorkoutContext` + `App.tsx` | persisted to localStorage key `workout` |
| Server state | mostly component local state | React Query installed but not used for fetches/mutations |
| Form state | local `useState` or RHF (`ExerciseEdit`) | mixed patterns |
| UI state | per-component `useState`/`useDisclosure` | modal/dialog toggles |
| Derived state | computed inline (`filteredExercises`, set counts, timers) | no memoization strategy |
| URL/navigation state | React Router | includes history-dependent `navigate(-1)` |

## React Query usage

- QueryClient configured in `main.tsx` with retries disabled and staleTime 5m.
- No `useQuery` or `useMutation` calls found in legacy frontend.
- Server state is entirely fetched imperatively (`useEffect` + services), bypassing cache invalidation patterns.

## Persisted values (legacy)

| Key | Shape | Writer(s) | Reader(s) | Lifecycle | Cleanup | Risk | Migration recommendation |
|---|---|---|---|---|---|---|---|
| `token` | raw JWT string | `useUser.addUser` | `useUser`, `apiClient` interceptor | login -> all authenticated screens | logout/interceptor on 401/403 | stored in plain localStorage; stale token behavior | move to SecureStore-backed mobile auth/session flow |
| `workout` | JSON serialized workout draft (`uuid,startDate,endDate?,workoutSets`) | `App.tsx` effect on every workout change | `App.tsx` initializer | start/resume workout | removed when draft null or success/discard | parse corruption not handled; shape drift; duplicate conflict clears draft | migrate to versioned persisted draft in Zustand + AsyncStorage + Zod |

## Current corruption/data-loss vectors

- `JSON.parse(savedWorkout)` has no try/catch fallback.
- Submission conflict (409 duplicate UUID) clears draft immediately.
- Nested object mutation before server confirmation.
- Reference-equality lookup for workout groups (`findIndex(workoutSet === currentWorkoutSet)`).
- Inconsistent set field names (`dropSet` vs `isDropSet`) across local/remote contexts.

## Mobile target ownership model (decided)

- **TanStack Query**: exercise/history/profile server state and offline-aware fetch status.
- **Zustand**: auth state machine metadata, editable active-workout draft, transient workflow UI state.
- **SecureStore**: refresh token and other sensitive credentials.
- **AsyncStorage**: canonical persisted active-workout draft envelope in initial release.
- **Zod**: versioned persisted-draft validation + migration guard rails.
- **React Hook Form**: forms with contract-aware validation.
- **Expo Router**: public/authenticated route groups + explicit destinations.

## Offline-first active workout behavior (decided)

The active-workout flow must work without network coverage and preserve data across app interruptions and auth expiry.

Required draft statuses:

- `active`
- `finished`
- `waiting_for_auth`
- `waiting_for_network`
- `submitting`
- `failed`
- (UI may additionally surface a synchronized/success state after acknowledgement)

Draft removal normally happens only after successful server acknowledgement.

## Persisted draft envelope (documentation pseudocode)

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

This is pseudocode for direction only.

## Restoration and write rules (decided)

### On startup

1. Read persisted draft.
2. Parse JSON safely.
3. Validate with versioned Zod schema.
4. Migrate when stored schema is older.
5. If recovery fails, keep raw payload for diagnostics where practical and present recovery/reset choice.
6. Never let malformed persisted data crash the whole app.

### Write strategy

- Persist after each meaningful workout mutation.
- Debounce short-interval writes.
- Force immediate flush on critical transitions (start/add-confirm set/finish/status change/server success).
- Use immutable updates.
- Use stable local IDs for groups and sets.
- Never identify groups/sets by array index or object-reference equality.

## Local draft model vs API contract (decided)

Editable state must use local draft models (`DraftWorkout`, `DraftWorkoutGroup`, `DraftSet`) rather than `CreateWorkoutRequest`.

Local draft models may include:

- stable local IDs;
- incomplete values while editing;
- text input values before numeric parsing;
- local timestamps;
- synchronization metadata;
- validation state.

Submission path:

`DraftWorkout -> mapper -> CreateWorkoutRequest -> shared schema validation -> API request`

## Future SQLite trigger (not now)

Revisit SQLite when requirements evolve to multiple pending workouts, durable multi-entity sync queues, queryable local history, very large datasets, transactional cross-entity updates, or multi-device conflict resolution.
