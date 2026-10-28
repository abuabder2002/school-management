package com.school.auth.dto;

import com.school.auth.entity.School;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolDTO {
    private Long id;
    private String name;
    private String adminEmail;
    private LocalDate subscriptionStart;
    private LocalDate subscriptionEnd;
    private School.PlanType planType;
    private boolean active;
    private LocalDateTime createdAt;
}
