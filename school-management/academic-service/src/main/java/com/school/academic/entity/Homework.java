package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Homework assignment for a class/section.
 */
@Entity
@Table(name = "homework")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Homework {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String className;

    private String section;

    private Long subjectId;

    @Column(nullable = false)
    private LocalDate dueDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
