# Mobile Authentication Architecture (Target)

This document describes the target Expo mobile authentication architecture and the backend behavior now available for username/password mobile sessions. It does **not** imply the Expo application, Google authentication, or Apple authentication already exists.

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

## Session restoration flow

On app launch:

1. Load refresh token from SecureStore.
2. If absent, enter unauthenticated state.
3. If present, call refresh endpoint.
4. Keep returned access token in memory.
5. Persist rotated refresh token in SecureStore.
6. Load current user profile.
7. Mark restoration complete.
8. Render protected navigation only after restoration reaches terminal state.

Authentication state machine must distinguish:

- `restoring`
- `authenticated`
- `unauthenticated`
- `reauthentication_required`

Avoid login-screen flicker while restoration is still in progress.

## HTTP client behavior

- Attach current access token automatically.
- On first eligible `401`, perform one shared refresh attempt.
- Queue concurrent failed requests behind that single refresh.
- Retry each request at most once.
- Clear mobile session if refresh fails definitively.
- Avoid refresh loops.
- Exclude signin/signup/refresh/logout from refresh retries.
- Preserve offline workout draft data when authentication is cleared.

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
