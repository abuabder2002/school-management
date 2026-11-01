package com.school.attendance.repository;

import com.school.attendance.entity.LeaveReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /** Super-Admin-managed reasons that apply to every school. */
    List<LeaveReason> findBySchoolIdIsNull();

    Optional<LeaveReason> findByIdAndSchoolIdIsNull(Long id);

    /** Active reasons for a school's dropdown, including Super-Admin global reasons. */
    @Query("SELECT lr FROM LeaveReason lr WHERE lr.active = true AND (lr.schoolId = :schoolId OR lr.schoolId IS NULL) ORDER BY lr.englishReason ASC")
    List<LeaveReason> findActiveBySchoolIdIncludingGlobal(@Param("schoolId") Long schoolId);

    /** A school's own reasons plus Super-Admin global reasons, for the admin management view. */
    @Query("SELECT lr FROM LeaveReason lr WHERE lr.schoolId = :schoolId OR lr.schoolId IS NULL")
    List<LeaveReason> findBySchoolIdIncludingGlobal(@Param("schoolId") Long schoolId);
}
