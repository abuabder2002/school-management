package com.school.fee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for displaying recent payment transactions with student and class metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentPaymentDTO {
    private Long id;
    private Long feeId;
    private Long studentId;
    private String studentName;
    private String admissionNumber;
    private String className;
    private BigDecimal amountPaid;
    private LocalDate paymentDate;
    private String paymentMethod;
    private String feeComponent;
    private String note;
    private String status;
    private LocalDateTime createdAt;
}
