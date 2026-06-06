# GymNotebook Backend Rewrite Instructions (Spring Boot -> Fastify)

This document is the complete implementation map I would follow to rewrite this backend in Fastify.

## 1) Current stack and runtime behavior to preserve

- Java 17, Spring Boot 3.0.5
- Spring Web + Spring Security + Spring Data JPA
- MySQL persistence
- JWT auth via Authorization header token
- Global CORS enabled (`*`)
- Global validation and exception mapping

Configuration currently expected:

- `server.port`
- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `spring.jpa.hibernate.ddl-auto`
- `gymnotebook.jwtSecret` (base64 512-bit key)
- `gymnotebook.jwtExpirationMs`

## 2) Domain model (entities/tables)

Implement equivalent schema (or compatible migration) for:

### `users`

- `id: Long` (PK)
- `username: String` (unique)
- `email: String` (unique)
- `password: String`

Relations:
- many-to-many with `roles` via `user_roles`
- one-to-many with `workouts`
- one-to-many with `exercises`

### `roles`

- `id: Integer` (PK)
- `name: ERole` where values:
  - `ROLE_USER`
  - `ROLE_MODERATOR`
  - `ROLE_ADMIN`

### `image_data`

- `id: Long` (PK)
- `name: String`
- `type: String` (MIME)
- `image_data: byte[]` (`MEDIUMBLOB`)

### `exercises`

- `id: Long` (PK)
- `name: String` (required)
- `image` relation to `image_data` (nullable)
- `description: String` (nullable)
- `type: EExerciseType` (required):
  - `WEIGHT`, `REPS`, `TIME`, `DISTANCE`, `WEIGHT_REPS`, `TIME_DISTANCE`
- `primaryMuscleGroup: EMuscleGroup` (required)
- `secondaryMuscleGroup: EMuscleGroup` (nullable)
- `user_id` relation to `users` (required)

`EMuscleGroup` values:
- `ABDOMINALS, ABDUCTORS, BICEPS, CALVES, CARDIO, CHEST, FOREARMS, FULL_BODY, GLUTES, HAMSTRINGS, LATS, LOWER_BACK, QUADRICEPS, SHOULDERS, TRAPS, TRICEPS, UPPER_BACK, OTHER`

### `workouts`

- `id: Long` (PK)
- `uuid: String` (must be unique in behavior; currently checked before insert)
- `user` relation to `users`
- `startDate: LocalDateTime`
- `endDate: LocalDateTime`
- `notes: String`

### `workout_sets`

- `id: Long` (PK)
- `workout_id` relation to `workouts` (required)
- `exercise` relation to `exercises` (required)
- `startDate: LocalDateTime` (nullable)
- `endDate: LocalDateTime` (nullable)
- `notes: String` (nullable)

### `sets`

- `id: Long` (PK)
- `reps: int`
- `weight: int`
- `time: int`
- `distance: int`
- `notes: String`
- `isDropSet: boolean`
- `workoutSet_id` relation to `workout_sets` (required)
- `startDate: LocalDateTime` (nullable)

## 3) DTO contracts to preserve

## Request DTOs

### `LoginRequest`
- `username` (required, not blank)
- `password` (required, not blank)

### `SignupRequest`
- `username` (required, 3..20, alphanumeric)
- `email` (required, email, max 50)
- `password` (required, 6..40)
- `role: Set<String>` (optional)

### `ModifyRoleRequest`
- `userId: Long` (annotated `@NotBlank` in source, semantically required)
- `newRole: ERole` (annotated `@NotBlank` in source, semantically required)

### `CreateExerciseRequest`
- `name` (required, max 200)
- `imageId: Long` (optional)
- `description` (optional, max 500)
- `type: EExerciseType` (required)
- `primaryMuscleGroup: EMuscleGroup` (required)
- `secondaryMuscleGroup: EMuscleGroup` (optional)

### `UpdateExerciseRequest`
- extends `CreateExerciseRequest`
- adds `id: Long` required
- endpoint still uses path `/{id}` as source of truth for target record

### `ExerciseRequest`
- `id: Long`

### `SetRequest`
- `reps, weight, time, distance: int`
- `notes: String`
- `isDropSet: boolean`
- `startDate: Instant`

### `WorkoutSetRequest`
- `exercise: ExerciseRequest`
- `sets: SetRequest[]`
- `startDate: Instant`
- `endDate: Instant`
- `notes: String`

### `CreateWorkoutRequest`
- `uuid: String`
- `startDate: Instant`
- `workoutSets: WorkoutSetRequest[]`
- `endDate: Instant`
- `notes: String`

## Response DTOs

