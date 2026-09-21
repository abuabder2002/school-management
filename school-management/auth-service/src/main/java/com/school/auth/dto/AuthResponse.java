package com.school.auth.dto;

import com.school.common.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO returned after successful authentication.
 * studentId is populated for PARENT role users only.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String type;
    private Long userId;
    private String name;
    private String email;
    private Role role;

    /**
     * For PARENT role: the student ID assigned to this parent (in student-service).
     * Null for ADMIN and TEACHER users.
     */
    private Long studentId;

    public static AuthResponse of(String token, Long userId, String name, String email, Role role, Long studentId) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(userId)
                .name(name)
                .email(email)
                .role(role)
                .studentId(studentId)
                .build();
    }
}
