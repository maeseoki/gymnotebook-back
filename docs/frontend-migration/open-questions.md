# Open Questions

## Decisions required before scaffolding

1. Is first release Android-only, or Android + iOS simultaneously?
2. Is web support required for Expo app?
3. Is registration public, invite-only, or disabled in production?
4. Should biometric unlock be supported for stored sessions?
5. Should active workout autosave happen after every set, debounced, or manual checkpoints?
6. Is offline workout creation/submission required for v1?
7. Should active workout canonical persistence use SQLite (recommended) or AsyncStorage?
8. Should exercise image input support camera, gallery, or both?
9. Is admin user-management expected in mobile app scope?
10. Is password recovery required in this migration scope?

## Decisions that can wait until later phases

1. Keep/replace confetti celebration animation?
2. Haptics usage for key actions (set saved, workout finished)?
3. Should weight/time/distance support decimals in future schema version?
4. Should bottom nav structure change (e.g., separate history tab)?
5. Monetization model (subscription/one-time/deferred)?
6. Push notification roadmap (reminders/progression nudges)?

## Decisions already implied by backend/contracts

1. JWT payload includes `userId` and role enum values.
2. Signup rejects unknown fields and does not accept role assignment.
3. Workout timestamps must include offset or `Z`.
4. Workouts-by-date endpoint expects strict `YYYY-MM-DD` (+ optional timezone query).
5. History pagination uses `page`, `pageSize`, `sortBy`, `sortDirection`.
6. Image upload supports JPEG/PNG/WebP and returns `{ id }`.
7. Ownership-protected resources often return `404` when inaccessible.
