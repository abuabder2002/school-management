package com.school.fee.controller;

import com.school.common.dto.ApiResponse;
import com.school.fee.dto.BulkUploadBillingResult;
import com.school.fee.dto.ClassBillingSummaryDTO;
import com.school.fee.dto.FeeDTO;
import com.school.fee.dto.RecentPaymentDTO;
import com.school.fee.dto.StudentBillingRowDTO;
import com.school.fee.entity.Payment;
import com.school.fee.security.JwtDecoder;
import com.school.fee.service.FeeExcelService;
import com.school.fee.service.FeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * REST controller for Fee, Payment, Class Summary, and Bulk Billing management.
 * Billing is administrative data: every endpoint requires ADMIN, except the two
 * per-student reads, which a PARENT may also call for their own linked child.
 */
@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
@Slf4j
public class FeeController {

    private final FeeService feeService;
    private final FeeExcelService feeExcelService;
    private final JwtDecoder jwtDecoder;

    /**
     * 401 if the token is missing/invalid, 403 if the caller's role isn't in {@code allowedRoles};
     * null means the caller is authorized to proceed. No endpoint here is called service-to-service
     * (confirmed: no other service's *ServiceClient targets fee-service), so every check fails closed.
     */
    private <T> ResponseEntity<ApiResponse<T>> denyUnlessRole(String authHeader, String... allowedRoles) {
        String token = jwtDecoder.extractRaw(authHeader);
        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Missing or invalid authentication token."));
        }
        String role = jwtDecoder.getRole(token);
        for (String allowed : allowedRoles) {
            if (allowed.equalsIgnoreCase(role)) {
                return null;
            }
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("You are not authorized to perform this action."));
    }

    /** ADMIN may view any student's billing; PARENT only their own linked child's. */
    private <T> ResponseEntity<ApiResponse<T>> denyUnlessAdminOrOwnChild(String authHeader, Long studentId) {
        String token = jwtDecoder.extractRaw(authHeader);
        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Missing or invalid authentication token."));
        }
        String role = jwtDecoder.getRole(token);
        if ("ADMIN".equalsIgnoreCase(role)) {
            return null;
        }
        if ("PARENT".equalsIgnoreCase(role)) {
            Long linkedStudentId = jwtDecoder.getStudentId(token);
            if (linkedStudentId != null && linkedStudentId.equals(studentId)) {
                return null;
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("You can only view your own child's billing records."));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("You are not authorized to view billing records."));
    }

    /** GET /api/fees/class-summary — Class-wise billing summary for the main portal */
    @GetMapping("/class-summary")
    public ResponseEntity<ApiResponse<List<ClassBillingSummaryDTO>>> getClassBillingSummaries(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<ClassBillingSummaryDTO>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        List<ClassBillingSummaryDTO> summaries = feeService.getClassBillingSummaries(resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(summaries));
    }

    /** GET /api/fees/class/{className} — Detailed student-level billing rows for a class */
    @GetMapping("/class/{className}")
    public ResponseEntity<ApiResponse<List<StudentBillingRowDTO>>> getStudentBillingForClass(
            @PathVariable("className") String className,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<StudentBillingRowDTO>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        List<StudentBillingRowDTO> rows = feeService.getStudentBillingForClass(className, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(rows));
    }

    /** GET /api/fees/template/{className} or /api/fees/template?className=... or /api/fees/excel/template — Download pre-filled Excel template for a class */
    @GetMapping({"/template/{className}", "/template", "/excel/template"})
    public ResponseEntity<?> downloadBillingTemplate(
            @PathVariable(value = "className", required = false) String pathClassName,
            @RequestParam(value = "className", required = false) String queryClassName,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Object>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        String targetClass = pathClassName != null && !pathClassName.trim().isEmpty() ? pathClassName.trim() : queryClassName;
        if (targetClass == null || targetClass.trim().isEmpty()) {
            targetClass = "ALL";
        }
        try {
            byte[] excelBytes = feeExcelService.generateTemplate(targetClass, resolveSchoolId(authHeader));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            String filename = (targetClass != null && !targetClass.isBlank() && !"ALL".equalsIgnoreCase(targetClass) && !"All Classes".equalsIgnoreCase(targetClass))
                    ? String.format("%s_Billing_Template.xlsx", targetClass.replace(" ", "_"))
                    : "Multi_Class_Billing_Template.xlsx";
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(excelBytes.length);
            return ResponseEntity.ok().headers(headers).body(excelBytes);
        } catch (IOException e) {
            log.error("Failed to generate billing template for {}: {}", targetClass, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** POST /api/fees/bulk-upload — Atomic bulk upload of billing records (class-specific or ALL classes) */
    @PostMapping("/bulk-upload")
    public ResponseEntity<ApiResponse<BulkUploadBillingResult>> bulkUploadBilling(
            @RequestParam(value = "className", required = false) String className,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<BulkUploadBillingResult>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        String targetClass = (className != null && !className.trim().isEmpty()) ? className.trim() : "ALL";
        try {
            BulkUploadBillingResult result = feeExcelService.processBulkUpload(targetClass, file, resolveSchoolId(authHeader));
            return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
        } catch (Exception e) {
            log.error("Bulk billing upload failed for {}: {}", targetClass, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Bulk upload processing failed: " + e.getMessage()));
        }
    }

    /** GET /api/fees/student/{studentId} — Get fees by student. ADMIN any; PARENT their own child only. */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<FeeDTO>>> getFeesByStudent(
            @PathVariable("studentId") Long studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<FeeDTO>>> denied = denyUnlessAdminOrOwnChild(authHeader, studentId);
        if (denied != null) return denied;
        List<FeeDTO> fees = feeService.getFeesByStudent(studentId, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(fees));
    }

    /** POST /api/fees — Create or update individual student billing record */
    @PostMapping
    public ResponseEntity<ApiResponse<FeeDTO>> createFee(
            @Valid @RequestBody FeeDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<FeeDTO>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        FeeDTO saved = feeService.createOrUpdateFee(dto, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Billing record saved successfully", saved));
    }

    /** PUT /api/fees/{id} — Update a fee record */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FeeDTO>> updateFee(@PathVariable("id") Long id,
                                                          @Valid @RequestBody FeeDTO dto,
                                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<FeeDTO>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        FeeDTO updated = feeService.updateFee(id, dto, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success("Fee record updated", updated));
    }

    /** POST /api/fees/{feeId}/payments — Record a payment against a fee */
    @PostMapping("/{feeId}/payments")
    public ResponseEntity<ApiResponse<Payment>> recordPayment(
            @PathVariable("feeId") Long feeId,
            @RequestBody Payment payment,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<Payment>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        Payment recorded = feeService.recordPayment(feeId, payment, resolveSchoolId(authHeader));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Payment recorded", recorded));
    }

    /** GET /api/fees/{feeId}/payments — Get payment history for a fee */
    @GetMapping("/{feeId}/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByFee(
            @PathVariable("feeId") Long feeId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<Payment>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        List<Payment> payments = feeService.getPaymentsByFee(feeId, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(payments));
    }

    /** GET /api/fees/student/{studentId}/payments — All payments for a student. ADMIN any; PARENT their own child only. */
    @GetMapping("/student/{studentId}/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByStudent(
            @PathVariable("studentId") Long studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<Payment>>> denied = denyUnlessAdminOrOwnChild(authHeader, studentId);
        if (denied != null) return denied;
        List<Payment> payments = feeService.getPaymentsByStudent(studentId, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(payments));
    }

    /** GET /api/fees/payments/recent — Recent payments with student and class information */
    @GetMapping("/payments/recent")
    public ResponseEntity<ApiResponse<List<RecentPaymentDTO>>> getRecentPayments(
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        ResponseEntity<ApiResponse<List<RecentPaymentDTO>>> denied = denyUnlessRole(authHeader, "ADMIN");
        if (denied != null) return denied;
        List<RecentPaymentDTO> payments = feeService.getRecentPayments(limit, resolveSchoolId(authHeader));
        return ResponseEntity.ok(ApiResponse.success(payments));
    }

    private Long resolveSchoolId(String authHeader) {
        if (authHeader == null) return null;
        String token = jwtDecoder.extractRaw(authHeader);
        return token != null ? jwtDecoder.getSchoolId(token) : null;
    }
}
