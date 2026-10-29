# Cross-School Data Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope every entity in student-service, academic-service, attendance-service, fee-service and notification-service to the school that owns it, so a second school's admin never sees another school's data — closing the gap Phase 1 deliberately left open in auth-service only.

**Architecture:** Add a nullable `schoolId` column to each of the 16 affected entities, backfill existing rows to `schoolId = 1` (Default School) via an idempotent boot-time runner, extend each service's existing `JwtDecoder` with `getSchoolId(token)`, and have every controller filter reads / stamp writes / 404 on cross-school access by that value. Inter-service calls carry schoolId as an explicit query parameter supplied by the calling service (which already resolved it from its own caller's JWT).

**Tech Stack:** Spring Boot 3 / Java 17, Spring Data JPA, PostgreSQL (Neon in production, Docker locally), `jjwt` for JWT decode, React/Vite frontend (not touched by this plan — all changes are backend).

**Spec:** [docs/superpowers/specs/2026-10-29-cross-school-data-isolation-design.md](../specs/2026-10-29-cross-school-data-isolation-design.md)

## Global Constraints

- Every new `schoolId` column is added **nullable** (no `@Column(nullable = false)`). `ddl-auto=update` adds a new column as a single `ALTER TABLE ... ADD COLUMN ... NOT NULL` statement, which fails outright against a table that already has rows — confirmed twice this session (`users_role_check`, `class_schedule`'s `scheduleDate`/`block`). Required-ness for new rows is enforced in application code (every create stamps it), not the DB schema.
- Every service gets one idempotent `@Order(0) CommandLineRunner` (new `config` package class, e.g. `SchoolIdBackfillRunner`) that runs `UPDATE <table> SET school_id = 1 WHERE school_id IS NULL;` for every table that service owns, in a single runner per service, try-with-resources `DataSource`/`Statement`, logging a warning (never throwing) on failure — mirrors `RoleCheckConstraintRepairRunner` (auth-service) and `ClassScheduleMigrationRunner` (academic-service) from this session.
- Every service's `JwtDecoder` gains:
  ```java
  public Long getSchoolId(String token) {
      // same try/catch + claims.get(...) shape as getStudentId; returns null if absent/invalid
  }
  ```
- Cross-school access to a specific row by id (GET/PUT/DELETE `/{id}`) returns **404** (`ResourceNotFoundException`) when the row exists but belongs to a different school — never 403. Achieved by querying with the schoolId filter baked into the lookup itself (e.g. `findByIdAndSchoolId`), so "wrong school" and "doesn't exist" are indistinguishable to the caller.
- Every list/search endpoint filters by the caller's schoolId.
- Every create stamps the caller's resolved schoolId onto the new entity, ignoring any schoolId the request body might contain.
- Inter-service calls add `schoolId` as a query parameter on the existing URL, supplied by the calling controller/service (which already resolved its own schoolId as above). The receiving endpoint accepts it via `@RequestParam(required = false) Long schoolId` and prefers it over JWT-decoded schoolId when present (internal callers don't send a JWT at all, per the codebase's existing documented convention — see `NotificationServiceClient`'s javadoc and `StudentController.denyUnlessRoleOrInternal`).
- SUPER_ADMIN tokens carry no schoolId (unchanged, by design). None of these 5 services expect SUPER_ADMIN callers; a null schoolId with no explicit query param on a scoped endpoint returns an empty result (reads) or a 400 `BadRequestException` (writes) — never a 500/NPE.

## Review Focus

- **SUPER_ADMIN or malformed token hits a scoped endpoint directly** → schoolId resolves to `null`; reads must return empty, not throw. Covered in Task 1 (student) and re-verified per service.
- **Admin guesses/increments another school's record id** (GET/PUT/DELETE `/{id}` across any of the 16 entities) → must be 404, not 200 with leaked data, not 500. Covered by the `findByIdAndSchoolId`-style lookup required in every task below, explicitly tested in Task 1, 3, 5, 7, 8.
- **Internal call arrives with no Authorization header and no `schoolId` query param** (e.g. a stale client build, or the param is dropped somewhere) → must be rejected (400), never silently treated as "no filter, return everything." Covered in Task 2 (student-service's dual-path endpoints) and Task 8 (notification-service's internal POST).
- **Bulk import matches an existing `admissionNumber` that belongs to a different school** → current duplicate-detection is global by `admissionNumber`; must not let School B's import silently update School A's student. Covered in Task 2.
- **Migration runner re-runs on a later boot after rows are already correctly scoped** → `UPDATE ... WHERE school_id IS NULL` must be a no-op second time, not reassign already-correct non-Default-School data back to school 1. Covered in Task 1's verification (run the service twice, confirm row count affected is 0 the second time).

---

### Task 1: student-service — Student entity core isolation

**Files:**
- Modify: `school-management/student-service/src/main/java/com/school/student/entity/Student.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/repository/StudentRepository.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/service/StudentService.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/controller/StudentController.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/security/JwtDecoder.java`
- Create: `school-management/student-service/src/main/java/com/school/student/config/SchoolIdBackfillRunner.java`
- Test: `school-management/student-service/verify-isolation.sh` (new local-only verification script, not committed to the deploy artifact but fine to commit to the repo as a dev tool — same spirit as the PyJWT-based checks already used this session)

**Interfaces:**
- Produces: `JwtDecoder.getSchoolId(String token): Long`, `StudentRepository.findByIdAndSchoolId(Long id, Long schoolId): Optional<Student>`, `StudentService` methods gain a `Long schoolId` parameter (search/create/update/delete/status/clear-all/getStudentById/getClassStudentSummaries/countTotalStudents/countActiveStudents/countInactiveStudents).

- [ ] **Step 1: Add `private Long schoolId;` to `Student.java`** (nullable, no `@Column` annotation needed beyond the field itself — matches the plain-field style already used for `parentId`).

- [ ] **Step 2: Add `getSchoolId(String token)` to `student-service`'s `JwtDecoder`**, copying the exact try/catch shape of the existing `getStudentId` method, claim key `"schoolId"`.

- [ ] **Step 3: Add schoolId-scoped repository methods to `StudentRepository`**: `findByIdAndSchoolId(Long id, Long schoolId)`, and add a `schoolId` filter to whatever underlies `searchStudents`/`getClassStudentSummaries`/`countTotalStudents`/`countActiveStudents`/`countInactiveStudents` today (check the existing `@Query`/derived-method signatures in `StudentService` and extend each with a `schoolId` equality clause).

- [ ] **Step 4: Write `verify-isolation.sh`** — a bash script using `curl` that: signs two short-lived HS256 JWTs with the local dev secret (`C:\Users\yousuf.suhail_cloud-\.tools\school-local-jwt.secret`) for `ADMIN` role with `schoolId=1` and `schoolId=2` respectively (same PyJWT approach already used this session), creates a student as School 1's admin, then asserts: School 2's admin's `GET /api/students` does not list it, and School 2's admin's `GET /api/students/{id}` for that student's id returns 404.

- [ ] **Step 5: Run the script against the current (unmodified) code to confirm it fails** — the student currently leaks across schools. Expected: the isolation assertions fail (both schools see the student).

- [ ] **Step 6: Implement `SchoolIdBackfillRunner`** per the Global Constraints pattern, scoped to the `students` table only.

- [ ] **Step 7: Resolve the caller's schoolId in every `StudentController` method that isn't one of the internal-call endpoints** (`searchStudents`, `getClassStudentSummaries`, `getStudentById`, `getStudentsByParent`, `createStudent`, `updateStudent`, `resetParentPassword`, `deleteStudent`, `clearAllStudents`, `updateStudentStatus`) from the JWT via `jwtDecoder.getSchoolId(token)`, and thread it through to the now-schoolId-aware `StudentService`/`StudentRepository` methods from Step 3. `clearAllStudents` in particular must only delete the caller's own school's rows (`deleteAllInBatch` → a schoolId-scoped delete) — this was explicitly flagged earlier as unsafe to expose per-school before this work landed; this step is what makes it safe.

- [ ] **Step 8: Rebuild and restart student-service locally** (`mvn -o -f school-management/pom.xml -pl student-service clean package -DskipTests`, then `school-local.ps1 stop student-service` / `start student-service`), check the log for the backfill runner's output.

- [ ] **Step 9: Re-run `verify-isolation.sh`, confirm it now passes.** Also verify the Review Focus "wrong-school id access → 404" case explicitly (one extra curl in the script): School 2's admin `DELETE`/`PUT` on School 1's student id both return 404.

- [ ] **Step 10: Verify the backfill is idempotent** — restart student-service a second time, confirm the log shows 0 rows affected (not an error, not re-touching already-scoped rows).

- [ ] **Step 11: Commit**

```bash
git add school-management/student-service
git commit -m "Scope Student entity to schoolId"
```

---

### Task 2: student-service — internal-call endpoints, bulk import/export, parent login

**Files:**
- Modify: `school-management/student-service/src/main/java/com/school/student/controller/StudentController.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/service/StudentService.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/service/ExcelImportService.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/service/ExcelExportService.java`
- Modify: `school-management/student-service/src/main/java/com/school/student/dto/ParentAuthResultDTO.java`
- Test: extend `verify-isolation.sh` from Task 1

**Interfaces:**
- Consumes: Task 1's `JwtDecoder.getSchoolId`, `StudentRepository.findByIdAndSchoolId`, schoolId-aware `StudentService` methods.
- Produces: `ParentAuthResultDTO.schoolId: Long` (consumed by Task 9, auth-service).

- [ ] **Step 1: Write a `resolveSchoolId(String authHeader, Long schoolIdParam)` private helper in `StudentController`** returning `schoolIdParam` when non-null (trusted internal caller), else `jwtDecoder.getSchoolId(extractedToken)` when `authHeader` is present, else `null`.

- [ ] **Step 2: Add `@RequestParam(required = false) Long schoolId` to `getDistinctClasses`, `getActiveStudentsByClass`, `getActiveStudentsGroupedByClass`, and the internal-caller branch of `searchStudents`/`getStudentById`**, and use `resolveSchoolId` to filter the underlying `StudentService` calls. When both `authHeader` and `schoolId` are absent (no way to resolve a school at all) on these endpoints, return 400 via `BadRequestException` instead of running unfiltered — this is the dual-path endpoints' Review Focus case.

- [ ] **Step 3: Scope `ExcelImportService.importStudents`/`processBulkUpload`/`validateBulkUpload`** to take a `Long schoolId` parameter (resolved by the controller from the admin's JWT, Task 1 style): stamp it on every created/updated `Student`, and change the existing admissionNumber duplicate-detection query to also filter by `schoolId` — so an import can create a student with an admissionNumber that collides with a *different* school's student without overwriting it (Review Focus case).

- [ ] **Step 4: Scope `ExcelExportService.generateBackup`** and the `bulk-template` endpoint's class-lookup to the caller's schoolId.

- [ ] **Step 5: Add `private Long schoolId;` to `ParentAuthResultDTO`**, and populate it in `StudentService.verifyParentCredentials` from the matched `Student.getSchoolId()`. The credential search itself stays unscoped (no schoolId filter on the lookup) — a parent doesn't know their school at login time.

- [ ] **Step 6: Extend `verify-isolation.sh`**: (a) call `GET /api/students/classes` and `/active-by-class` with no Authorization header and no `schoolId` param, assert 400; (b) call them with `schoolId=1` and no auth header, assert the result only reflects School 1's students; (c) import an Excel file as School 2's admin containing an admissionNumber that already exists for School 1, assert School 1's student is unchanged and School 2 now has its own student with that admissionNumber.

- [ ] **Step 7: Run the extended script, confirm the new assertions fail against the current (Step-1-only) code**, then implement Steps 1-5 if not already done in order, rerun until green.

- [ ] **Step 8: Rebuild, restart student-service, re-run the full `verify-isolation.sh`, confirm all pass.**

- [ ] **Step 9: Commit**

```bash
git add school-management/student-service
git commit -m "Scope student-service internal-call endpoints, bulk import/export, and parent login to schoolId"
```

---

### Task 3: academic-service — isolate all 7 entities

**Files:**
- Modify: `school-management/academic-service/src/main/java/com/school/academic/entity/{AcademicClass,Exam,Homework,Subject,Mark,BoardResult,ClassSchedule}.java`
- Modify: matching 7 repository interfaces in `school-management/academic-service/src/main/java/com/school/academic/repository/`
- Modify: `school-management/academic-service/src/main/java/com/school/academic/service/*.java` (service classes backing each entity)
- Modify: `school-management/academic-service/src/main/java/com/school/academic/controller/AcademicController.java`
- Modify: `school-management/academic-service/src/main/java/com/school/academic/controller/ScheduleController.java`
- Modify: `school-management/academic-service/src/main/java/com/school/academic/security/JwtDecoder.java`
- Create: `school-management/academic-service/src/main/java/com/school/academic/config/SchoolIdBackfillRunner.java` (new sibling class — leave the existing `ClassScheduleMigrationRunner` and its legacy-column repair untouched)
- Test: `school-management/academic-service/verify-isolation.sh`

**Interfaces:**
- Produces: `JwtDecoder.getSchoolId`, `findByIdAndSchoolId` on each of the 7 repositories.

- [ ] **Step 1: Add `private Long schoolId;` to all 7 entities.**

- [ ] **Step 2: Add `getSchoolId(String token)` to academic-service's `JwtDecoder`** (same shape as Task 1 Step 2).

- [ ] **Step 3: Add `findByIdAndSchoolId` plus a `schoolId` filter on every existing list/query method** across the 7 repositories (follow each entity's existing query method names — e.g. `ClassScheduleRepository`'s methods from this session's Daily Schedule work become `findByClassNameAndSectionAndSchoolIdOrder...` etc.).

- [ ] **Step 4: Write `verify-isolation.sh`** covering one representative check per entity: create a Mark as School 1 admin, confirm School 2 admin's list doesn't include it and direct-id access 404s. (Spot-check the other 6 entities' list endpoints return empty for School 2 rather than full CRUD-cycling all 7 — the pattern is identical to Mark, exhaustively re-testing it 7 times is not proportionate.)

- [ ] **Step 5: Run the script, confirm it fails against current code.**

- [ ] **Step 6: Implement the `SchoolIdBackfillRunner`** covering all 7 tables (`academic_classes`, `exams`, `homeworks`, `subjects`, `marks`, `board_results`, `class_schedule`) in one idempotent runner.

- [ ] **Step 7: Resolve the caller's schoolId in every method of `AcademicController` and `ScheduleController`**, threading it through to the now-schoolId-aware service/repository methods from Step 3, following the exact resolve/filter/stamp/404 pattern from Task 1 Step 7 (list → filter, create → stamp, update/delete by id → `findByIdAndSchoolId` then 404 if absent).

- [ ] **Step 8: Rebuild, restart academic-service, re-run `verify-isolation.sh`, confirm green. Restart a second time, confirm the backfill is a no-op (Review Focus case).**

- [ ] **Step 9: Commit**

```bash
git add school-management/academic-service
git commit -m "Scope all academic-service entities to schoolId"
```

**Note — `AcademicServiceClient` (student-service → academic-service, `DELETE /api/academic/marks/student/{studentId}`) needs no schoolId change.** It targets a single already-unique `studentId` (auto-increment PK), and Task 1 Step 7 already makes student-service's own delete path 404 on a cross-school student id — so this cleanup call only ever fires for a student that genuinely belonged to the deleting admin's own school. No separate task required for this call site.

---

### Task 4: academic-service — inter-service call wiring

**Files:**
- Modify: `school-management/academic-service/src/main/java/com/school/academic/service/StudentServiceClient.java`
- Modify: `school-management/academic-service/src/main/java/com/school/academic/service/MarkBulkUploadService.java` (wherever it calls `StudentServiceClient`)
- Modify: `school-management/academic-service/src/main/java/com/school/academic/controller/AcademicController.java` (wherever it calls `StudentServiceClient`, to pass the already-resolved schoolId from Task 3 Step 7 through)

**Interfaces:**
- Consumes: Task 2's `schoolId` query param contract on student-service's `/classes`, `/active-by-class`, `/class/{className}/active` endpoints.
- Consumes: Task 3's resolved-schoolId-per-request pattern in `AcademicController`.

- [ ] **Step 1: Add a `Long schoolId` parameter to `StudentServiceClient.getDistinctClasses`, `getActiveStudentsByClass`, `getAllStudents`**, appending `&schoolId=` + the value to each constructed URI.

- [ ] **Step 2: Update every call site of these 3 methods** (in `AcademicController` and `MarkBulkUploadService`) to pass the caller's already-resolved schoolId (from Task 3's per-request resolution) instead of calling with no argument.

- [ ] **Step 3: Write a curl-based check**: as School 1's admin with a student only in School 1, hit whichever academic-service endpoint triggers `getActiveStudentsByClass`/`getAllStudents` (e.g. the Mark-entry class roster lookup) as School 2's admin, confirm School 1's student does not appear.

- [ ] **Step 4: Run the check, confirm it fails against current (Step-1-unimplemented) code, implement, rerun until it passes.**

- [ ] **Step 5: Commit**

```bash
git add school-management/academic-service
git commit -m "Thread schoolId through academic-service's calls into student-service"
```

---

### Task 5: attendance-service — isolate all 5 entities

**Files:**
- Modify: `school-management/attendance-service/src/main/java/com/school/attendance/entity/{Holiday,Attendance,LeaveReason,LeaveRequest,TeacherLeaveRequest}.java`
- Modify: matching 5 repository interfaces
- Modify: service classes backing each entity
- Modify: `school-management/attendance-service/src/main/java/com/school/attendance/controller/AttendanceController.java`
- Modify: `school-management/attendance-service/src/main/java/com/school/attendance/security/JwtDecoder.java`
- Create: `school-management/attendance-service/src/main/java/com/school/attendance/config/SchoolIdBackfillRunner.java`
- Test: `school-management/attendance-service/verify-isolation.sh`

Same step shape as Task 3 (Steps 1-9: add field ×5, extend JwtDecoder, add `findByIdAndSchoolId` + filters ×5, write failing verification script covering one representative entity (`Attendance`) plus a spot-check on `LeaveRequest`, confirm red, implement backfill runner, resolve+thread schoolId through every `AttendanceController` method, rebuild/restart/verify green, verify idempotent backfill, commit).

- [ ] **Step 1-9: Apply the Task 3 step sequence to Holiday, Attendance, LeaveReason, LeaveRequest, TeacherLeaveRequest and `AttendanceController`.**

- [ ] **Step 10: Commit**

```bash
git add school-management/attendance-service
git commit -m "Scope all attendance-service entities to schoolId"
```

---

### Task 6: attendance-service — inter-service call wiring

**Files:**
- Modify: `school-management/attendance-service/src/main/java/com/school/attendance/service/StudentServiceClient.java`
- Modify: `school-management/attendance-service/src/main/java/com/school/attendance/service/NotificationServiceClient.java`
- Modify: `school-management/attendance-service/src/main/java/com/school/attendance/controller/AttendanceController.java` and `AttendanceService.java` (wherever these clients are called, to thread the already-resolved schoolId through)

**Interfaces:**
- Consumes: Task 2's dual-path endpoints on student-service; Task 8's dual-path `POST /api/notifications` on notification-service (see Task 8 below — implement this task's `NotificationServiceClient` change after Task 8 lands, or stub the parameter now and verify the end-to-end check once Task 8 exists).

- [ ] **Step 1: Add a `Long schoolId` parameter to every `StudentServiceClient` method in attendance-service**, same approach as Task 4 Step 1.

- [ ] **Step 2: Add a `Long schoolId` parameter to `NotificationServiceClient.notify`/`notifyStudent`**, included in the request body map (`body.put("schoolId", schoolId)`) alongside the existing `audience`/`message`/`date` fields.

- [ ] **Step 3: Update every call site in `AttendanceController`/`AttendanceService`** to pass the caller's resolved schoolId (from Task 5) into both clients.

- [ ] **Step 4: Write a curl-based check**: submit a teacher-leave request as School 2's admin/teacher, confirm the resulting notification (once Task 8 lands) carries School 2's schoolId and School 1 never sees it.

- [ ] **Step 5: Run, confirm red (or deferred — note in the script if Task 8 isn't done yet), implement, rerun.**

- [ ] **Step 6: Commit**

```bash
git add school-management/attendance-service
git commit -m "Thread schoolId through attendance-service's inter-service calls"
```

---

### Task 7: fee-service — isolate Fee and Payment, wire StudentServiceClient

**Files:**
- Modify: `school-management/fee-service/src/main/java/com/school/fee/entity/{Fee,Payment}.java`
- Modify: matching repository interfaces
- Modify: `school-management/fee-service/src/main/java/com/school/fee/service/FeeService.java`, `FeeExcelService.java`
- Modify: `school-management/fee-service/src/main/java/com/school/fee/service/StudentServiceClient.java`
- Modify: `school-management/fee-service/src/main/java/com/school/fee/controller/FeeController.java`
- Modify: `school-management/fee-service/src/main/java/com/school/fee/security/JwtDecoder.java`
- Create: `school-management/fee-service/src/main/java/com/school/fee/config/SchoolIdBackfillRunner.java`
- Test: `school-management/fee-service/verify-isolation.sh`

Same step shape as Task 3, combined with Task 4's inter-service wiring pattern since fee-service is small enough to do both in one task:

- [ ] **Step 1-9: Apply the Task 3 step sequence to Fee, Payment and `FeeController`** (entity fields, JwtDecoder, repository `findByIdAndSchoolId` + filters, failing script, backfill runner, resolve+thread through controller, rebuild/verify/idempotency check).

- [ ] **Step 10: Add a `Long schoolId` parameter to every `StudentServiceClient` method in fee-service** and update its call sites in `FeeService`/`FeeExcelService` to pass the caller's resolved schoolId — same as Task 4 Steps 1-2.

- [ ] **Step 11: Extend the verification script** to confirm fee-service's class-roster lookups (used when billing a whole class) only see the caller's own school's students.

- [ ] **Step 12: Commit**

```bash
git add school-management/fee-service
git commit -m "Scope fee-service entities to schoolId and thread it through student-service calls"
```

---

### Task 8: notification-service — isolate Notification, accept internal schoolId

**Files:**
- Modify: `school-management/notification-service/src/main/java/com/school/notification/entity/Notification.java`
- Modify: `school-management/notification-service/src/main/java/com/school/notification/repository/NotificationRepository.java`
- Modify: `school-management/notification-service/src/main/java/com/school/notification/service/NotificationService.java`
- Modify: `school-management/notification-service/src/main/java/com/school/notification/controller/NotificationController.java`
- Modify: `school-management/notification-service/src/main/java/com/school/notification/security/JwtDecoder.java`
- Create: `school-management/notification-service/src/main/java/com/school/notification/config/SchoolIdBackfillRunner.java`
- Test: `school-management/notification-service/verify-isolation.sh`

**Interfaces:**
- Produces: `POST /api/notifications` accepts `schoolId` in its request body when called without a JWT (internal caller from attendance-service, Task 6), and from the JWT when called externally (admin creating a notification).

- [ ] **Step 1: Add `private Long schoolId;` to `Notification`.**

- [ ] **Step 2: Add `getSchoolId(String token)` to notification-service's `JwtDecoder`.**

- [ ] **Step 3: Add a `schoolId`-filtered variant of `findAllByOrderByCreatedAtDesc`** (e.g. `findBySchoolIdOrderByCreatedAtDesc`) to `NotificationRepository`.

- [ ] **Step 4: Write `verify-isolation.sh`**: create a notification as School 1's admin, confirm School 2's admin's `getMyNotifications` doesn't include it; confirm a `POST /api/notifications` with no Authorization header and no `schoolId` in the body is rejected (400) — the dual-path Review Focus case for this service.

- [ ] **Step 5: Run, confirm red.**

- [ ] **Step 6: Implement the backfill runner (`notifications` table).**

- [ ] **Step 7: Update `NotificationController`**: the create endpoint resolves schoolId from the JWT when an Authorization header is present, else requires it in the request body (reject with 400 if neither is present); `getMyNotifications` and any admin-list endpoint filter by the caller's JWT-resolved schoolId; `getNotificationsForStaffRole`/`getNotificationsForStudentRole` in `NotificationService` gain a `schoolId` parameter used alongside the existing audience/class matching.

- [ ] **Step 8: Rebuild, restart, re-run `verify-isolation.sh`, confirm green.**

- [ ] **Step 9: Commit**

```bash
git add school-management/notification-service
git commit -m "Scope notification-service to schoolId, accept it from internal callers"
```

---

### Task 9: auth-service — wire parent login's schoolId through

**Files:**
- Modify: `school-management/auth-service/src/main/java/com/school/auth/dto/StudentAuthDTO.java`
- Modify: `school-management/auth-service/src/main/java/com/school/auth/service/StudentServiceClient.java`
- Modify: `school-management/auth-service/src/main/java/com/school/auth/service/UserService.java`

**Interfaces:**
- Consumes: Task 2's `ParentAuthResultDTO.schoolId` from student-service's `verify-parent-credentials` response.

- [ ] **Step 1: Add `private Long schoolId;` to `StudentAuthDTO`.**

- [ ] **Step 2: In `StudentServiceClient.doVerify`, read `data.get("schoolId")` from the response map** (same pattern as the existing `studentId`/`className` extraction) and set it on the built `StudentAuthDTO`.

- [ ] **Step 3: In `UserService`'s parent-login flow, pass `studentAuthDTO.getSchoolId()`** into the 7-arg `JwtUtil.generateToken(...)` call instead of `null`.

- [ ] **Step 4: Write a curl check**: parent-login as a parent linked to a School 2 student, decode the returned JWT (or call `GET /api/auth/schools/me` — no, that's ADMIN-only; instead hit any School-2-scoped endpoint with the parent's token and confirm it resolves School 2, e.g. the parent's own notifications feed from Task 8 only shows School 2 notifications), confirm it resolves School 2, not School 1 or null.

- [ ] **Step 5: Run, confirm red (JWT currently carries `schoolId: null` for parents), implement, rerun, confirm green.**

- [ ] **Step 6: Commit**

```bash
git add school-management/auth-service
git commit -m "Resolve the correct schoolId when minting a parent's JWT"
```

---

### Task 10: Full local integration verification

**Files:**
- Create: `school-management/verify-full-isolation.sh` (orchestrates the per-service scripts from Tasks 1-9 against a freshly-rebuilt full local stack, plus one true end-to-end story)

**Interfaces:**
- Consumes: every per-service `verify-isolation.sh` from Tasks 1, 2, 3, 5, 7, 8.

- [ ] **Step 1: Rebuild every service** (`mvn -o -f school-management/pom.xml clean package -DskipTests`) and restart the full local stack (`school-local.ps1 start`).

- [ ] **Step 2: Run every per-service `verify-isolation.sh`, confirm all green** (regression check — nothing broken by a later task's changes to shared infra like `JwtUtil`).

- [ ] **Step 3: Write and run one true end-to-end story in `verify-full-isolation.sh`**: as School 2's admin (freshly created via the Super Admin "Add School" flow, matching exactly how the user triggers this bug in production), create one student, one mark, one attendance record, one fee, one notification, one daily-schedule entry. Then as Default School's admin (`admin@school.com`), confirm every one of those six records is invisible to them, and vice versa — Default School's existing pre-fix data (students T1-T6 etc. per project memory) is still fully visible to Default School's admin and invisible to School 2's admin.

- [ ] **Step 4: Confirm existing regression surface is clean**: Default School admin login still works, existing student list/marks/attendance/fees/notifications for Default School are unchanged in count/content from before this plan started.

- [ ] **Step 5: Stop the local stack** (`school-local.ps1 stop`) once everything is green.

- [ ] **Step 6: Commit**

```bash
git add school-management/verify-full-isolation.sh
git commit -m "Add full-stack cross-school isolation verification script"
```

At this point every service is schoolId-scoped, locally verified end-to-end, and ready to deploy via the project's existing manual release process (DB backup → push to the `live` remote → poll CI → SSH swap → health-check) — deployment itself is an operational step outside this implementation plan, not a plan task.
