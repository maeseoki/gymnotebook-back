# User Workflows

## 1) Authentication

### Sign in / sign up (mobile target)
- **Entry:** public route group (`/login`, `/signup`)
- **Actions:** submit credentials
- **Expected auth behavior:** backend issues access + refresh session pair (future mobile auth endpoints)
- **Client handling:** keep access token in memory, store refresh token in SecureStore, then load current user profile
- **Failure:** standardized auth error UI; no offline workout draft deletion

### Session restoration on app launch
1. Load refresh token from SecureStore.
2. If absent -> `unauthenticated`.
3. If present -> refresh request.
4. On success: in-memory access token + rotated refresh token persisted securely.
5. Load profile.
6. Transition to `authenticated`.

Auth state machine must distinguish: `restoring`, `authenticated`, `unauthenticated`, `reauthentication_required`.

### Expired access token and request retry
- First eligible 401 triggers one shared refresh attempt.
- Concurrent failed requests queue behind same refresh.
- Each request retries once max.
- Signin/signup/refresh/logout endpoints are excluded from refresh retry loop.
- Definitive refresh failure clears auth session state but **must not clear offline workout draft**.

---

## 2) Exercise management

### List/detail/create/edit
- Core flow remains aligned with legacy behavior, with native navigation and input controls.
- Exercise image input must support **gallery and camera**.

### Image lifecycle (decided safe flow)

#### Create exercise with image
1. Select or capture image.
2. Resize/compress to API-supported JPEG/PNG/WebP.
3. Upload image.
4. Create exercise with uploaded image ID.
5. If exercise creation fails, attempt cleanup of newly uploaded image.
6. If cleanup fails, report orphan-cleanup condition without hiding original error.

#### Replace existing image
1. Keep existing image reference.
2. Upload new image.
3. Update exercise to new image ID.
4. Only after successful update, attempt deletion of old image.
5. If update fails, attempt deletion of newly uploaded image.
6. Never delete old image before successful exercise update.

---

## 3) Active workout flow (offline-first required)

### Draft model and persistence
- Editable state uses local draft models (`DraftWorkout`, `DraftWorkoutGroup`, `DraftSet`) with stable local IDs and UI-only metadata.
- Canonical persisted draft for initial release: Zustand + persist adapter + AsyncStorage + Zod validation/migration.

### Workflow
1. **Start workout** (online or offline if required exercise data is already local).
2. **Persist immediately** after start; status `active`.
3. **Add exercises and sets** while online/offline; persist debounced plus critical flushes.
4. **Navigate between screens / background app / process termination / restart** -> draft must restore reliably.
5. **Finish workout** -> mark draft `finished` locally (not removed).
6. **Submission attempt**:
   - if no network -> `waiting_for_network`;
   - if auth required/expired -> `waiting_for_auth`;
   - while sending -> `submitting`.
7. **Submission failure** -> `failed` (retryable), draft retained.
8. **Duplicate UUID response** -> retain draft; present explicit conflict/retry UX.
9. **Successful acknowledgement** -> transition to short-lived synchronized/success UI feedback, then clear persisted draft as normal completion path.
10. **Crash between acknowledgement and cleanup** -> on restore, keep behavior safe via workout UUID duplicate protection + explicit retry/recovery UX (no silent discard).

### Required user-visible status coverage
- in progress
- finished locally
- waiting for authentication
- waiting for connectivity
- submitting
- failed and retryable
- successfully synchronized

### Mapping to API contract before submission

`DraftWorkout -> explicit mapper -> CreateWorkoutRequest -> shared Zod validation -> API request`

Mapper must:
- remove UI-only fields;
- convert exercises to `{ id }`;
- normalize timestamps to ISO with offset or `Z`;
- parse/validate integer measurements;
- set final workout/group timestamps by product rules;
- validate against shared request schema before network submission.

---

## 4) History/calendar workflow

- Primary entry from History tab.
- Day detail should be a dedicated route/screen (not only modal patterns).
- History and exercise-history data may use cached server data with explicit offline/loading/error states.
- Active-workout offline-first scope remains stricter than general history offline behavior for initial release.
