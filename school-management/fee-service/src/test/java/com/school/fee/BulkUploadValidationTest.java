package com.school.fee;

import com.school.fee.dto.BulkUploadBillingResult;
import com.school.fee.dto.StudentInfoDTO;
import com.school.fee.repository.FeeRepository;
import com.school.fee.service.FeeExcelService;
import com.school.fee.service.StudentServiceClient;
import com.school.fee.repository.PaymentRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

public class BulkUploadValidationTest {

    @Test
    public void testDuplicateAndWrongClassValidation() throws IOException {
        StudentServiceClient mockClient = Mockito.mock(StudentServiceClient.class);
        FeeRepository mockRepo = Mockito.mock(FeeRepository.class);
        PaymentRepository mockPaymentRepo = Mockito.mock(PaymentRepository.class);

        // Active students in Class 10
        StudentInfoDTO abu = StudentInfoDTO.builder().id(101L).name("Abu").admissionNumber("ADM-01").className("Class 10").isActive(true).build();
        StudentInfoDTO mubeen = StudentInfoDTO.builder().id(102L).name("Mubeen").admissionNumber("ADM-02").className("Class 10").isActive(true).build();
        StudentInfoDTO ramya = StudentInfoDTO.builder().id(103L).name("Ramya").admissionNumber("ADM-03").className("Class 10").isActive(false).build(); // INACTIVE
        StudentInfoDTO david = StudentInfoDTO.builder().id(104L).name("David").admissionNumber("ADM-04").className("Class 9").isActive(true).build(); // CLASS 9

        Mockito.when(mockClient.getAllStudents(1L)).thenReturn(List.of(abu, mubeen, ramya, david));
        Mockito.when(mockClient.getActiveStudentsByClass("Class 10", 1L)).thenReturn(List.of(abu, mubeen));

        FeeExcelService service = new FeeExcelService(mockClient, mockRepo, mockPaymentRepo);

        // 1. Test Template Generation
        byte[] tplBytes = service.generateTemplate("Class 10", 1L);
        Assertions.assertTrue(tplBytes.length > 0);

        // 2. Build workbook with intentional errors:
        // Row 1: Abu
        // Row 2: Abu (Duplicate student)
        // Row 3: Ramya (Inactive student)
        // Row 4: David (Wrong class - Class 9 in Class 10 upload)
        // Row 5: Mubeen with negative amount (-500)
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Class 10 Billing");
            Row hRow = sheet.createRow(0);
            for (int i = 0; i < FeeExcelService.TEMPLATE_HEADERS.length; i++) {
                hRow.createCell(i).setCellValue(FeeExcelService.TEMPLATE_HEADERS[i]);
            }

            // Row 1: Abu
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);
            r1.createCell(1).setCellValue("Abu");
            r1.createCell(2).setCellValue("ADM-01");
            r1.createCell(3).setCellValue("Class 10");
            r1.createCell(4).setCellValue(1000);

            // Row 2: Abu (Duplicate!)
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue(2);
            r2.createCell(1).setCellValue("Abu");
            r2.createCell(2).setCellValue("ADM-01");
            r2.createCell(3).setCellValue("Class 10");
            r2.createCell(4).setCellValue(1000);

            // Row 3: Ramya (Inactive!)
            Row r3 = sheet.createRow(3);
            r3.createCell(0).setCellValue(3);
            r3.createCell(1).setCellValue("Ramya");
            r3.createCell(2).setCellValue("ADM-03");
            r3.createCell(3).setCellValue("Class 10");
            r3.createCell(4).setCellValue(1000);

            // Row 4: David (Class 9!)
            Row r4 = sheet.createRow(4);
            r4.createCell(0).setCellValue(4);
            r4.createCell(1).setCellValue("David");
            r4.createCell(2).setCellValue("ADM-04");
            r4.createCell(3).setCellValue("Class 10");
            r4.createCell(4).setCellValue(1000);

            // Row 5: Mubeen (Negative Amount!)
            Row r5 = sheet.createRow(5);
            r5.createCell(0).setCellValue(5);
            r5.createCell(1).setCellValue("Mubeen");
            r5.createCell(2).setCellValue("ADM-02");
            r5.createCell(3).setCellValue("Class 10");
            r5.createCell(4).setCellValue(-500);

            wb.write(out);

            MockMultipartFile mockFile = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
            BulkUploadBillingResult result = service.processBulkUpload("Class 10", mockFile, 1L);

            // Assertions
            Assertions.assertFalse(result.isSuccess(), "Upload with validation errors should fail atomically");
            Assertions.assertTrue(result.getErrorCount() >= 4, "Should have detected at least 4 errors");
            Assertions.assertNotNull(result.getErrorExcelBase64(), "Downloadable error report should be generated");

            boolean foundDuplicate = result.getErrors().stream().anyMatch(e -> e.getErrorType().equals("Duplicate Student"));
            boolean foundInactive = result.getErrors().stream().anyMatch(e -> e.getErrorType().equals("Inactive Student"));
            boolean foundWrongClass = result.getErrors().stream().anyMatch(e -> e.getErrorType().equals("Class Mismatch") || e.getErrorType().equals("Student Not Found"));
            boolean foundNegative = result.getErrors().stream().anyMatch(e -> e.getErrorType().equals("Negative Amount"));

            Assertions.assertTrue(foundDuplicate, "Must catch duplicate student");
            Assertions.assertTrue(foundInactive, "Must catch inactive student");
            Assertions.assertTrue(foundWrongClass, "Must catch wrong class student");
            Assertions.assertTrue(foundNegative, "Must catch negative amount");

            System.out.println("ALL BULK UPLOAD VALIDATION ASSERTIONS PASSED!");
            System.out.println("Errors captured:");
            result.getErrors().forEach(e -> System.out.println(" - " + e.getErrorType() + ": " + e.getErrorMessage()));
        }
    }
}
