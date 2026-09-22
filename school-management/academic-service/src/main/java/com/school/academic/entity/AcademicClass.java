package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Represents a school class (e.g. Grade 1, Grade 2).
 */
@Entity
@Table(name = "academic_classes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String section;

    private String description;
}
