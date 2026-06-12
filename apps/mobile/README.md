# The Gym Notebook Mobile

Expo mobile application foundation for Android and iOS. This package includes app bootstrap, routing, shared contracts, storage/query/network foundations, and the username/password mobile authentication flow. Exercise, workout, history, image, provider-auth, push-notification, and SQLite product work remains deferred.

## Selected Versions

- Expo SDK: `56.0.9`, matched to the current `expo-template-default@56.0.23`.
- React Native: `0.85.3`, from the Expo SDK 56 default template.
- React: `19.2.3`, from the Expo SDK 56 default template.
- Expo Router: `56.2.9`, matching SDK 56 package metadata.
- TypeScript: `6.0.3`, aligned with the monorepo and Expo template `~6.0.3`.
- Node: `24`, pnpm: `11.5.2`, inherited from the repository.
- TanStack Query: `5.101.0`, Zustand: `5.0.14`, Zod: `4.4.3`.
- React Hook Form: `7.78.0`, `@hookform/resolvers`: `5.4.0`.
- Axios: `1.17.0`.
- Jest Expo: `56.0.4`, React Native Testing Library: `14.0.0`.
- Tailwind CSS: `3.4.19`, latest stable Tailwind 3.4 release in npm metadata.
- NativeWind: `4.2.5`, stable NativeWind line compatible with Tailwind 3.4. NativeWind 5 is the Tailwind 4 line, but it is still preview/prerelease, so this foundation deliberately avoids it until a stable release is available.

Expo-managed native packages are pinned to SDK 56-compatible versions from Expo template/package metadata: SecureStore, AsyncStorage, Expo Network, Safe Area Context, Screens, Reanimated, Worklets, Gesture Handler, Splash Screen, Status Bar, and Dev Client.

## Scripts

```bash
pnpm --filter @gymnotebook/mobile start
pnpm --filter @gymnotebook/mobile start:clear
pnpm --filter @gymnotebook/mobile android
pnpm --filter @gymnotebook/mobile ios
pnpm --filter @gymnotebook/mobile web
pnpm --filter @gymnotebook/mobile lint
pnpm --filter @gymnotebook/mobile typecheck
pnpm --filter @gymnotebook/mobile test
pnpm --filter @gymnotebook/mobile expo:config
pnpm --filter @gymnotebook/mobile export
pnpm --filter @gymnotebook/mobile expo:doctor
pnpm --filter @gymnotebook/mobile expo:install-check
```

`build` maps to `expo export --platform web --output-dir dist` for deterministic CI validation. Cloud EAS builds are not part of normal CI.

## Development Builds

Expo Go is not the production-like workflow for this app. Use development builds:

```bash
pnpm --filter @gymnotebook/mobile start
pnpm --filter @gymnotebook/mobile start:clear
pnpm --filter @gymnotebook/mobile android
pnpm --filter @gymnotebook/mobile ios
pnpm --filter @gymnotebook/mobile web
pnpm --filter @gymnotebook/mobile exec expo run:android
pnpm --filter @gymnotebook/mobile exec eas build --profile development --platform android
pnpm --filter @gymnotebook/mobile exec eas build --profile development --platform ios
```

The project stays in Expo managed workflow. Native `android/` and `ios/` directories are not committed.

## Environment

Public variables:

```text
EXPO_PUBLIC_APP_ENV=development|preview|production|test
EXPO_PUBLIC_API_URL=https://api.example.com/api
```

Values are validated with Zod at startup. Public Expo variables must not contain secrets, JWT signing keys, refresh-token peppers, database credentials, or private service tokens.

`EXPO_PUBLIC_APP_ENV` has no fallback and rejects values outside `development`, `preview`, `production`, and `test`. `EXPO_PUBLIC_API_URL` must be explicitly provided. Development may use HTTP for emulator, simulator, or LAN addresses; preview and production require HTTPS. Trailing slashes are normalized away.

Development API URL examples:

- Android emulator to host API: `http://10.0.2.2:8080/api`
- iOS simulator to host API: `http://127.0.0.1:8080/api`
- Physical device: use the host LAN address, for example `http://192.168.1.30:8080/api`
- Preview/production: use HTTPS API URLs

`eas.json` sets only `EXPO_PUBLIC_APP_ENV` per build profile. Configure `EXPO_PUBLIC_API_URL` in the EAS environment or shell before building; missing values fail config resolution instead of defaulting to localhost or emulator loopback. `EXPO_PROJECT_ID` is optional for local development, but when supplied it must be a non-empty bounded value.

