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
| Axios or typed fetch client | HTTP layer | Yes | existing axios usage | Prefer central interceptors + contract mappers |
| Zustand | client workflow/session state | Yes | context-heavy mutable state | Expo Go compatible |
| React Hook Form | form state | Yes | mixed local state + RHF | Expo Go compatible |
| Zod + `@gymnotebook/contracts` | shared validation/types | Yes | local duplicated types | shared contracts from workspace |
| NativeWind or internal UI primitives | theming/components | Phase 2-3 | Chakra UI | depends on chosen styling stack |
| Expo SecureStore | JWT secure storage | Yes | localStorage token | Expo Go compatible |
| SQLite (recommended) | durable workout draft store | Phase 6 | localStorage workout JSON | may require dev build depending library choice |
| AsyncStorage | non-sensitive prefs | Phase 6 | localStorage misc | Expo Go compatible |
| Expo ImagePicker | camera/gallery selection | Phase 5/9 | react-dropzone | permissions required |
| Expo ImageManipulator | compression/resize | Phase 5/9 | CompressorJS | Expo Go compatible |
| React Native Reanimated | transitions/motion | Phase 3+ | auto-animate/framer-motion | may require babel/plugin setup |
| React Native Testing Library + Jest Expo | tests | Phase 11 | none in legacy frontend | standard Expo testing stack |
| Biome | lint/format consistency | Phase 1 | legacy eslint/prettier split | workspace alignment |

## Ordered implementation phases

| Phase | Scope | Dependencies | Acceptance criteria | Risks |
|---|---|---|---|---|
| 1. Workspace foundation | Create `apps/mobile`, Expo config, TS/biome wiring | product decisions: platform targets | App boots in dev; CI lint/typecheck wired | wrong initial architecture choices |
| 2. Contracts integration | consume `@gymnotebook/contracts`, API client scaffolding | phase 1 | typed API layer compiling end-to-end | drift between UI models and contracts |
| 3. Navigation + theme | Expo Router structure, header/tabs, base design tokens | phase 1 | authenticated route groups + visual baseline | over-coupling to legacy CSS |
| 4. Authentication | login/signup/session restore/logout | phases 2-3 | secure token storage and guarded routes working | token lifecycle edge cases |
| 5. Exercises | list/detail/create/edit + image pipeline | phases 2-4 | full CRUD parity on new backend | image permissions and upload constraints |
| 6. Active workout draft | local workflow editing + persisted draft store | phases 2-4 | resume-after-restart works reliably | state model complexity |
| 7. Workout sync | submit workflow, retries/conflict UX | phase 6 | successful submit clears draft; failures preserve draft | duplicate/conflict handling |
| 8. History/calendar | day markers, day workouts, exercise history pagination | phases 2-5 | history screens render contract data correctly | timezone/date edge cases |
| 9. Images hardening | format validation UX, replacement/deletion policy | phase 5 | upload/deletion flows match backend constraints | orphaned assets |
| 10. Error/offline behavior | global error mapping, network resilience | phases 4-9 | standardized user-facing error handling | inconsistent edge-case handling |
| 11. Testing | unit/integration/UI tests for key flows | phases 4-10 | stable automated tests for auth/workout/exercise | insufficient fixture coverage |
| 12. Internal builds/store prep | EAS/dev builds, release hardening | phases 1-11 | installable internal builds + release checklist | signing/config complexity |

## Additional migration guidance

- Do not port legacy local types; derive from contracts and map to view models explicitly.
- Use explicit route targets instead of history-pop navigation.
- Keep workflow behavior parity first; redesign visuals second.
