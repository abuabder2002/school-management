package com.school.attendance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * School holiday or public holiday.
 */
@Entity
@Table(name = "holidays")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalDate date;

    private String description;

    /** PUBLIC or SCHOOL */
    @Column(nullable = false)
    private String holidayType;
}
