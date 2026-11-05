package com.school.fee;

import com.school.fee.dto.RecentPaymentDTO;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import com.school.fee.service.FeeService;
import com.school.fee.service.StudentServiceClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Recent Payments can be narrowed to a date range, school-scoped, without losing the undated behaviour. */
public class RecentPaymentsDateFilterTest {

    @Test
    void noDatesGivenKeepsTheOldBehaviour() {
        FeeRepository feeRepo = Mockito.mock(FeeRepository.class);
        PaymentRepository paymentRepo = Mockito.mock(PaymentRepository.class);
        FeeService service = new FeeService(feeRepo, paymentRepo, Mockito.mock(StudentServiceClient.class));

        Mockito.when(paymentRepo.findBySchoolId(Mockito.eq(1L), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of(payment(1L, LocalDate.of(2026, 10, 1)))));

        List<RecentPaymentDTO> result = service.getRecentPayments(10, null, null, 1L);

        assertEquals(1, result.size());
        Mockito.verify(paymentRepo, Mockito.never())
                .findBySchoolIdAndPaymentDateBetween(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
    }

    @Test
    void dateRangeIsPassedToTheSchoolScopedRangeQuery() {
        FeeRepository feeRepo = Mockito.mock(FeeRepository.class);
        PaymentRepository paymentRepo = Mockito.mock(PaymentRepository.class);
        FeeService service = new FeeService(feeRepo, paymentRepo, Mockito.mock(StudentServiceClient.class));

        LocalDate from = LocalDate.of(2026, 10, 1);
        LocalDate to = LocalDate.of(2026, 10, 31);
        Mockito.when(paymentRepo.findBySchoolIdAndPaymentDateBetween(Mockito.eq(1L), Mockito.eq(from), Mockito.eq(to), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of(payment(2L, LocalDate.of(2026, 10, 15)))));

        List<RecentPaymentDTO> result = service.getRecentPayments(10, from, to, 1L);

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getId());
        Mockito.verify(paymentRepo, Mockito.never()).findBySchoolId(Mockito.any(), Mockito.any());
    }

    @Test
    void anotherSchoolsPaymentsNeverLeakIntoTheRangeQuery() {
        FeeRepository feeRepo = Mockito.mock(FeeRepository.class);
        PaymentRepository paymentRepo = Mockito.mock(PaymentRepository.class);
        FeeService service = new FeeService(feeRepo, paymentRepo, Mockito.mock(StudentServiceClient.class));

        LocalDate from = LocalDate.of(2026, 10, 1);
        ArgumentCaptor<Long> schoolIdCaptor = ArgumentCaptor.forClass(Long.class);
        Mockito.when(paymentRepo.findBySchoolIdAndPaymentDateBetween(schoolIdCaptor.capture(), Mockito.any(), Mockito.any(), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of()));

        service.getRecentPayments(10, from, null, 7L);

        assertEquals(7L, schoolIdCaptor.getValue());
    }

    private static Payment payment(Long id, LocalDate date) {
        Payment p = new Payment();
        p.setId(id);
        p.setFeeId(900L);
        p.setStudentId(901L);
        p.setAmountPaid(BigDecimal.TEN);
        p.setPaymentDate(date);
        p.setPaymentMethod("CASH");
        return p;
    }
}
