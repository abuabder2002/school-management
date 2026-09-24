package com.school.notification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Notification entity supporting both targeted parent notifications
 * and broad audience broadcasts (STUDENTS, TEACHERS, BOTH).
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

    @Column(name = "parent_id")
    private Long parentId;

    @Column
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "notification_date")
    private LocalDate notificationDate;

    @Column(name = "target_audience", length = 50)
    private String targetAudience;

    @Column(length = 50)
    @Builder.Default
    private String status = "Sent";

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean read;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (notificationDate == null) {
            notificationDate = LocalDate.now();
        }
        if (status == null || status.isBlank()) {
            status = "Sent";
        }
    }
}
