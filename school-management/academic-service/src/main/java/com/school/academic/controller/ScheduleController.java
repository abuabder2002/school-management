package com.school.academic.controller;

import com.school.academic.entity.ClassSchedule;
import com.school.academic.security.JwtDecoder;
import com.school.academic.service.ClassScheduleService;
import com.school.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
            @RequestParam(value = "section", required = false) String section) {
        return ResponseEntity.ok(ApiResponse.success(scheduleService.getForClass(className, section)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ClassSchedule>> create(
            @RequestBody ClassSchedule entry,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        ClassSchedule created = scheduleService.create(entry);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Schedule entry created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassSchedule>> update(
            @PathVariable("id") Long id,
            @RequestBody ClassSchedule entry,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Schedule entry updated", scheduleService.update(id, entry)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        scheduleService.delete(id);
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
}
