package com.school.auth.dto;

import com.school.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request DTO for user registration.
 * For PARENT role, provide studentId to link the parent to their child.
 */
@Data
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @NotNull(message = "Role is required")
    private Role role;

    /**
     * Optional: for PARENT role, the ID of the student in student-service.
     * Ignored for ADMIN and TEACHER roles.
     */
    private Long studentId;
}