The deterministic local validation scripts `expo:config`, `export`, and `expo:doctor` provide `EXPO_PUBLIC_APP_ENV=test` and `EXPO_PUBLIC_API_URL=https://example.invalid/api` only for static CI smoke checks. The `example.invalid` host is deliberately non-routable and must not be used by real development, preview, or production builds.

## Routes

Route groups:

```text
app/
├── (public)/login
├── (public)/signup
└── (authenticated)/
    ├── (tabs)/
    │   ├── index
    │   ├── workout
    │   ├── exercises
    │   ├── history
    │   └── profile
    ├── exercises/new
    ├── exercises/[id]
    ├── exercises/[id]/edit
    ├── history/day/[date]
    └── settings
```

The public login and signup routes call the backend mobile auth endpoints. Authenticated product routes are still placeholders except for Profile, which shows authenticated user metadata and supports logout.

## Foundations

- Providers: Safe Area, font/splash coordination, TanStack Query, and Expo Router slot composition.
- Contracts: mobile imports `@gymnotebook/contracts` through workspace resolution and Metro watch folders.
- HTTP: Axios client with environment-derived base URL, `Accept: application/json`, timeout, access-token getter injection, and shared error normalization. It does not force a global JSON `Content-Type`, so future multipart requests can set their own boundary. No global refresh interceptor is enabled yet; restoration and explicit refresh use the refresh endpoint directly to avoid hidden retry loops during this phase.
- Auth: username/password signin and signup through `/auth/mobile/*`, Zustand session metadata state machine, in-memory access token port, SecureStore refresh-token adapter, startup restoration, route protection, and logout.
- Persistence: AsyncStorage key-value adapter plus versioned JSON/Zod restore and migration helper for active-workout draft storage.
- Network: Expo Network adapter exposing `online`, `offline`, or `unknown`; connected network is not treated as guaranteed internet reachability. The TanStack Query online manager treats `unknown` as online so requests are not paused solely because reachability is inconclusive.
- Query: mobile QueryClient defaults, query-key conventions, conservative transient retry policy for queries, no global mutation retries, and Expo Network online-manager integration.
- Forms: React Hook Form resolver example using shared Zod mobile signin schema.
- UI: dark-first React Native primitives: Screen, KeyboardSafeScreen, Text, Button, Card, TextInput, FormField, LoadingIndicator, EmptyState, and ErrorState.
- Styling: NativeWind 4 is configured through `nativewind/babel`, `withNativeWind` in Metro, `global.css`, and `tailwind.config.ts`. The current primitives use React Native style objects so they remain stable before product screens introduce `className` usage.

## Active Workout Draft Flow

The application supports an offline-first active workout draft tracking flow:

1. **Start Workout:** Starts a new workout session, creating a local draft in Zustand and AsyncStorage.
2. **Draft Storage Key:** `gymnotebook.mobile.v1.activeWorkout`
3. **Draft Schema Version:** `1`
4. **Units Semantics:**
   - **Local Draft Weight:** Grams (`weightGrams`). Displayed as kilograms in the UI (e.g. `82500` grams -> `82.5` kg).
   - **UI Weight Input:** Kilograms (kg), supporting up to 3 decimal places without silent rounding (e.g. `82.5` -> converted to `82500` grams).
   - **Backend Weight:** Grams.
   - **Distance:** Meters (integer inputs only).
   - **Time:** Seconds.
   - **Reps:** Integer count.
5. **Backend Save Behavior:**
   - Empty exercises (with zero sets) are excluded from the payload sent to the backend.
   - Saving/finishing a workout requires at least one exercise and at least one set across the whole workout. Saving empty workouts is blocked.
   - A successful save clears the local draft from AsyncStorage and redirects the user to the history tab.
   - A save failure (e.g. network error) preserves the local draft.
6. **Active Workout Resume UX:**
   - When an active workout draft exists, landing on the Workout tab displays an explicit resume/discard summary instead of forcing the user directly into the active workout form.
   - The summary displays compact info: number of exercises, total sets, started date/time, and last updated date/time if available.
   - **Primary Action (`Continuar entrenamiento`):** Opens the active workout editor form.
   - **Secondary/Destructive Action (`Descartar entrenamiento`):** Prompts for confirmation before clearing the draft from store and local persisted storage.
   - **Start New Workout:** Starting a new workout while a draft exists requires explicit destructive confirmation to prevent accidental loss of the active draft.
   - **Local-Only Nature:** Discarding clears only the local draft from AsyncStorage; no backend workout deletion is performed.
