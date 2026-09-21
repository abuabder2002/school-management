package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.common.exception.ResourceNotFoundException;
import com.school.fee.dto.FeeDTO;
import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Business logic for Fee and Payment management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final FeeRepository feeRepository;
    private final PaymentRepository paymentRepository;

    public List<FeeDTO> getFeesByStudent(Long studentId) {
        return feeRepository.findByStudentId(studentId).stream()
                .map(this::toDTO)
                .toList();
    }

    public FeeDTO createFee(FeeDTO dto) {
        BigDecimal pending = dto.getTotalAmount().subtract(dto.getPaidAmount());
        FeeStatus status = determineStatus(dto.getTotalAmount(), dto.getPaidAmount());

        Fee fee = Fee.builder()
                .studentId(dto.getStudentId())
                .totalAmount(dto.getTotalAmount())
                .paidAmount(dto.getPaidAmount())
                .pendingAmount(pending)
                .status(status)
                .description(dto.getDescription())
                .build();

        Fee saved = feeRepository.save(fee);
        log.info("Created fee record for student {}: {}", dto.getStudentId(), status);
        return toDTO(saved);
    }

    public FeeDTO updateFee(Long id, FeeDTO dto) {
        Fee existing = feeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", id));

        BigDecimal pending = dto.getTotalAmount().subtract(dto.getPaidAmount());
        FeeStatus status = determineStatus(dto.getTotalAmount(), dto.getPaidAmount());

        existing.setTotalAmount(dto.getTotalAmount());
        existing.setPaidAmount(dto.getPaidAmount());
        existing.setPendingAmount(pending);
        existing.setStatus(status);
        existing.setDescription(dto.getDescription());

        Fee updated = feeRepository.save(existing);
        log.info("Updated fee {} for student {}: {}", id, dto.getStudentId(), status);
        return toDTO(updated);
    }

    /**
     * Record a payment against a fee.
     * Automatically updates paidAmount, pendingAmount, and status on the fee.
     */
    @Transactional
    public Payment recordPayment(Long feeId, Payment payment) {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", feeId));

        payment.setFeeId(feeId);
        payment.setStudentId(fee.getStudentId());
        Payment saved = paymentRepository.save(payment);

        // Update fee totals
        BigDecimal newPaid = fee.getPaidAmount().add(payment.getAmountPaid());
        if (newPaid.compareTo(fee.getTotalAmount()) > 0) newPaid = fee.getTotalAmount();
        BigDecimal newPending = fee.getTotalAmount().subtract(newPaid);

        fee.setPaidAmount(newPaid);
        fee.setPendingAmount(newPending);
        fee.setStatus(determineStatus(fee.getTotalAmount(), newPaid));
        feeRepository.save(fee);

        log.info("Recorded payment of {} for fee {} (student {})", payment.getAmountPaid(), feeId, fee.getStudentId());
        return saved;
    }

    public List<Payment> getPaymentsByFee(Long feeId) {
        return paymentRepository.findByFeeIdOrderByPaymentDateDesc(feeId);
    }

    public List<Payment> getPaymentsByStudent(Long studentId) {
        return paymentRepository.findByStudentIdOrderByPaymentDateDesc(studentId);
    }

    private FeeStatus determineStatus(BigDecimal total, BigDecimal paid) {
        if (paid.compareTo(BigDecimal.ZERO) == 0) {
            return FeeStatus.PENDING;
        } else if (paid.compareTo(total) >= 0) {
            return FeeStatus.PAID;
        } else {
            return FeeStatus.PARTIAL;
        }
    }

    private FeeDTO toDTO(Fee fee) {
        return FeeDTO.builder()
                .id(fee.getId())
                .studentId(fee.getStudentId())
                .totalAmount(fee.getTotalAmount())
                .paidAmount(fee.getPaidAmount())
                .pendingAmount(fee.getPendingAmount())
                .status(fee.getStatus())
                .description(fee.getDescription())
                .build();
    }
}
