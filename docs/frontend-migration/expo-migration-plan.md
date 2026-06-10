# Expo Migration Plan

## Target monorepo layout

```text
apps/
├── api/
└── mobile/

packages/
├── contracts/
├── typescript-config/
└── (optional) shared-ui / shared-utils
```

## Proposed stack (versions intentionally not pinned here)

> Version pinning must be verified at implementation time against official Expo and package docs.

| Dependency/technology | Purpose | Needed immediately? | Replaces legacy | Native config / Expo Go notes |
|---|---|---|---|---|
| Expo + React Native + TypeScript | app runtime | Yes | Vite + React DOM | Core foundation |
| Expo Router | file-based navigation | Yes | React Router DOM | Expo-first; deep-link friendly |
| TanStack Query | server-state caching | Yes | imperative `useEffect` fetching | Expo Go compatible |
| Axios or typed fetch client | HTTP layer | Yes | existing axios usage | central interceptors + mapper layer |
| Zustand | client workflow/session state | Yes | context-heavy mutable state | Expo Go compatible |
| React Hook Form | form state | Yes | mixed local state + RHF | Expo Go compatible |
| Zod + `@gymnotebook/contracts` | shared validation/types | Yes | local duplicated types | shared contracts from workspace |
| Expo SecureStore | refresh token secure storage | Yes | localStorage token | Expo Go compatible |
| AsyncStorage + Zustand persist | canonical active-workout draft persistence (initial) | Phase 7 | localStorage workout JSON | Expo Go compatible |
| Expo ImagePicker | camera/gallery selection | Phase 6 | react-dropzone | permissions required |
| Expo ImageManipulator | compression/resize | Phase 6 | CompressorJS | Expo Go compatible |
| React Native Testing Library + Jest Expo | tests | Phase 11 | none in legacy frontend | standard Expo testing stack |
| Biome | lint/format consistency | Phase 1 | legacy eslint/prettier split | workspace alignment |

## Decided route structure target

```text
app/
├── _layout.tsx
├── (public)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── signup.tsx
└── (authenticated)/
    ├── _layout.tsx
    ├── (tabs)/
    │   ├── _layout.tsx
    │   ├── index.tsx
    │   ├── workout.tsx
    │   ├── exercises.tsx
    │   ├── history.tsx
    │   └── profile.tsx
    ├── exercises/
    │   ├── new.tsx
    │   └── [id]/
    │       ├── index.tsx
    │       └── edit.tsx
    ├── history/
    │   ├── day/[date].tsx
    │   └── workout/[id].tsx
    └── settings/
```

Notes:
- tabs represent primary areas;
- create/detail/edit screens live in stack routes above tabs;
- exercise history should prefer dedicated screens over deeply nested modal flows;
- explicit destination navigation should replace history-pop behavior for critical flows;
- deep links must not rely on prior navigation state.

## Ordered implementation phases

| Phase | Scope | Can start before mobile-session backend endpoints? | Dependencies | Acceptance criteria | Risks |
|---|---|---|---|---|---|
| 1. Mobile workspace + UI foundation | Create `apps/mobile`, Expo config, TS/biome wiring, base UI shell | Yes | product decisions locked | app boots and lint/typecheck pass | wrong initial architecture |
| 2. Contracts + HTTP foundation | consume `@gymnotebook/contracts`, mapper-oriented client, error mapping base | Yes | phase 1 | typed client compiles end-to-end | contract drift and over-coupled view models |
| 3. Navigation/theme/primitives | Expo Router groups/tabs, tokenized theme, reusable primitives | Yes | phases 1-2 | target route skeleton and visual baseline | over-fitting legacy web CSS |
| 4. Backend mobile-session design/implementation | access+refresh+session endpoints and revocation/rotation rules | No (backend track) | backend issue | endpoint contract approved + implemented | auth/security complexity |
| 5. Mobile auth/session restoration | mobile signin/signup/restore/logout flows with state machine | No (needs phase 4) | phases 2-4 | restoring/authenticated/unauthenticated/reauth-required handled cleanly | refresh loop/session edge cases |
| 6. Exercises + native image pipeline | list/detail/create/edit + camera/gallery + image lifecycle handling | Mostly yes (except auth-protected runtime flows) | phases 2-3 (and 5 for authenticated runtime) | CRUD parity and safe image replacement sequencing | permissions and orphan cleanup |
| 7. Active workout draft model + persistence | draft model separation, AsyncStorage canonical persistence, recovery/migration | Yes for local flow; auth-aware submit needs phase 5 | phases 2-3 | survive restart/process termination with validated draft restoration | state-model complexity |
| 8. Offline workout completion + retry | finish offline, status transitions, retry gates for auth/network | Partially (full submit path needs phase 5 + backend workout endpoints) | phases 5-7 | required offline-first states and retry behavior visible | duplicate UUID/conflict UX |
| 9. History/calendar | day markers, day workouts, exercise history pagination | Mostly yes (auth needed for real data) | phases 2-3,5 | data renders with correct date/page query contracts | timezone/date strictness |
| 10. Error/a11y/network UX | consistent error surfaces, accessibility, network-awareness UX | Yes | phases 5-9 | standardized UX for failures and offline states | inconsistency across screens |
| 11. Testing + internal builds | unit/integration/UI tests and internal build hardening | Yes | phases 5-10 | stable CI tests and installable internal builds | insufficient fixture depth |
| 12. Google/Apple provider auth (later) | provider login/linking built atop core mobile sessions | No (depends on stable auth core) | phases 4-5 | provider sign-in works without replacing core app session model | account-linking security design |

## Additional migration guidance

- Keep `DraftWorkout*` local models separate from shared request contracts.
- Validate mapped API payloads against shared Zod schemas before sending.
- Preserve active workout across auth expiry/logout boundaries unless user explicitly discards.
- Offline-first requirement is mandatory for active workout flow, not optional enhancement.
