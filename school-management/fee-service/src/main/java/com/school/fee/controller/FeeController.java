package com.school.fee.controller;

import com.school.common.dto.ApiResponse;
import com.school.fee.dto.FeeDTO;
import com.school.fee.entity.Payment;
import com.school.fee.service.FeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Fee and Payment management.
 */
@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
public class FeeController {

    private final FeeService feeService;

    /** GET /api/fees/student/{studentId} — Get fees by student */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<FeeDTO>>> getFeesByStudent(@PathVariable("studentId") Long studentId) {
        List<FeeDTO> fees = feeService.getFeesByStudent(studentId);
        return ResponseEntity.ok(ApiResponse.success(fees));
    }

    /** POST /api/fees — Create a new fee record */
    @PostMapping
    public ResponseEntity<ApiResponse<FeeDTO>> createFee(@Valid @RequestBody FeeDTO dto) {
        FeeDTO created = feeService.createFee(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Fee record created", created));
    }

    /** PUT /api/fees/{id} — Update a fee record */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FeeDTO>> updateFee(@PathVariable("id") Long id,
                                                          @Valid @RequestBody FeeDTO dto) {
        FeeDTO updated = feeService.updateFee(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Fee record updated", updated));
    }

    /** POST /api/fees/{feeId}/payments — Record a payment against a fee */
    @PostMapping("/{feeId}/payments")
    public ResponseEntity<ApiResponse<Payment>> recordPayment(
            @PathVariable("feeId") Long feeId,
            @RequestBody Payment payment) {
        Payment recorded = feeService.recordPayment(feeId, payment);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Payment recorded", recorded));
    }

    /** GET /api/fees/{feeId}/payments — Get payment history for a fee */
    @GetMapping("/{feeId}/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByFee(@PathVariable("feeId") Long feeId) {
        List<Payment> payments = feeService.getPaymentsByFee(feeId);
        return ResponseEntity.ok(ApiResponse.success(payments));
    }

    /** GET /api/fees/student/{studentId}/payments — All payments for a student */
    @GetMapping("/student/{studentId}/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByStudent(@PathVariable("studentId") Long studentId) {
        List<Payment> payments = feeService.getPaymentsByStudent(studentId);
        return ResponseEntity.ok(ApiResponse.success(payments));
    }
}
