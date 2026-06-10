# API Compatibility Audit (Legacy Frontend vs Fastify Contracts)

References used:
- `legacy/frontend-vite/src/services/*`
- `packages/contracts/src/*`
- `apps/api/src/**/http/*.routes.ts`
- `docs/migrations/*compatibility*.md`

## Compatibility matrix by frontend call

| Frontend service call | Legacy HTTP | New HTTP | Legacy request/response assumptions in frontend | New contract/behavior | Auth | Status | Required frontend migration |
|---|---|---|---|---|---|---|---|
| `loginUser` | `POST /api/auth/signin` | same | expects `{ accessToken, tokenType, roles }`; stores `accessToken` | returns `{ token, type, id, username, email, roles }` | public | **Incompatible** | map `token` field and align with mobile auth architecture |
| `signUpUser` | `POST /api/auth/signup` | same | sends `{ username, email, password }` | strict schema rejects unknown fields; returns 201 message | public | Compatible with caveats | keep payload minimal; map standardized error shape (`code`) |
| `verifyUser` | `GET /api/auth/verifyuser/...` (frontend assumption) | actual new endpoint: `GET /api/user/verifyuser/:username/:email` + query variant | currently unused; wrong service path uses `auth` prefix | user route (authenticated) | auth | **Incompatible + unused** | if revived, move to `/api/user/verifyuser` query endpoint |
| `logoutUser` | `GET /api/auth/logout` | same | expects message | stateless compatibility message | public | Compatible (unused) | optional; local token removal remains required |
| `getAllUsers` | `GET /api/user` | same | frontend type expects `roles: [{id,name}]` | new response `roles: ERole[]` | admin/mod | **Incompatible typing** | replace local `userResponse` with contract `UserResponse`; update role checks |
| `deleteUser` | `DELETE /api/user/:id` | same path, status changed | frontend assumes success no body | returns `204` no body; new `cannot_delete_self`/`cannot_delete_last_admin` errors | admin | Mostly compatible | handle 204 explicitly and branch on error codes |
| `getAllExercises` | `GET /api/exercise` | same | expects list of exercise objects | same response shape with deterministic ordering | auth | Compatible | switch local type to contract `ExerciseResponse` |
| `getExercise` | `GET /api/exercise/:id` | same | expects exercise object | same shape; ownership failures unified as 404 | auth | Compatible with behavior change | treat 404 as not-found/forbidden-equivalent |
| `createExercise` | `POST /api/exercise` | same path, response changed | frontend expects void | returns created `ExerciseResponse` (201) | auth | Compatible with mismatch | consume response optionally; keep strict payload fields only |
| `updateExercise` | `PUT /api/exercise/:id` | same | frontend expects body (already okay) | returns updated `ExerciseResponse` (200) | auth | Compatible | ensure strict body (no unknown props) |
| `deleteExercise` | `DELETE /api/exercise/:id` | same | no body expected | returns 204; may return `409 exercise_in_use` | auth | Compatible with new conflict | show user-facing conflict handling |
| `uploadImage` | `POST /api/image` | same | frontend expects numeric id directly | now returns `{ id }`; strict type/format checks (jpeg/png/webp) | auth | **Incompatible** | parse `response.id`; enforce allowed file formats |
| `getImage/getImageAsUrl` | `GET /api/image/:id` | same | expects blob/public URL | still public; now safer headers + standardized 404 | public | Compatible | keep fallback handling |
| `saveWorkout` | `POST /api/workout` | same | sends full nested exercise object in `workoutSet.exercise`; Date objects serialized | contract requires strict `exercise: { id }`; strict ISO with offset/Z; nonnegative integer measures | auth | **Incompatible (critical)** | map local draft to request contract and validate before submit |
| `getWorkoutDaysForMonth` | `GET /api/workout/days/:month/:year` | same + timezone support | no timezone query | supports optional `timezone`; returns local day numbers based on timezone | auth | Compatible with enhancement | send user timezone for correctness |
| `getWorkoutsByDate` | `GET /api/workout/workouts/:date` | same path with stricter param | frontend sends ISO datetime via `toISOString()` | new route requires strict `YYYY-MM-DD`; optional timezone query | auth | **Incompatible** | send date-only param and timezone query |
| `getWorkoutSetsByExerciseId` | `GET /api/workout-sets/exercise/:id?page&size&sort` | same path, query changed | uses `size` + `sort` and expects legacy pageable response and `dropSet` field | contract now uses `page,pageSize,sortBy,sortDirection`; response pagination fields changed; set field is `isDropSet` | auth | **Incompatible** | update query params and response mappers/types |

## Critical migration notes (decided)

### Editable workout state must not be request contract state

Do not use `CreateWorkoutRequest` as live editable UI state.

Use local draft models (`DraftWorkout`, `DraftWorkoutGroup`, `DraftSet`) for editing, then map explicitly before network submission.

### Required mapper behavior before `POST /api/workout`

`DraftWorkout -> mapper -> CreateWorkoutRequest -> shared Zod validation -> API call`

Mapper requirements:
- remove UI-only fields;
- map exercises to `{ id }`;
- normalize timestamps to valid ISO with offset or `Z`;
- parse/validate integer measurements;
- set final workout/group timestamps per product rule;
- validate with shared request schema before request dispatch.

### Offline/auth interaction constraint

Auth expiration or temporary auth loss must not clear active/finished-unsynced workout drafts. Draft status should transition to auth/network waiting states and retry once conditions recover.

## Local frontend types that should be replaced by contracts

- Auth: `LoginRequest`, `LoginResponse`, `SignUpRequest`, `SignUpResponse`, `VerifyUser*`, `LogoutResponse`
- Exercises: `ExerciseType`, `ExerciseTypeUpdate`, enums
- Workouts/history responses: `SetResponse`, `WorkoutSetResponse`, `WorkoutSetsPageResponse`, pagination interfaces
- User/admin: `userResponse`, role enums

Recommended migration: import directly from `@gymnotebook/contracts` and keep UI-only view-models separate.
