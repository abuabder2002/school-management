package com.school.academic.controller;

import com.school.academic.entity.AcademicClass;
import com.school.academic.entity.Exam;
import com.school.academic.entity.Homework;
import com.school.academic.entity.Mark;
import com.school.academic.entity.Subject;
import com.school.academic.service.AcademicService;
import com.school.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Academic management (classes, subjects, exams, marks).
 */
@RestController
@RequestMapping("/api/academic")
@RequiredArgsConstructor
public class AcademicController {

    private final AcademicService academicService;

    // ---- Classes ----

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<AcademicClass>>> getAllClasses() {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllClasses()));
    }

    @GetMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<AcademicClass>> getClassById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getClassById(id)));
    }

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<AcademicClass>> createClass(@RequestBody AcademicClass academicClass) {
        AcademicClass created = academicService.createClass(academicClass);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Class created", created));
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<AcademicClass>> updateClass(@PathVariable("id") Long id,
                                                                    @RequestBody AcademicClass academicClass) {
        return ResponseEntity.ok(ApiResponse.success("Class updated", academicService.updateClass(id, academicClass)));
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteClass(@PathVariable("id") Long id) {
        academicService.deleteClass(id);
        return ResponseEntity.ok(ApiResponse.success("Class deleted", null));
    }

    // ---- Subjects ----

    @GetMapping("/subjects")
    public ResponseEntity<ApiResponse<List<Subject>>> getAllSubjects() {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllSubjects()));
    }

    @GetMapping("/subjects/{id}")
    public ResponseEntity<ApiResponse<Subject>> getSubjectById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getSubjectById(id)));
    }

    @GetMapping("/subjects/class/{classId}")
    public ResponseEntity<ApiResponse<List<Subject>>> getSubjectsByClass(@PathVariable("classId") Long classId) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getSubjectsByClass(classId)));
    }

    @PostMapping("/subjects")
    public ResponseEntity<ApiResponse<Subject>> createSubject(@RequestBody Subject subject) {
        Subject created = academicService.createSubject(subject);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Subject created", created));
    }

    @PutMapping("/subjects/{id}")
    public ResponseEntity<ApiResponse<Subject>> updateSubject(@PathVariable("id") Long id,
                                                               @RequestBody Subject subject) {
        return ResponseEntity.ok(ApiResponse.success("Subject updated", academicService.updateSubject(id, subject)));
    }

    // ---- Exams ----

    @GetMapping("/exams")
    public ResponseEntity<ApiResponse<List<Exam>>> getAllExams() {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllExams()));
    }

    @GetMapping("/exams/{id}")
    public ResponseEntity<ApiResponse<Exam>> getExamById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getExamById(id)));
    }

    @PostMapping("/exams")
    public ResponseEntity<ApiResponse<Exam>> createExam(@RequestBody Exam exam) {
        Exam created = academicService.createExam(exam);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Exam created", created));
    }

    // ---- Marks ----

    @GetMapping("/marks/student/{studentId}")
    public ResponseEntity<ApiResponse<List<Mark>>> getMarksByStudent(@PathVariable("studentId") Long studentId) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getMarksByStudent(studentId)));
    }

    @GetMapping("/marks/exam/{examId}")
    public ResponseEntity<ApiResponse<List<Mark>>> getMarksByExam(@PathVariable("examId") Long examId) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getMarksByExam(examId)));
    }

    @PostMapping("/marks")
    public ResponseEntity<ApiResponse<Mark>> createMark(@RequestBody Mark mark) {
        Mark created = academicService.createMark(mark);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Mark recorded", created));
    }

    @PutMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<Mark>> updateMark(@PathVariable("id") Long id, @RequestBody Mark mark) {
        return ResponseEntity.ok(ApiResponse.success("Mark updated", academicService.updateMark(id, mark)));
    }

    // ---- Homework ----

    @GetMapping("/homework")
    public ResponseEntity<ApiResponse<List<Homework>>> getAllHomework() {
        return ResponseEntity.ok(ApiResponse.success(academicService.getAllHomework()));
    }

    @GetMapping("/homework/class/{className}")
    public ResponseEntity<ApiResponse<List<Homework>>> getHomeworkByClass(@PathVariable("className") String className) {
        return ResponseEntity.ok(ApiResponse.success(academicService.getHomeworkByClass(className)));
    }

    @PostMapping("/homework")
    public ResponseEntity<ApiResponse<Homework>> createHomework(@RequestBody Homework homework) {
        Homework created = academicService.createHomework(homework);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Homework created", created));
    }

    @PutMapping("/homework/{id}")
    public ResponseEntity<ApiResponse<Homework>> updateHomework(@PathVariable("id") Long id,
                                                                @RequestBody Homework homework) {
        return ResponseEntity.ok(ApiResponse.success("Homework updated", academicService.updateHomework(id, homework)));
    }

    @DeleteMapping("/homework/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHomework(@PathVariable("id") Long id) {
        academicService.deleteHomework(id);
        return ResponseEntity.ok(ApiResponse.success("Homework deleted", null));
    }
}
