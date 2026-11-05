package com.school.fee;

import com.school.fee.dto.BulkUploadBillingResult;
import com.school.fee.dto.StudentInfoDTO;
import com.school.fee.entity.Fee;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import com.school.fee.service.FeeExcelService;
import com.school.fee.service.StudentServiceClient;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * The billing sheet carries a Section column right after Class, so a school with the same class split
 * into sections (or with two students of the same name) can be told apart. Sheets from before the
 * column existed must keep working.
 */
public class BillingSectionColumnTest {

    private StudentServiceClient client;
    private FeeRepository feeRepository;
    private FeeExcelService service;

    private StudentInfoDTO kumarA;
    private StudentInfoDTO kumarB;
    private StudentInfoDTO asha;

    @BeforeEach
    void setUp() {
        client = Mockito.mock(StudentServiceClient.class);
        feeRepository = Mockito.mock(FeeRepository.class);
        service = new FeeExcelService(client, feeRepository, Mockito.mock(PaymentRepository.class));

        kumarA = StudentInfoDTO.builder().id(201L).name("Kumar").admissionNumber("ADM-A").className("Class 10").section("A").isActive(true).build();
        kumarB = StudentInfoDTO.builder().id(202L).name("Kumar").admissionNumber("ADM-B").className("Class 10").section("B").isActive(true).build();
        asha = StudentInfoDTO.builder().id(203L).name("Asha").admissionNumber("ADM-C").className("Class 10").section("A").isActive(true).build();

        Mockito.when(client.getAllStudents(1L)).thenReturn(List.of(kumarA, kumarB, asha));
        Mockito.when(client.getActiveStudentsByClass("Class 10", 1L)).thenReturn(List.of(kumarB, asha, kumarA));
    }

    // ---- template ----

