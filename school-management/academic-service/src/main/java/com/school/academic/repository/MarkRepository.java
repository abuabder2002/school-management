package com.school.academic.repository;

import com.school.academic.entity.Mark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarkRepository extends JpaRepository<Mark, Long> {
    List<Mark> findByStudentId(Long studentId);
    List<Mark> findByExamId(Long examId);
}
