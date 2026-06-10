# Frontend Migration Audit: Legacy Vite -> Expo

## Purpose
This folder documents the legacy React + Vite SPA in `legacy/frontend-vite` and defines the migration specification for the Expo app in `apps/mobile`. The current mobile package is a foundation only, not a complete product implementation.

## Scope audited
- `legacy/frontend-vite/src` (routes, pages, components, services, context, hooks, utils, theme)
- `packages/contracts`
- `apps/api/src/**/http`
- `docs/migrations/*compatibility*`

## High-level findings
- **Route records discovered:** 11 (including index and nested records)
- **User-visible routed screens:** 9
- **Modal/dialog surfaces:** 6
- **Core workflows covered:** authentication, exercise CRUD, active workout, workout history/calendar/admin
- **Largest compatibility breaks:** login payload shape, workout submit payload shape, image upload response shape, history pagination query shape, set response field rename (`dropSet` -> `isDropSet`), strict date/time requirements.

## Locked mobile decisions (source of truth)
- Native Expo + React Native app for Android and iOS.
- Main tabs: Home, Workout, Exercises, History, Profile.
- Offline-first active workout is a core requirement.
- Initial active-workout persistence is Zustand + persist adapter + AsyncStorage + Zod (not SQLite by default).
- Mobile auth requires a future access+refresh+session architecture, not legacy localStorage behavior.
- Initial stable styling foundation uses NativeWind 4 + Tailwind CSS 3.4. NativeWind 5/Tailwind 4 migration is deferred until NativeWind 5 has a stable release.

See [mobile-decisions.md](./mobile-decisions.md) and [mobile-authentication.md](./mobile-authentication.md).

## Documents
- [Mobile architecture decisions (authoritative)](./mobile-decisions.md)
- [Mobile authentication architecture](./mobile-authentication.md)
- [Route inventory](./route-inventory.md)
- [Screen specifications](./screen-specifications.md)
- [User workflows](./user-workflows.md)
- [Component inventory](./component-inventory.md)
- [State and persistence](./state-and-persistence.md)
- [API compatibility audit](./api-compatibility.md)
- [Visual design](./visual-design.md)
- [Browser-specific dependencies](./browser-specific-dependencies.md)
- [Functional preservation matrix](./functional-preservation-matrix.md)
- [Defects and technical debt](./defects-and-technical-debt.md)
- [Expo migration plan](./expo-migration-plan.md)
- [Open questions](./open-questions.md)

## Audit limitations
- Legacy frontend was inspected primarily from source code.
- Legacy backend runtime was not used in this audit session, so authenticated visual behavior was not end-to-end verified against a live API.
- Standalone legacy build currently fails (`ExerciseEdit.tsx` imports `../../utils/compressor` while file path is `utils/Compressor.ts` on case-sensitive filesystem), so no reliable browser-run visual capture was produced.
- `docs/frontend-migration/screenshots/` is currently empty.

## Recommended next step
Continue with mobile auth/session restoration screens and services on top of the implemented foundation, without broadening active-workout or exercise CRUD scope prematurely.
