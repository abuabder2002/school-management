package com.school.attendance.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Leave record submitted by a parent for their child.
 * Recorded directly — no approval/rejection workflow.
 */
@Entity
@Table(name = "leave_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID of the student (from auth-service JWT studentId claim) */
    @Column(nullable = false)
    private Long studentId;

    /** ID of the parent user who submitted the request */
    @Column(nullable = false)
    private Long parentId;

    /** Single-day leave date (mapped to startDate in database for backward schema compatibility) */
    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    /** RECORDED */
    @Column(nullable = false)
    @Builder.Default
    private String status = "RECORDED";

    private String reviewNote;

    /** Who created this record: PARENT (self-submitted) or ADMIN (recorded on the parent's behalf) */
    @Column(length = 20)
    @Builder.Default
    private String recordedBy = "PARENT";

    /** Which batch/session the leave applies to (admin-recorded leaves only, e.g. "Morning Session"); null for parent-submitted leaves */
    private String session;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private Long schoolId;

    /** Convenience getter and JSON property for single-day leave date */
    @JsonProperty("leaveDate")
    public LocalDate getLeaveDate() {
        return startDate;
    }

    /** Convenience setter for single-day leave date */
    @JsonProperty("leaveDate")
    public void setLeaveDate(LocalDate leaveDate) {
        if (leaveDate != null) {
            this.startDate = leaveDate;
        }
    }

    /** Convenience getter for submitted timestamp */
    @JsonProperty("submittedAt")
    public LocalDateTime getSubmittedAt() {
        return createdAt;
    }
}
