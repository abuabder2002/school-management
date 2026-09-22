package com.school.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight DTO for listing users in dropdowns (e.g. parent selection).
 * studentId is populated for PARENT role users.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDTO {
    private Long id;
    private String name;
    private String email;
    private Long studentId;
}
