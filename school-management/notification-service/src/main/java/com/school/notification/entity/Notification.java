package com.school.notification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Notification sent by Admin to Students, Teachers, or Both.
 */
@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String audience;   // STUDENTS | TEACHERS | BOTH

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String status;     // SENT

    /** Set only for a notification meant for one specific student's parent/student portal; null = broadcast to the whole audience */
    private Long targetStudentId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private Long schoolId;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "SENT";
        }
    }
}
