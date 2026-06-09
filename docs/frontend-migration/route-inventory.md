# Route Inventory (Legacy React Router -> Proposed Expo Router)

## Route table

| Legacy route record | Params | Access | Layout/parent | Page component | Main child components | Navigation entry points | Redirect behavior | API calls used by page | Local state/loading/error | User actions | Proposed Expo route |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/login` | none | Public | none | `Auth/Login.tsx` | `Logo`, `PasswordField`, `Copyright` | direct URL, App redirect, logout | none | `POST auth/signin` | `loading` state, toast on auth error | sign in, go to sign up, forgot password (toast only) | `/login` |
| `/signup` | none | Public | none | `Auth/SignUp.tsx` | `Logo`, `PasswordField` | direct URL, login CTA | none | `POST auth/signup` | form state + regex validation + toast | create account, back to login | `/signup` |
| `/` (index child of app) | none | Authenticated (token parse in `App.tsx`) | `App.tsx` (`Header`, `MainNavigation`, `Container`) | `Home.tsx` | Alert + CTA button | post-login navigate(`/`), home tab | `App.tsx` sends unauthenticated users to `/login` | none | no loader; static beta alert | start workout CTA | `/(authenticated)/index` |
| `/workout/*` | wildcard unused | Authenticated | `App.tsx` | `Workout.tsx` | `NoWorkout` OR `WorkoutInfo` + `WorkoutSets` + `WorkoutControls` | home CTA, bottom tab, direct URL | none | `POST workout` (finish), plus exercise/history calls from nested components | state from `WorkoutContext`; dialogs for discard/end | start workout, add exercise, add sets, finish/discard | `/(authenticated)/workout/index` |
| `/exercises` (parent) | none | Authenticated | `App.tsx` + `ExercisesWrapper` | `Exercises.tsx` (index) | list cards, search, add button | bottom tab, no-workout CTA | none | `GET exercise` | `loading`, search filter, empty state, toast on fetch error | open detail, create, select exercise (in workout mode) | `/(authenticated)/exercises/index` |
| `/exercises/new` | none | Authenticated | `App.tsx` + `ExercisesWrapper` | `ExerciseEdit.tsx` | dropzone, form fields | exercises page button | success path uses `navigate(-1)` | `POST image` (optional), `POST exercise` | form state via RHF; toast for upload/save errors; skeleton not needed unless edit | pick image, fill form, save | `/(authenticated)/exercises/new` |
| `/exercises/:id` | `id:number` | Authenticated | `App.tsx` + `ExercisesWrapper` | `ExerciseDetail.tsx` | history cards, set table | exercise list card | none | `GET workout-sets/exercise/:id` | `loading` flag; no robust error state | view history, navigate to edit | `/(authenticated)/exercises/[id]` |
| `/exercises/edit/:id` | `id:number` | Authenticated | `App.tsx` + `ExercisesWrapper` | `ExerciseEdit.tsx` | same as new | detail “Editar ejercicio” link | save uses `navigate(-1)` | `GET exercise/:id`, optional `POST image`, `PUT exercise/:id` | skeleton while loading current exercise | update exercise | `/(authenticated)/exercises/[id]/edit` |
| `/me` | none | Authenticated | `App.tsx` | `User/Me.tsx` | profile card, `LogOut`, `WorkoutsCalendar` | bottom tab, no-workout CTA | none | calendar child: `GET workout/days/:month/:year`, `GET workout/workouts/:date` | no hard loading states; calendar markers | logout, browse calendar, click day | `/(authenticated)/me/index` |
| `/admin` (parent) | none | Authenticated only at app level; no route guard for role | `App.tsx` + `Admin.tsx` | `AdminUsers` via index child | user list + delete dialog | admin tab visible only if token roles include admin/mod | none | `GET user`, `DELETE user/:id` | local `users`, dialog state, toast success/fail | delete non-admin users | `/(authenticated)/admin/index` |
| `/admin` index child | none | same as parent | `Admin.tsx` outlet | `AdminUsers.tsx` | same | direct `/admin` | none | same | same | same | `/(authenticated)/admin/index` |

## Detailed route notes

- `workout/*` uses wildcard but `Workout.tsx` defines no nested `<Routes>` or `<Outlet>`; wildcard is currently unnecessary.
- `ExercisesWrapper` and `Admin` are pass-through outlet wrappers only.
- `ExerciseEdit` depends on browser history (`navigate(-1)`), which is fragile in native stacks when opened from deep link/push notification.

## Unreachable/duplicate/loop audit

- **Duplicate routes:** none.
- **Redirect loops:** none observed.
- **Defined-but-unused records:** no direct route record is dead; wildcard suffix on `/workout/*` appears redundant.
- **Links to nonexistent routes:** `Login.tsx` uses `navigate('/signUp')` (capital U), but router path is `/signup`.
- **Role-gated navigation vs route protection mismatch:** `/admin` page is hidden in bottom nav for non-admin users, but route itself has no frontend guard; direct URL still attempts render.

## Browser-history dependent flows

- `ExerciseEdit` saves then calls `navigate(-1)`. Native rewrite should use explicit destination (`/exercises` or `/exercises/[id]`) instead of history pop.
