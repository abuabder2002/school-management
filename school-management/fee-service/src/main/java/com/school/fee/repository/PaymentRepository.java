package com.school.fee.repository;

import com.school.fee.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByFeeIdOrderByPaymentDateDescIdDesc(Long feeId);
    List<Payment> findByStudentIdOrderByPaymentDateDescIdDesc(Long studentId);
}
