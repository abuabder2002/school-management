package com.school.attendance.repository;

import com.school.attendance.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByParentId(Long parentId);
    List<LeaveRequest> findByStudentId(Long studentId);
    List<LeaveRequest> findAllByOrderByCreatedAtDesc();
}
