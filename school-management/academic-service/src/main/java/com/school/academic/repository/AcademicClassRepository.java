package com.school.academic.repository;

import com.school.academic.entity.AcademicClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicClassRepository extends JpaRepository<AcademicClass, Long> {
    boolean existsByName(String name);

    List<AcademicClass> findBySchoolId(Long schoolId);

    Optional<AcademicClass> findByIdAndSchoolId(Long id, Long schoolId);
}
