package com.school.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentAuthResultDTO {
    private Long studentId;
    private String studentName;
    private String admissionNumber;
    private String className;
    private String section;
    private String phoneNumber;
    private Boolean isActive;
    private Long schoolId;
}
