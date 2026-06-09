# Frontend Migration Audit: Legacy Vite -> Expo

## Purpose
This folder documents the legacy React + Vite SPA in `legacy/frontend-vite` and defines a migration specification for a future Expo app in `apps/mobile` (not implemented in this issue).

## Scope audited
- `legacy/frontend-vite/src` (routes, pages, components, services, context, hooks, utils, theme)
- `packages/contracts`
- `apps/api/src/**/http`
- `docs/migrations/*compatibility*`

## High-level findings
- **Route records discovered:** 11 (including index and nested records)
- **User-visible routed screens:** 9
- **Modal/dialog surfaces:** 6
- **Core workflows covered:** authentication, exercise CRUD, active workout, workout history calendar/admin
- **Largest compatibility breaks:** login payload shape, workout submit payload shape, image upload response shape, history pagination query shape, set response field rename (`dropSet` -> `isDropSet`), strict date/time requirements.

## Recommended migration direction
- Expo Router for navigation structure
- TanStack Query for server state (currently mostly bypassed)
- Zustand for active workout draft + cross-screen transient state
- SecureStore for JWT, SQLite (recommended) for workout draft durability
- Shared API contracts imported from `@gymnotebook/contracts`

## Documents
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
Create a dedicated implementation issue for **Phase 1-3** from [expo-migration-plan.md](./expo-migration-plan.md), and lock product decisions listed in [open-questions.md](./open-questions.md) that block scaffolding.