### `JwtResponse`
- `token`
- `type` (`Bearer`)
- `id`
- `username`
- `email`
- `roles: List<String>`

### `MessageResponse`
- `message: String`

### `GetUserDtoResponse`
- `id, username, email, password, roles`

### `UserResponse`
- `id, username, email, roles`

### `ExerciseResponse`
- `id, name, description, imageId, type, primaryMuscleGroup, secondaryMuscleGroup`

### `SetResponse`
- `id, reps, weight, time, distance, notes, isDropSet, startDate`

### `WorkoutSetResponse`
- `id, startDate, endDate, exercise: ExerciseResponse, sets: List<SetResponse>, notes`

### `AllExercisesResponse`
- `id, name, description, imageId, type, primaryMuscleGroup, secondaryMuscleGroup`
- currently present but not used by controllers

## 4) Repository/query behavior to preserve

- `UserRepository`
  - `findByUsername`
  - `existsByUsername`
  - `existsByEmail`
- `RoleRepository.findByName(ERole)`
- `ExerciseRepository.findByUser(User)`
- `ExerciseRepository.findByIdAndUserId(exerciseId, userId)`
- `ImageDataRepository.findByName(name)`
- `WorkoutRepository.existsByUuid(uuid)`
- `WorkoutRepository.findWorkoutDaysByMonthAndYear(userId, month, year)` (native SQL `EXTRACT`)
- `WorkoutRepository.findWorkoutsByUserAndDateBetween(user, startOfDay, endOfDay)`
- `WorkoutSetRepository.findByExerciseId(exerciseId, pageable)`

## 5) Security and auth behavior

## JWT

- Token generation includes:
  - subject = username
  - claim `roles` = authorities
  - expiration from `gymnotebook.jwtExpirationMs`
- Signing key from base64-decoded `gymnotebook.jwtSecret`

## Auth filter behavior

- Reads `Authorization` header
- Expects token prefix in `Authorization` header
- Validates JWT and loads user details
- Populates request auth context

## Route access rules (`WebSecurityConfig`)

- Public:
  - `/api/auth/**`
  - `/api/test/**`
  - `GET /api/image/**`
- Auth required:
  - all others

Method-level role checks are also used (`@PreAuthorize`) in User/Test controllers and must be reimplemented in Fastify preHandlers.

## 6) Exception/validation behavior

Global exception mapping currently returns:

- Validation errors -> `400` + `MessageResponse(fieldErrorMessage)`
- `NullPointerException` -> `400` + fixed message
- `ResourceNotFoundException` -> `404` + message
- `IllegalArgumentException` -> `400` + message
- `AccessDeniedException` -> `403` + fixed message
- `DataIntegrityViolationException` -> `409` + fixed message

Unauthorized auth failures are returned as JSON:

- `status` (401)
- `error` (`Unauthorized`)
- `message`
- `path`

## 7) Endpoint inventory (complete)

## Auth (`/api/auth`)

### `POST /api/auth/signin`
- Body: `LoginRequest`
- Success: `200` `JwtResponse`

### `POST /api/auth/signup`
- Body: `SignupRequest`
- Behavior:
  - reject duplicate username/email (`400` + `MessageResponse`)
  - force default user role logic (admin/mod signup disabled)
- Success: `201` + location header + success `MessageResponse`

### `GET /api/auth/logout`
- Clears security context
- Success: `200` `MessageResponse`

## Exercise (`/api/exercise`) [authenticated]

### `GET /api/exercise`
- Returns exercises of current user
- Response: `200` `ExerciseResponse[]`

### `GET /api/exercise/{id}`
- `404` if exercise not found
- `401` if exercise is not owned by current user
- Response: `200` `ExerciseResponse`

### `POST /api/exercise`
- Body: `CreateExerciseRequest`
- Optional `imageId` lookup
- Response: `201` empty body

### `PUT /api/exercise/{id}`
- Body: `UpdateExerciseRequest`
- Ownership check (`401` if not owner)
- Response: `201` empty body

### `DELETE /api/exercise/{id}`
- Ownership check (`401` if not owner)
- Response: `204`

## Image (`/api/image`)

### `GET /api/image/{id}` (public)
- `404` if image not found
- Returns binary with stored `Content-Type`

### `POST /api/image` (authenticated)
- Multipart form field: `image`
- Empty file -> `400` with text message
- Success: `201` with numeric image id

### `DELETE /api/image/{id}` (authenticated)
- `404` if missing
- Success: `204`

## Workout (`/api/workout`) [authenticated]

