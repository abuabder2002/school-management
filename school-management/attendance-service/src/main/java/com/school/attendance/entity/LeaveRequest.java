package com.school.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Leave request submitted by a parent for their child.
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

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    /** PENDING, APPROVED, REJECTED */
    @Column(nullable = false)
    private String status;

    private String reviewNote;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
