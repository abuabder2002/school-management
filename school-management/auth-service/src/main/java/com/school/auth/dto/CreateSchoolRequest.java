package com.school.auth.dto;

import com.school.auth.entity.School;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * Super Admin creates a School and its first School Admin login in one call.
 */
@Data
public class CreateSchoolRequest {

    @NotBlank(message = "School name is required")
    private String name;

    @NotBlank(message = "Admin name is required")
    private String adminName;

    @NotBlank(message = "Admin login email is required")
    @Email(message = "Admin login email must be valid")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    private String adminPassword;

    private LocalDate subscriptionStart;
    private LocalDate subscriptionEnd;
    private School.PlanType planType;
}
