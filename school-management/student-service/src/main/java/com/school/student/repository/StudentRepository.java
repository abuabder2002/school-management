package com.school.student.repository;

import com.school.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Student entity.
 */
@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByAdmissionNumber(String admissionNumber);

    List<Student> findByClassName(String className);

    List<Student> findByParentId(Long parentId);

    List<Student> findByAdmissionNumberIn(java.util.Collection<String> admissionNumbers);

    boolean existsByAdmissionNumber(String admissionNumber);
}
