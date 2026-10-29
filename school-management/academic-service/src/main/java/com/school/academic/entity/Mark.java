package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents marks scored by a student in a subject and exam.
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

    private String admissionNumber;

    private String studentName;

    private String className;

    private String section;

    private Long examId;

    private String examName;

    private Long subjectId;

    private String subjectName;

    private Double marksObtained;

    private Double maxMarks;

    private String grade;

    private String remarks;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Long schoolId;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (maxMarks == null || maxMarks <= 0) {
            maxMarks = 100.0;
        }
        if (grade == null || grade.trim().isEmpty()) {
            grade = calculateGrade(marksObtained, maxMarks);
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
        if (maxMarks == null || maxMarks <= 0) {
            maxMarks = 100.0;
        }
        if (grade == null || grade.trim().isEmpty()) {
            grade = calculateGrade(marksObtained, maxMarks);
        }
    }

    public static String calculateGrade(Double marks, Double max) {
        if (marks == null || max == null || max <= 0) return "—";
        double percentage = (marks / max) * 100.0;
        if (percentage >= 90) return "A+";
        if (percentage >= 80) return "A";
        if (percentage >= 70) return "B+";
        if (percentage >= 60) return "B";
        if (percentage >= 50) return "C";
        if (percentage >= 40) return "D";
        return "F";
    }
}
