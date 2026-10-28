package com.school.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolModuleToggleDTO {
    private Long schoolId;
    private String moduleKey;
    private String label;
    private boolean enabled;
}
