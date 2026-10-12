package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.common.exception.ResourceNotFoundException;
import com.school.fee.dto.FeeDTO;
<<<<<<< HEAD
=======
import com.school.fee.dto.FeeCollectionRequest;
import com.school.fee.dto.FeeCollectionResponse;
import com.school.fee.dto.RecentPaymentDTO;
import com.school.fee.dto.StudentBillingRowDTO;
import com.school.fee.dto.StudentInfoDTO;
>>>>>>> 22873ba (Billing Changes)
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
<<<<<<< HEAD
=======
    private final StudentServiceClient studentServiceClient;

    /**
     * Get class-wise billing summaries for all configured/existing classes.
     * Calculated dynamically from active students and their fee records.
     */
    public List<ClassBillingSummaryDTO> getClassBillingSummaries() {
        Map<String, List<StudentInfoDTO>> groupedStudents;
        try {
            groupedStudents = studentServiceClient.getActiveStudentsGroupedByClass();
        } catch (Exception e) {
            log.warn("Failed to fetch active students grouped by class: {}", e.getMessage());
            groupedStudents = Collections.emptyMap();
        }
        if (groupedStudents == null) {
            groupedStudents = Collections.emptyMap();
        }

        Set<String> classSet = new LinkedHashSet<>();
        for (String c : groupedStudents.keySet()) {
            if (c != null && !c.trim().isEmpty()) {
                classSet.add(c.trim());
            }
        }

        if (classSet.isEmpty()) {
            try {
                List<String> distinctClasses = studentServiceClient.getDistinctClasses();
                if (distinctClasses != null) {
                    for (String c : distinctClasses) {
                        if (c != null && !c.trim().isEmpty()) {
                            classSet.add(c.trim());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch distinct classes from student service: {}", e.getMessage());
            }
        }

        if (classSet.isEmpty()) {
            // Fallback: distinct classes from fees table
            try {
                feeRepository.findAll().stream()
                        .map(Fee::getClassName)
                        .filter(c -> c != null && !c.trim().isEmpty())
                        .map(String::trim)
                        .forEach(classSet::add);
            } catch (Exception e) {
                log.warn("Failed to fetch fallback classes from fee repository: {}", e.getMessage());
            }
        }

        List<String> sortedClasses = new ArrayList<>(classSet);
        sortedClasses.sort(FeeService::naturalClassCompare);

        List<ClassBillingSummaryDTO> summaries = new ArrayList<>();
        int sNo = 1;

        for (String className : sortedClasses) {
            List<StudentInfoDTO> activeStudents = groupedStudents.getOrDefault(className, Collections.emptyList());
            if (activeStudents == null || activeStudents.isEmpty()) {
                try {
                    activeStudents = studentServiceClient.getActiveStudentsByClass(className);
                } catch (Exception e) {
                    log.warn("Failed to fetch active students for class {}: {}", className, e.getMessage());
                    activeStudents = Collections.emptyList();
                }
            }
            if (activeStudents == null) {
                activeStudents = Collections.emptyList();
            }

            long totalStudents = activeStudents.size();

            Set<Long> activeStudentIds = activeStudents.stream()
                    .filter(Objects::nonNull)
                    .map(StudentInfoDTO::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            BigDecimal totalAmount = BigDecimal.ZERO;
            BigDecimal totalPaidAmount = BigDecimal.ZERO;
            BigDecimal totalOutstandingAmount = BigDecimal.ZERO;

            if (!activeStudentIds.isEmpty()) {
                try {
                    List<Fee> fees = feeRepository.findByStudentIdIn(activeStudentIds);
                    if (fees != null) {
                        for (Fee fee : fees) {
                            if (fee.getTotalAmount() != null) totalAmount = totalAmount.add(fee.getTotalAmount());
                            if (fee.getPaidAmount() != null) totalPaidAmount = totalPaidAmount.add(fee.getPaidAmount());
                            if (fee.getPendingAmount() != null) totalOutstandingAmount = totalOutstandingAmount.add(fee.getPendingAmount());
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch fees by student IDs for class {}: {}", className, e.getMessage());
                }
            } else {
                // If there are no active students found via client, check if fees exist by className
                try {
                    List<Fee> classFees = feeRepository.findByClassName(className);
                    if (classFees != null && !classFees.isEmpty()) {
                        totalStudents = classFees.stream().map(Fee::getStudentId).filter(Objects::nonNull).distinct().count();
                        for (Fee fee : classFees) {
                            if (fee.getTotalAmount() != null) totalAmount = totalAmount.add(fee.getTotalAmount());
                            if (fee.getPaidAmount() != null) totalPaidAmount = totalPaidAmount.add(fee.getPaidAmount());
                            if (fee.getPendingAmount() != null) totalOutstandingAmount = totalOutstandingAmount.add(fee.getPendingAmount());
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch class fees for {}: {}", className, e.getMessage());
                }
            }

            summaries.add(ClassBillingSummaryDTO.builder()
                    .sNo(sNo++)
                    .className(className)
                    .totalStudents(totalStudents)
                    .totalAmount(totalAmount)
                    .totalPaidAmount(totalPaidAmount)
                    .totalOutstandingAmount(totalOutstandingAmount)
                    .build());
        }

        return summaries;
    }

    /**
     * Get detailed student-level billing rows for a specific class.
     * Strictly includes only ACTIVE students belonging to this class,
     * with graceful fallback to existing class fees if student directory service is unavailable.
     */
    public List<StudentBillingRowDTO> getStudentBillingForClass(String className) {
        List<StudentInfoDTO> activeStudents;
        try {
            activeStudents = studentServiceClient.getActiveStudentsByClass(className);
        } catch (Exception e) {
            log.warn("Failed to fetch active students for {}: {}", className, e.getMessage());
            activeStudents = Collections.emptyList();
        }
        if (activeStudents == null) {
            activeStudents = Collections.emptyList();
        }

        // If no active students returned from service client, fallback to students found in fees table
        if (activeStudents.isEmpty()) {
            try {
                List<Fee> classFees = feeRepository.findByClassName(className);
                if (classFees != null && !classFees.isEmpty()) {
                    activeStudents = classFees.stream()
                            .filter(f -> f.getStudentId() != null)
                            .map(f -> StudentInfoDTO.builder()
                                    .id(f.getStudentId())
                                    .admissionNumber(f.getAdmissionNumber() != null ? f.getAdmissionNumber() : "ID-" + f.getStudentId())
                                    .name(f.getStudentName() != null ? f.getStudentName() : "Student #" + f.getStudentId())
                                    .className(className)
                                    .isActive(true)
                                    .build())
                            .distinct()
                            .toList();
                }
            } catch (Exception e) {
                log.warn("Failed to fallback to class fees for {}: {}", className, e.getMessage());
            }
        }

        // Fetch existing fees for this class
        Set<Long> studentIds = activeStudents.stream()
                .filter(Objects::nonNull)
                .map(StudentInfoDTO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, Fee> feeMap = new HashMap<>();
        if (!studentIds.isEmpty()) {
            try {
                List<Fee> fees = feeRepository.findByStudentIdIn(studentIds);
                if (fees != null) {
                    for (Fee f : fees) {
                        feeMap.put(f.getStudentId(), f);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch fees for student IDs: {}", e.getMessage());
            }
        }

        List<StudentBillingRowDTO> rows = new ArrayList<>();
        int sNo = 1;

        for (StudentInfoDTO student : activeStudents) {
            Fee fee = feeMap.get(student.getId());

            BigDecimal termFees1 = BigDecimal.ZERO;
            BigDecimal termFees2 = BigDecimal.ZERO;
            BigDecimal termFees3 = BigDecimal.ZERO;
            BigDecimal busFees = BigDecimal.ZERO;
            BigDecimal examFees = BigDecimal.ZERO;
            BigDecimal totalAmount = BigDecimal.ZERO;
            BigDecimal paidAmount = BigDecimal.ZERO;
            BigDecimal outstandingAmount = BigDecimal.ZERO;
            String currentTerm = null;
            BigDecimal currentTermAmount = BigDecimal.ZERO;
            BigDecimal currentTermPaidAmount = BigDecimal.ZERO;
            BigDecimal currentTermOutstandingAmount = BigDecimal.ZERO;
            Map<String, BigDecimal> outstandingByComponent = Collections.emptyMap();
            String status = "unbilled";
            Long feeId = null;
            List<Payment> payments = Collections.emptyList();

            if (fee != null) {
                feeId = fee.getId();
                termFees1 = fee.getTermFees1() != null ? fee.getTermFees1() : BigDecimal.ZERO;
                termFees2 = fee.getTermFees2() != null ? fee.getTermFees2() : BigDecimal.ZERO;
                termFees3 = fee.getTermFees3() != null ? fee.getTermFees3() : BigDecimal.ZERO;
                busFees = fee.getBusFees() != null ? fee.getBusFees() : BigDecimal.ZERO;
                examFees = fee.getExamFees() != null ? fee.getExamFees() : BigDecimal.ZERO;
                totalAmount = fee.getTotalAmount() != null ? fee.getTotalAmount() : BigDecimal.ZERO;
                paidAmount = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
                outstandingAmount = fee.getPendingAmount() != null ? fee.getPendingAmount() : BigDecimal.ZERO;

                payments = getPaymentsByFee(fee.getId());
                FeePaymentAllocation.Summary allocation = FeePaymentAllocation.calculate(fee, payments);
                currentTerm = allocation.currentComponent();
                currentTermAmount = allocation.currentAmount();
                currentTermPaidAmount = allocation.currentPaid();
                currentTermOutstandingAmount = allocation.currentOutstanding();
                outstandingByComponent = allocation.outstandingByComponent();

                if (currentTermAmount.compareTo(BigDecimal.ZERO) == 0) {
                    status = "unbilled";
                } else if (currentTermOutstandingAmount.compareTo(BigDecimal.ZERO) == 0) {
                    status = "settled";
                } else if (currentTermPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
                    status = "partially paid";
                } else if (currentTermAmount.compareTo(BigDecimal.ZERO) > 0) {
                    status = "pending";
                } else {
                    status = "unbilled";
                }
            }

            rows.add(StudentBillingRowDTO.builder()
                    .sNo(sNo++)
                    .studentId(student.getId())
                    .admissionNumber(student.getAdmissionNumber())
                    .studentName(student.getName())
                    .className(student.getClassName() != null ? student.getClassName() : className)
                    .termFees1(termFees1)
                    .termFees2(termFees2)
                    .termFees3(termFees3)
                    .busFees(busFees)
                    .examFees(examFees)
                    .outstandingAmount(outstandingAmount)
                    .paidAmount(paidAmount)
                    .currentTerm(currentTerm)
                    .currentTermAmount(currentTermAmount)
                    .currentTermPaidAmount(currentTermPaidAmount)
                    .currentTermOutstandingAmount(currentTermOutstandingAmount)
                    .outstandingByComponent(outstandingByComponent)
                    .totalAmount(totalAmount)
                    .status(status)
                    .feeId(feeId)
                    .payments(payments)
                    .build());
        }

        return rows;
    }

    /**
     * Create or update fee record for an individual active student.
     * Enforces consistency: Total = Terms + Bus + Exam, Outstanding = Total - Paid.
     */
    @Transactional
    public FeeDTO createOrUpdateFee(FeeDTO dto) {
        if (dto.getStudentId() == null) {
            throw new BadRequestException("Student ID is required.");
        }

        // Validate student existence and active status in Student Portal
        List<StudentInfoDTO> allStudents = studentServiceClient.getAllStudents();
        StudentInfoDTO student = null;
        if (allStudents != null) {
            student = allStudents.stream()
                    .filter(s -> s.getId() != null && s.getId().equals(dto.getStudentId()))
                    .findFirst()
                    .orElse(null);
        }

        if (student == null) {
            throw new BadRequestException("Student with ID " + dto.getStudentId() + " does not exist in the Student Portal.");
        }

        if (Boolean.FALSE.equals(student.getIsActive())) {
            throw new BadRequestException("Student '" + student.getName() + "' is inactive and cannot have billing created or modified.");
        }

        // Validate class consistency
        if (dto.getClassName() != null && !dto.getClassName().isBlank() && student.getClassName() != null) {
            if (!dto.getClassName().trim().equalsIgnoreCase(student.getClassName().trim())) {
                throw new BadRequestException(String.format("Student %s belongs to %s, but %s was specified.",
                        student.getAdmissionNumber() != null ? student.getAdmissionNumber() : student.getName(),
                        student.getClassName(), dto.getClassName()));
            }
        }

        // Ensure canonical student details from Student Portal are synchronized
        if (dto.getStudentName() == null || dto.getStudentName().isBlank()) {
            dto.setStudentName(student.getName());
        }
        if (dto.getAdmissionNumber() == null || dto.getAdmissionNumber().isBlank()) {
            dto.setAdmissionNumber(student.getAdmissionNumber());
        }
        if (dto.getClassName() == null || dto.getClassName().isBlank()) {
            dto.setClassName(student.getClassName());
        }

        // Calculate total amount from breakdown
        BigDecimal t1 = dto.getTermFees1() != null ? dto.getTermFees1() : BigDecimal.ZERO;
        BigDecimal t2 = dto.getTermFees2() != null ? dto.getTermFees2() : BigDecimal.ZERO;
        BigDecimal t3 = dto.getTermFees3() != null ? dto.getTermFees3() : BigDecimal.ZERO;
        BigDecimal bus = dto.getBusFees() != null ? dto.getBusFees() : BigDecimal.ZERO;
        BigDecimal exam = dto.getExamFees() != null ? dto.getExamFees() : BigDecimal.ZERO;
        BigDecimal paid = dto.getPaidAmount() != null ? dto.getPaidAmount() : BigDecimal.ZERO;

        BigDecimal total = t1.add(t2).add(t3).add(bus).add(exam);
        if (dto.getTotalAmount() != null && total.compareTo(BigDecimal.ZERO) == 0) {
            total = dto.getTotalAmount();
        }
        if (paid.compareTo(total) > 0) {
            throw new BadRequestException("Paid amount cannot exceed the billed total of " + total.toPlainString() + ".");
        }

        BigDecimal pending = total.subtract(paid);
        if (pending.compareTo(BigDecimal.ZERO) < 0) {
            pending = BigDecimal.ZERO;
        }

        FeeStatus status = determineStatus(total, paid);

        Fee fee = feeRepository.findFirstByStudentId(dto.getStudentId()).orElse(null);

        if (fee == null) {
            fee = Fee.builder()
                    .studentId(dto.getStudentId())
                    .admissionNumber(dto.getAdmissionNumber())
                    .studentName(dto.getStudentName())
                    .className(dto.getClassName())
                    .termFees1(t1)
                    .termFees2(t2)
                    .termFees3(t3)
                    .busFees(bus)
                    .examFees(exam)
                    .totalAmount(total)
                    .paidAmount(paid)
                    .pendingAmount(pending)
                    .status(status)
                    .description(dto.getDescription() != null ? dto.getDescription() : "Tuition & Fees")
                    .academicYear(dto.getAcademicYear() != null ? dto.getAcademicYear() : "2026-2027")
                    .dueDate(dto.getDueDate() != null ? dto.getDueDate() : LocalDate.now().plusMonths(1))
                    .build();
        } else {
            if (dto.getAdmissionNumber() != null) fee.setAdmissionNumber(dto.getAdmissionNumber());
            if (dto.getStudentName() != null) fee.setStudentName(dto.getStudentName());
            if (dto.getClassName() != null) fee.setClassName(dto.getClassName());
            fee.setTermFees1(t1);
            fee.setTermFees2(t2);
            fee.setTermFees3(t3);
            fee.setBusFees(bus);
            fee.setExamFees(exam);
            fee.setTotalAmount(total);
            fee.setPaidAmount(paid);
            fee.setPendingAmount(pending);
            fee.setStatus(status);
            if (dto.getDescription() != null) fee.setDescription(dto.getDescription());
            if (dto.getAcademicYear() != null) fee.setAcademicYear(dto.getAcademicYear());
            if (dto.getDueDate() != null) fee.setDueDate(dto.getDueDate());
        }

        Fee saved = feeRepository.save(fee);

        // Record initial payment transaction if paid > 0 and no payment recorded yet
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            List<Payment> existingPayments = paymentRepository.findByFeeIdOrderByPaymentDateDescIdDesc(saved.getId());
            if (existingPayments.isEmpty()) {
                Payment initialPayment = Payment.builder()
                        .feeId(saved.getId())
                        .studentId(saved.getStudentId())
                        .amountPaid(paid)
                        .paymentDate(LocalDate.now())
                        .paymentMethod("ONLINE")
                        .note("Initial payment installment")
                        .build();
                paymentRepository.save(initialPayment);
            }
        }

        log.info("Saved fee record for student {}: total {}, paid {}, pending {}, status {}",
                saved.getStudentId(), total, paid, pending, status);
        return toDTO(saved);
    }
>>>>>>> 22873ba (Billing Changes)

    public List<FeeDTO> getFeesByStudent(Long studentId) {
        return feeRepository.findByStudentId(studentId).stream()
                .map(this::toDTO)
                .toList();
    }

<<<<<<< HEAD
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

=======
    @Transactional
>>>>>>> 22873ba (Billing Changes)
    public FeeDTO updateFee(Long id, FeeDTO dto) {
        Fee existing = feeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", id));

        BigDecimal pending = dto.getTotalAmount().subtract(dto.getPaidAmount());
        FeeStatus status = determineStatus(dto.getTotalAmount(), dto.getPaidAmount());

<<<<<<< HEAD
        existing.setTotalAmount(dto.getTotalAmount());
        existing.setPaidAmount(dto.getPaidAmount());
=======
        BigDecimal total = t1.add(t2).add(t3).add(bus).add(exam);
        if (dto.getTotalAmount() != null && total.compareTo(BigDecimal.ZERO) == 0) {
            total = dto.getTotalAmount();
        }
        if (paid.compareTo(total) > 0) {
            throw new BadRequestException("Paid amount cannot exceed the billed total of " + total.toPlainString() + ".");
        }
        BigDecimal previousPaid = existing.getPaidAmount() != null ? existing.getPaidAmount() : BigDecimal.ZERO;

        BigDecimal pending = total.subtract(paid);
        if (pending.compareTo(BigDecimal.ZERO) < 0) pending = BigDecimal.ZERO;

        FeeStatus status = determineStatus(total, paid);

        existing.setTermFees1(t1);
        existing.setTermFees2(t2);
        existing.setTermFees3(t3);
        existing.setBusFees(bus);
        existing.setExamFees(exam);
        existing.setTotalAmount(total);
        existing.setPaidAmount(paid);
>>>>>>> 22873ba (Billing Changes)
        existing.setPendingAmount(pending);
        existing.setStatus(status);
        existing.setDescription(dto.getDescription());

        Fee updated = feeRepository.save(existing);
        BigDecimal paymentDelta = paid.subtract(previousPaid);
        if (paymentDelta.compareTo(BigDecimal.ZERO) > 0) {
            paymentRepository.save(Payment.builder()
                .feeId(updated.getId())
                .studentId(updated.getStudentId())
                .amountPaid(paymentDelta)
                .paymentDate(LocalDate.now())
                .paymentMethod("MANUAL")
                .note("Paid amount recorded while editing billing")
                .build());
        }
        log.info("Updated fee {} for student {}: {}", id, dto.getStudentId(), status);
        return toDTO(updated);
    }

        @Transactional
        public FeeCollectionResponse collectFee(FeeCollectionRequest request, Long adminUserId, String adminEmail) {
        Fee fee = feeRepository.findById(request.getBillingId())
            .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", request.getBillingId()));
        if (!Objects.equals(fee.getStudentId(), request.getStudentId())) {
            throw new BadRequestException("The selected billing record does not belong to this student.");
        }

        Payment payment = Payment.builder()
            .amountPaid(request.getPaymentAmount())
            .paymentDate(request.getPaymentDate())
            .paymentMethod(request.getPaymentMethod())
            .feeComponent(request.getFeeComponent())
            .referenceNumber(request.getReferenceNumber())
            .adminUser(adminUserId + " (" + adminEmail + ")")
            .note(request.getRemarks())
            .build();
        recordPayment(fee.getId(), payment);

        Fee updated = feeRepository.findById(fee.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", fee.getId()));
        return FeeCollectionResponse.builder()
            .success(true)
            .updatedPaidAmount(updated.getPaidAmount())
            .updatedOutstandingAmount(updated.getPendingAmount())
            .updatedStatus(updated.getStatus().name())
            .build();
        }

    /**
     * Record a payment against a fee.
     * Automatically updates paidAmount, pendingAmount, and status on the fee.
     */
    @Transactional
    public Payment recordPayment(Long feeId, Payment payment) {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", feeId));

        BigDecimal amount = payment.getAmountPaid();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero.");
        }
        BigDecimal currentPaid = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal totalAmount = fee.getTotalAmount() != null ? fee.getTotalAmount() : BigDecimal.ZERO;
        FeePaymentAllocation.Summary allocation = getPaymentAllocation(fee);
        String component = FeePaymentAllocation.resolveComponent(payment.getFeeComponent(), allocation);
        String validationError = FeePaymentAllocation.validatePayment(component, amount, allocation);
        if (validationError != null) throw new BadRequestException(validationError);

        payment.setFeeId(feeId);
        payment.setStudentId(fee.getStudentId());
        payment.setFeeComponent(component);
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
        }
        Payment saved = paymentRepository.save(payment);

        // Update fee totals
        BigDecimal newPaid = currentPaid.add(amount);
        BigDecimal newPending = totalAmount.subtract(newPaid);

        fee.setPaidAmount(newPaid);
        fee.setPendingAmount(newPending);
        fee.setStatus(determineStatus(fee.getTotalAmount(), newPaid));
        feeRepository.save(fee);

        log.info("Recorded payment of {} for fee {} (student {})", payment.getAmountPaid(), feeId, fee.getStudentId());
        return saved;
    }

    public List<Payment> getPaymentsByFee(Long feeId) {
        List<Payment> payments = new ArrayList<>(paymentRepository.findByFeeIdOrderByPaymentDateDescIdDesc(feeId));
        Fee fee = feeRepository.findById(feeId).orElse(null);
        if (fee == null || fee.getPaidAmount() == null) {
            return payments;
        }

        BigDecimal recordedAmount = payments.stream()
                .map(Payment::getAmountPaid)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal untrackedAmount = fee.getPaidAmount().subtract(recordedAmount);
        if (untrackedAmount.compareTo(BigDecimal.ZERO) > 0) {
            payments.add(Payment.builder()
                    .feeId(feeId)
                    .studentId(fee.getStudentId())
                    .amountPaid(untrackedAmount)
                    .paymentMethod("LEGACY")
                    .note("Previously paid balance; original transaction details are unavailable")
                    .build());
        }
        FeePaymentAllocation.Summary allocation = FeePaymentAllocation.calculate(fee, payments);
        for (Payment payment : payments) {
            if (payment.getFeeComponent() == null) {
                payment.setFeeComponent(allocation.inferredComponent(payment));
            }
        }
        return payments;
    }

    public List<Payment> getPaymentsByStudent(Long studentId) {
        return paymentRepository.findByStudentIdOrderByPaymentDateDescIdDesc(studentId);
    }

<<<<<<< HEAD
=======
    /**
     * Fetch recent payments with student name and class details for ERP finance management dashboard.
     */
    public List<RecentPaymentDTO> getRecentPayments(int limit) {
        try {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                    0,
                    limit > 0 ? limit : 10,
                    org.springframework.data.domain.Sort.by("paymentDate").descending().and(org.springframework.data.domain.Sort.by("id").descending())
            );
            List<Payment> payments = paymentRepository.findAll(pageable).getContent();
            if (payments == null || payments.isEmpty()) {
                return Collections.emptyList();
            }

            Set<Long> feeIds = payments.stream()
                    .map(Payment::getFeeId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Map<Long, Fee> feeMap = new HashMap<>();
            if (!feeIds.isEmpty()) {
                try {
                    feeRepository.findAllById(feeIds).forEach(f -> feeMap.put(f.getId(), f));
                } catch (Exception e) {
                    log.warn("Failed to fetch fees for recent payments: {}", e.getMessage());
                }
            }

            Map<Long, String> componentByPaymentId = new HashMap<>();
            for (Fee fee : feeMap.values()) {
                for (Payment payment : getPaymentsByFee(fee.getId())) {
                    if (payment.getId() != null && payment.getFeeComponent() != null) {
                        componentByPaymentId.put(payment.getId(), payment.getFeeComponent());
                    }
                }
            }

            return payments.stream().map(p -> {
                Fee fee = feeMap.get(p.getFeeId());
                String studentName = (fee != null && fee.getStudentName() != null) ? fee.getStudentName() : ("Student #" + p.getStudentId());
                String className = (fee != null && fee.getClassName() != null) ? fee.getClassName() : "-";
                String admissionNumber = (fee != null && fee.getAdmissionNumber() != null) ? fee.getAdmissionNumber() : "";

                return RecentPaymentDTO.builder()
                        .id(p.getId())
                        .feeId(p.getFeeId())
                        .studentId(p.getStudentId())
                        .studentName(studentName)
                        .admissionNumber(admissionNumber)
                        .className(className)
                        .amountPaid(p.getAmountPaid() != null ? p.getAmountPaid() : BigDecimal.ZERO)
                        .paymentDate(p.getPaymentDate())
                        .paymentMethod(p.getPaymentMethod() != null ? p.getPaymentMethod() : "ONLINE")
                        .feeComponent(p.getFeeComponent() != null ? p.getFeeComponent() : componentByPaymentId.get(p.getId()))
                        .note(p.getNote())
                        .status("Paid")
                        .createdAt(p.getCreatedAt())
                        .build();
            }).toList();
        } catch (Exception e) {
            log.error("Failed to load recent payments: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

>>>>>>> 22873ba (Billing Changes)
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
<<<<<<< HEAD
=======
        List<Payment> payments = getPaymentsByFee(fee.getId());
>>>>>>> 22873ba (Billing Changes)
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
<<<<<<< HEAD
=======

    private FeePaymentAllocation.Summary getPaymentAllocation(Fee fee) {
        if (fee == null || fee.getId() == null) {
            return FeePaymentAllocation.calculate(fee, Collections.emptyList());
        }
        return FeePaymentAllocation.calculate(fee, getPaymentsByFee(fee.getId()));
    }

    public static int getClassAcademicRank(String className) {
        if (className == null) return 999;
        String s = className.trim().toUpperCase();
        String clean = s.replaceAll("^(CLASS|GRADE|STANDARD|STD)\\s+", "").trim();

        if (clean.equals("PRE-KG") || clean.equals("PREKG") || clean.equals("NURSERY")) return 0;
        if (clean.equals("LKG") || clean.equals("L.K.G") || clean.equals("L.K.G.")) return 1;
        if (clean.equals("UKG") || clean.equals("U.K.G") || clean.equals("U.K.G.")) return 2;

        if (clean.equals("I")) return 3;
        if (clean.equals("II")) return 4;
        if (clean.equals("III")) return 5;
        if (clean.equals("IV")) return 6;
        if (clean.equals("V")) return 7;
        if (clean.equals("VI")) return 8;
        if (clean.equals("VII")) return 9;
        if (clean.equals("VIII")) return 10;
        if (clean.equals("IX")) return 11;
        if (clean.equals("X")) return 12;
        if (clean.equals("XI")) return 13;
        if (clean.equals("XII")) return 14;

        String digits = clean.replaceAll("\\D+", "");
        if (!digits.isEmpty()) {
            try {
                int n = Integer.parseInt(digits);
                return 2 + n;
            } catch (NumberFormatException ignored) {}
        }
        return 100;
    }

    public static int naturalClassCompare(String a, String b) {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;

        int rankA = getClassAcademicRank(a);
        int rankB = getClassAcademicRank(b);
        if (rankA != rankB) {
            return Integer.compare(rankA, rankB);
        }
        return a.compareToIgnoreCase(b);
    }
>>>>>>> 22873ba (Billing Changes)
}
