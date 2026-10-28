package com.school.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * An internal staff opening posted by a School Admin. Scoped to one School (schoolId) —
 * the first new auth-service entity to use that scoping from day one.
 */
@Entity
@Table(name = "vacancies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vacancy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(nullable = false)
    private String title;

    private String department;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(name = "posted_date")
    private LocalDate postedDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        if (postedDate == null) {
            postedDate = LocalDate.now();
        }
    }

    public enum Status {
        OPEN,
        CLOSED
    }
}