7. **Recent Exercise Set History:**
   - Displays a compact "Últimas series" section for the selected exercise in the set-entry/edit modal.
   - Fetches recent sets using the `GET /api/workout-sets/exercise/:exerciseId` endpoint.
   - Uses formatting utilities for weight (grams to kg), time (seconds to min/sec), and distance (meters).
   - Handles loading ("Cargando historial..."), empty ("Sin historial previo para este ejercicio."), and error ("No se pudo cargar el historial reciente.") states without blocking the active workout form.
   - Auto-progression/auto-fill or suggestions are intentionally deferred (display-only MVP).
8. **Known Limitations:**
   - Confetti success feedback, active templates, and timers (workout duration countdown/elapsed clocks) are deferred.
   - History / calendar / charts synchronization is deferred.

## Workout History Flow

The application supports viewing historical workouts loaded from the backend:

1. **History List Tab:** Accessible via the main tab bar. Displays a list of workouts for the selected month. Users can navigate months using the month header controls.
2. **Workout/Day Detail Screen:** Accessible by tapping any workout card in the history list. Displays the workout date/time range, notes, and the list of exercises performed (including reps, weight in kg, time in m/s, and distance in meters).
3. **Pull-to-Refresh:** Pulling down on either the history list or detail screen triggers a TanStack query refetch.
4. **Error Handling & Retry:** Network or backend failures display a localized message (in Spanish) with a "Reintentar" button.
5. **Unit Conversions:**
   - Weight is formatted from grams to kilograms (e.g. `82500` -> `82.5 kg`, `80000` -> `80 kg`). Zero weights are omitted for non-weight exercises to keep the UI clean.
   - Time is formatted from seconds to `Xm Ys` or `Xs`.
   - Distance is formatted to meters (`X m`).
6. **Query Caching & Invalidation:**
   - Utilizes TanStack Query keys starting with `['mobile', 'workouts']`.
   - Creating a workout invalidates this query tree, automatically updating the history tab.
7. **Editing Saved Workouts:**
  - Integrated mobile UI controls to edit saved sets (reps, weight, time, distance, notes, dropSet status), delete individual sets, and delete entire workouts.
  - Implemented client wrappers under `historyMutationsApi` and mutation hooks (`useUpdateHistorySet`, `useDeleteHistorySet`, `useDeleteWorkout`).
  - Confirmed unit conversions (pre-filling weight from grams to kg, converting time from seconds to min/sec and back, validating no-rounding kg weights with up to 3 decimals, and restricting distance to integer meters).
  - Successful edits or deletions automatically invalidate query keys starting with `['mobile', 'workouts']`, updating details/list screen states dynamically.
  - Adding new sets or exercises to completed workouts remains unsupported/deferred on the backend and is not exposed in the UI.

## Mobile Authentication

Implemented flow:

1. The root layout mounts `AuthBootstrap`, which runs session restoration once.
2. Restoration reads the refresh token from SecureStore. Missing tokens become `unauthenticated`.
3. Existing refresh tokens are sent to `POST /api/auth/mobile/refresh`.
4. Successful refresh rotates the SecureStore refresh token, stores the access token in memory, and stores only safe user/session metadata in Zustand.
5. Invalid mobile sessions clear SecureStore, memory access token, and Zustand auth metadata.
6. Network, timeout, unknown, or SecureStore read failures do not automatically destroy the refresh token. The store moves to `reauthentication_required` and public auth routes are shown.
7. Login and signup store the returned refresh token first, then set the in-memory access token and Zustand authenticated metadata. If SecureStore write fails, the user is not marked authenticated.
8. Logout is best effort on the backend, then always clears SecureStore, memory access token, and Zustand auth metadata.

Storage model:

- Refresh token: SecureStore only, key owned by `src/shared/auth/refresh-token-storage.ts`.
- Access token: process memory only, via `src/shared/auth/access-token-memory.ts`.
- User metadata and access-token expiry: Zustand only.
- AsyncStorage: reserved for active-workout persistence and not used for auth.

Route protection:

- `restoring` shows a minimal loading screen.
- unauthenticated and `reauthentication_required` users are redirected to public login/signup.
- authenticated users are redirected away from public auth routes to tabs.

Local backend development requires `EXPO_PUBLIC_API_URL` to point at the API base including `/api`, for example:

```bash
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api pnpm --filter @gymnotebook/mobile start
```

The backend mobile auth endpoints must be available. Automated tests use fakes and do not require a live backend.

## Deferred

Global refresh interceptors, session-management UI, password recovery, workout editing, exercise CRUD, image selection/camera, history/calendar UI, Google/Apple authentication, push notifications, SQLite, and native project generation are intentionally deferred.
