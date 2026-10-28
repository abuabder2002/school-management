package com.school.auth.dto;

import com.school.common.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO returned after successful authentication.
 * studentId is populated for PARENT role users only.
 * assignedClass and assignedSection are populated for TEACHER role users.
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

    /**
     * For TEACHER role: The assigned class and section.
     */
    private String assignedClass;
    private String assignedSection;

    /**
     * The School (tenant) this user belongs to. Null only for SUPER_ADMIN users.
     */
    private Long schoolId;

    public static AuthResponse of(String token, Long userId, String name, String email, Role role, Long studentId) {
        return of(token, userId, name, email, role, studentId, null, null, null);
    }

    public static AuthResponse of(String token, Long userId, String name, String email, Role role, Long studentId, String assignedClass, String assignedSection) {
        return of(token, userId, name, email, role, studentId, assignedClass, assignedSection, null);
    }

    public static AuthResponse of(String token, Long userId, String name, String email, Role role, Long studentId, String assignedClass, String assignedSection, Long schoolId) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(userId)
                .name(name)
                .email(email)
                .role(role)
                .studentId(studentId)
                .assignedClass(assignedClass)
                .assignedSection(assignedSection)
                .schoolId(schoolId)
                .build();
    }
}
