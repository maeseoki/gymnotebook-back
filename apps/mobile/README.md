# The Gym Notebook Mobile

Expo mobile application foundation for Android and iOS. This package is intentionally limited to app bootstrap, routing, shared contracts, storage/query/network/auth foundations, tests, and development-build configuration. Product screens and endpoint calls are deferred.

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

Routes are placeholders only. They do not call signin, signup, exercise, workout, or history endpoints yet.

## Foundations

- Providers: Safe Area, font/splash coordination, TanStack Query, and Expo Router slot composition.
- Contracts: mobile imports `@gymnotebook/contracts` through workspace resolution and Metro watch folders.
- HTTP: Axios client with environment-derived base URL, `Accept: application/json`, timeout, access-token getter injection, and shared error normalization. It does not force a global JSON `Content-Type`, so future multipart requests can set their own boundary.
- Auth: Zustand session metadata state machine, in-memory access token port, SecureStore refresh-token adapter.
- Persistence: AsyncStorage key-value adapter plus versioned JSON/Zod restore and migration helper for future active-workout draft storage.
- Network: Expo Network adapter exposing `online`, `offline`, or `unknown`; connected network is not treated as guaranteed internet reachability. The TanStack Query online manager treats `unknown` as online so requests are not paused solely because reachability is inconclusive.
- Query: mobile QueryClient defaults, query-key conventions, conservative transient retry policy for queries, no global mutation retries, and Expo Network online-manager integration.
- Forms: React Hook Form resolver example using shared Zod mobile signin schema.
- UI: dark-first React Native primitives: Screen, KeyboardSafeScreen, Text, Button, Card, TextInput, FormField, LoadingIndicator, EmptyState, and ErrorState.
- Styling: NativeWind 4 is configured through `nativewind/babel`, `withNativeWind` in Metro, `global.css`, and `tailwind.config.ts`. The current primitives use React Native style objects so they remain stable before product screens introduce `className` usage.

## Deferred

Signin/signup screens, session restoration calls, refresh interceptors, workout editing/submission, exercise CRUD, image selection/camera, history/calendar UI, Google/Apple authentication, push notifications, SQLite, and native project generation are intentionally deferred.
