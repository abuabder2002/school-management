package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.fee.dto.BulkUploadBillingResult;
import com.school.fee.dto.StudentInfoDTO;
import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeeExcelPaymentHistoryTest {

    @Test
    void recordsInstallmentsSeparatelyForEachExcelImport() throws IOException {
        StudentServiceClient studentClient = mock(StudentServiceClient.class);
        FeeRepository feeRepository = mock(FeeRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        StudentInfoDTO student = StudentInfoDTO.builder()
                .id(101L)
                .name("Abdul")
                .admissionNumber("ADM-01")
                .className("Class 10")
                .isActive(true)
                .build();
        Fee existingFee = Fee.builder()
                .id(11L)
                .studentId(101L)
                .studentName("Abdul")
                .className("Class 10")
                .termFees1(new BigDecimal("5000"))
                .totalAmount(new BigDecimal("5000"))
                .paidAmount(BigDecimal.ZERO)
                .pendingAmount(new BigDecimal("5000"))
                .status(FeeStatus.PENDING)
                .build();

        when(studentClient.getAllStudents()).thenReturn(List.of(student));
        when(feeRepository.findByStudentIdAndClassName(101L, "Class 10")).thenReturn(Optional.of(existingFee));
        when(feeRepository.findFirstByStudentId(101L)).thenReturn(Optional.of(existingFee));
        when(feeRepository.save(any(Fee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeeExcelService service = new FeeExcelService(studentClient, feeRepository, paymentRepository);
        BulkUploadBillingResult firstImport = service.processBulkUpload("Class 10", workbookWithPaidAmount(1000));
        BulkUploadBillingResult secondImport = service.processBulkUpload("Class 10", workbookWithPaidAmount(2000));

        assertTrue(firstImport.isSuccess());
        assertTrue(secondImport.isSuccess());
        assertEquals(0, new BigDecimal("3000").compareTo(existingFee.getPaidAmount()));

        org.mockito.ArgumentCaptor<Payment> captor = org.mockito.ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, times(2)).save(captor.capture());
        List<Payment> payments = captor.getAllValues();
        assertEquals(0, new BigDecimal("1000").compareTo(payments.get(0).getAmountPaid()));
        assertEquals(0, new BigDecimal("2000").compareTo(payments.get(1).getAmountPaid()));
        assertEquals("EXCEL", payments.get(0).getPaymentMethod());
        assertEquals("EXCEL", payments.get(1).getPaymentMethod());
        assertEquals(FeePaymentAllocation.TERM_1, payments.get(0).getFeeComponent());
        assertEquals(FeePaymentAllocation.TERM_1, payments.get(1).getFeeComponent());
    }

    @Test
    void rejectsExcelPaymentAboveBilledTotalWithoutSaving() throws IOException {
        StudentServiceClient studentClient = mock(StudentServiceClient.class);
        FeeRepository feeRepository = mock(FeeRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        StudentInfoDTO student = StudentInfoDTO.builder()
                .id(101L)
                .name("Abdul")
                .admissionNumber("ADM-01")
                .className("Class 10")
                .isActive(true)
                .build();
        when(studentClient.getAllStudents()).thenReturn(List.of(student));
            Fee existingFee = Fee.builder()
                .id(11L)
                .studentId(101L)
                .studentName("Abdul")
                .className("Class 10")
                .totalAmount(new BigDecimal("5000"))
                .paidAmount(new BigDecimal("3000"))
                .pendingAmount(new BigDecimal("2000"))
                .status(FeeStatus.PARTIAL)
                .build();
            when(feeRepository.findByStudentIdAndClassName(101L, "Class 10")).thenReturn(Optional.of(existingFee));
            when(feeRepository.findFirstByStudentId(101L)).thenReturn(Optional.of(existingFee));

        FeeExcelService service = new FeeExcelService(studentClient, feeRepository, paymentRepository);
            BulkUploadBillingResult result = service.processBulkUpload("Class 10", workbookWithPaidAmount(2001));

        assertFalse(result.isSuccess());
        var paymentError = result.getErrors().stream()
            .filter(error -> error.getErrorType().equals("Payment Validation"))
            .findFirst()
            .orElseThrow();
        assertEquals("Abdul", paymentError.getStudentName());
        assertEquals("ADM-01", paymentError.getAdmissionNumber());
        assertEquals("Class 10", paymentError.getClassName());
        assertTrue(paymentError.getErrorMessage().contains("outstanding balance (₹2,000.00)"));
        try (Workbook errorWorkbook = WorkbookFactory.create(new java.io.ByteArrayInputStream(
            Base64.getDecoder().decode(result.getErrorExcelBase64())))) {
            Row errorRow = errorWorkbook.getSheetAt(0).getRow(1);
            assertEquals("Abdul", errorRow.getCell(1).getStringCellValue());
            assertEquals("ADM-01", errorRow.getCell(2).getStringCellValue());
            assertEquals("Class 10", errorRow.getCell(3).getStringCellValue());
        }
        verify(feeRepository, never()).save(any(Fee.class));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    private MockMultipartFile workbookWithPaidAmount(double paidAmount) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Class 10 Billing");
            Row headers = sheet.createRow(0);
            for (int column = 0; column < FeeExcelService.TEMPLATE_HEADERS.length; column++) {
                headers.createCell(column).setCellValue(FeeExcelService.TEMPLATE_HEADERS[column]);
            }

            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue(1);
            row.createCell(1).setCellValue("Abdul");
            row.createCell(2).setCellValue("ADM-01");
            row.createCell(3).setCellValue("Class 10");
            row.createCell(4).setCellValue(5000);
            row.createCell(9).setCellValue(paidAmount);
            workbook.write(output);
            return new MockMultipartFile("file", "fees.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", output.toByteArray());
        }
    }
}