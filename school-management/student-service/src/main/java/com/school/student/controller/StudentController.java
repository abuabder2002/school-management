package com.school.student.controller;

import com.school.common.dto.ApiResponse;
import com.school.student.dto.ImportResult;
import com.school.student.dto.StudentDTO;
import com.school.student.security.JwtDecoder;
import com.school.student.service.ExcelExportService;
import com.school.student.service.ExcelImportService;
import com.school.student.service.StudentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * REST controller for Student CRUD, Excel import and export.
 *
 * Authorization note: some of these endpoints (the student roster lookups) are also called
 * service-to-service by academic-service, attendance-service and fee-service — without a
 * token, by design (confirmed: their StudentServiceClient implementations never attach an
 * Authorization header). The gateway rejects every external /api/** call that lacks a valid
 * token (except login/register), so "no Authorization header reached this service" only
 * happens for those trusted internal callers. {@link #denyUnlessRoleOrInternal} therefore
 * allows a request through when no header is present at all, but still rejects one that
 * carries a header that is missing/invalid/wrong-role. Endpoints with no internal caller use
 * {@link #denyUnlessRole}, which always requires a valid token.
 */
@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final JwtDecoder jwtDecoder;
    private final ExcelImportService excelImportService;
    private final ExcelExportService excelExportService;

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

    private <T> ResponseEntity<ApiResponse<T>> denyUnlessRoleOrInternal(String authHeader, String... allowedRoles) {
        if (authHeader == null) {
            return null; // internal service-to-service call
        }
        return denyUnlessRole(authHeader, allowedRoles);
    }

    /** Resolves the caller's schoolId from an external (JWT-bearing) request. Null for an internal call or an invalid token. */
    private Long resolveSchoolId(String authHeader) {
        if (authHeader == null) return null;
        String token = jwtDecoder.extractRaw(authHeader);
        return token != null ? jwtDecoder.getSchoolId(token) : null;
    }

    /**
     * Resolves schoolId for an endpoint also called internally (no Authorization header, by the
     * codebase's existing internal-call convention): an explicit schoolId query param from a
     * trusted internal caller takes priority; otherwise fall back to the external caller's JWT.
     */
    private Long resolveSchoolId(String authHeader, Long schoolIdParam) {
        if (schoolIdParam != null) return schoolIdParam;
        return resolveSchoolId(authHeader);
    }

    /** GET /api/students */
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> searchStudents(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "className", required = false) String className,
            @RequestParam(value = "status", required = false, defaultValue = "All") String status,
            @RequestParam(value = "page", defaultValue = "1") int page, // UI is 1-based, Spring Data is 0-based
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            @RequestParam(value = "schoolId", required = false) Long schoolIdParam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<java.util.Map<String, Object>>> denied = denyUnlessRoleOrInternal(authHeader, "ADMIN", "TEACHER");
        if (denied != null) return denied;

        Long schoolId = resolveSchoolId(authHeader, schoolIdParam);
        if (schoolId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("schoolId could not be resolved."));
        }
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page - 1, pageSize, org.springframework.data.domain.Sort.by("name").ascending());
        org.springframework.data.domain.Page<StudentDTO> studentPage = studentService.searchStudents(search, className, status, pageable, schoolId);

        java.util.Map<String, Object> responseData = new java.util.HashMap<>();
        responseData.put("data", studentPage.getContent());

        java.util.Map<String, Object> pagination = new java.util.HashMap<>();
        pagination.put("page", page);
        pagination.put("pageSize", pageSize);
        pagination.put("total", studentPage.getTotalElements());
        pagination.put("totalPages", studentPage.getTotalPages());
        responseData.put("pagination", pagination);

        // Counts
        responseData.put("totalStudents", studentService.countTotalStudents(schoolId));
        responseData.put("activeStudents", studentService.countActiveStudents(schoolId));
        responseData.put("inactiveStudents", studentService.countInactiveStudents(schoolId));

        return ResponseEntity.ok(ApiResponse.success(responseData));
    }

    /** GET /api/students/class-summary — Student counts grouped by class in academic order */
    @GetMapping("/class-summary")
    public ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> getClassStudentSummaries(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> denied = denyUnlessRoleOrInternal(authHeader, "ADMIN", "TEACHER");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(studentService.getClassStudentSummaries(resolveSchoolId(authHeader))));
    }

    /** GET /api/students/classes — Distinct classes existing in Student Directory */
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<String>>> getDistinctClasses(
            @RequestParam(value = "schoolId", required = false) Long schoolIdParam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<String>>> denied = denyUnlessRoleOrInternal(authHeader, "ADMIN", "TEACHER");
        if (denied != null) return denied;
        Long schoolId = resolveSchoolId(authHeader, schoolIdParam);
        if (schoolId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("schoolId could not be resolved."));
        }
        List<String> classes = studentService.getDistinctClasses(schoolId);
        return ResponseEntity.ok(ApiResponse.success(classes));
    }

    /** GET /api/students/class/{className}/active — Active students in a class */
    @GetMapping("/class/{className}/active")
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getActiveStudentsByClass(
            @PathVariable("className") String className,
            @RequestParam(value = "schoolId", required = false) Long schoolIdParam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<StudentDTO>>> denied = denyUnlessRoleOrInternal(authHeader, "ADMIN", "TEACHER");
        if (denied != null) return denied;
        Long schoolId = resolveSchoolId(authHeader, schoolIdParam);
        if (schoolId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("schoolId could not be resolved."));
        }
        List<StudentDTO> students = studentService.getActiveStudentsByClass(className, schoolId);
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    /** GET /api/students/active-by-class — All active students grouped by class */
    @GetMapping("/active-by-class")
    public ResponseEntity<ApiResponse<java.util.Map<String, List<StudentDTO>>>> getActiveStudentsGroupedByClass(
            @RequestParam(value = "schoolId", required = false) Long schoolIdParam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<java.util.Map<String, List<StudentDTO>>>> denied = denyUnlessRoleOrInternal(authHeader, "ADMIN", "TEACHER");
        if (denied != null) return denied;
        Long schoolId = resolveSchoolId(authHeader, schoolIdParam);
        if (schoolId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("schoolId could not be resolved."));
        }
        return ResponseEntity.ok(ApiResponse.success(studentService.getActiveStudentsGroupedByClass(schoolId)));
    }

    /**
     * GET /api/students/{id}
     * ADMIN/TEACHER may view any student; PARENT only their own linked child; an internal
     * service-to-service call (no Authorization header) is allowed through unrestricted.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentById(
            @PathVariable("id") Long id,
            @RequestParam(value = "schoolId", required = false) Long schoolIdParam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long schoolId = schoolIdParam;
        if (authHeader != null) {
            String token = jwtDecoder.extractRaw(authHeader);
            if (token == null || !jwtDecoder.isValidToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Missing or invalid authentication token."));
            }
            String role = jwtDecoder.getRole(token);
            if ("PARENT".equalsIgnoreCase(role)) {
                Long linkedStudentId = jwtDecoder.getStudentId(token);
                if (linkedStudentId == null || !linkedStudentId.equals(id)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(ApiResponse.error("You can only view your own child's profile."));
                }
            } else if (!"ADMIN".equalsIgnoreCase(role) && !"TEACHER".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("You are not authorized to view this student."));
            }
            schoolId = jwtDecoder.getSchoolId(token);
        }
        StudentDTO student = studentService.getStudentById(id, schoolId);
        return ResponseEntity.ok(ApiResponse.success(student));
    }

    /**
     * GET /api/students/parent/{parentId}
     * PARENT can only fetch their own children; ADMIN can fetch any.
     */
    @GetMapping("/parent/{parentId}")
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getStudentsByParent(
            @PathVariable("parentId") Long parentId,
            HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");
        ResponseEntity<ApiResponse<List<StudentDTO>>> denied = denyUnlessRole(authHeader, "ADMIN", "PARENT");
        if (denied != null) return denied;

        String token = jwtDecoder.extractRaw(authHeader);
        String role = jwtDecoder.getRole(token);
        Long callerUserId = jwtDecoder.getUserId(token);
        if ("PARENT".equalsIgnoreCase(role) && !parentId.equals(callerUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Forbidden: you can only view your own children"));
        }

        List<StudentDTO> students = studentService.getStudentsByParent(parentId, jwtDecoder.getSchoolId(token));
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    /** POST /api/students */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentDTO>> createStudent(
            @Valid @RequestBody StudentDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<StudentDTO>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        StudentDTO created = studentService.createStudent(dto, resolveSchoolId(authHeader));
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student created successfully", created));
    }

    /** PUT /api/students/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> updateStudent(@PathVariable("id") Long id,
                                                                  @Valid @RequestBody StudentDTO dto,
                                                                  @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<StudentDTO>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        StudentDTO updated = studentService.updateStudent(id, dto, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Student updated successfully", updated));
    }

    /**
     * PATCH /api/students/{id}/parent-password — Admin resets the parent portal login password
     * for this student. Deliberately separate from PUT /{id} so it never touches any other field.
     */
    @PatchMapping("/{id}/parent-password")
    public ResponseEntity<ApiResponse<Void>> resetParentPassword(
            @PathVariable("id") Long id,
            @RequestBody java.util.Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Void>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        studentService.resetParentPassword(id, body.get("newPassword"), resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Parent login password updated", null));
    }

    /** DELETE /api/students/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Void>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        studentService.deleteStudent(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Student deleted successfully", null));
    }

    /**
     * DELETE /api/students/clear-all — Permanently deletes every student record. ADMIN only.
     * Registered before "/{id}" has no overlap (different HTTP method/path shape), but kept
     * next to it for visibility given how destructive it is.
     */
    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> clearAllStudents(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<java.util.Map<String, Object>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        long deleted = studentService.clearAllStudents(resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("All student records cleared",
                java.util.Map.of("deletedCount", deleted)));
    }

    /** PATCH /api/students/{id}/status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<StudentDTO>> updateStudentStatus(@PathVariable("id") Long id,
                                                                       @RequestBody java.util.Map<String, String> statusUpdate,
                                                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<StudentDTO>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        String status = statusUpdate.get("status");
        boolean isActive = "ACTIVE".equalsIgnoreCase(status);
        StudentDTO updated = studentService.updateStudentStatus(id, isActive, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Student status updated successfully", updated));
    }

    /**
     * POST /api/students/verify-parent-credentials
     * Verifies phone number and password for parent authentication.
     */
    @PostMapping("/verify-parent-credentials")
    public ResponseEntity<ApiResponse<com.school.student.dto.ParentAuthResultDTO>> verifyParentCredentials(
            @RequestBody com.school.student.dto.ParentLoginDTO request) {
        com.school.student.dto.ParentAuthResultDTO result = studentService.verifyParentCredentials(
                request.getPhoneNumber(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success("Credentials verified successfully", result));
    }

    /**
     * POST /api/students/import
     * Upload an Excel (.xlsx) file to import students.
     * Duplicate admissionNumber → UPDATE. New → INSERT.
     */
    @PostMapping("/import")
    public ResponseEntity<ApiResponse<ImportResult>> importStudents(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<ImportResult>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Please upload a non-empty Excel file"));
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Only .xlsx files are accepted"));
        }

        try {
            ImportResult result = excelImportService.importStudents(file, resolveSchoolId(authHeader));
            return ResponseEntity.ok(ApiResponse.success("Import completed", result));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to read Excel file: " + e.getMessage()));
        }
    }

    /**
     * GET /api/students/export
     * Download students (same column layout as the bulk-import template) as an .xlsx file.
     * With no className (or "ALL"), exports the whole school; otherwise just that one class.
     */
    @GetMapping("/export")
    public ResponseEntity<?> exportStudents(@RequestParam(value = "className", required = false) String className,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Object>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        try {
            byte[] excelBytes = excelExportService.generateBackup(className, resolveSchoolId(authHeader));
            boolean isClassScoped = className != null && !className.isBlank()
                    && !"ALL".equalsIgnoreCase(className.trim()) && !"ALL CLASSES".equalsIgnoreCase(className.trim());
            String filename = isClassScoped
                    ? ("students_" + className.trim().replaceAll("[^A-Za-z0-9]+", "_") + ".xlsx")
                    : "school_management_backup.xlsx";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(excelBytes.length);
            return ResponseEntity.ok().headers(headers).body(excelBytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/students/bulk-template
     * Download the standard Excel template for bulk student import.
     * When className is specified, includes that class's existing students + blank rows.
     */
    @GetMapping("/bulk-template")
    public ResponseEntity<?> downloadBulkTemplate(@RequestParam(value = "className", required = false) String className,
                                                    @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Object>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        try {
            byte[] templateBytes = excelImportService.generateTemplate(className, resolveSchoolId(authHeader));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            String fileName = (className != null && !className.isBlank() && !"ALL".equalsIgnoreCase(className.trim()))
                    ? (className.trim().replaceAll("[^a-zA-Z0-9_-]", "_") + "_student_template.xlsx")
                    : "student_import_template.xlsx";
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setContentLength(templateBytes.length);
            return ResponseEntity.ok().headers(headers).body(templateBytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/students/bulk-validate
     * Dry-run validation of student bulk upload without committing.
     */
    @PostMapping("/bulk-validate")
    public ResponseEntity<ApiResponse<com.school.student.dto.BulkUploadResult>> bulkValidateStudents(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "className", required = false) String className,
            HttpServletRequest request) {

        ResponseEntity<ApiResponse<com.school.student.dto.BulkUploadResult>> denied =
                denyUnlessRole(request.getHeader("Authorization"), "ADMIN");
        if (denied != null) return denied;

        try {
            com.school.student.dto.BulkUploadResult result = excelImportService.validateBulkUpload(file, className, resolveSchoolId(request.getHeader("Authorization")));
            return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Bulk upload validation failed: " + e.getMessage()));
        }
    }

    /**
     * POST /api/students/bulk-upload
     * Production-ready atomic bulk student upload with validation and duplicate detection.
     */
    @PostMapping("/bulk-upload")
    public ResponseEntity<ApiResponse<com.school.student.dto.BulkUploadResult>> bulkUploadStudents(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "className", required = false) String className,
            HttpServletRequest request) {

        ResponseEntity<ApiResponse<com.school.student.dto.BulkUploadResult>> denied =
                denyUnlessRole(request.getHeader("Authorization"), "ADMIN");
        if (denied != null) return denied;

        try {
            com.school.student.dto.BulkUploadResult result = excelImportService.processBulkUpload(file, className, resolveSchoolId(request.getHeader("Authorization")));
            return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Bulk upload failed: " + e.getMessage()));
        }
    }
}
