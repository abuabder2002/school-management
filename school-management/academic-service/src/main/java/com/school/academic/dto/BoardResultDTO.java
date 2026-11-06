package com.school.academic.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardResultDTO {

    private Long id;

    // Populated on every read, used by the Admin portal's read-only Board Results view and the
    // Super Admin "pick a student" flow, which has no school picker of its own.
    private Long schoolId;

    private Long studentId;

    private String admissionNumber;
    private String studentName;

    @NotBlank(message = "Board is required")
    private String board;

    @NotBlank(message = "Standard is required")
    private String standard;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private List<SubjectMarkDTO> subjects;

    private Double totalMarks;

    private String schoolName;
    private String area;
    private String pincode;
    private String schoolPhone;
    private String photo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
