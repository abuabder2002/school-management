package com.school.student.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Student entity representing an enrolled student.
 */
@Entity
@Table(name = "students")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String admissionNumber;

    @Column(nullable = false)
    private String name;

    private LocalDate dateOfBirth;

    private String gender;

    private Long parentId;

    // Nullable: ddl-auto=update adds a new column as NOT NULL in one step, which fails against
    // a table that already has rows. Backfilled to 1 (Default School) by SchoolIdBackfillRunner.
    private Long schoolId;

    @Column(nullable = false)
    private String className;

    private String section;

    private String fatherName;

    private String motherName;

    private String guardianName;

    private String contactNumber;

    @Column(name = "father_mobile_number")
    private String fatherMobileNumber;

    @Column(name = "mother_mobile_number")
    private String motherMobileNumber;

    @Column(name = "guardian_mobile_number")
    private String guardianMobileNumber;

    private String address;

    private String bloodGroup;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(name = "is_active", columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "password_hash")
    private String passwordHash;

    /** Base64 data URI (e.g. "data:image/jpeg;base64,..."), resized/compressed client-side before upload. */
    @Column(columnDefinition = "TEXT")
    private String photo;
}
