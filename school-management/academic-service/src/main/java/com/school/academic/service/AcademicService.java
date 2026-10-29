package com.school.academic.service;

import com.school.academic.dto.BoardResultDTO;
import com.school.academic.dto.SubjectMarkDTO;
import com.school.academic.entity.AcademicClass;
import com.school.academic.entity.BoardResult;
import com.school.academic.entity.Exam;
import com.school.academic.entity.Homework;
import com.school.academic.entity.Mark;
import com.school.academic.entity.Subject;
import com.school.academic.repository.AcademicClassRepository;
import com.school.academic.repository.BoardResultRepository;
import com.school.academic.repository.ExamRepository;
import com.school.academic.repository.HomeworkRepository;
import com.school.academic.repository.MarkRepository;
import com.school.academic.repository.SubjectRepository;
import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
    private final BoardResultRepository boardResultRepository;

    // ---- AcademicClass ----

    public List<AcademicClass> getAllClasses(Long schoolId) {
        ensureStandardAcademicDataSeeded(schoolId);
        return classRepository.findBySchoolId(schoolId);
    }

    public AcademicClass getClassById(Long id, Long schoolId) {
        return classRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass", "id", id));
    }

    public AcademicClass createClass(AcademicClass academicClass, Long schoolId) {
        requireSchoolId(schoolId);
        academicClass.setSchoolId(schoolId);
        return classRepository.save(academicClass);
    }

    public AcademicClass updateClass(Long id, AcademicClass updated, Long schoolId) {
        AcademicClass existing = getClassById(id, schoolId);
        existing.setName(updated.getName());
        existing.setSection(updated.getSection());
        existing.setDescription(updated.getDescription());
        return classRepository.save(existing);
    }

    public void deleteClass(Long id, Long schoolId) {
        if (classRepository.findByIdAndSchoolId(id, schoolId).isEmpty()) {
            throw new ResourceNotFoundException("AcademicClass", "id", id);
        }
        classRepository.deleteById(id);
    }

    // ---- Subject ----

    public List<Subject> getAllSubjects(Long schoolId) {
        ensureStandardAcademicDataSeeded(schoolId);
        return subjectRepository.findBySchoolId(schoolId);
    }

    public Subject getSubjectById(Long id, Long schoolId) {
        return subjectRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", id));
    }

    public List<Subject> getSubjectsByClass(Long classId, Long schoolId) {
        return subjectRepository.findByClassIdAndSchoolId(classId, schoolId);
    }

    @Transactional
    public Subject createSubject(Subject subject, Long schoolId) {
        requireSchoolId(schoolId);
        if (subject.getName() == null || subject.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Subject name is required.");
        }
        String trimmedName = subject.getName().trim();
        String trimmedCode = subject.getCode() != null ? subject.getCode().trim() : null;

        if (subjectRepository.existsByNameIgnoreCaseAndSchoolIdAndIdNot(trimmedName, schoolId, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject name '" + trimmedName + "' already exists.");
        }
        if (trimmedCode != null && !trimmedCode.isEmpty() && subjectRepository.existsByCodeIgnoreCaseAndSchoolIdAndIdNot(trimmedCode, schoolId, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject code '" + trimmedCode + "' already exists.");
        }

        subject.setName(trimmedName);
        subject.setCode(trimmedCode);
        subject.setSchoolId(schoolId);
        return subjectRepository.save(subject);
    }

    @Transactional
    public Subject updateSubject(Long id, Subject updated, Long schoolId) {
        Subject existing = getSubjectById(id, schoolId);
        if (updated.getName() == null || updated.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Subject name is required.");
        }
        String trimmedName = updated.getName().trim();
        String trimmedCode = updated.getCode() != null ? updated.getCode().trim() : null;

        if (subjectRepository.existsByNameIgnoreCaseAndSchoolIdAndIdNot(trimmedName, schoolId, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject name '" + trimmedName + "' already exists.");
        }
        if (trimmedCode != null && !trimmedCode.isEmpty() && subjectRepository.existsByCodeIgnoreCaseAndSchoolIdAndIdNot(trimmedCode, schoolId, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject code '" + trimmedCode + "' already exists.");
        }

        existing.setName(trimmedName);
        existing.setCode(trimmedCode);
        if (updated.getClassId() != null) {
            existing.setClassId(updated.getClassId());
        }
        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }
        Subject saved = subjectRepository.save(existing);
        markRepository.updateSubjectNameForMarks(id, trimmedName);
        return saved;
    }

    @Transactional
    public void deleteSubject(Long id, Long schoolId) {
        Subject existing = getSubjectById(id, schoolId);
        if (markRepository.existsBySubjectIdOrSubjectNameAndSchoolId(id, existing.getName(), schoolId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This subject cannot be deleted because marks already exist for this subject.");
        }
        subjectRepository.delete(existing);
    }

    // ---- Exam ----

    public List<Exam> getAllExams(Long schoolId) {
        ensureStandardAcademicDataSeeded(schoolId);
        return examRepository.findBySchoolId(schoolId);
    }

    public Exam getExamById(Long id, Long schoolId) {
        return examRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", "id", id));
    }

    @Transactional
    public Exam createExam(Exam exam, Long schoolId) {
        requireSchoolId(schoolId);
        if (exam.getName() == null || exam.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Exam name is required.");
        }
        String trimmedName = exam.getName().trim();
        if (examRepository.existsByNameIgnoreCaseAndSchoolIdAndIdNot(trimmedName, schoolId, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Exam name '" + trimmedName + "' already exists.");
        }

        exam.setName(trimmedName);
        if (exam.getTotalMarks() == null || exam.getTotalMarks() <= 0) {
            exam.setTotalMarks(100);
        }
        exam.setSchoolId(schoolId);
        return examRepository.save(exam);
    }

    @Transactional
    public Exam updateExam(Long id, Exam updated, Long schoolId) {
        Exam existing = getExamById(id, schoolId);
        if (updated.getName() == null || updated.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Exam name is required.");
        }
        String trimmedName = updated.getName().trim();
        if (examRepository.existsByNameIgnoreCaseAndSchoolIdAndIdNot(trimmedName, schoolId, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Exam name '" + trimmedName + "' already exists.");
        }

        existing.setName(trimmedName);
        if (updated.getExamDate() != null) {
            existing.setExamDate(updated.getExamDate());
        }
        if (updated.getTotalMarks() != null && updated.getTotalMarks() > 0) {
            existing.setTotalMarks(updated.getTotalMarks());
        }
        if (updated.getClassId() != null) {
            existing.setClassId(updated.getClassId());
        }
        if (updated.getSubjectId() != null) {
            existing.setSubjectId(updated.getSubjectId());
        }

        Exam saved = examRepository.save(existing);
        markRepository.updateExamNameForMarks(id, trimmedName);
        return saved;
    }

    @Transactional
    public void deleteExam(Long id, Long schoolId) {
        Exam existing = getExamById(id, schoolId);
        if (markRepository.existsByExamIdOrExamNameAndSchoolId(id, existing.getName(), schoolId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This exam cannot be deleted because marks already exist for this exam.");
        }
        examRepository.delete(existing);
    }


    // ---- Mark ----

    public List<com.school.academic.dto.MarkDTO> searchMarks(String className, String section, String examName, String subjectName, Long schoolId) {
        return markRepository.searchMarks(className, section, examName, subjectName, schoolId).stream()
                .map(this::toMarkDTO)
                .toList();
    }

    public List<com.school.academic.dto.MarkDTO> getMarksByStudent(Long studentId, Long schoolId) {
        return markRepository.findByStudentIdAndSchoolId(studentId, schoolId).stream()
                .map(this::toMarkDTO)
                .toList();
    }

    public List<com.school.academic.dto.MarkDTO> getMarksByExam(Long examId, Long schoolId) {
        return markRepository.findByExamIdAndSchoolId(examId, schoolId).stream()
                .map(this::toMarkDTO)
                .toList();
    }

    public com.school.academic.dto.MarkDTO getMarkById(Long id, Long schoolId) {
        Mark mark = markRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark", "id", id));
        return toMarkDTO(mark);
    }

    public com.school.academic.dto.MarkDTO saveOrUpdateMark(com.school.academic.dto.MarkDTO dto, Long schoolId) {
        requireSchoolId(schoolId);
        if (dto.getStudentId() == null) {
            throw new IllegalArgumentException("Student ID is required.");
        }
        if (dto.getSubjectName() == null || dto.getSubjectName().trim().isEmpty()) {
            throw new IllegalArgumentException("Subject name is required.");
        }
        if (dto.getExamName() == null || dto.getExamName().trim().isEmpty()) {
            throw new IllegalArgumentException("Exam name is required.");
        }

        double maxMarks = (dto.getMaxMarks() != null && dto.getMaxMarks() > 0) ? dto.getMaxMarks() : 100.0;
        double marksObtained = dto.getMarksObtained() != null ? dto.getMarksObtained() : 0.0;
        if (marksObtained < 0 || marksObtained > maxMarks) {
            throw new IllegalArgumentException("Marks obtained (" + marksObtained + ") must be between 0 and " + maxMarks);
        }

        // Check for existing mark for Student + Subject + Exam (upsert)
        java.util.Optional<Mark> existingOpt = dto.getId() != null ?
                markRepository.findByIdAndSchoolId(dto.getId(), schoolId) :
                markRepository.findFirstByStudentIdAndSubjectNameIgnoreCaseAndExamNameIgnoreCaseAndSchoolId(
                        dto.getStudentId(), dto.getSubjectName(), dto.getExamName(), schoolId);

        Long resolvedExamId = dto.getExamId();
        if (resolvedExamId == null && dto.getExamName() != null) {
            resolvedExamId = examRepository.findBySchoolId(schoolId).stream()
                    .filter(e -> e.getName() != null && e.getName().equalsIgnoreCase(dto.getExamName().trim()))
                    .map(Exam::getId)
                    .findFirst()
                    .orElse(null);
        }

        Long resolvedSubjectId = dto.getSubjectId();
        if (resolvedSubjectId == null && dto.getSubjectName() != null) {
            resolvedSubjectId = subjectRepository.findBySchoolId(schoolId).stream()
                    .filter(s -> s.getName() != null && s.getName().equalsIgnoreCase(dto.getSubjectName().trim()))
                    .map(Subject::getId)
                    .findFirst()
                    .orElse(null);
        }

        Mark mark;
        if (existingOpt.isPresent()) {
            mark = existingOpt.get();
            mark.setMarksObtained(marksObtained);
            mark.setMaxMarks(maxMarks);
            mark.setGrade(Mark.calculateGrade(marksObtained, maxMarks));
            if (dto.getRemarks() != null) mark.setRemarks(dto.getRemarks());
            if (dto.getClassName() != null) mark.setClassName(dto.getClassName());
            if (dto.getSection() != null) mark.setSection(dto.getSection());
            if (dto.getStudentName() != null) mark.setStudentName(dto.getStudentName());
            if (dto.getAdmissionNumber() != null) mark.setAdmissionNumber(dto.getAdmissionNumber());
            if (mark.getExamId() == null) mark.setExamId(resolvedExamId);
            if (mark.getSubjectId() == null) mark.setSubjectId(resolvedSubjectId);
            mark.setUpdatedAt(java.time.LocalDateTime.now());
        } else {
            mark = Mark.builder()
                    .studentId(dto.getStudentId())
                    .admissionNumber(dto.getAdmissionNumber())
                    .studentName(dto.getStudentName())
                    .className(dto.getClassName())
                    .section(dto.getSection())
                    .examId(resolvedExamId)
                    .examName(dto.getExamName())
                    .subjectId(resolvedSubjectId)
                    .subjectName(dto.getSubjectName())
                    .marksObtained(marksObtained)
                    .maxMarks(maxMarks)
                    .grade(Mark.calculateGrade(marksObtained, maxMarks))
                    .remarks(dto.getRemarks())
                    .createdAt(java.time.LocalDateTime.now())
                    .updatedAt(java.time.LocalDateTime.now())
                    .schoolId(schoolId)
                    .build();
        }

        Mark saved = markRepository.save(mark);
        return toMarkDTO(saved);
    }

    public List<com.school.academic.dto.MarkDTO> saveBatchMarks(com.school.academic.dto.MarkBatchRequest request, Long schoolId) {
        if (request.getMarks() == null || request.getMarks().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        java.util.List<com.school.academic.dto.MarkDTO> results = new java.util.ArrayList<>();
        for (com.school.academic.dto.MarkDTO dto : request.getMarks()) {
            // Apply batch fallbacks
            if (dto.getClassName() == null || dto.getClassName().isEmpty()) {
                dto.setClassName(request.getClassName());
            }
            if (dto.getSection() == null || dto.getSection().isEmpty()) {
                dto.setSection(request.getSection());
            }
            if (dto.getExamName() == null || dto.getExamName().isEmpty()) {
                dto.setExamName(request.getExamName());
            }
            if (dto.getSubjectName() == null || dto.getSubjectName().isEmpty()) {
                dto.setSubjectName(request.getSubjectName());
            }
            if (dto.getMaxMarks() == null || dto.getMaxMarks() <= 0) {
                dto.setMaxMarks(request.getMaxMarks() != null ? request.getMaxMarks() : 100.0);
            }

            if (dto.getMarksObtained() != null) {
                results.add(saveOrUpdateMark(dto, schoolId));
            }
        }
        return results;
    }

    public com.school.academic.dto.MarkDTO updateMark(Long id, com.school.academic.dto.MarkDTO updated, Long schoolId) {
        Mark existing = markRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark", "id", id));

        double maxMarks = (updated.getMaxMarks() != null && updated.getMaxMarks() > 0) ?
                updated.getMaxMarks() : (existing.getMaxMarks() != null ? existing.getMaxMarks() : 100.0);
        double marksObtained = updated.getMarksObtained() != null ?
                updated.getMarksObtained() : (existing.getMarksObtained() != null ? existing.getMarksObtained() : 0.0);

        if (marksObtained < 0 || marksObtained > maxMarks) {
            throw new IllegalArgumentException("Marks obtained (" + marksObtained + ") must be between 0 and " + maxMarks);
        }

        existing.setMarksObtained(marksObtained);
        existing.setMaxMarks(maxMarks);
        existing.setGrade(Mark.calculateGrade(marksObtained, maxMarks));
        if (updated.getRemarks() != null) existing.setRemarks(updated.getRemarks());
        existing.setUpdatedAt(java.time.LocalDateTime.now());

        Mark saved = markRepository.save(existing);
        return toMarkDTO(saved);
    }

    public void deleteMark(Long id, Long schoolId) {
        if (markRepository.findByIdAndSchoolId(id, schoolId).isEmpty()) {
            throw new ResourceNotFoundException("Mark", "id", id);
        }
        markRepository.deleteById(id);
    }

    /** Scoped variant for an external (ADMIN, JWT-bearing) caller. */
    @Transactional
    public long deleteMarksByStudent(Long studentId, Long schoolId) {
        return markRepository.deleteByStudentIdAndSchoolId(studentId, schoolId);
    }

    /**
     * Unscoped variant for the internal cleanup call from student-service (no Authorization
     * header, by the codebase's existing internal-call convention) when a student is deleted.
     * Safe without a schoolId: studentId is already a globally-unique id, and student-service's
     * own delete path (see StudentService.deleteStudent) is itself schoolId-scoped, so this only
     * ever fires for a student that genuinely belonged to the deleting admin's own school.
     */
    @Transactional
    public long deleteMarksByStudent(Long studentId) {
        return markRepository.deleteByStudentId(studentId);
    }

    public com.school.academic.dto.MarkDTO toMarkDTO(Mark mark) {
        return com.school.academic.dto.MarkDTO.builder()
                .id(mark.getId())
                .studentId(mark.getStudentId())
                .admissionNumber(mark.getAdmissionNumber())
                .studentName(mark.getStudentName())
                .className(mark.getClassName())
                .section(mark.getSection())
                .examId(mark.getExamId())
                .examName(mark.getExamName())
                .subjectId(mark.getSubjectId())
                .subjectName(mark.getSubjectName())
                .marksObtained(mark.getMarksObtained())
                .maxMarks(mark.getMaxMarks())
                .grade(mark.getGrade())
                .remarks(mark.getRemarks())
                .createdAt(mark.getCreatedAt())
                .updatedAt(mark.getUpdatedAt())
                .build();
    }

    // ---- Homework ----

    public List<Homework> getAllHomework(Long schoolId) {
        return homeworkRepository.findBySchoolId(schoolId);
    }

    public List<Homework> getHomeworkByClass(String className, Long schoolId) {
        return homeworkRepository.findByClassNameAndSchoolId(className, schoolId);
    }

    public Homework createHomework(Homework homework, Long schoolId) {
        requireSchoolId(schoolId);
        homework.setSchoolId(schoolId);
        return homeworkRepository.save(homework);
    }

    public Homework updateHomework(Long id, Homework updated, Long schoolId) {
        Homework existing = homeworkRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Homework", "id", id));
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setClassName(updated.getClassName());
        existing.setSection(updated.getSection());
        existing.setSubjectId(updated.getSubjectId());
        existing.setDueDate(updated.getDueDate());
        return homeworkRepository.save(existing);
    }

    public void deleteHomework(Long id, Long schoolId) {
        if (homeworkRepository.findByIdAndSchoolId(id, schoolId).isEmpty()) {
            throw new ResourceNotFoundException("Homework", "id", id);
        }
        homeworkRepository.deleteById(id);
    }

    // ---- Board Results ----

    public List<BoardResultDTO> getAllBoardResults(Long schoolId) {
        return boardResultRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId).stream()
                .map(this::toBoardResultDTO)
                .toList();
    }

    @Transactional
    public BoardResultDTO createBoardResult(BoardResultDTO dto, Long schoolId) {
        requireSchoolId(schoolId);
        BoardResult result = BoardResult.builder()
                .studentId(dto.getStudentId())
                .admissionNumber(dto.getAdmissionNumber())
                .studentName(dto.getStudentName())
                .board(dto.getBoard())
                .standard(dto.getStandard())
                .academicYear(dto.getAcademicYear())
                .subjects(toSubjectEntities(dto.getSubjects()))
                .totalMarks(sumMarks(dto.getSubjects()))
                .schoolId(schoolId)
                .build();
        BoardResult saved = boardResultRepository.save(result);
        return toBoardResultDTO(saved);
    }

    @Transactional
    public BoardResultDTO updateBoardResult(Long id, BoardResultDTO dto, Long schoolId) {
        BoardResult existing = boardResultRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("BoardResult", "id", id));
        existing.setBoard(dto.getBoard());
        existing.setStandard(dto.getStandard());
        existing.setAcademicYear(dto.getAcademicYear());
        existing.getSubjects().clear();
        existing.getSubjects().addAll(toSubjectEntities(dto.getSubjects()));
        existing.setTotalMarks(sumMarks(dto.getSubjects()));
        BoardResult saved = boardResultRepository.save(existing);
        return toBoardResultDTO(saved);
    }

    public void deleteBoardResult(Long id, Long schoolId) {
        if (boardResultRepository.findByIdAndSchoolId(id, schoolId).isEmpty()) {
            throw new ResourceNotFoundException("BoardResult", "id", id);
        }
        boardResultRepository.deleteById(id);
    }

    private Double sumMarks(List<SubjectMarkDTO> subjects) {
        if (subjects == null) return 0.0;
        return subjects.stream().mapToDouble(s -> s.getMarks() != null ? s.getMarks() : 0.0).sum();
    }

    /**
     * Guards every path that stamps schoolId onto a new row: a null here (unresolvable caller —
     * e.g. a stale pre-isolation token) must be rejected outright, never silently written and
     * later swept into Default School by the next boot's backfill.
     */
    public static void requireSchoolId(Long schoolId) {
        if (schoolId == null) {
            throw new BadRequestException("Could not resolve your school; please log in again.");
        }
    }

    /**
     * A school with zero exams/subjects/classes of its own (every school created after this
     * isolation work shipped) would otherwise show empty dropdowns throughout Marks/Homework —
     * before this fix, a new school silently inherited Default School's shared seed data; now
     * that's correctly blocked, but nothing replaced it. Seeds the same standard set
     * {@link com.school.academic.config.AcademicDataInitializer} seeds for Default School,
     * scoped to this schoolId, the first time any of the three lists is read empty.
     */
    private void ensureStandardAcademicDataSeeded(Long schoolId) {
        if (schoolId == null) return;
        if (examRepository.findBySchoolId(schoolId).isEmpty()) {
            for (String examName : com.school.academic.config.AcademicDataInitializer.STANDARD_EXAMS) {
                examRepository.save(Exam.builder()
                        .name(examName)
                        .totalMarks(100)
                        .examDate(java.time.LocalDate.now().plusMonths(1))
                        .schoolId(schoolId)
                        .build());
            }
            log.info("Seeded standard exams for schoolId {}", schoolId);
        }
        if (subjectRepository.findBySchoolId(schoolId).isEmpty()) {
            for (String[] sub : com.school.academic.config.AcademicDataInitializer.STANDARD_SUBJECTS) {
                subjectRepository.save(Subject.builder()
                        .name(sub[0])
                        .code(sub[1])
                        .schoolId(schoolId)
                        .build());
            }
            log.info("Seeded standard subjects for schoolId {}", schoolId);
        }
        if (classRepository.findBySchoolId(schoolId).isEmpty()) {
            for (int i = 1; i <= 12; i++) {
                classRepository.save(AcademicClass.builder()
                        .name("Class " + i)
                        .section("A")
                        .schoolId(schoolId)
                        .build());
            }
            log.info("Seeded standard classes for schoolId {}", schoolId);
        }
    }

    private List<BoardResult.SubjectMark> toSubjectEntities(List<SubjectMarkDTO> subjects) {
        if (subjects == null) return new java.util.ArrayList<>();
        return subjects.stream()
                .map(s -> BoardResult.SubjectMark.builder().subjectName(s.getSubjectName()).marks(s.getMarks()).build())
                .collect(java.util.stream.Collectors.toList());
    }

    private BoardResultDTO toBoardResultDTO(BoardResult result) {
        List<SubjectMarkDTO> subjects = result.getSubjects().stream()
                .map(s -> SubjectMarkDTO.builder().subjectName(s.getSubjectName()).marks(s.getMarks()).build())
                .toList();
        return BoardResultDTO.builder()
                .id(result.getId())
                .studentId(result.getStudentId())
                .admissionNumber(result.getAdmissionNumber())
                .studentName(result.getStudentName())
                .board(result.getBoard())
                .standard(result.getStandard())
                .academicYear(result.getAcademicYear())
                .subjects(subjects)
                .totalMarks(result.getTotalMarks())
                .createdAt(result.getCreatedAt())
                .updatedAt(result.getUpdatedAt())
                .build();
    }
}
