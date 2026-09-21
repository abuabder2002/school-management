package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Represents a subject taught in a class.
 */
@Entity
@Table(name = "subjects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String code;

    private Long classId;

    private String description;
}
