package com.school.attendance.controller;

import com.school.attendance.dto.AttendanceDTO;
import com.school.attendance.dto.LeaveRecordDTO;
import com.school.attendance.entity.Holiday;
import com.school.attendance.entity.LeaveReason;
import com.school.attendance.entity.LeaveRequest;
import com.school.attendance.security.JwtDecoder;
import com.school.attendance.service.AttendanceService;
import com.school.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for Attendance, Holiday, Leave Requests, and Leave Reasons.
 *
 * NOTE: The approval workflow (approve/reject) has been intentionally removed.
 * Leave is recorded directly when a parent submits it — no approval required.
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final JwtDecoder jwtDecoder;

    /**
     * 401 if the token is missing/invalid, 403 if the caller's role isn't in {@code allowedRoles};
     * null means the caller is authorized. No other service calls into attendance-service
     * (confirmed: no *ServiceClient targets it), so every check here fails closed.
     */
    private <T> ResponseEntity<ApiResponse<T>> denyUnlessRole(String authHeader, String... allowedRoles) {
        String token = jwtDecoder.extractRaw(authHeader);
        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Missing or invalid authentication token."));
        }
        String role = jwtDecoder.getRole(token);
        for (String allowed : allowedRoles) {
            if (allowed.equalsIgnoreCase(role)) {
                return null;
            }
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("You are not authorized to perform this action."));
    }

    // ---- Attendance ----

    /** POST /api/attendance — Mark attendance */
    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceDTO>> markAttendance(
            @Valid @RequestBody AttendanceDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        AttendanceDTO marked = attendanceService.markAttendance(dto, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Attendance marked successfully", marked));
    }

    /** GET /api/attendance/person/{personType}/{personId} — All attendance for a person */
    @GetMapping("/person/{personType}/{personId}")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getAttendanceByPerson(
            @PathVariable("personType") com.school.common.enums.PersonType personType,
            @PathVariable("personId") Long personId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        List<AttendanceDTO> attendance = attendanceService.getAttendanceByPerson(personType, personId, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    /** GET /api/attendance/today/{personType}/{personId} — Today's attendance */
    @GetMapping("/today/{personType}/{personId}")
    public ResponseEntity<ApiResponse<AttendanceDTO>> getTodayAttendance(
            @PathVariable("personType") com.school.common.enums.PersonType personType,
            @PathVariable("personId") Long personId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        AttendanceDTO attendance = attendanceService.getTodayAttendance(personType, personId, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    /** GET /api/attendance/today/{personType} — Today's attendance for all persons of a type */
    @GetMapping("/today/{personType}")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getTodayAttendanceAll(
            @PathVariable("personType") com.school.common.enums.PersonType personType,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        List<AttendanceDTO> attendance = attendanceService.getTodayAttendanceAll(personType, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    /** GET /api/attendance/summary — Attendance summary */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttendanceSummary(
            @RequestParam("date") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam("entityType") com.school.common.enums.PersonType entityType,
            @RequestParam(value = "classId", required = false) String classId,
            @RequestParam(value = "sectionId", required = false) String sectionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        List<AttendanceDTO> attendanceList = attendanceService.getAttendanceByDateAndType(date, entityType, resolveSchoolId(authHeader));
        long present = attendanceList.stream().filter(a -> a.getStatus() == com.school.common.enums.AttendanceStatus.PRESENT).count();
        long absent = attendanceList.stream().filter(a -> a.getStatus() == com.school.common.enums.AttendanceStatus.ABSENT).count();

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "total", 0L,
            "present", present,
            "absent", absent,
            "records", attendanceList
        )));
    }

    // ---- Holidays ----

    /** GET /api/attendance/holidays — All holidays */
    @GetMapping("/holidays")
    public ResponseEntity<ApiResponse<List<Holiday>>> getAllHolidays(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllHolidays(resolveSchoolId(authHeader))));
    }

    /** POST /api/attendance/holidays — Create holiday (Admin only) */
    @PostMapping("/holidays")
    public ResponseEntity<ApiResponse<Holiday>> createHoliday(
            @RequestBody Holiday holiday,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Holiday>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        Holiday created = attendanceService.createHoliday(holiday, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Holiday created", created));
    }

    /** PUT /api/attendance/holidays/{id} — Update holiday */
    @PutMapping("/holidays/{id}")
    public ResponseEntity<ApiResponse<Holiday>> updateHoliday(@PathVariable("id") Long id,
                                                               @RequestBody Holiday holiday,
                                                               @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Holiday>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success("Holiday updated", attendanceService.updateHoliday(id, holiday, resolveSchoolId(authHeader))));
    }

    /** DELETE /api/attendance/holidays/{id} — Delete holiday */
    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Void>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        attendanceService.deleteHoliday(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Holiday deleted", null));
    }

    // ---- Leave Requests (no approval workflow) ----

    /**
     * POST /api/attendance/leave — Parent submits single-day leave for their child.
     * studentId is resolved from JWT — backend-enforced security.
     * Leave is recorded directly as RECORDED. No approval required.
     */
    @PostMapping("/leave")
    public ResponseEntity<ApiResponse<LeaveRecordDTO>> submitLeave(
            @RequestBody LeaveRequest request,
            HttpServletRequest httpRequest) {

        String authHeader = httpRequest.getHeader("Authorization");
        String token = jwtDecoder.extractRaw(authHeader);

        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing token"));
        }

        Long parentId = jwtDecoder.getUserId(token);
        Long studentId = jwtDecoder.getStudentId(token);

        if (studentId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("No student linked to your parent account. Contact admin."));
        }

        if (request.getLeaveDate() == null && request.getStartDate() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Leave date is required."));
        }

        if (request.getReason() == null || request.getReason().trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Leave reason is required."));
        }

        LeaveRecordDTO saved = attendanceService.submitLeave(studentId, parentId, request, jwtDecoder.getSchoolId(token));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Leave recorded successfully", saved));
    }

    /**
     * GET /api/attendance/leave/teacher — Teacher view:
     * Only returns leave records belonging to students from the teacher's assigned class/section.
     * Access restriction enforced on backend via JWT claims.
     */
    @GetMapping("/leave/teacher")
    public ResponseEntity<ApiResponse<List<LeaveRecordDTO>>> getTeacherLeave(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        String token = jwtDecoder.extractRaw(authHeader);

        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing token"));
        }

        String role = jwtDecoder.getRole(token);
        if (!"TEACHER".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only teachers and administrators can view class leave records"));
        }

        String assignedClass = jwtDecoder.getAssignedClass(token);
        String assignedSection = jwtDecoder.getAssignedSection(token);

        List<LeaveRecordDTO> records = attendanceService.getTeacherLeaveRecords(assignedClass, assignedSection, jwtDecoder.getSchoolId(token));
        return ResponseEntity.ok(ApiResponse.success(records));
    }

    /**
     * GET /api/attendance/leave — Admin view: all school leave records enriched with student details.
     */
    @GetMapping("/leave")
    public ResponseEntity<ApiResponse<List<LeaveRecordDTO>>> getAllLeave(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<LeaveRecordDTO>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllLeaveRecordsEnriched(resolveSchoolId(authHeader))));
    }

    /**
     * GET /api/attendance/leave/my — Parent sees every leave record for their child,
     * whether they submitted it themselves or the admin recorded it on their behalf.
     */
    @GetMapping("/leave/my")
    public ResponseEntity<ApiResponse<List<LeaveRecordDTO>>> getMyLeave(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        String token = jwtDecoder.extractRaw(authHeader);

        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing token"));
        }

        Long studentId = jwtDecoder.getStudentId(token);
        if (studentId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("No student linked to your parent account. Contact admin."));
        }

        List<LeaveRecordDTO> requests = attendanceService.getMyLeaveRecordsByStudent(studentId, jwtDecoder.getSchoolId(token));
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    /**
     * POST /api/attendance/leave/admin — Admin records a leave directly for a student
     * whose parent didn't submit one. Notifies the student's parent portal.
     */
    @PostMapping("/leave/admin")
    public ResponseEntity<ApiResponse<LeaveRecordDTO>> submitAdminLeave(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<LeaveRecordDTO>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;

        Object studentIdRaw = body.get("studentId");
        if (studentIdRaw == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("studentId is required."));
        }
        Long studentId;
        try {
            studentId = Long.valueOf(studentIdRaw.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("studentId must be a number."));
        }

        String leaveDateStr = body.get("leaveDate") != null ? body.get("leaveDate").toString()
                : (body.get("startDate") != null ? body.get("startDate").toString() : null);
        String reason = body.get("reason") != null ? body.get("reason").toString() : null;
        String session = body.get("session") != null ? body.get("session").toString() : null;

        if (leaveDateStr == null || leaveDateStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Leave date is required."));
        }
        if (reason == null || reason.trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Leave reason is required."));
        }
        if (session == null || session.trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Session is required."));
        }

        LeaveRequest request = new LeaveRequest();
        request.setStartDate(java.time.LocalDate.parse(leaveDateStr));
        request.setReason(reason.trim());
        request.setSession(session.trim());

        LeaveRecordDTO saved = attendanceService.submitAdminLeave(studentId, request, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Leave recorded and the parent notified", saved));
    }

    // ---- Teacher's own leave ----

    /**
     * POST /api/attendance/teacher-leave — Teacher submits leave for themselves.
     * teacherId / assignedClass / assignedSection are resolved from the JWT, never from the
     * request body; teacherName is display-only, matching how student/fee names are denormalized
     * elsewhere in this app. Recorded directly as RECORDED and also raises a notification.
     */
    @PostMapping("/teacher-leave")
    public ResponseEntity<ApiResponse<com.school.attendance.entity.TeacherLeaveRequest>> submitTeacherLeave(
            @RequestBody com.school.attendance.entity.TeacherLeaveRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<com.school.attendance.entity.TeacherLeaveRequest>> denied =
                denyUnlessRole(authHeader, "TEACHER");
        if (denied != null) return denied;

        String token = jwtDecoder.extractRaw(authHeader);
        Long teacherId = jwtDecoder.getUserId(token);
        String assignedClass = jwtDecoder.getAssignedClass(token);
        String assignedSection = jwtDecoder.getAssignedSection(token);

        if (request.getTeacherName() == null || request.getTeacherName().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Your name is required."));
        }
        if (request.getLeaveDate() == null && request.getStartDate() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Leave date is required."));
        }
        if (request.getReason() == null || request.getReason().trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Leave reason is required."));
        }

        com.school.attendance.entity.TeacherLeaveRequest saved =
                attendanceService.submitTeacherLeave(teacherId, request.getTeacherName().trim(), assignedClass, assignedSection, request, jwtDecoder.getSchoolId(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Leave recorded successfully", saved));
    }

    /**
     * GET /api/attendance/teacher-leave — Admin view: every teacher's leave, most recent first.
     */
    @GetMapping("/teacher-leave")
    public ResponseEntity<ApiResponse<List<com.school.attendance.entity.TeacherLeaveRequest>>> getAllTeacherLeave(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<com.school.attendance.entity.TeacherLeaveRequest>>> denied =
                denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllTeacherLeave(resolveSchoolId(authHeader))));
    }

    /**
     * GET /api/attendance/teacher-leave/my — Teacher view: only their own submitted leave.
     */
    @GetMapping("/teacher-leave/my")
    public ResponseEntity<ApiResponse<List<com.school.attendance.entity.TeacherLeaveRequest>>> getMyTeacherLeave(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<com.school.attendance.entity.TeacherLeaveRequest>>> denied =
                denyUnlessRole(authHeader, "TEACHER");
        if (denied != null) return denied;
        String token = jwtDecoder.extractRaw(authHeader);
        Long teacherId = jwtDecoder.getUserId(token);
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getMyTeacherLeave(teacherId, jwtDecoder.getSchoolId(token))));
    }

    // ---- Leave Reasons (Admin-managed, bilingual English + Tamil) ----

    /**
     * GET /api/attendance/leave-reasons — Active reasons for parent dropdown.
     */
    @GetMapping("/leave-reasons")
    public ResponseEntity<ApiResponse<List<LeaveReason>>> getActiveLeaveReasons(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getActiveLeaveReasons(resolveSchoolId(authHeader))));
    }

    /**
     * GET /api/attendance/leave-reasons/all — All reasons (active + inactive) for admin view.
     */
    @GetMapping("/leave-reasons/all")
    public ResponseEntity<ApiResponse<List<LeaveReason>>> getAllLeaveReasons(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<LeaveReason>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllLeaveReasons(resolveSchoolId(authHeader))));
    }

    /**
     * POST /api/attendance/leave-reasons — Admin creates a new predefined reason.
     */
    @PostMapping("/leave-reasons")
    public ResponseEntity<ApiResponse<LeaveReason>> createLeaveReason(
            @RequestBody LeaveReason reason,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<LeaveReason>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        LeaveReason created = attendanceService.createLeaveReason(reason, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Leave reason created", created));
    }

    /**
     * PUT /api/attendance/leave-reasons/{id} — Admin updates English/Tamil text.
     */
    @PutMapping("/leave-reasons/{id}")
    public ResponseEntity<ApiResponse<LeaveReason>> updateLeaveReason(
            @PathVariable("id") Long id,
            @RequestBody LeaveReason reason,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<LeaveReason>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success("Leave reason updated", attendanceService.updateLeaveReason(id, reason, resolveSchoolId(authHeader))));
    }

    /**
     * DELETE /api/attendance/leave-reasons/{id} — Admin soft-deletes (deactivates) a reason.
     * Historical leave records using this reason text remain intact.
     */
    @DeleteMapping("/leave-reasons/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateLeaveReason(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Void>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        attendanceService.deactivateLeaveReason(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Leave reason deactivated", null));
    }

    /**
     * PUT /api/attendance/leave-reasons/{id}/reactivate — Admin re-enables a deactivated reason.
     */
    @PutMapping("/leave-reasons/{id}/reactivate")
    public ResponseEntity<ApiResponse<LeaveReason>> reactivateLeaveReason(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<LeaveReason>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success("Leave reason reactivated", attendanceService.reactivateLeaveReason(id, resolveSchoolId(authHeader))));
    }

    private Long resolveSchoolId(String authHeader) {
        if (authHeader == null) return null;
        String token = jwtDecoder.extractRaw(authHeader);
        return token != null ? jwtDecoder.getSchoolId(token) : null;
    }
}
