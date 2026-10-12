package com.school.fee.dto;

import com.school.fee.entity.Payment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.List;

/**
 * Detailed student billing row for the class-specific student billing table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentBillingRowDTO {
    private Integer sNo;
    private Long studentId;
    private String admissionNumber;
    private String studentName;
    private String className;
    private BigDecimal termFees1;
    private BigDecimal termFees2;
    private BigDecimal termFees3;
    private BigDecimal busFees;
    private BigDecimal examFees;
    private BigDecimal outstandingAmount;
    private BigDecimal paidAmount;
    private String currentTerm;
    private BigDecimal currentTermAmount;
    private BigDecimal currentTermPaidAmount;
    private BigDecimal currentTermOutstandingAmount;
    private Map<String, BigDecimal> outstandingByComponent;
    private BigDecimal totalAmount;
    private String status; // "settled", "partially paid", "pending", "unbilled"
    private Long feeId;
    private List<Payment> payments;
}
