package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Represents marks scored by a student in an exam.
 */
@Entity
@Table(name = "marks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Mark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private Long examId;

    private Integer marksObtained;

    private String grade;

    private String remarks;
}
