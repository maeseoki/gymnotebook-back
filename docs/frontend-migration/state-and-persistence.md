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

## Persisted values

| Key | Shape | Writer(s) | Reader(s) | Lifecycle | Cleanup | Risk | Migration recommendation |
|---|---|---|---|---|---|---|---|
| `token` | raw JWT string | `useUser.addUser` | `useUser`, `apiClient` interceptor | login -> all authenticated screens | logout/interceptor on 401/403 | stored in plain localStorage; XSS exposure; stale invalid token may persist | move to `Expo SecureStore`; keep decoded claims in memory store |
| `workout` | JSON serialized workout draft (`uuid,startDate,endDate?,workoutSets`) | `App.tsx` effect on every workout change | `App.tsx` initializer | start/resume workout | removed when draft null or success/discard | parse corruption not handled; shape drift; data loss on conflict branch | migrate to persisted workout-draft store with schema versioning |

## Current corruption/data-loss vectors

- `JSON.parse(savedWorkout)` has no try/catch fallback.
- Submission conflict (409 duplicate UUID) clears draft immediately.
- Nested object mutation before server confirmation.
- Reference-equality lookup for workout groups (`findIndex(workoutSet === currentWorkoutSet)`).
- Inconsistent set field names (`dropSet` vs `isDropSet`) across local/remote contexts.

## Future ownership model (recommended)

- **TanStack Query**
  - exercises list/detail
  - workout history pages
  - workouts-by-date and workout-day markers
  - current user profile/admin users
- **Zustand**
  - active workout draft (in-memory editing model)
  - auth session metadata (non-sensitive)
  - transient multi-screen wizard state
- **SecureStore**
  - JWT access token only
- **AsyncStorage or SQLite**
  - workout draft persistence
  - non-sensitive preferences
- **React Hook Form**
  - login/signup/exercise forms with shared contract validation
- **Expo Router**
  - route segments + deep-link-safe navigation state

## AsyncStorage vs SQLite for active workout draft

### Considerations
- Workout drafts can grow (many exercises + sets).
- Updates are frequent (often every set).
- Crash recovery should be robust.
- Future offline sync implies migration/versioning needs.

### Recommendation
Use **SQLite** for active workout drafts.

Rationale:
- Better durability and partial-update patterns than repeated full-JSON rewrites.
- Easier schema migrations/versioning as workout model evolves.
- Better path for future offline sync queues and conflict metadata.

Use AsyncStorage only for lightweight preferences/flags, not the canonical workout draft graph.