### `POST /api/workout`
- Body: `CreateWorkoutRequest`
- Reject duplicate workout UUID with `409`
- Creates workout + nested workoutSets + nested sets
- Converts `Instant` to local server timezone `LocalDateTime`
- Success: `201`

### `GET /api/workout/days/{month}/{year}`
- Returns integer array of days with workouts
- Success: `200` `number[]`

### `GET /api/workout/workouts/{date}`
- `date` parsed via `DateTimeFormatter.ISO_DATE_TIME`
- Returns workouts for full day range
- Success: `200` `Workout[]` (entity payload)

## Workout Sets (`/api/workout-sets`) [authenticated]

### `GET /api/workout-sets/exercise/{exerciseId}`
- Query supports pagination via `page`, `size`, `sort`
- Validates exercise exists and belongs to user
- Response: `200` paginated `WorkoutSetResponse`

## User (`/api/user`)

### `GET /api/user`
- Roles: ADMIN or MODERATOR
- Response: `200` `UserResponse[]`

### `GET /api/user/verifyuser/{username}/{email}`
- Public route (auth required globally, but no role check)
- Returns `400` if username/email exists, else `200`

### `GET /api/user/me`
- Roles: USER or MODERATOR or ADMIN
- Response: `GetUserDtoResponse`

### `PUT /api/user/setpermissions`
- Role: ADMIN
- Body: `ModifyRoleRequest`
- Adds ADMIN or MODERATOR role to target user
- Current source returns `null` instead of `ResponseEntity` and does not save explicitly

### `PUT /api/user/removepermissions`
- Role: ADMIN
- Body: `ModifyRoleRequest`
- Removes ADMIN or MODERATOR role from target user
- Current source returns `null` instead of `ResponseEntity` and does not save explicitly

### `DELETE /api/user/{id}`
- Role: ADMIN
- Deletes user by id
- Success: `200` `MessageResponse`

## Test (`/api/test`)

### `GET /api/test/all` (public)
### `GET /api/test/user` (USER/MODERATOR/ADMIN)
### `GET /api/test/mod` (MODERATOR)
### `GET /api/test/admin` (ADMIN)
### `GET /api/test/me` (USER/MODERATOR/ADMIN)

## 8) Fastify rewrite architecture I would implement

- `src/app.ts`: Fastify bootstrap, plugin registration
- `src/plugins/`
  - `env.ts` (config validation)
  - `db.ts` (ORM connection)
  - `jwt.ts` (JWT sign/verify)
  - `auth.ts` (auth decorator + role guard)
  - `multipart.ts`
  - `cors.ts`
- `src/modules/auth|user|exercise|image|workout|workout-set|test/`
  - `routes.ts`
  - `controller.ts`
  - `service.ts`
  - `repository.ts` (or data-access adapter)
  - `schemas.ts` (request/response JSON schema)
  - `types.ts` (DTO/domain types)
- `src/common/`
  - error classes + centralized error handler
  - mapper functions (entity <-> DTO)
  - pagination helpers

ORM recommendation: Prisma or TypeORM; ensure schema/relations and enum values match exactly.

## 9) Ordered implementation plan (rewrite execution)

1. Set up Fastify app, env validation, health check.
2. Implement DB schema and migrations matching current entities/relations.
3. Seed roles (`ROLE_USER`, `ROLE_MODERATOR`, `ROLE_ADMIN`).
4. Implement JWT auth plugin + request auth context.
5. Implement role-based guard equivalents for method-level restrictions.
6. Implement shared validation schemas for all DTOs listed above.
7. Implement `auth` module endpoints and response contracts.
8. Implement `image` module (multipart upload + binary retrieval).
9. Implement `exercise` module with ownership checks.
10. Implement `workout` module (nested create transaction for workout/workoutSets/sets).
11. Implement `workout-sets` listing with pagination and nested DTO mapping.
12. Implement `user` module endpoints (including role modification flows).
13. Implement `test` module parity endpoints.
14. Implement global error handling to mirror status/message behavior.
15. Validate parity endpoint-by-endpoint with regression checklist.

## 10) Critical parity notes (do not miss)

- Keep response status codes as currently used (even where unconventional, e.g. update returning `201`).
- Preserve ownership checks for exercise and workout-set read paths.
- Preserve binary image retrieval with proper `Content-Type`.
- Preserve date conversion semantics from `Instant` to server-local `LocalDateTime`.
- Keep pagination contract for workout-sets.
- Preserve auth/public route boundaries exactly.
- Keep duplicate checks for username/email and workout UUID.
- Re-evaluate and explicitly decide behavior for two current anomalies:
  - `PUT /api/user/setpermissions` currently returns `null`
  - `PUT /api/user/removepermissions` currently returns `null`
