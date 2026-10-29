package com.school.academic.repository;

import com.school.academic.entity.Mark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarkRepository extends JpaRepository<Mark, Long> {

    List<Mark> findByStudentId(Long studentId);

    long deleteByStudentId(Long studentId);

    long deleteByStudentIdAndSchoolId(Long studentId, Long schoolId);

    List<Mark> findByExamId(Long examId);

    List<Mark> findByStudentIdAndSchoolId(Long studentId, Long schoolId);

    List<Mark> findByExamIdAndSchoolId(Long examId, Long schoolId);

    Optional<Mark> findByIdAndSchoolId(Long id, Long schoolId);

    Optional<Mark> findFirstByStudentIdAndSubjectNameIgnoreCaseAndExamNameIgnoreCase(
            Long studentId, String subjectName, String examName);

    Optional<Mark> findFirstByStudentIdAndSubjectNameIgnoreCaseAndExamNameIgnoreCaseAndSchoolId(
            Long studentId, String subjectName, String examName, Long schoolId);

    Optional<Mark> findFirstByAdmissionNumberAndSubjectNameIgnoreCaseAndExamNameIgnoreCase(
            String admissionNumber, String subjectName, String examName);

    @Query("SELECT m FROM Mark m WHERE " +
           "(:className IS NULL OR :className = '' OR LOWER(m.className) = LOWER(:className) OR LOWER(m.className) = LOWER(CONCAT('Class ', :className))) AND " +
           "(:section IS NULL OR :section = '' OR LOWER(m.section) = LOWER(:section)) AND " +
           "(:examName IS NULL OR :examName = '' OR LOWER(m.examName) = LOWER(:examName)) AND " +
           "(:subjectName IS NULL OR :subjectName = '' OR LOWER(m.subjectName) = LOWER(:subjectName)) AND " +
           "m.schoolId = :schoolId " +
           "ORDER BY m.className, m.section, m.admissionNumber, m.id")
    List<Mark> searchMarks(
            @Param("className") String className,
            @Param("section") String section,
            @Param("examName") String examName,
            @Param("subjectName") String subjectName,
            @Param("schoolId") Long schoolId);

    @Query("SELECT COUNT(m) > 0 FROM Mark m WHERE " +
           "(:subjectId IS NOT NULL AND m.subjectId = :subjectId) OR " +
           "(:subjectName IS NOT NULL AND TRIM(:subjectName) <> '' AND m.subjectName IS NOT NULL AND LOWER(TRIM(m.subjectName)) = LOWER(TRIM(:subjectName)))")
    boolean existsBySubjectIdOrSubjectName(
            @Param("subjectId") Long subjectId,
            @Param("subjectName") String subjectName);

    @Query("SELECT COUNT(m) > 0 FROM Mark m WHERE m.schoolId = :schoolId AND ((:subjectId IS NOT NULL AND m.subjectId = :subjectId) OR " +
           "(:subjectName IS NOT NULL AND TRIM(:subjectName) <> '' AND m.subjectName IS NOT NULL AND LOWER(TRIM(m.subjectName)) = LOWER(TRIM(:subjectName))))")
    boolean existsBySubjectIdOrSubjectNameAndSchoolId(
            @Param("subjectId") Long subjectId,
            @Param("subjectName") String subjectName,
            @Param("schoolId") Long schoolId);

    @Query("SELECT COUNT(m) > 0 FROM Mark m WHERE " +
           "(:examId IS NOT NULL AND m.examId = :examId) OR " +
           "(:examName IS NOT NULL AND TRIM(:examName) <> '' AND m.examName IS NOT NULL AND LOWER(TRIM(m.examName)) = LOWER(TRIM(:examName)))")
    boolean existsByExamIdOrExamName(
            @Param("examId") Long examId,
            @Param("examName") String examName);

    @Query("SELECT COUNT(m) > 0 FROM Mark m WHERE m.schoolId = :schoolId AND ((:examId IS NOT NULL AND m.examId = :examId) OR " +
           "(:examName IS NOT NULL AND TRIM(:examName) <> '' AND m.examName IS NOT NULL AND LOWER(TRIM(m.examName)) = LOWER(TRIM(:examName))))")
    boolean existsByExamIdOrExamNameAndSchoolId(
            @Param("examId") Long examId,
            @Param("examName") String examName,
            @Param("schoolId") Long schoolId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE Mark m SET m.subjectName = :newName WHERE m.subjectId = :subjectId")
    int updateSubjectNameForMarks(@Param("subjectId") Long subjectId, @Param("newName") String newName);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE Mark m SET m.examName = :newName WHERE m.examId = :examId")
    int updateExamNameForMarks(@Param("examId") Long examId, @Param("newName") String newName);
}

