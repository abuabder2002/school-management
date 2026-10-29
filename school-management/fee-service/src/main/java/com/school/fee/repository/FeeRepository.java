package com.school.fee.repository;

import com.school.fee.entity.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Fee entity.
 */
@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {

    List<Fee> findByStudentId(Long studentId);

    Optional<Fee> findFirstByStudentId(Long studentId);

    List<Fee> findByClassName(String className);

    Optional<Fee> findByStudentIdAndClassName(Long studentId, String className);

    List<Fee> findByStudentIdIn(Collection<Long> studentIds);

    List<Fee> findByStudentIdAndSchoolId(Long studentId, Long schoolId);

    Optional<Fee> findFirstByStudentIdAndSchoolId(Long studentId, Long schoolId);

    List<Fee> findByClassNameAndSchoolId(String className, Long schoolId);

    List<Fee> findByStudentIdInAndSchoolId(Collection<Long> studentIds, Long schoolId);

    List<Fee> findBySchoolId(Long schoolId);

    Optional<Fee> findByIdAndSchoolId(Long id, Long schoolId);
}
