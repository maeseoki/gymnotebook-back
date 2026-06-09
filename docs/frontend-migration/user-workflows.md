# User Workflows

## 1) Authentication

### Sign in
- **Entry:** `/login`
- **Preconditions:** none
- **Actions:** fill username/password -> submit
- **State changes:** `loading=true`; token stored in `localStorage[token]` via `useUser`
- **API:** `POST /api/auth/signin`
- **Success:** navigate `/`; app shell loads
- **Failure:** error toast
- **Legacy defects:** frontend expects `accessToken` but new API sends `token`
- **Expo recommendation:** typed auth client; normalize token response; SecureStore persistence; auto-redirect if session exists

### Sign up
- **Entry:** `/signup`
- **Actions:** fill form -> regex validation -> submit
- **API:** `POST /api/auth/signup`
- **Success:** toast + navigate `/login`
- **Failure:** toast
- **Legacy defects:** client-only regex diverges from backend schema
- **Expo recommendation:** use shared Zod contracts + RHF resolver

### Session persistence/logout/expired token
- **Persistence:** raw JWT in `localStorage[token]`
- **Bootstrapping:** `useUser` parses token each render; expired token returns `user=null`
- **Logout:** removes token, navigate `/login`
- **Expired/401:** axios interceptor removes token and hard redirects `window.location.href='/login'`
- **Legacy defects:** stale/invalid token may remain until request; hard page reload
- **Expo recommendation:** central auth store, interceptor-driven sign-out, router reset without hard reload

---

## 2) Exercise management

### List exercises
- **Entry:** `/exercises` or workout add mode
- **API:** `GET /api/exercise`
- **UI:** skeleton -> cards/empty state
- **Failure:** toast

### Open detail
- **Entry:** card click
- **API:** `GET /api/workout-sets/exercise/:id`
- **Success:** historical set tables
- **Failure:** currently poorly surfaced

### Create exercise
1. Enter `/exercises/new`.
2. Optional image selection/drop + compression.
3. Submit -> upload image first.
4. Submit exercise payload with optional `imageId`.
5. Navigate back on success.

- **APIs:** `POST /api/image`, `POST /api/exercise`
- **Defects:** image upload response shape incompatible (`{id}` vs number)

### Edit exercise
- **Entry:** `/exercises/edit/:id`
- **API:** `GET /api/exercise/:id`, optional image upload, `PUT /api/exercise/:id`
- **Defects:** navigate(-1) fragile

### Delete exercise
- UI currently not implemented in routed pages.
- Backend now can return `409 exercise_in_use`; migration should design explicit delete flow and conflict messaging.

### Exercise history/progress
- Accessed in detail page and workout modal.
- Uses legacy pagination params and legacy `dropSet` field assumptions.

---

## 3) Workout flow (detailed)

1. **Start workout**
   - Entry: `/workout` -> `NoWorkout` -> start button.
   - Local change: create draft `{ uuid, startDate }`.

2. **Resume local workout**
   - App boot loads `localStorage[workout]` JSON into context state.

3. **Add exercises**
   - Tap “Añadir ejercicio” -> switches to exercises selector mode.
   - Selecting exercise appends new workout group with empty set array.

4. **Add workout groups**
   - Repeating step 3 appends additional groups.

5. **Add individual sets**
   - Per workout group card -> “Añadir Serie” opens modal.

6. **Enter reps/weight/time/distance**
   - Fields shown conditionally by exercise type.

7. **Mark drop set**
   - Toggle switch in modal.

8. **Record timestamps**
   - Each set gets `startDate: new Date()` at modal accept.
   - Group/workout end dates mostly unset until finish.

9. **Navigate between sections**
   - Scroll list of cards; open exercise history modal optionally.

10. **Finish workout**
   - Open end dialog -> confirm.
   - Mutates `workout.endDate = new Date()`.

11. **Submit workout**
   - API call `POST /api/workout`.

12. **Handle duplicate UUID/network failure**
   - 409 shows duplicate message, then clears workout anyway.
   - Other errors show generic message and closes dialog.

13. **Preserve unfinished workout on app close**
   - App-level `useEffect` syncs workout context to `localStorage` on every change.

14. **Clear local workout after success**
   - `setWorkout(null)` and remove local storage key.

### Current data-loss/corruption risks
- Direct object mutation (`workout.endDate = ...`) before API result.
- `setWorkout(null)` on duplicate UUID conflict (drops draft without recovery).
- Identity by reference in `WorkoutSets` (`findIndex(workoutSet === currentWorkoutSet)`).
- Array-index React keys for sets and workout cards.
- No retry/offline queue for submit.
- Local storage parse has no corruption recovery path.

### Recommended Expo behavior
- Immutable updates and deterministic IDs per workout group/set.
- Autosave transactional draft store (SQLite recommended).
- Explicit retry queue for failed submissions.
- Preserve draft on 409 until user resolves conflict.

---

## 4) History/calendar workflow

- **Entry:** `/me`
- **Flow:** load month markers -> browse month -> select date -> fetch workouts-by-date
- **Current result:** selected-day workouts are only `console.log` output; no rendered list
- **Pagination:** history pagination currently implemented for exercise history endpoint only
- **Defects:** month/year argument order bug in `onActiveStartDateChange`; strict new API date format mismatch
- **Expo recommendation:** native calendar + rendered daily workout list with nested groups/sets and navigation to exercise history

