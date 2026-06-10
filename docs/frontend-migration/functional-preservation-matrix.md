# Functional Preservation Matrix

| Legacy feature | Classification | Reason |
|---|---|---|
| Main navigation model | Preserve with redesign | Use native tabs Home/Workout/Exercises/History/Profile; route admin later through Profile/settings |
| Auth login/signup/logout core flow | Preserve with architecture replacement | UX preserved, but implementation moves to access+refresh+session model |
| Session persistence across restarts | Preserve with stronger guarantees | Must use restoration flow; avoid login flicker; no long-lived token in AsyncStorage |
| Exercise list/search/cards | Preserve with UX improvements | Core workflow remains critical |
| Exercise create/edit form | Preserve with UX improvements | Core domain flow; native input behavior needed |
| Exercise image upload pipeline | Preserve with technical replacement | Camera/gallery + safe replace lifecycle + cleanup attempts |
| Exercise history from workout context | Preserve with UX improvements | Prefer dedicated screen over deep modal stack |
| Active workout local persistence | Preserve and strengthen | Core offline-first requirement with explicit statuses and recovery rules |
| Add set by exercise type | Preserve exactly | Domain behavior must remain stable |
| Drop set indicator | Preserve exactly | Domain semantics unchanged |
| Offline workout start/edit/finish | Preserve and strengthen | Explicitly required in v1, not optional |
| Preserve draft on submit/auth failure | Preserve and strengthen | Draft must never clear silently on duplicate or auth/network failure |
| Draft-vs-request model separation | Add/require | Local editable models must remain distinct from API contracts |
| Confetti on workout finish | Needs product decision | Cosmetic behavior still open |
| Calendar month markers/day details | Preserve with UX improvements | Keep feature while fixing behavior gaps |
| Admin user management main tab | Remove from initial scope | Not part of initial mobile main navigation |
| React Query global config | Replace technically | Move from unused setup to real query/mutation ownership |
| Reference-equality workout-set selection | Replace technically | Requires stable IDs and immutable updates |
| `navigate(-1)` completion behavior | Replace technically | Critical flows need explicit destination navigation |
| Beta warning alerts | Remove (or reduce) | Not core product behavior |
| Push notifications in v1 | Defer | Out of initial rewrite scope |
| Monetization/subscriptions in v1 | Defer | Out of initial rewrite scope |
