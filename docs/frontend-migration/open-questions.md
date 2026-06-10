# Open Questions

## Still unresolved (required for implementation detail)

1. Is signup public, invite-only, or disabled for production?
2. What are final access-token and refresh-token lifetimes?
3. What session-management UX is required initially (current-device only vs visible session list vs revoke-all)?
4. What exact UX should represent offline retry decisions for finished workouts (automatic background retry, manual retry trigger, or hybrid)?
5. What final conflict-resolution UX should appear on duplicate UUID responses?
6. Should future measurements support decimals (and how does that version with existing integer contracts)?
7. Keep/replace confetti celebration after workout finish?
8. What haptic feedback should be enabled by default for key actions?
9. For future Google/Apple auth: automatic linking by verified email vs explicit linking?
10. For Apple private relay email cases: what linking/recovery behavior is required?
11. What account unlinking and lost-provider-access recovery policy is required?
12. What mandatory Sign in with Apple implications apply if Google sign-in is offered on iOS?

## Decisions now closed

The following are no longer open in this documentation set:

- Android+iOS support from one codebase.
- Web support not prioritized for first release.
- Biometric unlock not required initially (but architecture must keep extension path).
- Active-workout persistence initial stack uses AsyncStorage + Zustand persist + Zod (not SQLite-by-default).
- Camera and gallery support are both required.
- Mobile admin scope excluded from initial main tabs.
- Password recovery deferred until backend flow exists.
- Autosave/persistence durability for active workout is required.
- Active-workout offline-first behavior is mandatory.
- Main tabs are Home/Workout/Exercises/History/Profile.
- Monetization/subscriptions out of initial rewrite.
- Push notifications out of initial rewrite.

## Decisions already implied by backend/contracts

1. Signup rejects unknown fields and role assignment.
2. Workout timestamps must be ISO with offset or `Z`.
3. Workouts-by-date endpoint expects strict `YYYY-MM-DD` (+ optional timezone query).
4. History pagination uses `page`, `pageSize`, `sortBy`, `sortDirection`.
5. Image upload supports JPEG/PNG/WebP and returns `{ id }`.
6. Ownership-protected resources often return `404` when inaccessible.
