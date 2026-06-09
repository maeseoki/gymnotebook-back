# Functional Preservation Matrix

| Legacy feature | Classification | Reason |
|---|---|---|
| Bottom navigation (home/workout/exercises/me/admin) | Preserve with UX improvements | Core navigation model is clear; implement with native tab UX and role-gated admin tab |
| Auth login/signup/logout flow | Preserve with UX improvements | Core flow needed; must align with new token/error contracts |
| JWT persistence across app restarts | Preserve exactly (storage tech replaced) | Required product behavior; move to SecureStore |
| Exercise list/search/cards | Preserve with UX improvements | Key workflow; optimize loading and empty/error states |
| Exercise create/edit form | Preserve with UX improvements | Important domain flow; replace web image/file controls |
| Exercise image upload/compression | Replace technically | Keep behavior but switch to Expo ImagePicker + ImageManipulator |
| Exercise history modal from workout | Preserve with UX improvements | Useful contextual insight; likely better as full screen on mobile |
| Active workout local persistence | Preserve and strengthen | Core differentiator; needs stronger durability and conflict handling |
| Add set by exercise type | Preserve exactly | Domain-critical input behavior |
| Drop set indicator | Preserve exactly | Domain semantics should remain |
| Confetti on workout finish | Needs product decision | Cosmetic; keep if desired |
| Calendar month markers | Preserve with UX improvements | Valuable history entry point but currently incomplete |
| Admin user management screen | Needs product decision | Mobile app may not require admin operations |
| React Query global config with retries disabled | Needs product decision | Current defaults likely too strict for mobile/offline contexts |
| Reference-equality workout-set selection | Replace technically | Fragile state identity implementation |
| `navigate(-1)` post-save behavior | Replace technically | Not deep-link safe in native navigation |
| Beta warning alerts | Remove (or reduce) | Temporary messaging, not core product behavior |
