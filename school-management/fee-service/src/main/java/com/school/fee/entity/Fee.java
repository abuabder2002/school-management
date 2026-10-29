package com.school.fee.entity;

import com.school.common.enums.FeeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fee record for a student with breakdown for terms, bus, exam, and totals.
 */
@Entity
@Table(name = "fees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Fee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    private String admissionNumber;

    private String studentName;

    private String className;

    @Builder.Default
    @Column(name = "term_fees1")
    private BigDecimal termFees1 = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "term_fees2")
    private BigDecimal termFees2 = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "term_fees3")
    private BigDecimal termFees3 = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "bus_fees")
    private BigDecimal busFees = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "exam_fees")
    private BigDecimal examFees = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private BigDecimal paidAmount;

    @Column(nullable = false)
    private BigDecimal pendingAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeeStatus status;

    private String description;

    private String academicYear;

    private LocalDate dueDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private Long schoolId;
}
