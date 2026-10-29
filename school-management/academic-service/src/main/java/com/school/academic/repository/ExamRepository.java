package com.school.academic.repository;

import com.school.academic.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByClassId(Long classId);

    List<Exam> findBySchoolId(Long schoolId);

    Optional<Exam> findByIdAndSchoolId(Long id, Long schoolId);

    @Query("SELECT COUNT(e) > 0 FROM Exam e WHERE LOWER(TRIM(e.name)) = LOWER(TRIM(:name)) AND (:id IS NULL OR e.id <> :id)")
    boolean existsByNameIgnoreCaseAndIdNot(@Param("name") String name, @Param("id") Long id);

    @Query("SELECT COUNT(e) > 0 FROM Exam e WHERE LOWER(TRIM(e.name)) = LOWER(TRIM(:name)) AND e.schoolId = :schoolId AND (:id IS NULL OR e.id <> :id)")
    boolean existsByNameIgnoreCaseAndSchoolIdAndIdNot(@Param("name") String name, @Param("schoolId") Long schoolId, @Param("id") Long id);
}

