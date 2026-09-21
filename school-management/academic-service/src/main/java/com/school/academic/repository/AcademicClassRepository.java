package com.school.academic.repository;

import com.school.academic.entity.AcademicClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AcademicClassRepository extends JpaRepository<AcademicClass, Long> {
    boolean existsByName(String name);
}
