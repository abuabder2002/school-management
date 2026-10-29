package com.school.academic.repository;

import com.school.academic.entity.BoardResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardResultRepository extends JpaRepository<BoardResult, Long> {

    List<BoardResult> findAllByOrderByCreatedAtDesc();

    List<BoardResult> findByStudentId(Long studentId);

    List<BoardResult> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    Optional<BoardResult> findByIdAndSchoolId(Long id, Long schoolId);
}
