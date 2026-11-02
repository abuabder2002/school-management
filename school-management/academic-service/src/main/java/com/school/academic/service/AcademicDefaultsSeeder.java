package com.school.academic.service;

import com.school.academic.config.StandardAcademicData;
import com.school.academic.entity.AcademicClass;
import com.school.academic.entity.AcademicSeedMarker;
import com.school.academic.entity.Exam;
import com.school.academic.entity.Subject;
import com.school.academic.repository.AcademicClassRepository;
import com.school.academic.repository.AcademicSeedMarkerRepository;
import com.school.academic.repository.ExamRepository;
import com.school.academic.repository.SubjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Gives a school the standard exams, subjects and classes exactly once, the first time any of
 * them is read. A school with none of them would otherwise show empty dropdowns throughout Marks.
 *
 * Two properties matter, and both were broken when this was "seed whenever a list is empty":
 *  - once only: after the school has been seeded, anything it deletes stays deleted;
 *  - no duplicates: the dashboard and the Marks page load at the same moment on a new school, so
 *    concurrent first requests are serialised per school and only the first one seeds.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AcademicDefaultsSeeder {

    private final AcademicSeedMarkerRepository markerRepository;
    private final ExamRepository examRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicClassRepository classRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void ensureSeeded(Long schoolId) {
        if (schoolId == null || markerRepository.existsById(schoolId)) {
            return;
        }

        // Held until this transaction commits. A concurrent first request waits here, then sees
        // the marker below and returns, instead of seeding a second copy.
        entityManager.createNativeQuery("SELECT 1 FROM (SELECT pg_advisory_xact_lock(:key) AS locked) l")
                .setParameter("key", schoolId)
                .getSingleResult();
        if (markerRepository.existsById(schoolId)) {
            return;
        }

        // A school that already has some of its own data (it predates this marker) only gets the
        // lists it has none of, so existing data is never touched.
        if (examRepository.findBySchoolId(schoolId).isEmpty()) {
            for (String examName : StandardAcademicData.STANDARD_EXAMS) {
                examRepository.save(Exam.builder()
                        .name(examName)
                        .totalMarks(100)
                        .examDate(LocalDate.now().plusMonths(1))
                        .schoolId(schoolId)
                        .build());
            }
        }
        if (subjectRepository.findBySchoolId(schoolId).isEmpty()) {
            for (String[] sub : StandardAcademicData.STANDARD_SUBJECTS) {
                subjectRepository.save(Subject.builder()
                        .name(sub[0])
                        .code(sub[1])
                        .schoolId(schoolId)
                        .build());
            }
        }
        if (classRepository.findBySchoolId(schoolId).isEmpty()) {
            for (int i = 1; i <= 12; i++) {
                classRepository.save(AcademicClass.builder()
                        .name("Class " + i)
                        .section("A")
                        .schoolId(schoolId)
                        .build());
            }
        }

        markerRepository.save(new AcademicSeedMarker(schoolId, LocalDateTime.now()));
        log.info("Seeded standard exams, subjects and classes for schoolId {}", schoolId);
    }
}
