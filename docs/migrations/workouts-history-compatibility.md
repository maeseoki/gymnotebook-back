# Workouts And History Compatibility

| Legacy behavior | New behavior | Preserved or changed | Reason | Frontend impact |
| --- | --- | --- | --- | --- |
| Routes queried users by JWT username. | Routes use immutable JWT `userId`. | Changed. | Avoids repeated user lookups and username coupling. | No frontend impact when JWT payload is current. |
| Workout creation inserted rows outside an explicit transaction. | Workout, workout groups and individual sets are inserted in one transaction. | Changed. | Prevents partial workout graphs. | Failed creation now leaves no partial rows. |
| Duplicate UUID returned a Spanish text conflict and relied on pre-checks. | Duplicate UUID, including races, returns `409 workout_already_exists`; the database unique constraint is authoritative. | Changed. | Stable error contract. | Clients should branch on `code`. |
| Referenced exercises were not ownership-validated. | Every unique exercise ID is validated in one set-based query for the authenticated user. Missing and foreign-owned IDs return `404 workout_exercise_not_available`. | Changed. | Prevents cross-user workout references without leaking existence. | Frontend must only submit owned exercise IDs. |
| Server-local date conversion used `Date` and `setHours`. | API timestamps must include offset/`Z`, are converted to UTC, stored as UTC MySQL `DATETIME`, and returned as ISO UTC strings. | Changed. | Removes host timezone dependence. | Clients must send timezone-aware timestamps. |
| `GET /api/workout/workouts/:date` accepted loosely parsed dates and used server-local day bounds. | `date` is strict `YYYY-MM-DD`; local day is calculated from `timezone` query or `DEFAULT_TIMEZONE` with a half-open UTC range. | Changed. | Correct DST and deployment-independent behavior. | Clients should pass the user's IANA timezone. |
| `GET /api/workout/days/:month/:year` used MySQL `DAY/MONTH/YEAR`, depending on stored wall-clock assumptions. | The API queries a bounded UTC month range and converts matching UTC instants to local day numbers in application code. | Changed. | Avoids MySQL timezone table dependence and handles UTC/local boundary shifts. | Day results now follow the supplied timezone. |
| Nested workout reads used queries inside loops. | Workouts-by-date uses three fixed queries: workouts, groups+live exercises, sets. | Changed. | Removes N+1 behavior. | No response-shape impact except deterministic ordering. |
| Exercise history counted by loading all matching rows and fetched sets inside loops. | History uses `COUNT(*)`, one page query, and one set query. | Changed. | Bounded query behavior and proper pagination. | `pageSize` replaces legacy `size`; `sortBy/sortDirection` replace generic `sort`. |
| Generic `sort` input was ignored or unsafe. | Sorting is allowlisted: `startDate`, `endDate`, `id`; direction is `asc` or `desc`; ID is used as deterministic tie-breaker. | Changed. | Prevents untrusted SQL ordering and nondeterministic pages. | Unsupported sort fields return validation errors. |
| Negative measurements could pass through contracts. | Reps, weight, time and distance are nonnegative integers. Fractional values remain unsupported. | Changed. | Matches legacy integer columns while rejecting invalid values. | Clients must not submit negative or fractional measurements. |
| Workout update/delete endpoints were absent. | They remain absent. | Preserved. | Out of scope for this phase. | No new update/delete support. |

## Query Count

- Creating a workout graph uses one set-based exercise validation query plus one transaction. Inside the transaction it performs one workout insert, one batched group insert when groups exist, and one batched individual-set insert when sets exist.
- Getting workouts for one date uses three fixed read queries: workouts, workout groups joined to live exercises, and individual sets.
- Getting one exercise history page uses four fixed read queries: owned exercise check, `COUNT(*)`, page of workout groups, and individual sets for that page.

These counts are not proportional to the number of groups, sets or exercises in a response.

## Legacy Timestamp Migration Risk

Existing Spring Boot rows in `workouts.start_date`, `workouts.end_date`, `workout_sets.start_date`, `workout_sets.end_date` and `sets.start_date` may have been written as server-local wall-clock values. The Fastify rewrite now treats stored `DATETIME` values as UTC wall-clock values. Before adopting an existing production database:

1. Identify the timezone used by the legacy server when rows were written.
2. Sample rows around DST and UTC/local day boundaries.
3. Compare user-visible workout dates against expected local calendar days.
4. Back up the database.
5. Run a versioned timestamp migration only after the legacy timezone assumption is proven.

The API does not silently rewrite or reinterpret existing timestamps automatically.
