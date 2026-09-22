package com.school.student.service;

import com.school.student.dto.BulkUploadError;
import com.school.student.dto.BulkUploadResult;
import com.school.student.dto.ImportResult;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Service for importing students from Excel (.xlsx, .xls) files,
 * generating bulk upload templates, and producing error report workbooks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportService {

    private final StudentRepository studentRepository;

    private static final DateTimeFormatter[] DATE_FORMATS = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("yyyy.MM.dd"),
    };

    // =========================================================================
    // 1. TEMPLATE GENERATION
    // =========================================================================

    public byte[] generateTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // --- Sheet 1: Student Import Template ---
            Sheet dataSheet = workbook.createSheet("Student Import Template");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Data row style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Date cell style
            CellStyle dateStyle = workbook.createCellStyle();
            CreationHelper createHelper = workbook.getCreationHelper();
            dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("yyyy-MM-dd"));
            dateStyle.setBorderBottom(BorderStyle.THIN);
            dateStyle.setBorderTop(BorderStyle.THIN);
            dateStyle.setBorderLeft(BorderStyle.THIN);
            dateStyle.setBorderRight(BorderStyle.THIN);

            String[] headers = {
                    "S.No",
                    "Adm No",
                    "Name",
                    "Class",
                    "Section",
                    "DOB",
                    "Gender",
                    "Father Name",
                    "Mother Name",
                    "Mobile",
                    "Address",
                    "Blood Group"
            };

            Row headerRow = dataSheet.createRow(0);
            headerRow.setHeightInPoints(26);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // No sample rows as per requirement


            // Freeze header row
            dataSheet.createFreezePane(0, 1);

            // Auto filter
            dataSheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));

            // Auto-size columns with min width
            for (int i = 0; i < headers.length; i++) {
                dataSheet.autoSizeColumn(i);
                int currentWidth = dataSheet.getColumnWidth(i);
                dataSheet.setColumnWidth(i, Math.max(currentWidth + 1000, 3500));
            }

            // --- Sheet 2: Instructions ---
            Sheet instSheet = workbook.createSheet("Instructions");

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);

            Row titleRow = instSheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Instructions for Bulk Student Upload (Template Version 1.0)");
            titleCell.setCellStyle(titleStyle);

            String[] instructions = {
                    "1. Fill one student record per row starting from row 2 in the 'Student Import Template' sheet.",
                    "2. Do not delete, reorder, or rename the column headers in the template.",
                    "3. Admission Number (Adm No) is a unique identifier. Every student in the file and database must have a unique Adm No.",
                    "4. Duplicate Student Rule: The system will detect and reject duplicate students whose Name + Father Name + Address + DOB match another row or existing record.",
                    "5. Required Fields: 'Adm No', 'Name', and 'Class' are mandatory for every student.",
                    "6. Accepted Date of Birth formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or native Excel date.",
                    "7. Mobile Number should contain a valid contact number (7 to 15 digits).",
                    "8. Supported File Types: .xlsx or .xls.",
                    "9. ATOMIC IMPORT: If any row has a validation error or duplicate, ZERO students will be added. An error report will be provided.",
                    "10. After reviewing and correcting issues in the error report, upload the fixed file again."
            };

            CellStyle instStyle = workbook.createCellStyle();
            Font instFont = workbook.createFont();
            instFont.setFontHeightInPoints((short) 11);
            instStyle.setFont(instFont);

            for (int i = 0; i < instructions.length; i++) {
                Row row = instSheet.createRow(i + 2);
                Cell cell = row.createCell(0);
                cell.setCellValue(instructions[i]);
                cell.setCellStyle(instStyle);
            }

            instSheet.setColumnWidth(0, 256 * 120); // Set fixed width to prevent autoSizeColumn from exceeding max width on long instruction strings

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // =========================================================================
    // 2. BULK UPLOAD WITH ATOMIC VALIDATION & TRANSACTION
    // =========================================================================

    @Transactional(rollbackFor = Exception.class)
    public BulkUploadResult processBulkUpload(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return BulkUploadResult.builder()
                    .success(false)
                    .message("Uploaded file is empty.")
                    .errorCount(1)
                    .errors(List.of(BulkUploadError.builder()
                            .row(0)
                            .errorType("Empty File")
                            .errorMessage("The uploaded Excel file is empty.")
                            .build()))
                    .build();
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.toLowerCase().endsWith(".xlsx") && !filename.toLowerCase().endsWith(".xls"))) {
            return BulkUploadResult.builder()
                    .success(false)
                    .message("Invalid file type. Only .xlsx and .xls files are supported.")
                    .errorCount(1)
                    .errors(List.of(BulkUploadError.builder()
                            .row(0)
                            .errorType("Invalid File Format")
                            .errorMessage("Only .xlsx and .xls Excel files are accepted.")
                            .build()))
                    .build();
        }

        List<BulkUploadError> errors = new ArrayList<>();
        List<ParsedStudentRow> parsedRows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheet("Student Import Template");
            if (sheet == null) {
                sheet = workbook.getSheetAt(0);
            }

            if (sheet == null || sheet.getLastRowNum() < 1) {
                errors.add(BulkUploadError.builder()
                        .row(0)
                        .errorType("Empty Sheet")
                        .errorMessage("The worksheet contains no data rows.")
                        .build());
                return buildFailureResult(errors, Collections.emptyList());
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                errors.add(BulkUploadError.builder()
                        .row(0)
                        .errorType("Missing Header")
                        .errorMessage("The worksheet is missing a header row.")
                        .build());
                return buildFailureResult(errors, Collections.emptyList());
            }

            Map<String, Integer> colMap = buildColumnMap(headerRow);

            // Verify required header columns
            if (!hasColumn(colMap, "adm no", "admission no", "admission number", "admissionno", "register number", "reg no")) {
                errors.add(BulkUploadError.builder()
                        .row(1)
                        .errorType("Missing Column")
                        .errorMessage("The uploaded Excel file is missing the required column: 'Adm No'.")
                        .errorFields("Adm No")
                        .build());
            }
            if (!hasColumn(colMap, "name", "student name", "studentname")) {
                errors.add(BulkUploadError.builder()
                        .row(1)
                        .errorType("Missing Column")
                        .errorMessage("The uploaded Excel file is missing the required column: 'Name'.")
                        .errorFields("Name")
                        .build());
            }
            if (!hasColumn(colMap, "class", "classname", "class name")) {
                errors.add(BulkUploadError.builder()
                        .row(1)
                        .errorType("Missing Column")
                        .errorMessage("The uploaded Excel file is missing the required column: 'Class'.")
                        .errorFields("Class")
                        .build());
            }

            if (!errors.isEmpty()) {
                return buildFailureResult(errors, Collections.emptyList());
            }

            // In-file duplicate tracking
            Map<String, Integer> seenAdmissionNumbers = new HashMap<>(); // normalizedAdmNo -> rowNum
            Map<String, Integer> seenStudentFingerprints = new HashMap<>(); // fingerprint -> rowNum

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;

                int excelRow = r + 1; // 1-based display row number

                String sNo = getCellString(row, colMap, "s.no", "sno", "serial no", "sl no");
                String rawAdmNo = getCellString(row, colMap, "adm no", "admission no", "admission number", "admissionno", "register number", "reg no");
                String rawName = getCellString(row, colMap, "name", "student name", "studentname");
                String rawClass = getCellString(row, colMap, "class", "classname", "class name");
                String section = getCellString(row, colMap, "section");
                String gender = getCellString(row, colMap, "gender");
                String fatherName = getCellString(row, colMap, "father name", "fathername", "father");
                String motherName = getCellString(row, colMap, "mother name", "mothername", "mother");
                String mobile = getCellString(row, colMap, "mobile", "mobile number", "contact number", "contact", "phone", "father mobile number");
                String address = getCellString(row, colMap, "address", "residential address");
                String bloodGroup = getCellString(row, colMap, "blood group", "bloodgroup", "blood");

                // Parse Date of Birth
                LocalDate dob = null;
                String dobRaw = getCellString(row, colMap, "dob", "date of birth", "dateofbirth", "birth date");
                if (dobRaw != null && !dobRaw.isBlank()) {
                    dob = parseDobValue(row, colMap, excelRow, dobRaw, errors, rawName, rawAdmNo);
                }

                // Normalization
                String normAdmNo = normalize(rawAdmNo);
                String normName = normalize(rawName);
                String normClass = normalize(rawClass);
                String normFather = normalize(fatherName);
                String normAddress = normalize(address);
                String normDob = dob != null ? dob.toString() : (dobRaw != null ? normalize(dobRaw) : "");

                ParsedStudentRow studentRow = new ParsedStudentRow(
                        excelRow, sNo, rawAdmNo, normAdmNo, rawName, normName,
                        rawClass, normClass, section, dob, normDob, gender,
                        fatherName, normFather, motherName, mobile, address, normAddress, bloodGroup
                );
                parsedRows.add(studentRow);

                // --- 1. Required Field Validations ---
                if (normAdmNo.isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Required Field")
                            .errorMessage("Row " + excelRow + ": Admission Number is required.")
                            .errorFields("Adm No")
                            .build());
                }

                if (normName.isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Required Field")
                            .errorMessage("Row " + excelRow + ": Student Name is required.")
                            .errorFields("Name")
                            .build());
                }

                if (normClass.isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Required Field")
                            .errorMessage("Row " + excelRow + ": Class is required.")
                            .errorFields("Class")
                            .build());
                }

                // Mobile validation (if present)
                if (mobile != null && !mobile.isBlank()) {
                    String cleanMobile = mobile.replaceAll("[\\s\\-+()]", "");
                    if (!cleanMobile.matches("\\d{7,15}")) {
                        errors.add(BulkUploadError.builder()
                                .row(excelRow)
                                .studentName(rawName)
                                .admissionNumber(rawAdmNo)
                                .errorType("Invalid Mobile Number")
                                .errorMessage("Row " + excelRow + ": Mobile number '" + mobile + "' is invalid (must be 7 to 15 digits).")
                                .errorFields("Mobile")
                                .build());
                    }
                }

                // --- 2. In-File Duplicate Admission Number Validation ---
                if (!normAdmNo.isEmpty()) {
                    String admKey = normAdmNo.toUpperCase();
                    if (seenAdmissionNumbers.containsKey(admKey)) {
                        int prevRow = seenAdmissionNumbers.get(admKey);
                        errors.add(BulkUploadError.builder()
                                .row(excelRow)
                                .studentName(rawName)
                                .admissionNumber(rawAdmNo)
                                .errorType("Duplicate Admission No")
                                .errorMessage("Row " + excelRow + " has Admission Number \"" + rawAdmNo + "\", which is already used in Row " + prevRow + " of this uploaded file.")
                                .duplicateWithRow(prevRow)
                                .errorFields("Adm No")
                                .build());
                    } else {
                        seenAdmissionNumbers.put(admKey, excelRow);
                    }
                }

                // --- 3. In-File Duplicate Student Detection (Name + Parent Name + Address + DOB) ---
                if (!normName.isEmpty() && (!normFather.isEmpty() || !normAddress.isEmpty() || !normDob.isEmpty())) {
                    String fingerprint = normName.toUpperCase() + "|"
                            + normFather.toUpperCase() + "|"
                            + normAddress.toUpperCase() + "|"
                            + normDob.toUpperCase();

                    if (seenStudentFingerprints.containsKey(fingerprint)) {
                        int prevRow = seenStudentFingerprints.get(fingerprint);
                        errors.add(BulkUploadError.builder()
                                .row(excelRow)
                                .studentName(rawName)
                                .admissionNumber(rawAdmNo)
                                .errorType("Duplicate Student")
                                .errorMessage("Row " + excelRow + " appears to be a duplicate of Row " + prevRow + ". Matching fields: Name, Father/Parent Name, Address, DOB.")
                                .duplicateWithRow(prevRow)
                                .errorFields("Name, Father Name, Address, DOB")
                                .build());
                    } else {
                        seenStudentFingerprints.put(fingerprint, excelRow);
                    }
                }
            }

            if (parsedRows.isEmpty()) {
                errors.add(BulkUploadError.builder()
                        .row(0)
                        .errorType("Empty File")
                        .errorMessage("No valid student rows found in the uploaded file.")
                        .build());
                return buildFailureResult(errors, Collections.emptyList());
            }

            // --- 4. Database Duplicate Validations ---
            // Collect all unique non-empty admission numbers
            Set<String> allAdmNos = new HashSet<>();
            for (ParsedStudentRow pr : parsedRows) {
                if (pr.rawAdmNo != null && !pr.rawAdmNo.isBlank()) {
                    allAdmNos.add(pr.rawAdmNo.trim());
                }
            }

            if (!allAdmNos.isEmpty()) {
                List<Student> dbMatches = studentRepository.findByAdmissionNumberIn(allAdmNos);
                Set<String> dbAdmSet = new HashSet<>();
                for (Student s : dbMatches) {
                    if (s.getAdmissionNumber() != null) {
                        dbAdmSet.add(s.getAdmissionNumber().trim().toUpperCase());
                    }
                }

                for (ParsedStudentRow pr : parsedRows) {
                    if (pr.rawAdmNo != null && dbAdmSet.contains(pr.rawAdmNo.trim().toUpperCase())) {
                        errors.add(BulkUploadError.builder()
                                .row(pr.excelRow)
                                .studentName(pr.rawName)
                                .admissionNumber(pr.rawAdmNo)
                                .errorType("Database Duplicate")
                                .errorMessage("Admission Number \"" + pr.rawAdmNo + "\" already exists in the system.")
                                .errorFields("Adm No")
                                .build());
                    }
                }
            }

            // Also check candidate duplicate students against existing DB students
            List<Student> allDbStudents = studentRepository.findAll();
            Map<String, Student> dbFingerprintMap = new HashMap<>();
            for (Student s : allDbStudents) {
                String dbName = normalize(s.getName()).toUpperCase();
                String dbFather = normalize(s.getFatherName()).toUpperCase();
                String dbAddress = normalize(s.getAddress()).toUpperCase();
                String dbDob = s.getDateOfBirth() != null ? s.getDateOfBirth().toString().toUpperCase() : "";

                if (!dbName.isEmpty() && (!dbFather.isEmpty() || !dbAddress.isEmpty() || !dbDob.isEmpty())) {
                    String fp = dbName + "|" + dbFather + "|" + dbAddress + "|" + dbDob;
                    dbFingerprintMap.put(fp, s);
                }
            }

            for (ParsedStudentRow pr : parsedRows) {
                if (!pr.normName.isEmpty() && (!pr.normFather.isEmpty() || !pr.normAddress.isEmpty() || !pr.normDob.isEmpty())) {
                    String fp = pr.normName.toUpperCase() + "|"
                            + pr.normFather.toUpperCase() + "|"
                            + pr.normAddress.toUpperCase() + "|"
                            + pr.normDob.toUpperCase();

                    if (dbFingerprintMap.containsKey(fp)) {
                        Student matched = dbFingerprintMap.get(fp);
                        errors.add(BulkUploadError.builder()
                                .row(pr.excelRow)
                                .studentName(pr.rawName)
                                .admissionNumber(pr.rawAdmNo)
                                .errorType("Database Duplicate Student")
                                .errorMessage("Student details match an existing student in the database (Adm No: " + matched.getAdmissionNumber() + ") based on Name, Parent Name, Address, and DOB.")
                                .errorFields("Name, Father Name, Address, DOB")
                                .build());
                    }
                }
            }

            // --- 5. ATOMIC DECISION ---
            if (!errors.isEmpty()) {
                // ANY error found: Rollback / Insert NOTHING, return error Excel
                return buildFailureResult(errors, parsedRows);
            }

            // NO errors: Transactional Insert of ALL rows
            List<Student> studentsToSave = new ArrayList<>();
            for (ParsedStudentRow pr : parsedRows) {
                Student s = Student.builder()
                        .admissionNumber(pr.rawAdmNo.trim())
                        .name(pr.rawName.trim())
                        .className(pr.rawClass.trim())
                        .section(pr.section != null ? pr.section.trim() : null)
                        .dateOfBirth(pr.dob)
                        .gender(pr.gender != null ? pr.gender.trim() : null)
                        .fatherName(pr.fatherName != null ? pr.fatherName.trim() : null)
                        .motherName(pr.motherName != null ? pr.motherName.trim() : null)
                        .contactNumber(pr.mobile != null ? pr.mobile.trim() : null)
                        .address(pr.address != null ? pr.address.trim() : null)
                        .bloodGroup(pr.bloodGroup != null ? pr.bloodGroup.trim() : null)
                        .build();
                studentsToSave.add(s);
            }

            studentRepository.saveAll(studentsToSave);
            log.info("Bulk student upload successful: {} students inserted.", studentsToSave.size());

            return BulkUploadResult.builder()
                    .success(true)
                    .totalRows(parsedRows.size())
                    .insertedCount(studentsToSave.size())
                    .errorCount(0)
                    .message(studentsToSave.size() + " students were added successfully.")
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse uploaded Excel file: {}", e.getMessage(), e);
            errors.add(BulkUploadError.builder()
                    .row(0)
                    .errorType("Processing Error")
                    .errorMessage("Failed to process Excel file: " + e.getMessage())
                    .build());
            return buildFailureResult(errors, parsedRows);
        }
    }

    // =========================================================================
    // 3. ERROR WORKBOOK GENERATION
    // =========================================================================

    public byte[] generateErrorReport(List<BulkUploadError> errors, List<ParsedStudentRow> rows) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // --- Sheet 1: Upload Errors ---
            Sheet errorSheet = workbook.createSheet("Upload Errors");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_RED.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Row styles
            CellStyle cellStyle = workbook.createCellStyle();
            cellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            cellStyle.setBorderBottom(BorderStyle.THIN);
            cellStyle.setBorderTop(BorderStyle.THIN);
            cellStyle.setBorderLeft(BorderStyle.THIN);
            cellStyle.setBorderRight(BorderStyle.THIN);

            CellStyle wrapStyle = workbook.createCellStyle();
            wrapStyle.cloneStyleFrom(cellStyle);
            wrapStyle.setWrapText(true);

            String[] headers = {
                    "Excel Row",
                    "Student Name",
                    "Admission No",
                    "Error Type",
                    "Error Message",
                    "Duplicate With Row",
                    "Error Fields"
            };

            Row headerRow = errorSheet.createRow(0);
            headerRow.setHeightInPoints(26);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Fill rows
            int rNum = 1;
            for (BulkUploadError err : errors) {
                Row row = errorSheet.createRow(rNum++);
                row.setHeightInPoints(24);

                Cell c0 = row.createCell(0);
                c0.setCellValue(err.getRow() > 0 ? String.valueOf(err.getRow()) : "General");
                c0.setCellStyle(cellStyle);

                Cell c1 = row.createCell(1);
                c1.setCellValue(err.getStudentName() != null ? err.getStudentName() : "—");
                c1.setCellStyle(cellStyle);

                Cell c2 = row.createCell(2);
                c2.setCellValue(err.getAdmissionNumber() != null ? err.getAdmissionNumber() : "—");
                c2.setCellStyle(cellStyle);

                Cell c3 = row.createCell(3);
                c3.setCellValue(err.getErrorType() != null ? err.getErrorType() : "Error");
                c3.setCellStyle(cellStyle);

                Cell c4 = row.createCell(4);
                c4.setCellValue(err.getErrorMessage() != null ? err.getErrorMessage() : "");
                c4.setCellStyle(wrapStyle);

                Cell c5 = row.createCell(5);
                c5.setCellValue(err.getDuplicateWithRow() != null ? "Row " + err.getDuplicateWithRow() : "—");
                c5.setCellStyle(cellStyle);

                Cell c6 = row.createCell(6);
                c6.setCellValue(err.getErrorFields() != null ? err.getErrorFields() : "—");
                c6.setCellStyle(cellStyle);
            }

            // Freeze header and enable filter
            errorSheet.createFreezePane(0, 1);
            errorSheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                errorSheet.autoSizeColumn(i);
                int cur = errorSheet.getColumnWidth(i);
                errorSheet.setColumnWidth(i, Math.max(cur + 1200, 4000));
            }
            errorSheet.setColumnWidth(4, 15000); // Give Error Message generous width

            // --- Sheet 2: Instructions ---
            Sheet instSheet = workbook.createSheet("Instructions");

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 13);
            titleStyle.setFont(titleFont);

            Row instTitle = instSheet.createRow(0);
            Cell tCell = instTitle.createCell(0);
            tCell.setCellValue("How to Resolve Bulk Student Upload Errors");
            tCell.setCellStyle(titleStyle);

            String[] notes = {
                    "IMPORTANT: Because errors were detected, NO STUDENTS WERE IMPORTED (atomic transaction).",
                    "",
                    "1. Review the 'Upload Errors' sheet to see the specific row numbers and descriptions of each issue.",
                    "2. 'Duplicate Admission No': Change the admission number so that each student has a unique identifier.",
                    "3. 'Duplicate Student': Review records where Name, Father Name, Address, and DOB match another student.",
                    "4. 'Database Duplicate': The student's admission number is already assigned to an enrolled student in the database.",
                    "5. 'Missing Required Field': Ensure 'Adm No', 'Name', and 'Class' are populated.",
                    "6. 'Invalid Date of Birth': Verify dates use YYYY-MM-DD or DD/MM/YYYY.",
                    "",
                    "After correcting the data in your Excel file, save it and submit it again via 'Bulk Upload Students'."
            };

            CellStyle noteStyle = workbook.createCellStyle();
            Font noteFont = workbook.createFont();
            noteFont.setFontHeightInPoints((short) 11);
            noteStyle.setFont(noteFont);

            for (int i = 0; i < notes.length; i++) {
                Row row = instSheet.createRow(i + 2);
                Cell cell = row.createCell(0);
                cell.setCellValue(notes[i]);
                cell.setCellStyle(noteStyle);
            }

            instSheet.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private BulkUploadResult buildFailureResult(List<BulkUploadError> errors, List<ParsedStudentRow> parsedRows) {
        List<BulkUploadError> sortedErrors = new ArrayList<>(errors);
        sortedErrors.sort(ERROR_COMPARATOR);

        String base64Excel = "";
        try {
            byte[] errorBytes = generateErrorReport(sortedErrors, parsedRows);
            base64Excel = Base64.getEncoder().encodeToString(errorBytes);
        } catch (Exception e) {
            log.warn("Failed to generate error Excel report: {}", e.getMessage());
        }

        return BulkUploadResult.builder()
                .success(false)
                .totalRows(parsedRows.size())
                .insertedCount(0)
                .errorCount(sortedErrors.size())
                .errors(sortedErrors)
                .errorExcelBase64(base64Excel)
                .message(sortedErrors.size() + " error(s) found. No students were added.")
                .build();
    }

    public static final Comparator<BulkUploadError> ERROR_COMPARATOR = (e1, e2) -> {
        String a1 = e1.getAdmissionNumber();
        String a2 = e2.getAdmissionNumber();

        int admComp = compareNatural(a1, a2);
        if (admComp != 0) {
            return admComp;
        }
        return Integer.compare(e1.getRow(), e2.getRow());
    };

    public static int compareNatural(String s1, String s2) {
        if (s1 == null && s2 == null) return 0;
        if (s1 == null || s1.isBlank()) return 1;
        if (s2 == null || s2.isBlank()) return -1;

        s1 = s1.trim();
        s2 = s2.trim();

        // Check if both are pure numbers
        try {
            long l1 = Long.parseLong(s1);
            long l2 = Long.parseLong(s2);
            return Long.compare(l1, l2);
        } catch (NumberFormatException ignored) {}

        // Natural sort by splitting into text and numeric segments
        int i1 = 0, i2 = 0;
        int len1 = s1.length(), len2 = s2.length();

        while (i1 < len1 && i2 < len2) {
            char c1 = s1.charAt(i1);
            char c2 = s2.charAt(i2);

            if (Character.isDigit(c1) && Character.isDigit(c2)) {
                int start1 = i1;
                while (i1 < len1 && Character.isDigit(s1.charAt(i1))) i1++;
                String numStr1 = s1.substring(start1, i1);

                int start2 = i2;
                while (i2 < len2 && Character.isDigit(s2.charAt(i2))) i2++;
                String numStr2 = s2.substring(start2, i2);

                try {
                    long n1 = Long.parseLong(numStr1);
                    long n2 = Long.parseLong(numStr2);
                    int numDiff = Long.compare(n1, n2);
                    if (numDiff != 0) return numDiff;
                } catch (NumberFormatException e) {
                    int strDiff = numStr1.compareTo(numStr2);
                    if (strDiff != 0) return strDiff;
                }
            } else {
                int charDiff = Character.compare(Character.toLowerCase(c1), Character.toLowerCase(c2));
                if (charDiff != 0) return charDiff;
                i1++;
                i2++;
            }
        }

        return Integer.compare(len1, len2);
    }

    // =========================================================================
    // 4. EXISTING IMPORT METHOD (Kept for backwards compatibility)
    // =========================================================================

    public ImportResult importStudents(MultipartFile file) throws IOException {
        BulkUploadResult bulkResult = processBulkUpload(file);
        ImportResult legacy = ImportResult.builder().build();
        legacy.setTotal(bulkResult.getTotalRows());
        legacy.setImported(bulkResult.getInsertedCount());
        legacy.setFailed(bulkResult.getErrorCount());
        for (BulkUploadError e : bulkResult.getErrors()) {
            legacy.getErrors().add(ImportResult.RowError.builder()
                    .row(e.getRow())
                    .field(e.getErrorFields())
                    .reason(e.getErrorMessage())
                    .build());
        }
        return legacy;
    }

    // =========================================================================
    // 5. HELPER METHODS
    // =========================================================================

    private String normalize(String str) {
        if (str == null) return "";
        return str.trim().replaceAll("\\s+", " ");
    }

    private Map<String, Integer> buildColumnMap(Row header) {
        Map<String, Integer> map = new HashMap<>();
        for (int c = 0; c < header.getLastCellNum(); c++) {
            Cell cell = header.getCell(c);
            if (cell != null) {
                String key = cell.toString().trim().toLowerCase().replaceAll("[._\\-\\s]+", " ");
                map.put(key, c);
            }
        }
        return map;
    }

    private boolean hasColumn(Map<String, Integer> colMap, String... possibleKeys) {
        for (String key : possibleKeys) {
            String norm = key.toLowerCase().replaceAll("[._\\-\\s]+", " ");
            if (colMap.containsKey(norm)) return true;
        }
        return false;
    }

    private String getCellString(Row row, Map<String, Integer> colMap, String... possibleKeys) {
        for (String key : possibleKeys) {
            String normKey = key.toLowerCase().replaceAll("[._\\-\\s]+", " ");
            Integer idx = colMap.get(normKey);
            if (idx != null) {
                Cell cell = row.getCell(idx);
                if (cell != null) {
                    if (cell.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) {
                        double num = cell.getNumericCellValue();
                        if (num == (long) num) {
                            return String.valueOf((long) num);
                        } else {
                            return String.valueOf(num);
                        }
                    }
                    String val = cell.toString().trim();
                    if (!val.isBlank()) return val;
                }
            }
        }
        return null;
    }

    private LocalDate parseDobValue(Row row, Map<String, Integer> colMap, int rowNum, String raw,
                                    List<BulkUploadError> errors, String studentName, String admNo) {
        // Handle numeric date cell from Excel
        for (String key : new String[]{"dob", "date of birth", "dateofbirth", "birth date"}) {
            String norm = key.toLowerCase().replaceAll("[._\\-\\s]+", " ");
            Integer idx = colMap.get(norm);
            if (idx != null) {
                Cell cell = row.getCell(idx);
                if (cell != null && cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                    try {
                        return cell.getLocalDateTimeCellValue().toLocalDate();
                    } catch (Exception ignored) {}
                }
            }
        }

        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return LocalDate.parse(raw.trim(), fmt);
            } catch (DateTimeParseException ignored) {}
        }

        errors.add(BulkUploadError.builder()
                .row(rowNum)
                .studentName(studentName)
                .admissionNumber(admNo)
                .errorType("Invalid Date of Birth")
                .errorMessage("Row " + rowNum + ": DOB \"" + raw + "\" is not a valid date. Accepted formats: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY.")
                .errorFields("DOB")
                .build());
        return null;
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !cell.toString().isBlank()) {
                return false;
            }
        }
        return true;
    }

    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class ParsedStudentRow {
        public int excelRow;
        public String sNo;
        public String rawAdmNo;
        public String normAdmNo;
        public String rawName;
        public String normName;
        public String rawClass;
        public String normClass;
        public String section;
        public LocalDate dob;
        public String normDob;
        public String gender;
        public String fatherName;
        public String normFather;
        public String motherName;
        public String mobile;
        public String address;
        public String normAddress;
        public String bloodGroup;
    }
}
