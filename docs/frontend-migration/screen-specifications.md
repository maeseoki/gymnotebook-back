# Screen Specifications (Legacy SPA)

This section covers every user-visible routed page and modal/dialog.

## Routed screens

### 1) Login (`/login`)
- **Source:** `components/Auth/Login.tsx`
- **Purpose:** authenticate user and store JWT.

**Layout (top -> bottom)**
1. Centered container (`maxW=lg`) with vertical padding.
2. Logo SVG.
3. Title `The Gym Notebook`.
4. Subtitle + CTA to sign up.
5. Card-like form block (`gray.900`, rounded, shadow).
6. Username input.
7. Password field with reveal toggle.
8. “Forgot password” link-style button.
9. Full-width submit button with loading text.
10. Copyright footer.

**Behavior**
- Initial: empty form.
- Submit: sets loading, calls login API.
- Success: stores token via `useUser.addUser`, navigates `/`.
- Failure: error toast (“usuario o contraseña incorrectos”).
- No redirect-away if already authenticated.

**Data/API**
- POST `auth/signin`.
- Expects legacy `accessToken` field (currently incompatible with new API token field).

**Mobile considerations**
- Good one-column structure.
- Keyboard overlap handling not explicit.
- Touch targets acceptable.
- Can adopt native secure text input + autofill hints.

---

### 2) Sign Up (`/signup`)
- **Source:** `components/Auth/SignUp.tsx`
- **Purpose:** create account.

**Layout** mirrors login with username/email/password form.

**Behavior**
- Inline regex validation for username/email/password.
- Submit -> loading -> signup API.
- Success -> navigate `/login` and success toast.
- Failure -> toast from axios error message.

**Data/API**
- POST `auth/signup`.

**Mobile considerations**
- Email keyboard should be explicit in RN.
- Password requirements should be shown persistently, not only toast.

---

### 3) Home (`/`)
- **Source:** `components/Home/Home.tsx`
- **Purpose:** welcome/beta warning and workout entry CTA.

**Layout**
1. Full-width warning alert with icon.
2. Personalized title using username from context.
3. Beta text.
4. CTA button -> `/workout`.

**Behavior:** static; no API.

---

### 4) Workout Root (`/workout/*`)
- **Source:** `app/(authenticated)/(tabs)/workout.tsx`
- **Purpose:** active workout flow or start prompt, and draft resume management.

**States**
- `workout == null`: render `NoWorkout` start screen.
- `workout !== null && !isEditing`: render explicit `Resume/Summary` screen.
- `workout !== null && isEditing`: render active workout dashboard form.
- `isAddingExercise == true`: render `Exercises` selector mode.

#### 4A) NoWorkout state
- Start button creates workout draft with UUID and `startedAt` timestamp, transitioning immediately to the active workout editor (`isEditing = true`).
- Secondary CTAs to exercises and profile.

#### 4B) Resume/Summary state (New Active Workout UX)
- Renders when a local draft is restored on component mount.
- Displays Title: "Entrenamiento en curso".
- Subtitle: "Tienes un entrenamiento sin finalizar."
- Summary Card showing: number of exercises, total sets, started date/time, and last updated date/time.
- Primary CTA: "Continuar entrenamiento" (transitions to active workout editor dashboard).
- Secondary CTA: "Descartar entrenamiento" (asks for destructive confirmation: `¿Descartar entrenamiento? Se perderán las series registradas en este entrenamiento.`, clearing draft from store and local storage upon confirmation).
- Start new workout option: "Iniciar un nuevo entrenamiento" (asks for confirmation to discard the active draft and starts a new blank workout).

#### 4C) Active workout state layout
1. Title: “Entrenamiento en marcha”.
2. Subtitle with start date/time.
3. List of exercise cards with sets, reps, weight, time, and distance.
4. Action buttons: "Añadir Ejercicio", "Descartar", "Finalizar".

**Behavior highlights**
- Finish confirms in dialog. If there are no sets at all or no exercises added, finishing is blocked and the user is shown an alert. A successful save clears the local draft and redirects to history; save failure preserves the draft.
- Discard confirms in dialog; clears draft locally (no backend delete).
- On successful finish: redirects to history. Toast and confetti feedback are deferred.
- Excludes empty exercises (with zero sets) from the payload sent to the backend.
- No timer feature yet (displays static starting date/time and last updated date/time).

**Data/API**
- POST `workout` when finishing.
- Exercise details modal inside workout fetches history page.

**Mobile considerations**
- Heavy modal usage.
- Numeric fields in Add Set modal currently plain text inputs.
- Long workout cards may require sticky CTA redesign.

---

### 5) Exercises list (`/exercises`)
- **Source:** `components/Exercises/Exercises.tsx`
- **Purpose:** browse/search exercises; optional selection mode for workout.

**Layout**
1. Title.
2. “Nuevo Ejercicio” full-width button.
3. Search input with icon.
4. Empty-state heading/text when none.
5. Scrollable card list:
   - circular image/avatar
   - name
   - muscle groups + type badges/icons
   - description

**Behavior**
- On mount fetches all exercises.
- Loading via global skeleton for list area.
- Card click:
  - normal mode -> route to detail page
  - workout mode -> callback to add exercise directly

**Data/API**
- GET `exercise`.
- Image displayed via direct URL `${VITE_API_URL}image/{imageId}`.

---

