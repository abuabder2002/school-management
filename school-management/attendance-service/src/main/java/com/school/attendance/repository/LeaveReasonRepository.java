package com.school.attendance.repository;

import com.school.attendance.entity.LeaveReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveReasonRepository extends JpaRepository<LeaveReason, Long> {

    /** All active reasons for the parent dropdown */
    List<LeaveReason> findByActiveTrueOrderByEnglishReasonAsc();

    /** Check if any leave request references this reason text */
    boolean existsByEnglishReason(String englishReason);

    List<LeaveReason> findByActiveTrueAndSchoolIdOrderByEnglishReasonAsc(Long schoolId);

    List<LeaveReason> findBySchoolId(Long schoolId);

    boolean existsByEnglishReasonAndSchoolId(String englishReason, Long schoolId);

    Optional<LeaveReason> findByIdAndSchoolId(Long id, Long schoolId);
}
