# Component Inventory

## Authentication

| Component | Path | Purpose | Inputs/state/deps | Parent screens | Preserve/replace recommendation |
|---|---|---|---|---|---|
| Login | `components/Auth/Login.tsx` | Sign in form | local form state, `loginUser`, `useUser`, `navigate` | `/login` | Recreate; replace legacy response mapping |
| SignUp | `components/Auth/SignUp.tsx` | Registration form | local form state, regex validation, `signUpUser` | `/signup` | Recreate with RHF+Zod contracts |
| PasswordField | `components/Auth/PasswordFIeld.tsx` | Reusable password input with reveal | controlled value/onChange | login/signup | Recreate with RN secure input + reveal |
| LogOut | `components/Auth/LogOut.tsx` | Logout confirmation dialog | `AuthContext.removeUser` | `/me` | Recreate as action sheet/alert |

## Shared/navigation

| Component | Path | Notes | Recommendation |
|---|---|---|---|
| App shell | `App.tsx` | Auth gate + providers + header + bottom nav + local storage workout sync | Recreate architecture, but move to dedicated stores |
| Header | `components/Shared/Header.tsx` | Static route-title map + regex matching | Recreate with route-segment based titles |
| MainNavigation | `components/Shared/MainNavigation.tsx` | Fixed bottom icon nav, role-based admin tab visibility | Preserve UX with native tab bar |
| Logo/Copyright | `components/Shared/*` | Branding/footer | Optional preserve; footer less useful in mobile app |

## Exercises

| Component | Path | Inputs/deps | Reusable business logic | Recommendation |
|---|---|---|---|---|
| Exercises | `components/Exercises/Exercises.tsx` | optional `onExerciseClick`; `getAllExercises` | exercise list/search/selection mode | Recreate; split into list + picker variants |
| ExerciseEdit | `components/Exercises/ExerciseEdit.tsx` | route params, RHF, dropzone, compressor, image/exercise services | create/update flow + image upload ordering | Recreate; replace web image stack with Expo modules |
| ExerciseDetail | `components/Exercises/ExerciseDetail.tsx` | optional `exerciseId`; history service | rendering workout history tables | Recreate with contract-aligned history model |
| ExercisesWrapper | `components/Exercises/ExercisesWrapper.tsx` | outlet passthrough | none | Remove |

## Workouts

| Component | Path | Notes | Recommendation |
|---|---|---|---|
| Workout | `components/Workout/Workout.tsx` | state machine via booleans/context | Recreate with explicit workflow state |
| NoWorkout | `components/Workout/NoWorkout.tsx` | start draft with `crypto.randomUUID()` | Recreate |
| WorkoutInfo | `components/Workout/WorkoutInfo.tsx` | live timer interval + aggregate counts | Recreate |
| WorkoutSets | `components/Workout/WorkoutSets.tsx` | mutable nested updates, reference identity matching | Recreate and fix state model |
| WorkoutControls | `components/Workout/WorkoutControls.tsx` | finish/discard dialogs + submit | Recreate with safer submission handling |
| AddSetModal | `components/Workout/AddSetModal.tsx` | dynamic inputs by type | Recreate as native sheet/modal |
| ExerciseDetailModal | `components/Workout/ExerciseDetailModal.tsx` | embeds history screen in modal | Consider dedicated screen instead |
| Set / SetsTableHead | `components/Workout/Set.tsx`, `SetsTableHead.tsx` | table-row rendering by type | Replace table with RN list rows |
| End/Discard dialogs | `components/Workout/*Dialog.tsx` | confirm destructive actions | Recreate with native alerts |

## History/Profile/Admin

| Component | Path | Notes | Recommendation |
|---|---|---|---|
| Me | `components/User/Me.tsx` | profile + beta + calendar | Recreate (profile + history split) |
| WorkoutsCalendar | `components/User/WorkoutsCalendar.tsx` | calendar markers + date fetch, but no rendered workouts | Recreate with full day-detail UI |
| AdminUsers | `components/Admin/AdminUsers.tsx` | user admin list/delete | Recreate only if mobile app includes admin tools |
| Admin wrapper | `components/Admin/Admin.tsx` | outlet passthrough | Remove |

## Feedback/utility hooks

| Item | Path | Notes | Recommendation |
|---|---|---|---|
| `useGenericToast` | `hooks/useGenericToast.ts` | warning/error helper toasts | Recreate with mobile toast/snackbar helper |
| `useLocalStorage` | `hooks/useLocalStorage.ts` | direct browser localStorage | Replace with SecureStore/AsyncStorage abstraction |
| `useUser` | `hooks/userUser.ts` | parses JWT from localStorage | Replace with auth store + typed token claims |
| `useAuth` | `hooks/useAuth.ts` | currently unused | Remove/replace |

## Problematic patterns to preserve/fix

Preserve behavior: workout resumability, quick add-set UX, image-backed exercise cards, role-aware admin nav visibility.

Fix in rewrite:
- Nested state mutation and reference-identity lookup.
- Index-based React keys.
- Casts through `FieldValues` / unchecked assertions.
- Browser-only APIs (`window`, `localStorage`, `URL.createObjectURL`, `react-dropzone`, HTML table semantics).
- Business logic embedded in visual components (submit transforms, auth parsing).