    @Test
    void templateHasSectionColumnRightAfterClassFilledFromTheStudent() throws IOException {
        byte[] bytes = service.generateTemplate("Class 10", 1L);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            Row header = sheet.getRow(0);
            int classCol = indexOfHeader(header, "Class");
            Assertions.assertTrue(classCol >= 0, "Class column present");
            Assertions.assertEquals("Section", header.getCell(classCol + 1).getStringCellValue(),
                    "Section must sit immediately after Class");

            // Sorted by section then name: Asha(A), Kumar(A), Kumar(B)
            Assertions.assertEquals("Asha", sheet.getRow(1).getCell(1).getStringCellValue());
            Assertions.assertEquals("A", sheet.getRow(1).getCell(classCol + 1).getStringCellValue());
            Assertions.assertEquals("B", sheet.getRow(3).getCell(classCol + 1).getStringCellValue());
        }
    }

    @Test
    void templateStillHasAllFeeColumnsAndKeepsHiddenIdColumnsAfterThem() throws IOException {
        byte[] bytes = service.generateTemplate("Class 10", 1L);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Row header = wb.getSheetAt(0).getRow(0);
            for (String h : List.of("Student Name", "Adm No", "Class", "Section", "Term Fees - 1", "Term Fees - 2",
                    "Term Fees - 3", "Bus Fees", "Exam Fees", "Paid Amount")) {
                Assertions.assertTrue(indexOfHeader(header, h) >= 0, "missing column " + h);
            }
            Assertions.assertTrue(indexOfHeader(header, "Student_Internal_ID") > indexOfHeader(header, "Paid Amount"));
        }
    }

    // ---- upload ----

    @Test
    void sameNameAndClassIsToldApartBySection() throws IOException {
        // no admission number in the sheet, two "Kumar" in Class 10 — only the Section says which one
        byte[] sheet = billingSheet(true, new String[]{"Kumar", "", "Class 10", "B", "5000"});
        BulkUploadBillingResult result = service.processBulkUpload("ALL", file(sheet), 1L);

        Assertions.assertTrue(result.isSuccess(), String.valueOf(result.getErrors()));
        ArgumentCaptor<Fee> saved = ArgumentCaptor.forClass(Fee.class);
        Mockito.verify(feeRepository).save(saved.capture());
        Assertions.assertEquals(202L, saved.getValue().getStudentId(), "must pick Kumar of section B");
    }

    @Test
    void wrongSectionIsRejectedAndNothingIsSaved() throws IOException {
        byte[] sheet = billingSheet(true, new String[]{"Asha", "ADM-C", "Class 10", "B", "5000"});
        BulkUploadBillingResult result = service.processBulkUpload("ALL", file(sheet), 1L);

        Assertions.assertFalse(result.isSuccess());
        Assertions.assertTrue(result.getErrors().stream().anyMatch(e -> "Section Mismatch".equals(e.getErrorType())),
                String.valueOf(result.getErrors()));
        Mockito.verify(feeRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void sectionIsComparedIgnoringCaseSpacesAndSectionWord() throws IOException {
        byte[] sheet = billingSheet(true, new String[]{"Asha", "ADM-C", "Class 10", " section a ", "5000"});
        BulkUploadBillingResult result = service.processBulkUpload("ALL", file(sheet), 1L);

        Assertions.assertTrue(result.isSuccess(), String.valueOf(result.getErrors()));
    }

    @Test
    void blankSectionCellIsNotChecked() throws IOException {
        byte[] sheet = billingSheet(true, new String[]{"Asha", "ADM-C", "Class 10", "", "5000"});
        BulkUploadBillingResult result = service.processBulkUpload("ALL", file(sheet), 1L);

        Assertions.assertTrue(result.isSuccess(), String.valueOf(result.getErrors()));
    }

    @Test
    void sheetWithoutSectionColumnStillUploads() throws IOException {
        // the layout every school used before the Section column existed
        byte[] sheet = billingSheet(false, new String[]{"Asha", "ADM-C", "Class 10", "5000"});
        BulkUploadBillingResult result = service.processBulkUpload("ALL", file(sheet), 1L);

        Assertions.assertTrue(result.isSuccess(), String.valueOf(result.getErrors()));
        ArgumentCaptor<Fee> saved = ArgumentCaptor.forClass(Fee.class);
        Mockito.verify(feeRepository).save(saved.capture());
        Assertions.assertEquals(203L, saved.getValue().getStudentId());
        Assertions.assertEquals(0, saved.getValue().getTermFees1().compareTo(new java.math.BigDecimal("5000")),
                "Term Fees - 1 must be read from its own column, not shifted");
    }

    @Test
    void studentWithNoSectionOnFileRejectsASectionInTheSheet() throws IOException {
        StudentInfoDTO none = StudentInfoDTO.builder().id(204L).name("Ravi").admissionNumber("ADM-R").className("Class 10").section(null).isActive(true).build();
        Mockito.when(client.getAllStudents(1L)).thenReturn(List.of(none));
        byte[] sheet = billingSheet(true, new String[]{"Ravi", "ADM-R", "Class 10", "A", "100"});
        BulkUploadBillingResult result = service.processBulkUpload("ALL", file(sheet), 1L);

        Assertions.assertFalse(result.isSuccess());
        Assertions.assertTrue(result.getErrors().stream().anyMatch(e -> "Section Mismatch".equals(e.getErrorType())));
    }

    // ---- helpers ----

    private static int indexOfHeader(Row header, String name) {
        for (int i = 0; i < header.getLastCellNum(); i++) {
            Cell c = header.getCell(i);
            if (c != null && name.equalsIgnoreCase(c.getStringCellValue())) return i;
        }
        return -1;
    }

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("file", "billing.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    /**
     * Builds a one-row billing sheet. withSection: [name, adm, class, section, term1];
     * otherwise the pre-Section layout: [name, adm, class, term1].
     */
    private static byte[] billingSheet(boolean withSection, String[] values) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Billing");
            String[] headers = withSection
                    ? new String[]{"S.No", "Student Name", "Adm No", "Class", "Section", "Term Fees - 1", "Term Fees - 2",
                    "Term Fees - 3", "Bus Fees", "Exam Fees", "Paid Amount"}
                    : new String[]{"S.No", "Student Name", "Adm No", "Class", "Term Fees - 1", "Term Fees - 2",
                    "Term Fees - 3", "Bus Fees", "Exam Fees", "Paid Amount"};
            Row h = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) h.createCell(i).setCellValue(headers[i]);

            Row r = sheet.createRow(1);
            r.createCell(0).setCellValue(1);
            for (int i = 0; i < values.length - 1; i++) {
                r.createCell(i + 1).setCellValue(values[i]);
            }
            int term1Col = withSection ? 5 : 4;
            r.createCell(term1Col).setCellValue(Double.parseDouble(values[values.length - 1]));
            wb.write(out);
            return out.toByteArray();
        }
    }
}
