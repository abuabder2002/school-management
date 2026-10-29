package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import com.school.fee.dto.ClassBillingSummaryDTO;
import com.school.fee.dto.FeeDTO;
import com.school.fee.dto.RecentPaymentDTO;
import com.school.fee.dto.StudentBillingRowDTO;
import com.school.fee.dto.StudentInfoDTO;
import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Business logic for Fee, Payment, Class Summary, and Student Billing.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final FeeRepository feeRepository;
    private final PaymentRepository paymentRepository;
    private final StudentServiceClient studentServiceClient;

    /**
     * Get class-wise billing summaries for all configured/existing classes.
     * Calculated dynamically from active students and their fee records.
     */
    public List<ClassBillingSummaryDTO> getClassBillingSummaries(Long schoolId) {
        Map<String, List<StudentInfoDTO>> groupedStudents;
        try {
            groupedStudents = studentServiceClient.getActiveStudentsGroupedByClass(schoolId);
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
                List<String> distinctClasses = studentServiceClient.getDistinctClasses(schoolId);
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
                feeRepository.findBySchoolId(schoolId).stream()
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
                    activeStudents = studentServiceClient.getActiveStudentsByClass(className, schoolId);
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
                    List<Fee> fees = feeRepository.findByStudentIdInAndSchoolId(activeStudentIds, schoolId);
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
                    List<Fee> classFees = feeRepository.findByClassNameAndSchoolId(className, schoolId);
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
    public List<StudentBillingRowDTO> getStudentBillingForClass(String className, Long schoolId) {
        List<StudentInfoDTO> activeStudents;
        try {
            activeStudents = studentServiceClient.getActiveStudentsByClass(className, schoolId);
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
                List<Fee> classFees = feeRepository.findByClassNameAndSchoolId(className, schoolId);
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
                List<Fee> fees = feeRepository.findByStudentIdInAndSchoolId(studentIds, schoolId);
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

                if (outstandingAmount.compareTo(BigDecimal.ZERO) == 0 && totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                    status = "settled";
                } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0 && outstandingAmount.compareTo(BigDecimal.ZERO) > 0) {
                    status = "partially paid";
                } else if (totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                    status = "pending";
                } else {
                    status = "unbilled";
                }

                try {
                    payments = paymentRepository.findByFeeIdOrderByPaymentDateDesc(fee.getId());
                } catch (Exception e) {
                    payments = Collections.emptyList();
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
    public FeeDTO createOrUpdateFee(FeeDTO dto, Long schoolId) {
        requireSchoolId(schoolId);
        if (dto.getStudentId() == null) {
            throw new BadRequestException("Student ID is required.");
        }

        // Validate student existence and active status in Student Portal
        List<StudentInfoDTO> allStudents = studentServiceClient.getAllStudents(schoolId);
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

        BigDecimal pending = total.subtract(paid);
        if (pending.compareTo(BigDecimal.ZERO) < 0) {
            pending = BigDecimal.ZERO;
        }

        FeeStatus status = determineStatus(total, paid);

        Fee fee = feeRepository.findFirstByStudentIdAndSchoolId(dto.getStudentId(), schoolId).orElse(null);

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
                    .schoolId(schoolId)
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
            List<Payment> existingPayments = paymentRepository.findByFeeIdOrderByPaymentDateDesc(saved.getId());
            if (existingPayments.isEmpty()) {
                Payment initialPayment = Payment.builder()
                        .feeId(saved.getId())
                        .studentId(saved.getStudentId())
                        .amountPaid(paid)
                        .paymentDate(LocalDate.now())
                        .paymentMethod("ONLINE")
                        .note("Initial payment installment")
                        .schoolId(schoolId)
                        .build();
                paymentRepository.save(initialPayment);
            }
        }

        log.info("Saved fee record for student {}: total {}, paid {}, pending {}, status {}",
                saved.getStudentId(), total, paid, pending, status);
        return toDTO(saved);
    }

    public List<FeeDTO> getFeesByStudent(Long studentId, Long schoolId) {
        return feeRepository.findByStudentIdAndSchoolId(studentId, schoolId).stream()
                .map(this::toDTO)
                .toList();
    }

    public FeeDTO updateFee(Long id, FeeDTO dto, Long schoolId) {
        Fee existing = feeRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", id));

        BigDecimal t1 = dto.getTermFees1() != null ? dto.getTermFees1() : (existing.getTermFees1() != null ? existing.getTermFees1() : BigDecimal.ZERO);
        BigDecimal t2 = dto.getTermFees2() != null ? dto.getTermFees2() : (existing.getTermFees2() != null ? existing.getTermFees2() : BigDecimal.ZERO);
        BigDecimal t3 = dto.getTermFees3() != null ? dto.getTermFees3() : (existing.getTermFees3() != null ? existing.getTermFees3() : BigDecimal.ZERO);
        BigDecimal bus = dto.getBusFees() != null ? dto.getBusFees() : (existing.getBusFees() != null ? existing.getBusFees() : BigDecimal.ZERO);
        BigDecimal exam = dto.getExamFees() != null ? dto.getExamFees() : (existing.getExamFees() != null ? existing.getExamFees() : BigDecimal.ZERO);
        BigDecimal paid = dto.getPaidAmount() != null ? dto.getPaidAmount() : existing.getPaidAmount();

        BigDecimal total = t1.add(t2).add(t3).add(bus).add(exam);
        if (dto.getTotalAmount() != null && total.compareTo(BigDecimal.ZERO) == 0) {
            total = dto.getTotalAmount();
        }

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
        existing.setPendingAmount(pending);
        existing.setStatus(status);
        if (dto.getDescription() != null) existing.setDescription(dto.getDescription());

        Fee updated = feeRepository.save(existing);
        log.info("Updated fee {} for student {}: {}", id, dto.getStudentId(), status);
        return toDTO(updated);
    }

    /**
     * Record a payment against a fee.
     * Automatically updates paidAmount, pendingAmount, and status on the fee.
     */
    @Transactional
    public Payment recordPayment(Long feeId, Payment payment, Long schoolId) {
        Fee fee = feeRepository.findByIdAndSchoolId(feeId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", feeId));

        payment.setFeeId(feeId);
        payment.setStudentId(fee.getStudentId());
        payment.setSchoolId(schoolId);
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

    public List<Payment> getPaymentsByFee(Long feeId, Long schoolId) {
        // Confirms the fee belongs to the caller's school before returning its payments —
        // feeId alone would otherwise let one school enumerate another's payment history.
        feeRepository.findByIdAndSchoolId(feeId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee", "id", feeId));
        return paymentRepository.findByFeeIdOrderByPaymentDateDesc(feeId);
    }

    public List<Payment> getPaymentsByStudent(Long studentId, Long schoolId) {
        return paymentRepository.findByStudentIdAndSchoolIdOrderByPaymentDateDesc(studentId, schoolId);
    }

    /**
     * Fetch recent payments with student name and class details for ERP finance management dashboard.
     */
    public List<RecentPaymentDTO> getRecentPayments(int limit, Long schoolId) {
        try {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                    0,
                    limit > 0 ? limit : 10,
                    org.springframework.data.domain.Sort.by("paymentDate").descending().and(org.springframework.data.domain.Sort.by("id").descending())
            );
            List<Payment> payments = paymentRepository.findBySchoolId(schoolId, pageable).getContent();
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

    private FeeStatus determineStatus(BigDecimal total, BigDecimal paid) {
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            return FeeStatus.PENDING;
        } else if (paid.compareTo(total) >= 0 && total.compareTo(BigDecimal.ZERO) > 0) {
            return FeeStatus.PAID;
        } else {
            return FeeStatus.PARTIAL;
        }
    }

    private FeeDTO toDTO(Fee fee) {
        List<Payment> payments = paymentRepository.findByFeeIdOrderByPaymentDateDesc(fee.getId());
        return FeeDTO.builder()
                .id(fee.getId())
                .studentId(fee.getStudentId())
                .admissionNumber(fee.getAdmissionNumber())
                .studentName(fee.getStudentName())
                .className(fee.getClassName())
                .termFees1(fee.getTermFees1())
                .termFees2(fee.getTermFees2())
                .termFees3(fee.getTermFees3())
                .busFees(fee.getBusFees())
                .examFees(fee.getExamFees())
                .totalAmount(fee.getTotalAmount())
                .paidAmount(fee.getPaidAmount())
                .pendingAmount(fee.getPendingAmount())
                .status(fee.getStatus())
                .description(fee.getDescription())
                .academicYear(fee.getAcademicYear())
                .dueDate(fee.getDueDate())
                .payments(payments)
                .build();
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

    /**
     * Guards every path that stamps schoolId onto a new row: a null here (unresolvable caller —
     * e.g. a stale pre-isolation token) must be rejected outright, never silently written and
     * later swept into Default School by the next boot's backfill.
     */
    public static void requireSchoolId(Long schoolId) {
        if (schoolId == null) {
            throw new BadRequestException("Could not resolve your school; please log in again.");
        }
    }
}
