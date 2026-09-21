package com.school.fee.dto;

import com.school.common.enums.FeeStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Fee create/update and response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeDTO {

    private Long id;

    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;

    @NotNull(message = "Paid amount is required")
    private BigDecimal paidAmount;

    private BigDecimal pendingAmount;

    private FeeStatus status;

    private String description;
}
