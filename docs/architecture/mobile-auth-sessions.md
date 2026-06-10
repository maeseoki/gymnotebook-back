# Mobile Auth Sessions ADR

## Status

Implemented foundations. HTTP mobile authentication endpoints are deferred.

## Context

The existing web-compatible authentication endpoints issue stateless JWTs and must remain compatible. The Expo mobile target needs durable session restoration, refresh-token rotation, explicit revocation, and reuse detection without storing long-lived bearer credentials in plaintext.

## Threat Model

Refresh tokens are long-lived credentials. The design assumes an attacker may obtain database read access or replay an old client token. It does not assume server environment secrets are exposed at the same time as database rows. It also assumes access tokens can be short lived and are not durable session truth.

Refresh tokens and refresh-token hashes must not be logged. Device metadata is optional, bounded display metadata only; no sensitive device fingerprints are stored.

## Token Responsibilities

Mobile access tokens are short-lived JWTs sent as `Authorization: Bearer <token>`. They include:

```ts
{
  sub: string;
  userId: number;
  roles: ERole[];
  sessionId: string;
}
```

Existing non-mobile JWTs may continue without `sessionId`.

Refresh tokens are opaque base64url strings generated from Node cryptographic random bytes. They are returned only on initial issue and rotation, stored by the client in SecureStore, and never placed in JWT claims.

## Refresh-Token Hashing

Refresh tokens are uniformly random high-entropy secrets, so the server stores `HMAC-SHA-256(refreshToken, MOBILE_REFRESH_TOKEN_PEPPER)` rather than Argon2 or BCrypt. Password hash algorithms are designed for low-entropy human secrets; the expensive work factor is not needed for random 32+ byte tokens and would raise refresh latency without meaningful brute-force protection.

The pepper is separate from `JWT_SECRET`, validated through the central configuration layer, required in production, and redacted from logs.

## Database Model

The new `mobile_sessions` table stores one row per refresh-token version:

- `id`: internal numeric primary key.
- `session_id`: non-guessable UUID exposed in access-token claims and future session-management APIs.
- `user_id`: required FK to `users`, `ON DELETE CASCADE`.
- `token_family_id`: UUID grouping all rotations for one logical session lineage.
- `refresh_token_hash`: unique HMAC digest of the current or historical refresh token.
- `previous_session_row_id`: FK to the previous token-version row, `ON DELETE RESTRICT`.
- `replaced_by_session_row_id`: FK to the replacement token-version row, `ON DELETE SET NULL`.
- `device_name`, `device_platform`: optional bounded safe metadata.
- `created_at`, `last_used_at`, `rotated_at`, `expires_at`, `revoked_at`: UTC MySQL `DATETIME` strings.

`rotated_at` is null for the active leaf token. It is set when that token version is successfully replaced. Family revocation sets `revoked_at` on all rows but does not rewrite historical `rotated_at`.

Indexes cover user listing, token-family revocation, hash lookup, active-session listing, cleanup, and replacement-chain traversal.

## Rotation Model

Rotation creates a new token-version row under the same stable `session_id` and `token_family_id`. The previous row is marked with `rotated_at`, revoked, and linked to the replacement row atomically. This keeps old refresh-token hashes available for replay/reuse detection while future session listing can still show one logical device session.

At most one refresh with the same credential can succeed because the repository locks the matching row with `SELECT ... FOR UPDATE` inside a transaction.

The mutation is also defensively conditional: the previous row is updated only when `replaced_by_session_row_id IS NULL` and `revoked_at IS NULL`. If that condition fails, the transaction rolls back and no replacement branch is committed.

Access-token issuance happens inside the same database transaction as session creation or rotation. If JWT signing fails, session creation leaves no row, and rotation leaves the old refresh credential valid with no replacement row.

## Reuse Detection

Concurrent refresh requests can legitimately replay the same old token: one request rotates successfully, while another request resumes after waiting on the old row lock and sees the row has already been replaced. Revoking the whole family immediately in that case would invalidate the replacement token already returned by the successful request.

To avoid that failure mode, an already-replaced token presented within `MOBILE_REFRESH_TOKEN_REUSE_GRACE_MS` of `rotated_at` is treated as immediate replay. The old token is still rejected, the replacement token is not returned again because plaintext refresh tokens are not retained, and the token family is not revoked. Future HTTP callers should still receive the same generic mobile-session failure.

If the already-replaced token is presented after the short grace window, it is treated as suspected refresh-token reuse. The application revokes the complete token family atomically, commits that revocation, and then returns a generic mobile-session failure.

Safe security events are emitted after the database transaction commits. Event recording is best effort; telemetry or logging failure must not roll back a committed family revocation or make that revocation appear unsuccessful. A durable outbox may be added later if guaranteed event delivery becomes a requirement.

Internal error codes distinguish `invalid_mobile_session`, `immediate_replay`, `mobile_session_expired`, `mobile_session_revoked`, `mobile_refresh_token_reuse`, and `mobile_session_not_found` for tests and safe logs. Future HTTP endpoints should map sensitive refresh failures to one external `invalid_mobile_session` response.

## Revocation And Logout

Implemented application operations support:

- idempotent current-device logout by refresh token;
- revoke one stable session ID for the authenticated owner;
- revoke all sessions for a user with optional current-session exclusion;
- list active, unexpired, unreplaced sessions for a user.

Users cannot inspect or revoke another user's sessions because repository operations scope by `user_id`. Deleting a user cascades mobile-session rows, leaving no usable sessions.

## Cleanup

Cleanup is explicit and not request-driven. `pnpm db:cleanup-mobile-sessions` deletes bounded batches of expired or long-revoked leaf rows. Leaf-only deletion preserves replacement-chain foreign-key integrity; repeated batches can drain old chains from newest to oldest. Retention is controlled by `MOBILE_SESSION_CLEANUP_RETENTION_MS`.

## Compatibility

The existing web-compatible endpoints remain stateless and unchanged:

- `POST /api/auth/signin`
- `POST /api/auth/signup`
- `GET /api/auth/logout`

Mobile flows will use separate endpoints in a later task.

## Future Provider Integration

Future Google and Apple login should validate provider authorization through backend-owned Authorization Code + PKCE flows, link immutable provider subjects to internal users, and then issue the same GymNotebook mobile session token pair. Provider tokens must not become GymNotebook API access tokens.

## Unresolved Decisions

- Exact mobile HTTP endpoint handlers and error response mapping.
- Whether to expose coarse security-event history to users.
- Active-session count limits or device-name editing.
- Production scheduling for the cleanup command.
