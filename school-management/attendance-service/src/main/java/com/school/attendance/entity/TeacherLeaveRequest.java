package com.school.attendance.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Leave record a teacher submits for themselves.
 * Recorded directly — no approval/rejection workflow, matching student leave.
 */
@Entity
@Table(name = "teacher_leave_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherLeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID of the teacher (from auth-service JWT userId claim) */
    @Column(nullable = false)
    private Long teacherId;

    /** Display name, supplied by the frontend from the signed-in teacher's own profile. */
    @Column(nullable = false)
    private String teacherName;

    /** Assigned class/section, resolved server-side from the teacher's JWT claims. */
    private String assignedClass;
    private String assignedSection;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    /** RECORDED */
    @Column(nullable = false)
    @Builder.Default
    private String status = "RECORDED";

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private Long schoolId;

    /** Convenience getter and JSON property for single-day leave date, matching LeaveRequest's shape. */
    @JsonProperty("leaveDate")
    public LocalDate getLeaveDate() {
        return startDate;
    }

    @JsonProperty("leaveDate")
    public void setLeaveDate(LocalDate leaveDate) {
        if (leaveDate != null) {
            this.startDate = leaveDate;
        }
    }

    @JsonProperty("submittedAt")
    public LocalDateTime getSubmittedAt() {
        return createdAt;
    }
}
