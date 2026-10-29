package com.school.academic.controller;

import com.school.academic.entity.ClassSchedule;
import com.school.academic.security.JwtDecoder;
import com.school.academic.service.ClassScheduleService;
import com.school.common.dto.ApiResponse;
import com.school.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * Daily/weekly class timetable. Admin manages entries; teachers and parents can view.
 */
@RestController
@RequestMapping("/api/academic/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ClassScheduleService scheduleService;
    private final JwtDecoder jwtDecoder;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassSchedule>>> getForClass(
            @RequestParam("className") String className,
            @RequestParam(value = "section", required = false) String section,
            @RequestParam(value = "date", required = false) String date,
            @RequestParam(value = "schoolId", required = false) Long schoolIdParam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        LocalDate parsedDate = (date != null && !date.isBlank()) ? LocalDate.parse(date) : null;
        Long schoolId = resolveSchoolId(authHeader, schoolIdParam);
        if (schoolId == null) {
            throw new BadRequestException("schoolId could not be resolved.");
        }
        return ResponseEntity.ok(ApiResponse.success(scheduleService.getForClass(className, section, parsedDate, schoolId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ClassSchedule>> create(
            @RequestBody ClassSchedule entry,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        ClassSchedule created = scheduleService.create(entry, resolveSchoolId(authHeader, null));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Schedule entry created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassSchedule>> update(
            @PathVariable("id") Long id,
            @RequestBody ClassSchedule entry,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Schedule entry updated", scheduleService.update(id, entry, resolveSchoolId(authHeader, null))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        scheduleService.delete(id, resolveSchoolId(authHeader, null));
        return ResponseEntity.ok(ApiResponse.success("Schedule entry deleted", null));
    }

    private void verifyAdminRole(String authHeader) {
        if (authHeader == null) return;
        String token = jwtDecoder.extractRaw(authHeader);
        if (token != null && jwtDecoder.isValidToken(token)) {
            String role = normalizeRole(jwtDecoder.getRole(token));
            if (!"ADMIN".equals(role)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only Admin is authorized to manage the class schedule.");
            }
        }
    }

    private String normalizeRole(String role) {
        if (role == null) return "";
        return role.toUpperCase().replace("ROLE_", "").trim();
    }

    /**
     * An external (JWT-bearing) caller's own token always wins — schoolIdParam is only trusted
     * when there is no Authorization header at all, i.e. a genuine internal caller. A logged-in
     * user must never be able to override their own schoolId via a query parameter.
     */
    private Long resolveSchoolId(String authHeader, Long schoolIdParam) {
        if (authHeader == null) return schoolIdParam;
        String token = jwtDecoder.extractRaw(authHeader);
        return token != null ? jwtDecoder.getSchoolId(token) : null;
    }
}
