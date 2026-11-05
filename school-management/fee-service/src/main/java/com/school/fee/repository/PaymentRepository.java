package com.school.fee.repository;

import com.school.fee.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByFeeIdOrderByPaymentDateDesc(Long feeId);
    List<Payment> findByStudentIdOrderByPaymentDateDesc(Long studentId);

    List<Payment> findByStudentIdAndSchoolIdOrderByPaymentDateDesc(Long studentId, Long schoolId);
    Page<Payment> findBySchoolId(Long schoolId, Pageable pageable);

    // Inclusive date range, school-scoped — backs the Recent Payments date filter.
    Page<Payment> findBySchoolIdAndPaymentDateBetween(Long schoolId, LocalDate fromDate, LocalDate toDate, Pageable pageable);

    // Inclusive date range, student- and school-scoped — backs the parent portal's Payment History filter.
    List<Payment> findByStudentIdAndSchoolIdAndPaymentDateBetweenOrderByPaymentDateDesc(
            Long studentId, Long schoolId, LocalDate fromDate, LocalDate toDate);
}
