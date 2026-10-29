# Cross-School Data Isolation — Design

## Context

Phase 1 of multi-tenancy (shipped earlier) added `schoolId` to `auth-service` only: the `School`
and `User` entities, JWT claims, and the Super Admin "Add School" / "Subscription" / "Module
Access" screens. It was explicitly scoped as "foundation only" — the other 5 services
(student, academic, attendance, fee, notification) were left untouched, with a known,
communicated limitation: every entity in those services is a single shared dataset with no
`schoolId` at all.

That limitation surfaced as a live-production bug: the user created a second real school via
Super Admin, logged in as its admin, and saw the first school's student data. This spec covers
making all 5 remaining services genuinely school-isolated, closing that gap completely.

**Confirmed with the user before this design:**
- All 5 services get isolated in one piece of work (not a partial fix).
- No real data was entered through the other school logins (Test School A, Masoodthaika) —
  only testing. So every existing row in these 5 services can be safely backfilled to
  `schoolId = 1` (Default School) with no manual data-reattribution step needed.
- Inter-service calls will carry an explicit `schoolId` query parameter (not JWT forwarding) —
  consistent with the codebase's existing convention that internal service-to-service calls are
  trusted via network isolation, not re-authenticated (see `NotificationServiceClient`'s existing
  javadoc, which already documents this as intentional).

## Goals

- Every entity in student-service, academic-service, attendance-service, fee-service, and
  notification-service is scoped to the school that owns it: reads filtered, writes stamped,
  cross-school access rejected.
- Inter-service calls (`StudentServiceClient` × 4, `AcademicServiceClient`,
  `NotificationServiceClient`) carry the correct schoolId instead of silently operating across
  all schools.
- Existing production data (all currently under the shared/Default School) keeps working
  unchanged after this ships — Default School's admin sees exactly what they see today.
- Parent login keeps working: a parent authenticates with phone+password without knowing their
  schoolId in advance.

## Non-goals

- No change to auth-service's existing Phase 1 schoolId plumbing (already correct).
- No per-school data export/clear tooling (explicitly deferred until this isolation ships and is
  verified — building it against unisolated data was previously identified as unsafe).
- No change to how JWTs are issued or their claim shape (already carries `schoolId` since
  Phase 1; this work only adds *consumers* of that claim in the other 5 services).

## Entities affected

| Service | Entities |
|---|---|
| student-service | `Student` |
| academic-service | `AcademicClass`, `Exam`, `Homework`, `Subject`, `Mark`, `BoardResult`, `ClassSchedule` |
| attendance-service | `Holiday`, `Attendance`, `LeaveReason`, `LeaveRequest`, `TeacherLeaveRequest` |
| fee-service | `Fee`, `Payment` |
| notification-service | `Notification` |

16 entities total.

## Design

### 1. Entity changes & migration

Each entity gets a `schoolId` (Long) column, added **nullable** — not `@Column(nullable = false)`.
This is a hard requirement, not a style choice: Hibernate's `ddl-auto=update` adds new columns as
a single `ALTER TABLE ... ADD COLUMN ... NOT NULL` statement, which fails outright against a table
that already has rows (confirmed twice this session — once with the `users_role_check` CHECK
constraint, once with `class_schedule`'s new `scheduleDate`/`block` columns). Every one of these
16 tables already has production rows.

Each service gets one idempotent `CommandLineRunner` (mirroring `RoleCheckConstraintRepairRunner`
and `ClassScheduleMigrationRunner` from this session) that runs once per boot:

```sql
UPDATE <table> SET school_id = 1 WHERE school_id IS NULL;
```

This is safe specifically because the user confirmed no real data exists under any school other
than Default School (id=1) yet. Required-ness for *new* rows is enforced at the application layer
(service/controller always stamps the caller's schoolId before save), not at the DB level —
consistent with how `ClassSchedule.scheduleDate`/`block` were just handled.

### 2. Request-time scoping

Each service's `JwtDecoder` (already exists per service, already extracts `role`/`userId`/
`studentId`) gets one more method:

```java
public Long getSchoolId(String token) {
    // same pattern as getStudentId — claims.get("schoolId", Long.class)
}
```

Every controller resolves the caller's schoolId once (same place it already resolves/verifies
role, e.g. `ScheduleController.verifyAdminRole`) and:
- **Reads** (list/get-by-id/get-by-class endpoints): filter by `schoolId = :callerSchoolId`.
- **Writes** (create): stamp `schoolId` from the caller's token, ignoring any schoolId the client
  might send in the request body.
