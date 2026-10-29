package com.school.academic.repository;

import com.school.academic.entity.Homework;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HomeworkRepository extends JpaRepository<Homework, Long> {
    List<Homework> findByClassName(String className);
    List<Homework> findByClassNameAndSection(String className, String section);

    List<Homework> findBySchoolId(Long schoolId);
    List<Homework> findByClassNameAndSchoolId(String className, Long schoolId);
    Optional<Homework> findByIdAndSchoolId(Long id, Long schoolId);
}
