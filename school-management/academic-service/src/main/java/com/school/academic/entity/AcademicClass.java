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

    // Unique per school (see SchoolIdBackfillRunner), not globally.
    @Column(nullable = false)
    private String name;

    private String section;

    private String description;

    private Long schoolId;
}
