package com.school.fee;

import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import com.school.fee.service.FeeService;
import com.school.fee.service.StudentServiceClient;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * A parent's "Payment History" (and its last-transaction view) can be narrowed to a date range,
 * school- and student-scoped, without losing the undated "all payments" behaviour.
 */
public class StudentPaymentsDateFilterTest {

    @Test
    void noDatesGivenKeepsTheOldBehaviour() {
        FeeRepository feeRepo = Mockito.mock(FeeRepository.class);
        PaymentRepository paymentRepo = Mockito.mock(PaymentRepository.class);
        FeeService service = new FeeService(feeRepo, paymentRepo, Mockito.mock(StudentServiceClient.class));

        Mockito.when(paymentRepo.findByStudentIdAndSchoolIdOrderByPaymentDateDesc(501L, 1L))
                .thenReturn(List.of(payment(1L)));

        List<Payment> result = service.getPaymentsByStudent(501L, null, null, 1L);

        assertEquals(1, result.size());
        Mockito.verify(paymentRepo, Mockito.never())
                .findByStudentIdAndSchoolIdAndPaymentDateBetweenOrderByPaymentDateDesc(
                        Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
    }

    @Test
    void dateRangeIsPassedToTheStudentAndSchoolScopedRangeQuery() {
        FeeRepository feeRepo = Mockito.mock(FeeRepository.class);
        PaymentRepository paymentRepo = Mockito.mock(PaymentRepository.class);
        FeeService service = new FeeService(feeRepo, paymentRepo, Mockito.mock(StudentServiceClient.class));

        LocalDate from = LocalDate.of(2026, 10, 1);
        LocalDate to = LocalDate.of(2026, 10, 31);
        Mockito.when(paymentRepo.findByStudentIdAndSchoolIdAndPaymentDateBetweenOrderByPaymentDateDesc(501L, 1L, from, to))
                .thenReturn(List.of(payment(2L)));

        List<Payment> result = service.getPaymentsByStudent(501L, from, to, 1L);

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getId());
        Mockito.verify(paymentRepo, Mockito.never()).findByStudentIdAndSchoolIdOrderByPaymentDateDesc(Mockito.any(), Mockito.any());
    }

    private static Payment payment(Long id) {
        Payment p = new Payment();
        p.setId(id);
        p.setFeeId(900L);
        p.setStudentId(501L);
        p.setAmountPaid(BigDecimal.TEN);
        p.setPaymentDate(LocalDate.of(2026, 10, 15));
        p.setPaymentMethod("CASH");
        return p;
    }
}
