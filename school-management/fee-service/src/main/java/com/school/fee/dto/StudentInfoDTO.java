package com.school.fee.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class StudentInfoDTO {
    private Long id;
    private String admissionNumber;
    private String name;
    private String className;
    private String section;
    private Boolean isActive;
}
