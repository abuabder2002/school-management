package com.school.academic.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * One period of a class's weekly timetable (e.g. Class 10 / A, Monday, Period 3, Math, 9:00-9:45).
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

    @Column(nullable = false)
    private String dayOfWeek; // MONDAY..SATURDAY

    @Column(nullable = false)
    private Integer periodNumber;

    private LocalTime startTime;

    private LocalTime endTime;

    @Column(nullable = false)
    private String subjectName;

    private String teacherName;
}
