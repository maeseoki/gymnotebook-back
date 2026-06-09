# Defects and Technical Debt

| Category | Source location | Issue | Impact | Must fix in Expo rewrite? | Recommended behavior |
|---|---|---|---|---|---|
| Functional defect | `Login.tsx` | Link uses `/signUp` but route is `/signup` | Broken navigation path | Yes | Normalize route constants |
| API incompatibility | `authService.ts`, `Login.tsx` | Expects `accessToken`; new API returns `token` | Login fails against new backend | Yes | Use contract types + mapper |
| API incompatibility | `imageService.ts`, `ExerciseEdit.tsx` | Expects numeric upload response; backend returns `{id}` | Image ID becomes invalid object | Yes | Parse response object |
| API incompatibility | `workoutService.ts` + workout draft shape | Posts full exercise object in workout sets | Strict request validation failure | Yes | Transform to `{ exercise: { id } }` |
| API incompatibility | `workoutSetService.ts` + `ExerciseDetail.tsx` | Uses `size/sort` query and `dropSet` field | History request/visual mismatch | Yes | Use new query + `isDropSet` |
| API incompatibility | `workoutService.ts` + `WorkoutsCalendar.tsx` | Sends ISO datetime to date-only endpoint | 400 validation failures | Yes | Send `YYYY-MM-DD` + timezone |
| Data-loss risk | `WorkoutControls.tsx` | Clears workout on duplicate UUID conflict | User loses unfinished workout | Yes | Keep draft and offer retry/duplicate resolution |
| Data-loss risk | `App.tsx` | `JSON.parse` without guard for persisted workout | Crash or unusable app state | Yes | Safe parse + schema validation + fallback recovery |
| Maintainability issue | `WorkoutSets.tsx` | Reference equality used as workout group identity | Fragile updates, hard-to-debug bugs | Yes | Stable IDs per workout group |
| Maintainability issue | `WorkoutSets.tsx`, `ExerciseDetail.tsx` | Index-based keys | Render instability when order changes | Yes | Use stable IDs/uuid keys |
| Maintainability issue | `ExerciseEdit.tsx` | `FieldValues` and casts bypass strong typing | Runtime shape bugs | Yes | Use typed form schema inferred from contracts |
| Maintainability issue | `main.tsx` vs rest of app | React Query installed but bypassed | duplicated fetch logic/cache misses | Yes | Move server state to Query hooks |
| Mobile UX issue | `ExerciseEdit.tsx`, `AddSetModal.tsx` | Web dropzone/text numeric fields | poor native input UX | Yes | Native picker, numeric keyboards |
| Mobile UX issue | `ExerciseEdit.tsx` | `navigate(-1)` dependency | unpredictable back navigation | Yes | Explicit destination routes |
| Security issue | `useLocalStorage.ts` token storage | JWT stored in localStorage | higher token theft risk in web context | Yes (in mobile architecture) | SecureStore token storage |
| Performance issue | multiple components | Imperative fetches without caching/retry policy | repeated network calls, weak offline UX | Yes | TanStack Query with sensible retry policies |
| Accessibility issue | many icon buttons | limited explicit accessibility labels beyond nav | weaker screen-reader support | Yes | Add accessibility labels/roles in native components |
| Functional defect | `WorkoutsCalendar.tsx` | month/year arguments swapped in `onActiveStartDateChange` | wrong days API query | Yes | Fix parameter order and add tests |
| Maintainability issue | `ExerciseEdit.tsx` image flow | replacing image can orphan previous uploaded image | storage leakage risk | Yes | add explicit image replace/delete lifecycle |
