package com.school.attendance.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Predefined leave reason with English and Tamil text.
 * Admin-managed. Soft-deletable via 'active' flag so historical
 * leave records that referenced this reason remain understandable.
 */
@Entity
@Table(name = "leave_reasons")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveReason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** English reason text, e.g. "Fever" */
    @Column(nullable = false)
    private String englishReason;

    /** Tamil meaning, e.g. "காய்ச்சல்" */
    @Column(nullable = false)
    private String tamilMeaning;

    /**
     * If false, this reason is deactivated (soft-deleted).
     * It will not appear in the parent dropdown for new requests
     * but historical leave records that used it remain intact.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    private Long schoolId;
}
