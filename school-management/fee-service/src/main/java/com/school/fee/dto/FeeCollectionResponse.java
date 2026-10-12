package com.school.fee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeCollectionResponse {
    private boolean success;
    private BigDecimal updatedPaidAmount;
    private BigDecimal updatedOutstandingAmount;
    private String updatedStatus;
}