package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.fee.dto.FeeCollectionRequest;
import com.school.fee.dto.FeeCollectionResponse;
import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeeCollectionServiceTest {

    @Test
    void collectsFeeUpdatesBalanceAndPersistsAdminAuditDetails() {
        FeeRepository feeRepository = mock(FeeRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        StudentServiceClient studentClient = mock(StudentServiceClient.class);
        Fee fee = Fee.builder()
                .id(10L)
                .studentId(101L)
                .termFees1(new BigDecimal("5000"))
                .totalAmount(new BigDecimal("5000"))
                .paidAmount(BigDecimal.ZERO)
                .pendingAmount(new BigDecimal("5000"))
                .status(FeeStatus.PENDING)
                .build();
        when(feeRepository.findById(10L)).thenReturn(Optional.of(fee));
        when(paymentRepository.findByFeeIdOrderByPaymentDateDescIdDesc(10L)).thenReturn(List.of());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(feeRepository.save(any(Fee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeeCollectionRequest request = FeeCollectionRequest.builder()
                .studentId(101L)
                .billingId(10L)
                .paymentAmount(new BigDecimal("1500"))
                .paymentDate(LocalDate.of(2026, 10, 12))
                .paymentMethod("UPI")
                .feeComponent(FeePaymentAllocation.TERM_1)
                .referenceNumber("UPI-REF-42")
                .remarks("October installment")
                .build();

        FeeCollectionResponse response = new FeeService(feeRepository, paymentRepository, studentClient)
                .collectFee(request, 7L, "admin@school.test");

        assertEquals(0, new BigDecimal("1500").compareTo(response.getUpdatedPaidAmount()));
        assertEquals(0, new BigDecimal("3500").compareTo(response.getUpdatedOutstandingAmount()));
        assertEquals("PARTIAL", response.getUpdatedStatus());

        org.mockito.ArgumentCaptor<Payment> paymentCaptor = org.mockito.ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        Payment savedPayment = paymentCaptor.getValue();
        assertEquals("UPI-REF-42", savedPayment.getReferenceNumber());
        assertEquals("October installment", savedPayment.getNote());
        assertEquals("7 (admin@school.test)", savedPayment.getAdminUser());
        assertEquals(FeePaymentAllocation.TERM_1, savedPayment.getFeeComponent());
        assertEquals(LocalDate.of(2026, 10, 12), savedPayment.getPaymentDate());
    }

    @Test
    void exactOutstandingSettlementIsAllowedAfterThreePreviousPayments() {
        FeeRepository feeRepository = mock(FeeRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        StudentServiceClient studentClient = mock(StudentServiceClient.class);
        Fee fee = Fee.builder()
                .id(11L)
                .studentId(102L)
                .termFees2(new BigDecimal("5000"))
                .totalAmount(new BigDecimal("5000"))
                .paidAmount(new BigDecimal("4000"))
                .pendingAmount(new BigDecimal("1000"))
                .status(FeeStatus.PARTIAL)
                .build();
        List<Payment> priorPayments = List.of(
                payment(1L, "1000"),
                payment(2L, "2000"),
                payment(3L, "1000")
        );
        when(feeRepository.findById(11L)).thenReturn(Optional.of(fee));
        when(paymentRepository.findByFeeIdOrderByPaymentDateDescIdDesc(11L)).thenReturn(priorPayments);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(feeRepository.save(any(Fee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeeCollectionRequest request = FeeCollectionRequest.builder()
                .studentId(102L)
                .billingId(11L)
                .paymentAmount(new BigDecimal("1000"))
                .paymentDate(LocalDate.of(2026, 10, 12))
                .paymentMethod("CASH")
                .feeComponent(FeePaymentAllocation.TERM_2)
                .build();

        FeeCollectionResponse response = new FeeService(feeRepository, paymentRepository, studentClient)
                .collectFee(request, 7L, "admin@school.test");

        assertEquals(0, new BigDecimal("5000").compareTo(response.getUpdatedPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getUpdatedOutstandingAmount()));
        assertEquals("PAID", response.getUpdatedStatus());
    }

    private Payment payment(Long id, String amount) {
        return Payment.builder()
                .id(id)
                .feeId(11L)
                .studentId(102L)
                .amountPaid(new BigDecimal(amount))
                .feeComponent(FeePaymentAllocation.TERM_2)
                .paymentDate(LocalDate.of(2026, 10, 1))
                .build();
    }
}