# Mobile Authentication Architecture (Target)

This is a target architecture for the Expo mobile rewrite. It does **not** imply current backend support already exists.

Implemented backend foundations are documented in [Mobile Auth Sessions ADR](../architecture/mobile-auth-sessions.md). That ADR covers persistence, refresh-token hashing, rotation foundations, reuse detection foundations, revocation application services, and shared contracts. Mobile HTTP endpoints remain deferred.

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

### Server-side session model (future backend)

Conceptual session fields for a future backend issue:

- `id`
- `user_id`
- `refresh_token_hash`
- `token_family_id`
- `created_at`
- `last_used_at`
- `expires_at`
- `revoked_at`
- `replaced_by_session_or_token_id`
- device metadata (`device_name`, etc.) where needed

Exact schema design is deferred to backend implementation.

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

## Mobile auth endpoints to design later

A later backend issue should define endpoints conceptually similar to:

- `POST /api/auth/mobile/signin`
- `POST /api/auth/mobile/signup`
- `POST /api/auth/mobile/refresh`
- `POST /api/auth/mobile/logout`
- `GET /api/auth/mobile/sessions`
- `DELETE /api/auth/mobile/sessions/:sessionId`

Names are not finalized by this documentation task.

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
