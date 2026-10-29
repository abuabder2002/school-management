package com.school.academic.controller;

import com.school.academic.dto.BoardResultDTO;
import com.school.academic.dto.BulkUploadResult;
import com.school.academic.dto.MarkBatchRequest;
import com.school.academic.dto.MarkDTO;
import com.school.academic.entity.AcademicClass;
import com.school.academic.entity.Exam;
import com.school.academic.entity.Homework;
import com.school.academic.entity.Subject;
import com.school.academic.security.JwtDecoder;
import com.school.academic.service.AcademicService;
import com.school.academic.service.MarkBulkUploadService;
import com.school.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * REST controller for Academic management (classes, subjects, exams, marks, homework).
 */
@RestController
@RequestMapping("/api/academic")
@RequiredArgsConstructor
@Slf4j
public class AcademicController {

    private final AcademicService academicService;
    private final MarkBulkUploadService markBulkUploadService;
    private final JwtDecoder jwtDecoder;

    // ---- Classes ----

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<AcademicClass>>> getAllClasses(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllClasses(resolveSchoolId(authHeader))));
    }

    @GetMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<AcademicClass>> getClassById(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getClassById(id, resolveSchoolId(authHeader))));
    }

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<AcademicClass>> createClass(
            @RequestBody AcademicClass academicClass,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        AcademicClass created = academicService.createClass(academicClass, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Class created", created));
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<AcademicClass>> updateClass(
            @PathVariable("id") Long id,
            @RequestBody AcademicClass academicClass,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Class updated", academicService.updateClass(id, academicClass, resolveSchoolId(authHeader))));
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteClass(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        academicService.deleteClass(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Class deleted", null));
    }

    // ---- Subjects ----

    @GetMapping("/subjects")
    public ResponseEntity<ApiResponse<List<Subject>>> getAllSubjects(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllSubjects(resolveSchoolId(authHeader))));
    }

    @GetMapping("/subjects/{id}")
    public ResponseEntity<ApiResponse<Subject>> getSubjectById(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getSubjectById(id, resolveSchoolId(authHeader))));
    }

    @GetMapping("/subjects/class/{classId}")
    public ResponseEntity<ApiResponse<List<Subject>>> getSubjectsByClass(
            @PathVariable("classId") Long classId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getSubjectsByClass(classId, resolveSchoolId(authHeader))));
    }

    @PostMapping("/subjects")
    public ResponseEntity<ApiResponse<Subject>> createSubject(
            @RequestBody Subject subject,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        Subject created = academicService.createSubject(subject, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Subject created", created));
    }

    @PutMapping("/subjects/{id}")
    public ResponseEntity<ApiResponse<Subject>> updateSubject(
            @PathVariable("id") Long id,
            @RequestBody Subject subject,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Subject updated", academicService.updateSubject(id, subject, resolveSchoolId(authHeader))));
    }

    @DeleteMapping("/subjects/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSubject(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        academicService.deleteSubject(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Subject deleted", null));
    }

    // ---- Exams ----

    @GetMapping("/exams")
    public ResponseEntity<ApiResponse<List<Exam>>> getAllExams(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllExams(resolveSchoolId(authHeader))));
    }

    @GetMapping("/exams/{id}")
    public ResponseEntity<ApiResponse<Exam>> getExamById(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getExamById(id, resolveSchoolId(authHeader))));
    }

    @PostMapping("/exams")
    public ResponseEntity<ApiResponse<Exam>> createExam(
            @RequestBody Exam exam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        Exam created = academicService.createExam(exam, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Exam created", created));
    }

    @PutMapping("/exams/{id}")
    public ResponseEntity<ApiResponse<Exam>> updateExam(
            @PathVariable("id") Long id,
            @RequestBody Exam exam,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Exam updated", academicService.updateExam(id, exam, resolveSchoolId(authHeader))));
    }

    @DeleteMapping("/exams/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExam(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        academicService.deleteExam(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Exam deleted", null));
    }


    // ---- Marks ----

    @GetMapping("/marks")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getMarks(
            @RequestParam(value = "className", required = false) String className,
            @RequestParam(value = "section", required = false) String section,
            @RequestParam(value = "examName", required = false) String examName,
            @RequestParam(value = "subjectName", required = false) String subjectName,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        List<MarkDTO> marks = academicService.searchMarks(className, section, examName, subjectName, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(marks));
    }

    @GetMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<MarkDTO>> getMarkById(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success(academicService.getMarkById(id, resolveSchoolId(authHeader))));
    }

    @GetMapping("/marks/student/{studentId}")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getMarksByStudent(
            @PathVariable("studentId") Long studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Enforce parent-child isolation if called by a PARENT role
        Long schoolId = null;
        if (authHeader != null) {
            String token = jwtDecoder.extractRaw(authHeader);
            if (token != null && jwtDecoder.isValidToken(token)) {
                String role = normalizeRole(jwtDecoder.getRole(token));
                if ("PARENT".equals(role)) {
                    Long tokenStudentId = jwtDecoder.getStudentId(token);
                    // Must match a linked child; a null tokenStudentId (self-registered, no child
                    // linked yet) must also be rejected, not silently let through.
                    if (tokenStudentId == null || !tokenStudentId.equals(studentId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(ApiResponse.error("You are only authorized to view marks for your linked child"));
                    }
                }
                schoolId = jwtDecoder.getSchoolId(token);
            }
        }
        return ResponseEntity.ok(ApiResponse.success(academicService.getMarksByStudent(studentId, schoolId)));
    }

    @GetMapping("/marks/exam/{examId}")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getMarksByExam(
            @PathVariable("examId") Long examId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success(academicService.getMarksByExam(examId, resolveSchoolId(authHeader))));
    }

    @PostMapping("/marks")
    public ResponseEntity<ApiResponse<MarkDTO>> createMark(
            @RequestBody MarkDTO markDTO,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        MarkDTO created = academicService.saveOrUpdateMark(markDTO, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Mark recorded", created));
    }

    @PutMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<MarkDTO>> updateMark(
            @PathVariable("id") Long id,
            @RequestBody MarkDTO markDTO,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Mark updated", academicService.updateMark(id, markDTO, resolveSchoolId(authHeader))));
    }

    @DeleteMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMark(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        academicService.deleteMark(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Mark deleted", null));
    }

    /**
     * Also the internal cleanup target from student-service (no Authorization header) when a
     * student is deleted — see AcademicService.deleteMarksByStudent(Long) for why that path is
     * safely left unscoped.
     */
    @DeleteMapping("/marks/student/{studentId}")
    public ResponseEntity<ApiResponse<Void>> deleteMarksByStudent(
            @PathVariable("studentId") Long studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null) {
            academicService.deleteMarksByStudent(studentId);
        } else {
            verifyAdminRole(authHeader);
            academicService.deleteMarksByStudent(studentId, resolveSchoolId(authHeader));
        }
        return ResponseEntity.ok(ApiResponse.success("Marks deleted for student", null));
    }

    @PostMapping("/marks/batch")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> saveBatchMarks(
            @RequestBody MarkBatchRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        List<MarkDTO> saved = academicService.saveBatchMarks(request, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Marks saved successfully", saved));
    }

    @PostMapping("/marks/bulk-upload")
    public ResponseEntity<ApiResponse<BulkUploadResult>> bulkUploadMarks(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "examName", required = false) String examName,
            @RequestHeader(value = "Authorization", required = false) String authHeader) throws java.io.IOException {
        verifyStaffRole(authHeader);
        BulkUploadResult result = markBulkUploadService.processBulkUpload(file, examName, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Bulk marks processed", result));
    }

    @GetMapping("/marks/bulk-template")
    public ResponseEntity<byte[]> downloadTemplate(
            @RequestParam(value = "className", required = false) String className,
            @RequestParam(value = "subjectIds", required = false) List<Long> subjectIds,
            @RequestParam(value = "examName", required = false) String examName,
            @RequestHeader(value = "Authorization", required = false) String authHeader) throws java.io.IOException {
        verifyStaffRole(authHeader);
        byte[] bytes = markBulkUploadService.generateTemplate(className, subjectIds, examName, resolveSchoolId(authHeader));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"marks_template.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    // ---- Homework ----

    @GetMapping("/homework")
    public ResponseEntity<ApiResponse<List<Homework>>> getAllHomework(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllHomework(resolveSchoolId(authHeader))));
    }

    @GetMapping("/homework/class/{className}")
    public ResponseEntity<ApiResponse<List<Homework>>> getHomeworkByClass(
            @PathVariable("className") String className,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getHomeworkByClass(className, resolveSchoolId(authHeader))));
    }

    @PostMapping("/homework")
    public ResponseEntity<ApiResponse<Homework>> createHomework(
            @RequestBody Homework homework,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        Homework created = academicService.createHomework(homework, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Homework created", created));
    }

    @PutMapping("/homework/{id}")
    public ResponseEntity<ApiResponse<Homework>> updateHomework(
            @PathVariable("id") Long id,
            @RequestBody Homework homework,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Homework updated", academicService.updateHomework(id, homework, resolveSchoolId(authHeader))));
    }

    @DeleteMapping("/homework/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHomework(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        academicService.deleteHomework(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Homework deleted", null));
    }

    // ---- Board Results ----

    @GetMapping("/board-results")
    public ResponseEntity<ApiResponse<List<BoardResultDTO>>> getAllBoardResults(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllBoardResults(resolveSchoolId(authHeader))));
    }

    @PostMapping("/board-results")
    public ResponseEntity<ApiResponse<BoardResultDTO>> createBoardResult(
            @jakarta.validation.Valid @RequestBody BoardResultDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        BoardResultDTO created = academicService.createBoardResult(dto, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Board result saved", created));
    }

    @PutMapping("/board-results/{id}")
    public ResponseEntity<ApiResponse<BoardResultDTO>> updateBoardResult(
            @PathVariable("id") Long id,
            @jakarta.validation.Valid @RequestBody BoardResultDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyStaffRole(authHeader);
        return ResponseEntity.ok(ApiResponse.success("Board result updated", academicService.updateBoardResult(id, dto, resolveSchoolId(authHeader))));
    }

    @DeleteMapping("/board-results/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBoardResult(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        verifyAdminRole(authHeader);
        academicService.deleteBoardResult(id, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Board result deleted", null));
    }

    // ---- Role verification helpers ----

    private void verifyStaffRole(String authHeader) {
        if (authHeader == null) return;
        String token = jwtDecoder.extractRaw(authHeader);
        if (token != null && jwtDecoder.isValidToken(token)) {
            String role = normalizeRole(jwtDecoder.getRole(token));
            if (!"ADMIN".equals(role) && !"TEACHER".equals(role)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only Admin and Teachers are authorized to access Marks management.");
            }
        }
    }

    private void verifyAdminRole(String authHeader) {
        if (authHeader == null) return;
        String token = jwtDecoder.extractRaw(authHeader);
        if (token != null && jwtDecoder.isValidToken(token)) {
            String role = normalizeRole(jwtDecoder.getRole(token));
            if (!"ADMIN".equals(role)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only Admin is authorized to perform this operation.");
            }
        }
    }

    private String normalizeRole(String role) {
        if (role == null) return "";
        return role.toUpperCase().replace("ROLE_", "").trim();
    }

    private Long resolveSchoolId(String authHeader) {
        if (authHeader == null) return null;
        String token = jwtDecoder.extractRaw(authHeader);
        return token != null ? jwtDecoder.getSchoolId(token) : null;
    }
}
