# Mobile Authentication Architecture

This document describes the implemented Expo mobile username/password authentication architecture and the backend behavior available for revocable mobile sessions. Google authentication, Apple authentication, password recovery, and session-management UI are still deferred.

Implemented backend behavior is documented in [Mobile Auth Sessions ADR](../architecture/mobile-auth-sessions.md). That ADR covers persistence, refresh-token hashing, refresh rotation, reuse detection, revocation, session-management enforcement, shared contracts, and HTTP endpoints.

Related: [Mobile architecture decisions](./mobile-decisions.md)

## Why this differs from legacy

The legacy access-token + localStorage model is insufficient for long-term mobile session requirements. Mobile requires explicit session restoration, refresh rotation, revocation, and safe handling of authentication loss without deleting offline workout data.

## Token model

### Access token

- Short-lived JWT.
- Sent as a Bearer token in the HTTP `Authorization` header.
- Held primarily in app memory.
- May be recovered after restart via refresh-token flow.
- Not treated as durable source of session truth.
- Decoded claims may exist in Zustand memory but are not authorization proof without server validation.

### Refresh token

- Long-lived opaque random token (not assumed JWT unless future ADR says otherwise).
- Stored in Expo SecureStore.
- Sent only to refresh/logout/session-management endpoints.
- Never stored in AsyncStorage.
- Never logged.
- Rotated on successful use.

### Server-side session model

The backend stores one row per refresh-token version in `mobile_sessions`:

- internal `id`
- stable public `session_id`
- `user_id`
- `refresh_token_hash`
- `token_family_id`
- `previous_session_row_id`
- `replaced_by_session_row_id`
- `created_at`
- `last_used_at`
- `rotated_at`
- `expires_at`
- `revoked_at`
- device metadata (`device_name`, etc.) where needed

Only the stable public session ID and safe device/timestamp metadata are exposed to clients.

## Security behavior requirements

- Persist only cryptographic refresh-token hash server-side.
- Support explicit session revocation.
- Support logout on current device.
- Leave room for logout-all-devices.
- Rotate refresh tokens.
- Detect refresh-token reuse after rotation.
- Revoke the relevant token family/session chain on suspected reuse.
- Optionally limit active sessions only if later product decision requires it.
- Never expose raw refresh tokens in logs or post-issuance API payloads.

## Implemented mobile auth endpoints

The backend exposes:

- `POST /api/auth/mobile/signin`
- `POST /api/auth/mobile/signup`
- `POST /api/auth/mobile/refresh`
- `POST /api/auth/mobile/logout`
- `GET /api/auth/mobile/sessions`
- `DELETE /api/auth/mobile/sessions/:sessionId`
- `DELETE /api/auth/mobile/sessions?keepCurrent=false`

Signin/signup return an access/refresh token pair. Refresh rotates the refresh token and returns a new pair. Logout uses a refresh token and remains idempotent, so it can work after access-token expiry. Session listing and revocation require a mobile access token containing `sessionId`.

Refresh failures for unknown, expired, revoked, immediately replayed, or reused tokens all return `401 invalid_mobile_session`. Malformed request bodies return `400 validation_failed`.

Revoking a mobile session immediately prevents refresh and access to mobile session-management endpoints. Existing access tokens may remain valid on ordinary protected API routes until their short TTL expires because global per-request session validation is not enabled yet.

## Expo app implementation

The Expo app now implements:

- login at `apps/mobile/app/(public)/login.tsx`;
- signup at `apps/mobile/app/(public)/signup.tsx`;
- startup restoration through `AuthBootstrap`;
- route protection through public/authenticated Expo Router group guards;
- logout from Profile;
- auth API functions under `apps/mobile/src/features/auth/api`;
- auth application service under `apps/mobile/src/features/auth/application`;
- React Hook Form + Zod form schemas under `apps/mobile/src/features/auth/schemas`;
- in-memory access-token injection into Axios;
- SecureStore refresh-token persistence.

