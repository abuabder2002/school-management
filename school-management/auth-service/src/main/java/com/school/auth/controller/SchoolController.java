package com.school.auth.controller;

import com.school.auth.dto.CreateSchoolRequest;
import com.school.auth.dto.SchoolDTO;
import com.school.auth.dto.SchoolModuleToggleDTO;
import com.school.auth.dto.UpdateSubscriptionRequest;
import com.school.auth.service.SchoolModuleToggleService;
import com.school.auth.service.SchoolService;
import com.school.common.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Super Admin endpoints for managing Schools (tenants): Add School, the Subscription list,
 * and per-school module access. All endpoints here are SUPER_ADMIN only (SecurityConfig).
 */
@RestController
@RequestMapping("/api/auth/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;
    private final SchoolModuleToggleService moduleToggleService;

    @PostMapping
    public ResponseEntity<ApiResponse<SchoolDTO>> createSchool(@Valid @RequestBody CreateSchoolRequest request) {
        SchoolDTO created = schoolService.createSchool(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("School created", created));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SchoolDTO>>> listSchools() {
        return ResponseEntity.ok(ApiResponse.success(schoolService.listSchools()));
    }

    @PutMapping("/{id}/subscription")
    public ResponseEntity<ApiResponse<SchoolDTO>> updateSubscription(
            @PathVariable("id") Long id,
            @RequestBody UpdateSubscriptionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Subscription updated", schoolService.updateSubscription(id, request)));
    }

    @GetMapping("/{id}/modules")
    public ResponseEntity<ApiResponse<List<SchoolModuleToggleDTO>>> getModules(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.success(moduleToggleService.getTogglesForSchool(id)));
    }

    @PutMapping("/{id}/modules")
    public ResponseEntity<ApiResponse<SchoolModuleToggleDTO>> setModule(
            @PathVariable("id") Long id,
            @RequestBody SetModuleToggleRequest request) {
        SchoolModuleToggleDTO updated = moduleToggleService.setToggle(id, request.getModuleKey(), request.isEnabled());
        return ResponseEntity.ok(ApiResponse.success("Module access updated", updated));
    }

    @Data
    public static class SetModuleToggleRequest {
        @NotBlank
        private String moduleKey;
        private boolean enabled;
    }
}
