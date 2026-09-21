package com.school.attendance.controller;

import com.school.attendance.dto.AttendanceDTO;
import com.school.attendance.entity.Holiday;
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
 * REST controller for Attendance, Holiday, and Leave Request operations.
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final JwtDecoder jwtDecoder;

    // ---- Attendance ----

    /** POST /api/attendance — Mark attendance */
    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceDTO>> markAttendance(@Valid @RequestBody AttendanceDTO dto) {
        AttendanceDTO marked = attendanceService.markAttendance(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Attendance marked successfully", marked));
    }

    /** GET /api/attendance/student/{studentId} — All attendance for a student */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getAttendanceByStudent(@PathVariable("studentId") Long studentId) {
        List<AttendanceDTO> attendance = attendanceService.getAttendanceByStudent(studentId);
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    /** GET /api/attendance/today/{studentId} — Today's attendance */
    @GetMapping("/today/{studentId}")
    public ResponseEntity<ApiResponse<AttendanceDTO>> getTodayAttendance(@PathVariable("studentId") Long studentId) {
        AttendanceDTO attendance = attendanceService.getTodayAttendance(studentId);
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    /** GET /api/attendance/today — Today's attendance for all students */
    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getTodayAttendanceAll() {
        List<AttendanceDTO> attendance = attendanceService.getTodayAttendanceAll();
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    // ---- Holidays ----

    /** GET /api/attendance/holidays — All holidays */
    @GetMapping("/holidays")
    public ResponseEntity<ApiResponse<List<Holiday>>> getAllHolidays() {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllHolidays()));
    }

    /** POST /api/attendance/holidays — Create holiday (Admin only) */
    @PostMapping("/holidays")
    public ResponseEntity<ApiResponse<Holiday>> createHoliday(@RequestBody Holiday holiday) {
        Holiday created = attendanceService.createHoliday(holiday);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Holiday created", created));
    }

    /** PUT /api/attendance/holidays/{id} — Update holiday */
    @PutMapping("/holidays/{id}")
    public ResponseEntity<ApiResponse<Holiday>> updateHoliday(@PathVariable("id") Long id,
                                                               @RequestBody Holiday holiday) {
        return ResponseEntity.ok(ApiResponse.success("Holiday updated", attendanceService.updateHoliday(id, holiday)));
    }

    /** DELETE /api/attendance/holidays/{id} — Delete holiday */
    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(@PathVariable("id") Long id) {
        attendanceService.deleteHoliday(id);
        return ResponseEntity.ok(ApiResponse.success("Holiday deleted", null));
    }

    // ---- Leave Requests ----

    /**
     * POST /api/attendance/leave — Parent submits leave for their child.
     * studentId is resolved from JWT, NOT from the request body — backend ownership enforced.
     */
    @PostMapping("/leave")
    public ResponseEntity<ApiResponse<LeaveRequest>> submitLeave(
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

        LeaveRequest saved = attendanceService.submitLeave(studentId, parentId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Leave request submitted", saved));
    }

    /** GET /api/attendance/leave — Admin/Teacher: all leave requests */
    @GetMapping("/leave")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getAllLeave() {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllLeaveRequests()));
    }

    /**
     * GET /api/attendance/leave/my — Parent sees only their own submitted requests.
     */
    @GetMapping("/leave/my")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getMyLeave(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        String token = jwtDecoder.extractRaw(authHeader);

        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing token"));
        }

        Long parentId = jwtDecoder.getUserId(token);
        List<LeaveRequest> requests = attendanceService.getLeaveByParent(parentId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    /** PUT /api/attendance/leave/{id}/approve — Admin/Teacher approve */
    @PutMapping("/leave/{id}/approve")
    public ResponseEntity<ApiResponse<LeaveRequest>> approveLeave(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.getOrDefault("note", "") : "";
        return ResponseEntity.ok(ApiResponse.success("Leave approved", attendanceService.approveLeave(id, note)));
    }

    /** PUT /api/attendance/leave/{id}/reject — Admin/Teacher reject */
    @PutMapping("/leave/{id}/reject")
    public ResponseEntity<ApiResponse<LeaveRequest>> rejectLeave(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.getOrDefault("note", "") : "";
        return ResponseEntity.ok(ApiResponse.success("Leave rejected", attendanceService.rejectLeave(id, note)));
    }
}
