package com.school.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for Student create/update and response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDTO {

    private Long id;

    @NotBlank(message = "Admission number is required")
    private String admissionNumber;

    @NotBlank(message = "Name is required")
    private String name;

    private LocalDate dateOfBirth;

    private String gender;

    private Long parentId;

    @NotBlank(message = "Class name is required")
    private String className;

    private String section;

    private String fatherName;

    private String motherName;

    private String contactNumber;

    private String address;

    private String bloodGroup;
}
