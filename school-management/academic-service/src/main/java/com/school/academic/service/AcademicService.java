package com.school.academic.service;

import com.school.academic.entity.AcademicClass;
import com.school.academic.entity.Exam;
import com.school.academic.entity.Homework;
import com.school.academic.entity.Mark;
import com.school.academic.entity.Subject;
import com.school.academic.repository.AcademicClassRepository;
import com.school.academic.repository.ExamRepository;
import com.school.academic.repository.HomeworkRepository;
import com.school.academic.repository.MarkRepository;
import com.school.academic.repository.SubjectRepository;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service layer for academic operations: classes, subjects, exams, marks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AcademicService {

    private final AcademicClassRepository classRepository;
    private final SubjectRepository subjectRepository;
    private final ExamRepository examRepository;
    private final MarkRepository markRepository;
    private final HomeworkRepository homeworkRepository;

    // ---- AcademicClass ----

    public List<AcademicClass> getAllClasses() {
        return classRepository.findAll();
    }

    public AcademicClass getClassById(Long id) {
        return classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass", "id", id));
    }

    public AcademicClass createClass(AcademicClass academicClass) {
        return classRepository.save(academicClass);
    }

    public AcademicClass updateClass(Long id, AcademicClass updated) {
        AcademicClass existing = getClassById(id);
        existing.setName(updated.getName());
        existing.setSection(updated.getSection());
        existing.setDescription(updated.getDescription());
        return classRepository.save(existing);
    }

    public void deleteClass(Long id) {
        if (!classRepository.existsById(id)) {
            throw new ResourceNotFoundException("AcademicClass", "id", id);
        }
        classRepository.deleteById(id);
    }

    // ---- Subject ----

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    public Subject getSubjectById(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", id));
    }

    public List<Subject> getSubjectsByClass(Long classId) {
        return subjectRepository.findByClassId(classId);
    }

    public Subject createSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public Subject updateSubject(Long id, Subject updated) {
        Subject existing = getSubjectById(id);
        existing.setName(updated.getName());
        existing.setCode(updated.getCode());
        existing.setClassId(updated.getClassId());
        existing.setDescription(updated.getDescription());
        return subjectRepository.save(existing);
    }

    // ---- Exam ----

    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    public Exam getExamById(Long id) {
        return examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", "id", id));
    }

    public Exam createExam(Exam exam) {
        return examRepository.save(exam);
    }

    // ---- Mark ----

    public List<Mark> getMarksByStudent(Long studentId) {
        return markRepository.findByStudentId(studentId);
    }

    public List<Mark> getMarksByExam(Long examId) {
        return markRepository.findByExamId(examId);
    }

    public Mark createMark(Mark mark) {
        return markRepository.save(mark);
    }

    public Mark updateMark(Long id, Mark updated) {
        Mark existing = markRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mark", "id", id));
        existing.setMarksObtained(updated.getMarksObtained());
        existing.setGrade(updated.getGrade());
        existing.setRemarks(updated.getRemarks());
        return markRepository.save(existing);
    }

    // ---- Homework ----

    public List<Homework> getAllHomework() {
        return homeworkRepository.findAll();
    }

    public List<Homework> getHomeworkByClass(String className) {
        return homeworkRepository.findByClassName(className);
    }

    public Homework createHomework(Homework homework) {
        return homeworkRepository.save(homework);
    }

    public Homework updateHomework(Long id, Homework updated) {
        Homework existing = homeworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Homework", "id", id));
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setClassName(updated.getClassName());
        existing.setSection(updated.getSection());
        existing.setSubjectId(updated.getSubjectId());
        existing.setDueDate(updated.getDueDate());
        return homeworkRepository.save(existing);
    }

    public void deleteHomework(Long id) {
        if (!homeworkRepository.existsById(id)) {
            throw new ResourceNotFoundException("Homework", "id", id);
        }
        homeworkRepository.deleteById(id);
    }
}