- **Writes** (update/delete by id): look the row up *with* the schoolId filter — if it belongs to
  a different school, the row is treated as not found (404), not forbidden (403). This avoids
  confirming to one school's admin that another school's record ID exists at all.

SUPER_ADMIN tokens have no schoolId (by design, unchanged from Phase 1) and have no reason to
call these 5 services directly today — no special-casing needed there.

### 3. Inter-service calls

Five internal clients need a `schoolId` parameter added to every method, threaded through from
the calling controller (which already resolved its own schoolId per section 2):

| Client | Caller service | Target service |
|---|---|---|
| `StudentServiceClient` | auth-service | student-service |
| `StudentServiceClient` | academic-service | student-service |
| `StudentServiceClient` | attendance-service | student-service |
| `StudentServiceClient` | fee-service | student-service |
| `AcademicServiceClient` | student-service | academic-service |
| `NotificationServiceClient` | attendance-service | notification-service |

Each call adds `&schoolId=<id>` to its existing URI; each target endpoint adds an optional
`schoolId` query parameter and filters by it when present. The one exception is auth-service's
`StudentServiceClient.verifyParentCredentials` — see section 4.

### 4. Parent login (special case)

`POST /api/students/verify-parent-credentials` must stay **unscoped** — at login time, a parent
is identified only by phone+password, and doesn't know their schoolId yet (there's no "pick your
school" step in this product). student-service keeps searching across all schools by credentials.

`ParentAuthResultDTO` (student-service) and `StudentAuthDTO` (auth-service) each gain a
`schoolId` field, populated from the matched `Student.schoolId`. auth-service's
`UserService`/`StudentServiceClient` already has everything needed to mint the JWT with the
correct schoolId (the 7-arg `JwtUtil.generateToken(...)` overload already takes schoolId) — this
just wires the value through instead of passing `null`.

### 5. Bulk import/export (student-service)

- `POST /api/students/import` (Excel): every created/updated row is stamped with the importing
  admin's schoolId (resolved from their JWT, same as section 2) — an admin can't import rows into
  another school even if the sheet is reused across schools.
- `GET /api/students/export`, `POST /api/students/bulk-validate`, `GET /api/students/bulk-template`:
  filtered/scoped to the caller's own school's data.

### 6. Testing

Local verification (two test schools, two admin logins, following the pattern already used to
verify Phase 1's module toggles this session):
1. Create a student under School A's admin; confirm School B's admin does not see it, and a
   direct `GET /api/students/{id}` for that student from School B's admin returns 404.
2. Repeat the create/isolate/404 check for one representative entity per remaining service
   (a Mark, an Attendance record, a Fee, a Notification) to confirm the pattern is applied
   consistently, not just on Student.
3. Confirm a parent login still resolves correctly and the parent's dashboard only shows their
   own student's data.
4. Confirm bulk import stamps the correct schoolId and bulk export/validate stay scoped.
5. Regression: existing Default School admin (`admin@school.com`) still sees all pre-existing
   data unchanged.

## Risks

- **Volume of touch points**: 16 entities × (entity, repository, service, controller) × 5
  services, plus 6 inter-service call sites, plus 2 special-cased flows. This is the largest
  single change made to this codebase this session. Mitigated by doing it as one coherent
  implementation plan (next step) rather than ad hoc, and by the consistent, already-proven
  pattern (nullable column + idempotent backfill runner) from this session's two prior fixes.
- **Missed inter-service call site**: if any internal call is missed, that one path silently
  stays cross-school. Mitigated by the explicit table in section 3 enumerating all known call
  sites (found via `grep` for `RestTemplate|WebClient|FeignClient|ServiceClient` across the
  whole `school-management` tree — no others exist today).
- **Production deploy risk**: this is a single combined deploy (all services ship together in one
  container, per the existing release process) touching every service at once. Mitigated by: full
  local verification per section 6 before any deploy, a DB backup immediately before deploying
  (as already standard practice for this project), and the nullable-column + idempotent-backfill
  approach meaning the migration can safely re-run on every boot without side effects if a deploy
  needs to be retried.
