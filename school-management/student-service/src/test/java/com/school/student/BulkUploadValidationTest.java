package com.school.student;

import com.school.student.dto.BulkUploadResult;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import com.school.student.service.ExcelImportService;
import com.school.student.util.AcademicClassOrder;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class BulkUploadValidationTest {

    @Autowired
    private ExcelImportService excelImportService;

    @Autowired
    private StudentRepository studentRepository;

    @Test
    @DisplayName("Requirement 1 & 22: Academic Class Order sorting")
    void testAcademicClassOrdering() {
        List<String> raw = Arrays.asList(
                "Class 12", "Class 10", "UKG", "Class 2", "LKG", "Class 1", "Class 9", "Class 5", "Class 8", "Class 6", "Class 7", "Class 11", "Class 3", "Class 4"
        );

        List<String> sorted = new ArrayList<>(raw);
        sorted.sort(AcademicClassOrder.CLASS_COMPARATOR);

        List<String> expected = Arrays.asList(
                "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
        );

        assertEquals(expected, sorted, "Classes must be sorted in exact ascending academic order");
    }

    @Test
    @DisplayName("Test POI Date and Phone DataValidation creation")
    void testPoiValidationCreation() throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Test");
            DataValidationHelper dvHelper = sheet.getDataValidationHelper();

            // 1. Gender dropdown
            CellRangeAddressList genderRange = new CellRangeAddressList(1, 1000, 6, 6);
            DataValidationConstraint genderConstraint = dvHelper.createExplicitListConstraint(new String[]{"Male", "Female", "Other"});
            DataValidation genderValidation = dvHelper.createValidation(genderConstraint, genderRange);
            sheet.addValidationData(genderValidation);

            // 2. Date constraint
            CellRangeAddressList dateRange = new CellRangeAddressList(1, 1000, 5, 5);
            DataValidationConstraint dateConstraint = dvHelper.createDateConstraint(
                    DataValidationConstraint.OperatorType.BETWEEN,
                    "DATE(1900,1,1)",
                    "DATE(2099,12,31)",
                    "yyyy-MM-dd"
            );
            DataValidation dateValidation = dvHelper.createValidation(dateConstraint, dateRange);
            dateValidation.setShowErrorBox(true);
            dateValidation.setErrorStyle(DataValidation.ErrorStyle.STOP);
            dateValidation.createErrorBox("Invalid Date", "Please enter a valid date in DD-MM-YYYY format.");
            sheet.addValidationData(dateValidation);

            // 3. Phone length constraint
            CellRangeAddressList phoneRange = new CellRangeAddressList(1, 1000, 10, 10);
            DataValidationConstraint phoneConstraint = dvHelper.createTextLengthConstraint(
                    DataValidationConstraint.OperatorType.EQUAL,
                    "10",
                    null
            );
            DataValidation phoneValidation = dvHelper.createValidation(phoneConstraint, phoneRange);
            phoneValidation.setEmptyCellAllowed(true);
            phoneValidation.setShowErrorBox(true);
            phoneValidation.createErrorBox("Invalid Mobile", "Mobile number must be exactly 10 digits.");
            sheet.addValidationData(phoneValidation);

            try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
                wb.write(bos);
                assertTrue(bos.size() > 0, "Workbook with validations should serialize successfully");
            }
        }
    }

    @Test
    @DisplayName("Requirements 1, 4, 5, 9, 10, 12: Clean Excel Template Structure and Roman numeral Class X")
    void testClassSpecificTemplateGeneration() throws Exception {
        byte[] excelBytes = excelImportService.generateTemplate("Class 10", 1L);
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 0);

        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(excelBytes))) {
            Sheet sheet = wb.getSheetAt(0);
            assertNotNull(sheet);

            Row headerRow = sheet.getRow(0);
            assertEquals(16, headerRow.getLastCellNum(), "Template must have exactly 16 columns");
            assertEquals("S.No", headerRow.getCell(0).getStringCellValue());
            assertEquals("Adm No", headerRow.getCell(1).getStringCellValue());
            assertEquals("Name", headerRow.getCell(2).getStringCellValue());
            assertEquals("Class", headerRow.getCell(3).getStringCellValue());
            assertEquals("Section", headerRow.getCell(4).getStringCellValue());
            assertEquals("DOB", headerRow.getCell(5).getStringCellValue());
            assertEquals("Gender", headerRow.getCell(6).getStringCellValue());
            assertEquals("Father Name", headerRow.getCell(7).getStringCellValue());
            assertEquals("Mother Name", headerRow.getCell(8).getStringCellValue());
            assertEquals("Guardian Name", headerRow.getCell(9).getStringCellValue());
            assertEquals("Father Mobile Number", headerRow.getCell(10).getStringCellValue());
            assertEquals("Mother Mobile Number", headerRow.getCell(11).getStringCellValue());
            assertEquals("Guardian Mobile Number", headerRow.getCell(12).getStringCellValue());
            assertEquals("Address", headerRow.getCell(13).getStringCellValue());
            assertEquals("Blood Group", headerRow.getCell(14).getStringCellValue());
            assertEquals("Joining Date", headerRow.getCell(15).getStringCellValue());

            // Check that existing students have Class as "X"
            long dbClass10Count = studentRepository.findAll().stream()
                    .filter(s -> AcademicClassOrder.isClassMatch(s.getClassName(), "Class 10"))
                    .count();

            if (dbClass10Count > 0) {
                Row firstStudentRow = sheet.getRow(1);
                assertNotNull(firstStudentRow);
                assertEquals(1, (int) firstStudentRow.getCell(0).getNumericCellValue());
                assertEquals("Class X", firstStudentRow.getCell(3).getStringCellValue(), "Class 10 students must have Class as Class X");
            }

            // Total data rows = existing students + 50 blank rows
            int totalDataRows = sheet.getLastRowNum();
            assertTrue(totalDataRows >= dbClass10Count + 50,
                    "Total rows should contain at least existing students (" + dbClass10Count + ") plus 50 blank rows");

            // Check blank row has S.No continuing, Class as Class X, and Adm No & Name empty
            int blankRowIdx = (int) dbClass10Count + 1;
            Row blankRow = sheet.getRow(blankRowIdx);
            assertNotNull(blankRow);
            assertEquals(blankRowIdx, (int) blankRow.getCell(0).getNumericCellValue(), "S.No must continue sequence");
            assertEquals("", blankRow.getCell(1).getStringCellValue(), "Blank row Adm No must be empty");
            assertEquals("", blankRow.getCell(2).getStringCellValue(), "Blank row Name must be empty");
            assertEquals("Class X", blankRow.getCell(3).getStringCellValue(), "Blank row Class must be Class X for Class 10");

            // Verify Data Validations exist on sheet
            List<? extends DataValidation> validations = sheet.getDataValidations();
            assertFalse(validations.isEmpty(), "Data validations (Gender, Blood Group, Class, Date, Mobile) must be attached to the sheet");
        }
    }

    @Test
    @DisplayName("Roman numeral class mappings: Class 1->I, Class 3->III, Class 10->X, Class 12->XII")
    void testRomanNumeralMappings() {
        assertEquals("LKG", AcademicClassOrder.toExcelClassName("LKG"));
        assertEquals("UKG", AcademicClassOrder.toExcelClassName("UKG"));
        assertEquals("I", AcademicClassOrder.toExcelClassName("Class 1"));
        assertEquals("II", AcademicClassOrder.toExcelClassName("Class 2"));
        assertEquals("III", AcademicClassOrder.toExcelClassName("Class 3")); // CRITICAL: III not II
        assertEquals("IV", AcademicClassOrder.toExcelClassName("Class 4"));
        assertEquals("V", AcademicClassOrder.toExcelClassName("Class 5"));
        assertEquals("VI", AcademicClassOrder.toExcelClassName("Class 6"));
        assertEquals("VII", AcademicClassOrder.toExcelClassName("Class 7"));
        assertEquals("VIII", AcademicClassOrder.toExcelClassName("Class 8"));
        assertEquals("IX", AcademicClassOrder.toExcelClassName("Class 9"));
        assertEquals("X", AcademicClassOrder.toExcelClassName("Class 10"));
        assertEquals("XI", AcademicClassOrder.toExcelClassName("Class 11"));
        assertEquals("XII", AcademicClassOrder.toExcelClassName("Class 12"));

        assertEquals("Class 1", AcademicClassOrder.toApplicationClassName("I"));
        assertEquals("Class 3", AcademicClassOrder.toApplicationClassName("III"));
        assertEquals("Class 10", AcademicClassOrder.toApplicationClassName("X"));
        assertEquals("Class 12", AcademicClassOrder.toApplicationClassName("XII"));

        assertTrue(AcademicClassOrder.isClassMatch("Class 10", "X"));
        assertTrue(AcademicClassOrder.isClassMatch("Class 3", "III"));
        assertFalse(AcademicClassOrder.isClassMatch("Class 3", "II"));
        assertFalse(AcademicClassOrder.isClassMatch("Class 10", "V"));
    }

    @Test
    @DisplayName("Requirement 7 & 13: Upload unchanged template -> No new students, all exist")
    void testUnchangedTemplateUpload() throws Exception {
        byte[] excelBytes = excelImportService.generateTemplate("Class 10", 1L);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "Class_10_template.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                excelBytes
        );

        BulkUploadResult result = excelImportService.validateBulkUpload(file, "Class 10", 1L);
        assertTrue(result.isSuccess(), "Unchanged file validation should succeed: " + result.getMessage());
        assertTrue(result.isCanCommit(), "Should be safe to commit");
        assertEquals(0, result.getInsertedCount(), "Inserted count must be 0");
        assertEquals(0, result.getUpdatedCount(), "Updated count must be 0");
        assertTrue(result.getUnchangedCount() > 0, "Unchanged count must be > 0");
        assertEquals(0, result.getErrorCount(), "Errors must be 0");
        assertTrue(result.getMessage().contains("No new students found"), "Message must indicate all students already exist");
    }

    @Test
    @DisplayName("Requirement 10 & 11: Class Mismatch Validation inside Class 10")
    void testClassMismatchValidation() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Class 10 Upload");
            Row h = sheet.createRow(0);
            String[] headers = ExcelImportService.CLASS_SPECIFIC_TEMPLATE_HEADERS;
            for (int i = 0; i < headers.length; i++) {
                h.createCell(i).setCellValue(headers[i]);
            }

            // Add student Kumar with Class 5
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);
            r1.createCell(1).setCellValue("ADM-1020"); // Col 1: Adm No
            r1.createCell(2).setCellValue("Kumar");    // Col 2: Name
            r1.createCell(3).setCellValue("Class 5");  // Col 3: Wrong class!
            r1.createCell(4).setCellValue("A");
            r1.createCell(5).setCellValue("15-05-2012");
            r1.createCell(6).setCellValue("Male");
            r1.createCell(7).setCellValue("Suresh");

            wb.write(out);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "test_wrong_class.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );

            BulkUploadResult result = excelImportService.validateBulkUpload(file, "Class 10", 1L);
            assertFalse(result.isSuccess(), "Should fail class validation");
            assertTrue(result.getErrorCount() > 0);
            assertTrue(result.getErrors().stream().anyMatch(e ->
                    e.getErrorMessage().contains("Student Kumar belongs to Class 5. This upload is for Class 10.")
            ), "Should display specific class mismatch message");
        }
    }

    @Test
    @DisplayName("Requirement 12: In-file duplicate admission number detection")
    void testDuplicateAdmissionNumberInFile() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Class 10 Upload");
            Row h = sheet.createRow(0);
            String[] headers = ExcelImportService.CLASS_SPECIFIC_TEMPLATE_HEADERS;
            for (int i = 0; i < headers.length; i++) {
                h.createCell(i).setCellValue(headers[i]);
            }

            // Row 1: ADM-9999 Kumar
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);
            r1.createCell(1).setCellValue("ADM-9999");
            r1.createCell(2).setCellValue("Kumar");
            r1.createCell(3).setCellValue("Class 10");
            r1.createCell(7).setCellValue("Father1");

            // Row 2: ADM-9999 Ravi (duplicate Adm No!)
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue(2);
            r2.createCell(1).setCellValue("ADM-9999");
            r2.createCell(2).setCellValue("Ravi");
            r2.createCell(3).setCellValue("Class 10");
            r2.createCell(7).setCellValue("Father2");

            wb.write(out);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "test_duplicate_adm.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );

            BulkUploadResult result = excelImportService.validateBulkUpload(file, "Class 10", 1L);
            assertFalse(result.isSuccess(), "Should fail on duplicate admission number in file");
            assertTrue(result.getErrors().stream().anyMatch(e ->
                    e.getErrorMessage().contains("Duplicate Admission Number ADM-9999 found in the uploaded Excel.")
            ), "Should report duplicate admission number error");
        }
    }

    @Test
    @DisplayName("Requirement 11 & 12: Add new student with Roman numeral X in Class 10 template")
    void testAddNewStudentWithRomanNumeralX() throws Exception {
        byte[] excelBytes = excelImportService.generateTemplate("Class 10", 1L);

        // Open the template, fill the first blank row with a new student
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(excelBytes));
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.getSheetAt(0);

            long dbClass10Count = studentRepository.findAll().stream()
                    .filter(s -> AcademicClassOrder.isClassMatch(s.getClassName(), "Class 10"))
                    .count();

            int newStudentRowIdx = (int) dbClass10Count + 1;
            Row row = sheet.getRow(newStudentRowIdx);
            assertNotNull(row);

            row.getCell(1).setCellValue("NEW-ADM-9901");
            row.getCell(2).setCellValue("Ananya Sen");
            // Col 3 already has "Class X"
            assertEquals("Class X", row.getCell(3).getStringCellValue());
            row.getCell(4).setCellValue("A");
            row.getCell(5).setCellValue("10-06-2009");
            row.getCell(6).setCellValue("Female");
            row.getCell(7).setCellValue("Amit Sen");
            row.getCell(8).setCellValue("Rina Sen");
            row.getCell(10).setCellValue("9876543210");
            row.getCell(13).setCellValue("123 Lake View, Chennai");
            row.getCell(14).setCellValue("O+");
            row.getCell(15).setCellValue("01-06-2024");

            wb.write(out);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "class_10_with_new_student.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );

            BulkUploadResult result = excelImportService.validateBulkUpload(file, "Class 10", 1L);
            assertTrue(result.isSuccess(), "Validation should succeed for new student with Class X: " + result.getMessage());
            assertEquals(1, result.getInsertedCount(), "Inserted count should be 1");
            assertEquals(0, result.getErrorCount(), "Errors should be 0");
        }
    }

    @Test
    @DisplayName("Requirements 7 & 8: Invalid Date and Invalid Mobile number validation")
    void testInvalidDateAndPhoneValidation() throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Class 10 Upload");
            Row h = sheet.createRow(0);
            String[] headers = ExcelImportService.TEMPLATE_HEADERS;
            for (int i = 0; i < headers.length; i++) {
                h.createCell(i).setCellValue(headers[i]);
            }

            // Student with invalid date "hello" and invalid phone "12345"
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);
            r1.createCell(1).setCellValue("ADM-8888");
            r1.createCell(2).setCellValue("Test Student");
            r1.createCell(3).setCellValue("X");
            r1.createCell(4).setCellValue("A");
            r1.createCell(5).setCellValue("hello"); // Invalid date!
            r1.createCell(6).setCellValue("Male");
            r1.createCell(7).setCellValue("Parent Name");
            r1.createCell(10).setCellValue("12345"); // Invalid phone (5 digits)!

            wb.write(out);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "invalid_fields.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );

            BulkUploadResult result = excelImportService.validateBulkUpload(file, "Class 10", 1L);
            assertFalse(result.isSuccess(), "Should fail on invalid date and mobile number");
            assertTrue(result.getErrorCount() >= 2);
            assertTrue(result.getErrors().stream().anyMatch(e -> e.getErrorMessage().contains("Invalid DOB") || "Invalid DOB".equals(e.getErrorType())), "Should report invalid DOB");
            assertTrue(result.getErrors().stream().anyMatch(e -> e.getErrorMessage().contains("Father Mobile Number") && e.getErrorMessage().contains("invalid")), "Should report invalid mobile");
        }
    }

    @Test
    @DisplayName("Requirement 6: Main Generic Template has Class dropdown with all 14 classes")
    void testGenericTemplateGeneration() throws Exception {
        byte[] excelBytes = excelImportService.generateTemplate(null, 1L);
        assertNotNull(excelBytes);

        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(excelBytes))) {
            Sheet sheet = wb.getSheetAt(0);
            assertNotNull(sheet);

            Row headerRow = sheet.getRow(0);
            assertEquals(16, headerRow.getLastCellNum());
            assertEquals("S.No", headerRow.getCell(0).getStringCellValue());
            assertEquals("Adm No", headerRow.getCell(1).getStringCellValue());

            // 50 blank rows
            assertTrue(sheet.getLastRowNum() >= 50);

            // Row 1 should have S.No = 1, Adm No = ""
            Row r1 = sheet.getRow(1);
            assertEquals(1, (int) r1.getCell(0).getNumericCellValue());
            assertEquals("", r1.getCell(1).getStringCellValue());

            List<? extends DataValidation> validations = sheet.getDataValidations();
            assertFalse(validations.isEmpty());
        }
    }
}
