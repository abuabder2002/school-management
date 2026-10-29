package com.school.academic.repository;

import com.school.academic.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByClassId(Long classId);

    List<Subject> findByClassIdAndSchoolId(Long classId, Long schoolId);

    List<Subject> findBySchoolId(Long schoolId);

    Optional<Subject> findByIdAndSchoolId(Long id, Long schoolId);

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(:name)) AND (:id IS NULL OR s.id <> :id)")
    boolean existsByNameIgnoreCaseAndIdNot(@Param("name") String name, @Param("id") Long id);

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE LOWER(TRIM(s.code)) = LOWER(TRIM(:code)) AND (:id IS NULL OR s.id <> :id)")
    boolean existsByCodeIgnoreCaseAndIdNot(@Param("code") String code, @Param("id") Long id);

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(:name)) AND s.schoolId = :schoolId AND (:id IS NULL OR s.id <> :id)")
    boolean existsByNameIgnoreCaseAndSchoolIdAndIdNot(@Param("name") String name, @Param("schoolId") Long schoolId, @Param("id") Long id);

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE LOWER(TRIM(s.code)) = LOWER(TRIM(:code)) AND s.schoolId = :schoolId AND (:id IS NULL OR s.id <> :id)")
    boolean existsByCodeIgnoreCaseAndSchoolIdAndIdNot(@Param("code") String code, @Param("schoolId") Long schoolId, @Param("id") Long id);
}

