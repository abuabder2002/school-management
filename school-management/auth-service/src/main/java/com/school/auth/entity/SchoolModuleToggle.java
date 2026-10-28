package com.school.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Admin-controlled on/off switch for a module within one School (e.g. "can School X's
 * admins see Billing"). Absence of a row for a given (schoolId, moduleKey) means enabled —
 * mirrors the (role, moduleKey) FeatureToggle pattern, scoped by school instead of role.
 */
@Entity
@Table(name = "school_module_toggles", uniqueConstraints = @UniqueConstraint(columnNames = {"school_id", "module_key"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolModuleToggle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "module_key", nullable = false)
    private String moduleKey;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    public void touch() {
        updatedAt = LocalDateTime.now();
    }
}
