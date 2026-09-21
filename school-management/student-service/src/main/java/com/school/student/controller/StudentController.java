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
 */
@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final JwtDecoder jwtDecoder;
    private final ExcelImportService excelImportService;
    private final ExcelExportService excelExportService;

    /** GET /api/students */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getAllStudents() {
        List<StudentDTO> students = studentService.getAllStudents();
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    /** GET /api/students/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentById(@PathVariable("id") Long id) {
        StudentDTO student = studentService.getStudentById(id);
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
        String token = jwtDecoder.extractRaw(authHeader);

        if (token != null && jwtDecoder.isValidToken(token)) {
            String role = jwtDecoder.getRole(token);
            Long callerUserId = jwtDecoder.getUserId(token);

            if ("PARENT".equals(role) && !parentId.equals(callerUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Forbidden: you can only view your own children"));
            }
        }

        List<StudentDTO> students = studentService.getStudentsByParent(parentId);
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    /** POST /api/students */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentDTO>> createStudent(@Valid @RequestBody StudentDTO dto) {
        StudentDTO created = studentService.createStudent(dto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student created successfully", created));
    }

    /** PUT /api/students/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> updateStudent(@PathVariable("id") Long id,
                                                                  @Valid @RequestBody StudentDTO dto) {
        StudentDTO updated = studentService.updateStudent(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Student updated successfully", updated));
    }

    /** DELETE /api/students/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable("id") Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.success("Student deleted successfully", null));
    }

    /**
     * POST /api/students/import
     * Upload an Excel (.xlsx) file to import students.
     * Duplicate admissionNumber → UPDATE. New → INSERT.
     */
    @PostMapping("/import")
    public ResponseEntity<ApiResponse<ImportResult>> importStudents(
            @RequestParam("file") MultipartFile file) {

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
            ImportResult result = excelImportService.importStudents(file);
            return ResponseEntity.ok(ApiResponse.success("Import completed", result));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to read Excel file: " + e.getMessage()));
        }
    }

    /**
     * GET /api/students/export
     * Download all students as school_management_backup.xlsx
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportStudents() {
        try {
            byte[] excelBytes = excelExportService.generateBackup();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "school_management_backup.xlsx");
            headers.setContentLength(excelBytes.length);
            return ResponseEntity.ok().headers(headers).body(excelBytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/students/bulk-template
     * Download the standard Excel template for bulk student import.
     */
    @GetMapping("/bulk-template")
    public ResponseEntity<byte[]> downloadBulkTemplate() {
        try {
            byte[] templateBytes = excelImportService.generateTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "student_import_template.xlsx");
            headers.setContentLength(templateBytes.length);
            return ResponseEntity.ok().headers(headers).body(templateBytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/students/bulk-upload
     * Production-ready atomic bulk student upload with validation and duplicate detection.
     */
    @PostMapping("/bulk-upload")
    public ResponseEntity<ApiResponse<com.school.student.dto.BulkUploadResult>> bulkUploadStudents(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");
        String token = jwtDecoder.extractRaw(authHeader);
        if (token != null && jwtDecoder.isValidToken(token)) {
            String role = jwtDecoder.getRole(token);
            if (!"ADMIN".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied: only ADMIN can perform bulk student uploads."));
            }
        }

        try {
            com.school.student.dto.BulkUploadResult result = excelImportService.processBulkUpload(file);
            return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Bulk upload failed: " + e.getMessage()));
        }
    }
}
