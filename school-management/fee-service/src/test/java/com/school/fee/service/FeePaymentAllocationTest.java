package com.school.fee.service;

import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class FeePaymentAllocationTest {

    @Test
    void allocatesLegacyPaymentsToOldestTermAndShowsOnlyCurrentTermBalance() {
        Fee fee = Fee.builder()
                .termFees1(new BigDecimal("5000"))
                .termFees2(new BigDecimal("5000"))
                .totalAmount(new BigDecimal("10000"))
                .paidAmount(new BigDecimal("9000"))
                .build();
        List<Payment> payments = List.of(
                payment(3L, "2000", null),
                payment(2L, "2000", null),
                payment(1L, "5000", null)
        );

        FeePaymentAllocation.Summary summary = FeePaymentAllocation.calculate(fee, payments);

        assertEquals(FeePaymentAllocation.TERM_2, summary.currentComponent());
        assertEquals(0, new BigDecimal("4000").compareTo(summary.currentPaid()));
        assertEquals(0, new BigDecimal("1000").compareTo(summary.currentOutstanding()));
        assertEquals(2, summary.paymentCount(FeePaymentAllocation.TERM_2));
    }

    @Test
    void allowsPartialAndExactSettlementAfterMultiplePreviousPayments() {
        Fee fee = Fee.builder()
                .termFees2(new BigDecimal("5000"))
                .totalAmount(new BigDecimal("5000"))
                .paidAmount(new BigDecimal("3000"))
                .build();
        FeePaymentAllocation.Summary summary = FeePaymentAllocation.calculate(fee, List.of(
                payment(1L, "1000", FeePaymentAllocation.TERM_2),
                payment(2L, "1000", FeePaymentAllocation.TERM_2),
                payment(3L, "1000", FeePaymentAllocation.TERM_2)
        ));

        assertNull(FeePaymentAllocation.validatePayment(FeePaymentAllocation.TERM_2,
                new BigDecimal("500"), summary));
        assertNull(FeePaymentAllocation.validatePayment(FeePaymentAllocation.TERM_2,
                new BigDecimal("2000"), summary));
        String overpaymentError = FeePaymentAllocation.validatePayment(FeePaymentAllocation.TERM_2,
                new BigDecimal("2001"), summary);
        assertNotNull(overpaymentError);
        org.junit.jupiter.api.Assertions.assertEquals("Payment cannot exceed outstanding balance (₹2,000.00).", overpaymentError);
    }

    private Payment payment(Long id, String amount, String component) {
        return Payment.builder()
                .id(id)
                .amountPaid(new BigDecimal(amount))
                .feeComponent(component)
                .build();
    }
}