package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * One class-schedule entry (e.g. Class 10 / A, 2026-10-29, Block A, Math, Mr. Rao).
 */
@Entity
@Table(name = "class_schedule")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String className;

    private String section;

    // Not DB-NOT-NULL: ddl-auto=update adds new columns as NOT NULL in one step, which fails
    // outright against a table that already has rows (as this one does from earlier testing).
    // Required-ness for new entries is enforced in the form/controller instead.
    private LocalDate scheduleDate;

    private String block; // "A" or "B"

    @Column(nullable = false)
    private String subjectName;

    private String teacherName; // staff member's name

    private Long schoolId;
}