### 6) Exercise detail (`/exercises/:id` and modal variant)
- **Source:** `components/Exercises/ExerciseDetail.tsx`
- **Purpose:** show exercise workout history (grouped by workout set/date).

**Layout**
1. Header with exercise name.
2. Optional “Editar ejercicio” link when routed page (not modal).
3. List of cards by workout date.
4. Table per card: dynamic headers by exercise type + rows.

**Behavior**
- Fetch history on mount/`exerciseId` change.
- Loading text only; no empty/error differentiated UI.
- Uses index-based keys for set rows.

**Data/API**
- GET `workout-sets/exercise/:id` with legacy pagination params.

---

### 7) Exercise create/edit (`/exercises/new`, `/exercises/edit/:id`)
- **Source:** `components/Exercises/ExerciseEdit.tsx`
- **Purpose:** create or update exercise with optional image upload.

**Layout**
1. Circular dashed image dropzone centered.
2. Name input.
3. Primary muscle select.
4. Secondary muscle select.
5. Exercise type select.
6. Description textarea.
7. Save button.

**Behavior**
- Uses React Hook Form + Yup schema.
- Edit mode fetches exercise and pre-fills fields.
- Image flow: drop/select -> CompressorJS -> preview object URL.
- Save flow: upload image first (if selected), then create/update exercise.
- Success navigates `-1` (history-dependent).

**Data/API**
- Optional POST `image` then POST/PUT `exercise`.

**Mobile considerations**
- Dropzone is web-specific.
- Native camera/gallery replacement required.

---

### 8) Profile (`/me`)
- **Source:** `components/User/Me.tsx`, `WorkoutsCalendar.tsx`
- **Purpose:** basic profile card, logout, beta info, calendar.

**Layout**
1. Profile card with avatar, username, logout button.
2. Beta/unavailable info alert.
3. `react-calendar` month component with highlighted workout days.

**Behavior**
- Calendar month changes trigger day-fetch call.
- Day click fetches workouts for selected date but only logs to console.

**Data/API**
- GET `workout/days/:month/:year`
- GET `workout/workouts/:date`

---

### 9) Admin users (`/admin`)
- **Source:** `components/Admin/AdminUsers.tsx`
- **Purpose:** list users and delete non-admin users.

**Layout**
- Vertical list of user cards + delete icon button.
- Delete confirmation alert dialog.

**Behavior**
- Fetch users on mount.
- Delete -> optimistic local filter + success/error toast.

**Data/API**
- GET `user`
- DELETE `user/:id`

---

### 10) Workout History (`/history` and `/history/day/:date`)
- **Source:** `features/history/components/HistoryListScreen.tsx`, `HistoryWorkoutDetailScreen.tsx`
- **Purpose:** browse monthly workout lists and drill down into daily workout details.

**Layout**
1. History list tab: month selector (with previous/next buttons) + list of workout cards.
2. Workout detail page: title with date + list of exercise cards with sets, reps, weight, time, and distance, plus Edit/Delete buttons per set row, and a Delete Workout button in each workout card header.

**Behavior**
- Loads workout days for month and fetches details for each day in parallel.
- Sorts workouts descending (newest first).
- Refreshes on pull-to-refresh.
- Shows error state with retry option.
- Formats weight to kg, time to m/s, distance to meters.
- **Editing sets:** Clicking "Editar" opens a modal form allowing the user to update reps, weight in kg, time, distance, notes, and dropSet status. Prefilled values are converted from backend units. On submit, inputs are validated and converted back to backend units (weight to grams, time to seconds).
- **Deleting sets:** Requires confirmation. Deleting a set triggers a cascade that deletes empty parent workout sets and workouts.
- **Deleting workouts:** Clicking the delete button in the workout card header requires confirmation and deletes the entire workout.
- **Query Invalidation:** Successful edits or deletions invalidate the `['mobile', 'workouts']` cache tree, refetching the day details dynamically.

**Data/API**
- GET `workout/days/:month/:year`
- GET `workout/workouts/:date`
- PATCH `workout/sets/:setId` (UpdateWorkoutSetRequestSchema / UpdateWorkoutSetResponseSchema)
- DELETE `workout/sets/:setId` (DeleteWorkoutSetResponseSchema)
- DELETE `workout/:workoutId` (DeleteWorkoutResponseSchema)

---

## Modals and dialogs

1. `SetForm` (`Workout/SetForm.tsx`): dynamic fields by exercise type. Displays and accepts weight input in kilograms (kg) and converts to grams on submit without silent rounding. Distance is labeled as `Distancia (m)` and accepts only integer values. Labels and error validation messages are localized in Spanish. Includes a compact "Últimas series" section showing the last 2 previous workout sets for the selected exercise, fetched from `/workout-sets/exercise/:exerciseId`. Displays date, set values, notes, and drop set marker. Show loading state ("Cargando historial..."), empty state ("Sin historial previo para este ejercicio."), and error state ("No se pudo cargar el historial reciente.") safely without blocking the active workout form. Suggestions and auto-fill are deferred.
2. `ExerciseDetailModal` (`Workout/ExerciseDetailModal.tsx`): wraps exercise history view.
3. `DiscardWorkoutDialog`: confirms workout discard.
4. `EndWorkoutDialog`: confirms workout finish.
5. `LogOut` alert dialog: confirms logout.
6. `AdminUsers` delete-user dialog.

