package com.school.academic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One row per school whose standard exams/subjects/classes have already been created.
 * Its presence is what stops them being re-created: a school may delete any or all of them.
 */
@Entity
@Table(name = "academic_seed_markers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcademicSeedMarker {

    @Id
    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "seeded_at", nullable = false)
    private LocalDateTime seededAt;
}
