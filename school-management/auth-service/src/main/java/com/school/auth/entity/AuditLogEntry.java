package com.school.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Records who did what to which account (staff created/deleted, password resets),
 * so multiple admins sharing this system can see each other's account-management actions.
 */
@Entity
@Table(name = "audit_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    @Column(nullable = false)
    private String action;

    @Column(name = "target_email")
    private String targetEmail;

    @Column(name = "target_role")
    private String targetRole;

    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** The acting admin's school at the time of the action. Null for SUPER_ADMIN-driven actions. */
    @Column(name = "school_id")
    private Long schoolId;
}
