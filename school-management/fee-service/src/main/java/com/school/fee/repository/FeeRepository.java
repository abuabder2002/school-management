package com.school.fee.repository;

import com.school.fee.entity.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Fee entity.
 */
@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {

    List<Fee> findByStudentId(Long studentId);
}
