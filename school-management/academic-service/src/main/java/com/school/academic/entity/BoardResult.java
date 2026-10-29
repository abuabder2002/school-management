package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A Class X / XII board exam result for one student: the board, standard, academic year,
 * and a variable-length list of subject-wise marks the admin builds up with "Add Subject".
 */
@Entity
@Table(name = "board_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    private String admissionNumber;

    private String studentName;

    /** STATE_BOARD | CBSE | ICSE */
    @Column(nullable = false)
    private String board;

    /** X | XII */
    @Column(nullable = false)
    private String standard;

    @Column(nullable = false)
    private String academicYear;

    @ElementCollection
    @CollectionTable(name = "board_result_subjects", joinColumns = @JoinColumn(name = "board_result_id"))
    @Builder.Default
    private List<SubjectMark> subjects = new ArrayList<>();

    private Double totalMarks;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Long schoolId;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Embeddable
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectMark {
        private String subjectName;
        private Double marks;
    }
}