Device metadata is intentionally minimal: the app sends `{ platform: 'ios' | 'android' }` when running on those platforms and omits metadata otherwise.

## Session restoration flow

On app launch:

1. Load refresh token from SecureStore.
2. If absent, enter unauthenticated state.
3. If present, call refresh endpoint.
4. Keep returned access token in memory.
5. Persist rotated refresh token in SecureStore.
6. Store returned user metadata and access-token expiry in Zustand.
7. Mark restoration complete.
8. Render protected navigation only after restoration reaches terminal state.

Authentication state machine must distinguish:

- `restoring`
- `authenticated`
- `unauthenticated`
- `reauthentication_required`

Avoid login-screen flicker while restoration is still in progress.

Invalid mobile sessions clear SecureStore, the memory access token, and Zustand auth metadata. Network, timeout, unknown, or SecureStore read failures do not automatically destroy the stored refresh token; the app clears any memory access token, moves to `reauthentication_required`, and shows public auth routes so the user can retry or sign in. This preserves the chance to recover from transient connectivity without deleting a still-valid refresh token.

## HTTP client behavior

- Attach current access token automatically.
- Parse mobile auth success responses with shared Zod contracts from `@gymnotebook/contracts`.
- Normalize backend, validation, network, timeout, and unknown errors before mapping them to safe UI messages.
- Do not enable a global refresh interceptor yet.
- Preserve offline workout draft data when authentication is cleared.

The global refresh interceptor is deferred deliberately. The current app has restoration, login, signup, and logout but no protected product mutations yet. Keeping refresh explicit avoids hidden retry behavior and infinite-loop risk until authenticated endpoint usage and active-workout retry states are implemented.

## Logout behavior

Logout reads the refresh token from SecureStore and makes a best-effort `POST /api/auth/mobile/logout`. Local state is authoritative: SecureStore, the in-memory access token, and Zustand auth metadata are cleared even if the backend logout request fails. Active-workout AsyncStorage persistence is not touched.

## Storage model

- Refresh token: SecureStore only.
- Access token: in-memory port only.
- User metadata and access-token expiry: Zustand only.
- AsyncStorage: reserved for active-workout persistence and never used for auth.

When a token pair is received, the app stores the refresh token in SecureStore before setting the access token or authenticated Zustand metadata. If SecureStore write fails, the app does not mark the user authenticated.

## Route protection

- `restoring`: render a minimal loading screen.
- `unauthenticated`: public login/signup are accessible; authenticated routes redirect to login.
- `reauthentication_required`: public login/signup are accessible; authenticated routes redirect to login.
- `authenticated`: authenticated tabs are accessible; public login/signup redirect to tabs.

## Token expiry during workout

Required behavior:

`access token expires -> local workout continues -> submission requires auth -> draft becomes waiting_for_auth -> user reauthenticates or refresh succeeds -> submission retries -> draft removed only after server success`

Authentication loss must never delete active or finished-unsynced workout drafts.

## Future Google and Apple authentication direction

Architecture must allow:

- Google sign-in for Android/iOS where supported.
- Sign in with Apple for iOS and where policy requires it.
- Multiple login methods linked to one internal account.
- Existing username/password accounts to link providers later.
- Provider identities stored separately from core user account.

Conceptual backend table:

`user_identities(id, user_id, provider, provider_subject, email_at_link_time, created_at, last_used_at)`

Use provider immutable subject (`provider_subject`), not email, as external identity key.

Intended flow:

- Authorization Code + PKCE.
- Native system browser/provider SDK via supported Expo modules.
- Backend verifies/exchanges authorization result.
- Backend issues GymNotebook access/refresh tokens.
- App must never treat Google/Apple tokens as GymNotebook API tokens.

Account-linking, email-collision, unlinking, and recovery behavior are deferred to dedicated security/product design.
