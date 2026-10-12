package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.common.exception.BadRequestException;
import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeeServicePaymentHistoryTest {

    @Test
    void includesPreviouslyPaidBalanceMissingFromTransactionLedger() {
        FeeRepository feeRepository = mock(FeeRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        StudentServiceClient studentClient = mock(StudentServiceClient.class);
        Fee fee = feeWithAmounts("5000", "3000");
        Payment recordedPayment = Payment.builder()
                .id(1L)
                .feeId(7L)
                .studentId(101L)
                .amountPaid(new BigDecimal("2000"))
                .build();
        when(feeRepository.findById(7L)).thenReturn(Optional.of(fee));
        when(paymentRepository.findByFeeIdOrderByPaymentDateDescIdDesc(7L)).thenReturn(List.of(recordedPayment));

        List<Payment> history = new FeeService(feeRepository, paymentRepository, studentClient).getPaymentsByFee(7L);

        assertEquals(2, history.size());
        Payment legacyBalance = history.get(1);
        assertEquals(new BigDecimal("1000"), legacyBalance.getAmountPaid());
        assertEquals("LEGACY", legacyBalance.getPaymentMethod());
        assertNull(legacyBalance.getPaymentDate());
        assertTrue(legacyBalance.getNote().contains("details are unavailable"));
    }

    @Test
    void rejectsPaymentAboveOutstandingBalanceWithoutSaving() {
        FeeRepository feeRepository = mock(FeeRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        StudentServiceClient studentClient = mock(StudentServiceClient.class);
        when(feeRepository.findById(7L)).thenReturn(Optional.of(feeWithAmounts("5000", "3000")));
        Payment payment = Payment.builder().amountPaid(new BigDecimal("2001")).build();

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> new FeeService(feeRepository, paymentRepository, studentClient).recordPayment(7L, payment));

        assertTrue(error.getMessage().contains("₹2,000.00"));
        verify(paymentRepository, never()).save(any(Payment.class));
        verify(feeRepository, never()).save(any(Fee.class));
    }

    private Fee feeWithAmounts(String total, String paid) {
        BigDecimal totalAmount = new BigDecimal(total);
        BigDecimal paidAmount = new BigDecimal(paid);
        return Fee.builder()
                .id(7L)
                .studentId(101L)
                .termFees1(totalAmount)
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .pendingAmount(totalAmount.subtract(paidAmount))
                .status(FeeStatus.PARTIAL)
                .build();
    }
}