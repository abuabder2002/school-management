package com.school.attendance.repository;

import com.school.attendance.entity.TeacherLeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherLeaveRequestRepository extends JpaRepository<TeacherLeaveRequest, Long> {
    List<TeacherLeaveRequest> findByTeacherIdOrderByCreatedAtDesc(Long teacherId);
    List<TeacherLeaveRequest> findAllByOrderByCreatedAtDesc();

    List<TeacherLeaveRequest> findByTeacherIdAndSchoolIdOrderByCreatedAtDesc(Long teacherId, Long schoolId);
    List<TeacherLeaveRequest> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    Optional<TeacherLeaveRequest> findByIdAndSchoolId(Long id, Long schoolId);
}
