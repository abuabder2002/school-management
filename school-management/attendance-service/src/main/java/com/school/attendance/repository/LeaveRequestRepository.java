package com.school.attendance.repository;

import com.school.attendance.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByParentId(Long parentId);
    List<LeaveRequest> findByStudentId(Long studentId);
    List<LeaveRequest> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<LeaveRequest> findAllByOrderByCreatedAtDesc();

    List<LeaveRequest> findByParentIdAndSchoolId(Long parentId, Long schoolId);
    List<LeaveRequest> findByStudentIdAndSchoolIdOrderByCreatedAtDesc(Long studentId, Long schoolId);
    List<LeaveRequest> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    Optional<LeaveRequest> findByIdAndSchoolId(Long id, Long schoolId);
}
