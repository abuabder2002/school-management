package com.school.attendance.entity;

import com.school.common.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Attendance record for a student on a specific date.
 */
@Entity
@Table(name = "attendance")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;
}
