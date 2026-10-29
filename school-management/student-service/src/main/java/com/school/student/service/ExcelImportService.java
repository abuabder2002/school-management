package com.school.student.service;

import com.school.student.dto.BulkUploadError;
import com.school.student.dto.BulkUploadResult;
import com.school.student.dto.BulkUploadRowDetail;
import com.school.student.dto.ImportResult;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import com.school.student.util.AcademicClassOrder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportService {

    private final StudentRepository studentRepository;

    // Exact 16 headers for Clean Excel Template
    public static final String[] TEMPLATE_HEADERS = {
            "S.No",
            "Adm No",
            "Name",
            "Class",
            "Section",
            "DOB",
            "Gender",
            "Father Name",
            "Mother Name",
            "Guardian Name",
            "Father Mobile Number",
            "Mother Mobile Number",
            "Guardian Mobile Number",
            "Address",
            "Blood Group",
            "Joining Date"
    };

    public static final String[] CLASS_SPECIFIC_TEMPLATE_HEADERS = TEMPLATE_HEADERS;
    public static final String[] MAIN_TEMPLATE_HEADERS = TEMPLATE_HEADERS;


    private static final DateTimeFormatter STRICT_DD_MM_YYYY = new DateTimeFormatterBuilder()
            .appendPattern("dd-MM-uuuu")
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter STRICT_DD_SLASH_MM_YYYY = new DateTimeFormatterBuilder()
            .appendPattern("dd/MM/uuuu")
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter STRICT_YYYY_MM_DD = new DateTimeFormatterBuilder()
            .appendPattern("uuuu-MM-dd")
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter STRICT_YYYY_SLASH_MM_DD = new DateTimeFormatterBuilder()
            .appendPattern("uuuu/MM/dd")
            .toFormatter(Locale.ENGLISH)
            .withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter[] STRICT_FORMATTERS = {
            STRICT_DD_MM_YYYY,
            STRICT_DD_SLASH_MM_YYYY,
            STRICT_YYYY_MM_DD,
            STRICT_YYYY_SLASH_MM_DD
    };

    // =========================================================================
    // 1. TEMPLATE GENERATION
    // =========================================================================

    public byte[] generateTemplate(Long schoolId) throws IOException {
        return generateTemplate(null, schoolId);
    }

    public byte[] generateTemplate(String className, Long schoolId) throws IOException {
        boolean isClassSpecific = className != null && !className.isBlank()
                && !"ALL".equalsIgnoreCase(className.trim())
                && !"ALL CLASSES".equalsIgnoreCase(className.trim());

        String targetAppClass = isClassSpecific ? AcademicClassOrder.toApplicationClassName(className) : null;
        String targetDisplayClass = isClassSpecific ? AcademicClassOrder.toDisplayClassName(className) : null;

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            String sheetName = isClassSpecific
                    ? (targetDisplayClass + " Students")
                    : "Student Import Template";
            Sheet sheet = workbook.createSheet(sheetName);

            // Styling setup
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 10);
            headerFont.setFontName("Calibri");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            Font bodyFont = workbook.createFont();
            bodyFont.setFontHeightInPoints((short) 10);
            bodyFont.setFontName("Calibri");

            DataFormat dataFormat = workbook.createDataFormat();

            // Text style (@ format to prevent scientific notation)
            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setFont(bodyFont);
            textStyle.setDataFormat(dataFormat.getFormat("@"));
            textStyle.setBorderBottom(BorderStyle.THIN);
            textStyle.setBorderTop(BorderStyle.THIN);
            textStyle.setBorderLeft(BorderStyle.THIN);
            textStyle.setBorderRight(BorderStyle.THIN);
            textStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Center text style (@ format)
            CellStyle centerTextStyle = workbook.createCellStyle();
            centerTextStyle.setFont(bodyFont);
            centerTextStyle.setDataFormat(dataFormat.getFormat("@"));
            centerTextStyle.setAlignment(HorizontalAlignment.CENTER);
            centerTextStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            centerTextStyle.setBorderBottom(BorderStyle.THIN);
            centerTextStyle.setBorderTop(BorderStyle.THIN);
            centerTextStyle.setBorderLeft(BorderStyle.THIN);
            centerTextStyle.setBorderRight(BorderStyle.THIN);

            // Date cell style
            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setFont(bodyFont);
            dateStyle.setDataFormat(dataFormat.getFormat("dd-MM-yyyy"));
            dateStyle.setAlignment(HorizontalAlignment.CENTER);
            dateStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dateStyle.setBorderBottom(BorderStyle.THIN);
            dateStyle.setBorderTop(BorderStyle.THIN);
            dateStyle.setBorderLeft(BorderStyle.THIN);
            dateStyle.setBorderRight(BorderStyle.THIN);

            String[] headers = TEMPLATE_HEADERS;

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(26);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            int serialNo = 1;

            if (isClassSpecific) {
                // Fetch existing students of this specific class
                List<Student> classStudents = studentRepository.findBySchoolId(schoolId).stream()
                        .filter(s -> AcademicClassOrder.isClassMatch(s.getClassName(), targetAppClass))
                        .sorted((s1, s2) -> {
                            String sec1 = s1.getSection() != null ? s1.getSection() : "";
                            String sec2 = s2.getSection() != null ? s2.getSection() : "";
                            int secComp = sec1.compareToIgnoreCase(sec2);
                            if (secComp != 0) return secComp;
                            return AcademicClassOrder.compareNatural(s1.getAdmissionNumber(), s2.getAdmissionNumber());
                        })
                        .toList();

                // Populate existing students
                for (Student s : classStudents) {
                    Row r = sheet.createRow(rowIndex++);
                    r.setHeightInPoints(20);

                    // Col 0: S.No
                    Cell c0 = r.createCell(0);
                    c0.setCellValue(serialNo++);
                    c0.setCellStyle(centerTextStyle);

                    // Col 1: Adm No
                    Cell c1 = r.createCell(1);
                    c1.setCellValue(s.getAdmissionNumber() != null ? s.getAdmissionNumber().trim() : "");
                    c1.setCellStyle(centerTextStyle);

                    // Col 2: Name
                    Cell c2 = r.createCell(2);
                    c2.setCellValue(s.getName() != null ? s.getName().trim() : "");
                    c2.setCellStyle(textStyle);

                    // Col 3: Class (Display format: e.g. "Class X", "Class V", "Class III", "LKG")
                    Cell c3 = r.createCell(3);
                    c3.setCellValue(targetDisplayClass);
                    c3.setCellStyle(centerTextStyle);

                    // Col 4: Section
                    Cell c4 = r.createCell(4);
                    c4.setCellValue(s.getSection() != null ? s.getSection().trim() : "");
                    c4.setCellStyle(centerTextStyle);

                    // Col 5: DOB
                    Cell c5 = r.createCell(5);
                    if (s.getDateOfBirth() != null) {
                        c5.setCellValue(s.getDateOfBirth().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
                        c5.setCellStyle(centerTextStyle);
                    } else {
                        c5.setCellValue("");
                        c5.setCellStyle(centerTextStyle);
                    }

                    // Col 6: Gender
                    Cell c6 = r.createCell(6);
                    c6.setCellValue(s.getGender() != null ? s.getGender().trim() : "");
                    c6.setCellStyle(centerTextStyle);

                    // Col 7: Father Name
                    Cell c7 = r.createCell(7);
                    c7.setCellValue(s.getFatherName() != null ? s.getFatherName().trim() : "");
                    c7.setCellStyle(textStyle);

                    // Col 8: Mother Name
                    Cell c8 = r.createCell(8);
                    c8.setCellValue(s.getMotherName() != null ? s.getMotherName().trim() : "");
                    c8.setCellStyle(textStyle);

                    // Col 9: Guardian Name
                    Cell c9 = r.createCell(9);
                    c9.setCellValue(s.getGuardianName() != null ? s.getGuardianName().trim() : "");
                    c9.setCellStyle(textStyle);

                    // Col 10: Father Mobile Number
                    Cell c10 = r.createCell(10);
                    String fm = s.getFatherMobileNumber();
                    if ((fm == null || fm.isBlank()) && s.getContactNumber() != null) fm = s.getContactNumber();
                    c10.setCellValue(fm != null ? fm.trim() : "");
                    c10.setCellStyle(centerTextStyle);

                    // Col 11: Mother Mobile Number
                    Cell c11 = r.createCell(11);
                    c11.setCellValue(s.getMotherMobileNumber() != null ? s.getMotherMobileNumber().trim() : "");
                    c11.setCellStyle(centerTextStyle);

                    // Col 12: Guardian Mobile Number
                    Cell c12 = r.createCell(12);
                    c12.setCellValue(s.getGuardianMobileNumber() != null ? s.getGuardianMobileNumber().trim() : "");
                    c12.setCellStyle(centerTextStyle);

                    // Col 13: Address
                    Cell c13 = r.createCell(13);
                    c13.setCellValue(s.getAddress() != null ? s.getAddress().trim() : "");
                    c13.setCellStyle(textStyle);

                    // Col 14: Blood Group
                    Cell c14 = r.createCell(14);
                    c14.setCellValue(s.getBloodGroup() != null ? s.getBloodGroup().trim() : "");
                    c14.setCellStyle(centerTextStyle);

                    // Col 15: Joining Date
                    Cell c15 = r.createCell(15);
                    if (s.getJoiningDate() != null) {
                        c15.setCellValue(s.getJoiningDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
                        c15.setCellStyle(centerTextStyle);
                    } else {
                        c15.setCellValue("");
                        c15.setCellStyle(centerTextStyle);
                    }
                }

                // Add 50 blank rows with S.No continuing and Class pre-filled as targetExcelClass (e.g. "X")
                for (int i = 0; i < 50; i++) {
                    Row r = sheet.createRow(rowIndex++);
                    r.setHeightInPoints(20);

                    Cell c0 = r.createCell(0);
                    c0.setCellValue(serialNo++);
                    c0.setCellStyle(centerTextStyle);

                    for (int col = 1; col < headers.length; col++) {
                        Cell c = r.createCell(col);
                        if (col == 3) {
                            c.setCellValue(targetDisplayClass);
                            c.setCellStyle(centerTextStyle);
                        } else {
                            c.setCellValue("");
                            c.setCellStyle((col == 1 || col == 4 || col == 5 || col == 6 || col == 10 || col == 11 || col == 12 || col == 14 || col == 15) ? centerTextStyle : textStyle);
                        }
                    }
                }
            } else {
                // Generic / Main template: add 50 clean rows with S.No pre-filled
                for (int i = 0; i < 50; i++) {
                    Row r = sheet.createRow(rowIndex++);
                    r.setHeightInPoints(20);

                    Cell c0 = r.createCell(0);
                    c0.setCellValue(serialNo++);
                    c0.setCellStyle(centerTextStyle);

                    for (int col = 1; col < headers.length; col++) {
                        Cell c = r.createCell(col);
                        c.setCellValue("");
                        c.setCellStyle((col == 1 || col == 3 || col == 4 || col == 5 || col == 6 || col == 10 || col == 11 || col == 12 || col == 14 || col == 15) ? centerTextStyle : textStyle);
                    }
                }
            }

            // Set column formatting & width
            for (int i = 0; i < headers.length; i++) {
                sheet.setDefaultColumnStyle(i, textStyle);
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.max(currentWidth + 1200, 4200));
            }

            // Data Validations
            DataValidationHelper dvHelper = sheet.getDataValidationHelper();
            int maxValidationRow = Math.max(rowIndex + 200, 1000);

            // 1. Gender dropdown (Col 6)
            CellRangeAddressList genderRange = new CellRangeAddressList(1, maxValidationRow, 6, 6);
            DataValidationConstraint genderConstraint = dvHelper.createExplicitListConstraint(new String[]{"Male", "Female", "Other"});
            DataValidation genderValidation = dvHelper.createValidation(genderConstraint, genderRange);
            genderValidation.setSuppressDropDownArrow(true);
            genderValidation.setShowErrorBox(true);
            genderValidation.setErrorStyle(DataValidation.ErrorStyle.STOP);
            genderValidation.createErrorBox("Invalid Gender", "Please select a valid gender from the dropdown: Male, Female, Other.");
            sheet.addValidationData(genderValidation);

            // 2. Blood Group dropdown (Col 14)
            CellRangeAddressList bgRange = new CellRangeAddressList(1, maxValidationRow, 14, 14);
            DataValidationConstraint bgConstraint = dvHelper.createExplicitListConstraint(
                    new String[]{"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
            );
            DataValidation bgValidation = dvHelper.createValidation(bgConstraint, bgRange);
            bgValidation.setSuppressDropDownArrow(true);
            bgValidation.setShowErrorBox(true);
            bgValidation.setErrorStyle(DataValidation.ErrorStyle.STOP);
            bgValidation.createErrorBox("Invalid Blood Group", "Please select a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-).");
            sheet.addValidationData(bgValidation);

            // 3. Class dropdown / lock (Col 3)
            CellRangeAddressList classRange = new CellRangeAddressList(1, maxValidationRow, 3, 3);
            DataValidationConstraint classConstraint;
            if (isClassSpecific) {
                classConstraint = dvHelper.createExplicitListConstraint(new String[]{targetDisplayClass});
            } else {
                classConstraint = dvHelper.createExplicitListConstraint(
                        AcademicClassOrder.DISPLAY_CLASSES.toArray(new String[0])
                );
            }
            DataValidation classValidation = dvHelper.createValidation(classConstraint, classRange);
            classValidation.setSuppressDropDownArrow(true);
            classValidation.setShowErrorBox(true);
            classValidation.setErrorStyle(DataValidation.ErrorStyle.STOP);
            if (isClassSpecific) {
                classValidation.createErrorBox("Class Locked", "This template is locked for " + targetDisplayClass + " (" + targetAppClass + "). Changing class is not allowed.");
            } else {
                classValidation.createErrorBox("Invalid Class", "Please select a valid class from the dropdown (LKG, UKG, Class I to Class XII).");
            }
            sheet.addValidationData(classValidation);

            // 4 & 5. DOB (Col 5) / Joining Date (Col 15): input hint only.
            // These cells are Text-formatted so "dd-MM-yyyy" is kept as typed; a strict Excel
            // DATE validation would reject that text and block entry. The upload parser
            // accepts dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd and real Excel date cells.
            addDateInputHint(sheet, dvHelper, new CellRangeAddressList(1, maxValidationRow, 5, 5), "Date of Birth");
            addDateInputHint(sheet, dvHelper, new CellRangeAddressList(1, maxValidationRow, 15, 15), "Joining Date");

            // 6. Mobile number validation (Cols 10, 11, 12)
            CellRangeAddressList mobileRange = new CellRangeAddressList(1, maxValidationRow, 10, 12);
            DataValidationConstraint mobileConstraint = dvHelper.createTextLengthConstraint(
                    DataValidationConstraint.OperatorType.EQUAL,
                    "10",
                    null
            );
            DataValidation mobileValidation = dvHelper.createValidation(mobileConstraint, mobileRange);
            mobileValidation.setEmptyCellAllowed(true);
            mobileValidation.setShowErrorBox(true);
            mobileValidation.setErrorStyle(DataValidation.ErrorStyle.STOP);
            mobileValidation.createErrorBox("Invalid Mobile Number", "Mobile number must be a valid 10-digit Indian phone number.");
            sheet.addValidationData(mobileValidation);

            // Filters and freeze pane
            sheet.setAutoFilter(new CellRangeAddress(0, Math.max(1, rowIndex - 1), 0, headers.length - 1));
            sheet.createFreezePane(0, 1);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // =========================================================================
    // 2. TWO-PHASE VALIDATE & COMMIT WORKFLOW
    // =========================================================================

    public BulkUploadResult validateBulkUpload(MultipartFile file, String expectedClassName, Long schoolId) throws IOException {
        return executeBulkUpload(file, expectedClassName, false, schoolId);
    }

    @Transactional(rollbackFor = Exception.class)
    public BulkUploadResult processBulkUpload(MultipartFile file, String expectedClassName, Long schoolId) throws IOException {
        return executeBulkUpload(file, expectedClassName, true, schoolId);
    }

    private BulkUploadResult executeBulkUpload(MultipartFile file, String expectedClassName, boolean commitToDatabase, Long schoolId) throws IOException {
        com.school.student.service.StudentService.requireSchoolId(schoolId);
        if (file.isEmpty()) {
            return BulkUploadResult.builder()
                    .success(false)
                    .canCommit(false)
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
                    .canCommit(false)
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

        Map<String, Student> dbStudentMap = new HashMap<>();
        for (Student s : studentRepository.findBySchoolId(schoolId)) {
            if (s.getAdmissionNumber() != null && !s.getAdmissionNumber().isBlank()) {
                dbStudentMap.put(s.getAdmissionNumber().trim().toLowerCase(), s);
            }
        }

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getLastRowNum() < 1) {
                errors.add(BulkUploadError.builder()
                        .row(0)
                        .errorType("Empty Sheet")
                        .errorMessage("The worksheet contains no data rows.")
                        .build());
                return buildFailureResult(errors, Collections.emptyList());
            }

            Map<String, Integer> colMap = new HashMap<>();

            // Find header row (check first 10 rows)
            for (int r = 0; r <= Math.min(sheet.getLastRowNum(), 10); r++) {
                Row testRow = sheet.getRow(r);
                if (testRow != null && isHeaderRow(testRow)) {
                    colMap = buildColumnMap(testRow);
                    break;
                }
            }

            // In-file duplicate tracking
            Map<String, Integer> seenAdmissionNumbers = new HashMap<>(); // normAdm -> rowNum

            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;

                int excelRow = r + 1; // 1-based display row

                // Skip header row
                if (isHeaderRow(row)) {
                    colMap = buildColumnMap(row);
                    continue;
                }

                if (colMap.isEmpty()) {
                    colMap = buildColumnMap(row);
                    if (isHeaderRow(row)) continue;
                }

                String rawAdmNo = getCellString(row, colMap, "adm no", "admission no", "admission number", "admissionno", "register number", "reg no");
                String rawName = getCellString(row, colMap, "student name", "name", "studentname");
                String rawClass = getCellString(row, colMap, "class", "classname", "class name");
                String section = getCellString(row, colMap, "section");
                String gender = getCellString(row, colMap, "gender");
                String fatherName = getCellString(row, colMap, "father name", "fathername", "father");
                String motherName = getCellString(row, colMap, "mother name", "mothername", "mother");
                String guardianName = getCellString(row, colMap, "guardian name", "guardianname", "guardian");

                String fatherMobile = getCellString(row, colMap, "father mobile number", "father mobile", "father phone", "father contact");
                String motherMobile = getCellString(row, colMap, "mother mobile number", "mother mobile", "mother phone", "mother contact");
                String guardianMobile = getCellString(row, colMap, "guardian mobile number", "guardian mobile", "guardian phone", "guardian contact");
                String genericMobile = getCellString(row, colMap, "mobile", "mobile number", "contact number", "contact", "phone");

                if ((fatherMobile == null || fatherMobile.isBlank()) && genericMobile != null && !genericMobile.isBlank()) {
                    fatherMobile = genericMobile;
                }

                String address = getCellString(row, colMap, "address", "residential address");
                String bloodGroup = getCellString(row, colMap, "blood group", "bloodgroup", "blood");
                String dobRaw = getCellString(row, colMap, "dob", "date of birth", "dateofbirth", "birth date");
                String joiningDateRaw = getCellString(row, colMap, "joining date", "joiningdate", "date of joining");
                String phoneNumber = getCellString(row, colMap, "parent login phone number", "parent login phone", "parent login mobile", "phone number", "portal phone");
                String password = getCellString(row, colMap, "parent login password", "password", "portal password");

                // If Adm No matches header or is blank while name is also blank, skip row
                if (rawAdmNo != null) {
                    String normAdmCheck = rawAdmNo.trim().toLowerCase();
                    if (normAdmCheck.equals("adm no") || normAdmCheck.equals("admission no") || normAdmCheck.equals("admission number") || normAdmCheck.equals("s.no")) {
                        continue;
                    }
                }

                // If both Adm No and Name are blank, this is an unfilled blank template row -> skip it!
                if ((rawAdmNo == null || rawAdmNo.isBlank()) && (rawName == null || rawName.isBlank())) {
                    continue;
                }

                // Parse dates strictly
                LocalDate dob = null;
                if (dobRaw != null && !dobRaw.isBlank()) {
                    dob = parseDateStrict(row, colMap, excelRow, dobRaw, errors, rawName, rawAdmNo, "DOB",
                            "dob", "date of birth", "dateofbirth", "birth date");
                }

                LocalDate joiningDate = null;
                if (joiningDateRaw != null && !joiningDateRaw.isBlank()) {
                    joiningDate = parseDateStrict(row, colMap, excelRow, joiningDateRaw, errors, rawName, rawAdmNo, "Joining Date",
                            "joining date", "joiningdate", "date of joining");
                }

                String normAdmNo = normalize(rawAdmNo);
                String normName = normalize(rawName);
                String normClass = normalize(rawClass);

                ParsedStudentRow studentRow = new ParsedStudentRow();
                studentRow.excelRow = excelRow;
                studentRow.rawAdmNo = rawAdmNo;
                studentRow.normAdmNo = normAdmNo;
                studentRow.rawName = rawName;
                studentRow.normName = normName;
                studentRow.rawClass = rawClass;
                studentRow.normClass = normClass;
                studentRow.section = section;
                studentRow.dob = dob;
                studentRow.gender = gender;
                studentRow.fatherName = fatherName;
                studentRow.motherName = motherName;
                studentRow.guardianName = guardianName;
                studentRow.fatherMobile = fatherMobile;
                studentRow.motherMobile = motherMobile;
                studentRow.guardianMobile = guardianMobile;
                studentRow.address = address;
                studentRow.bloodGroup = bloodGroup;
                studentRow.joiningDate = joiningDate;
                studentRow.phoneNumber = phoneNumber;
                studentRow.password = password;

                parsedRows.add(studentRow);

                // --- Required Field Validations ---
                if (normAdmNo.isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Required Field")
                            .errorMessage("Row " + excelRow + ": Admission Number is required.")
                            .build());
                }

                if (normName.isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Required Field")
                            .errorMessage("Row " + excelRow + ": Student Name is required.")
                            .build());
                }

                if (normClass.isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Required Field")
                            .errorMessage("Row " + excelRow + ": Class is required.")
                            .build());
                } else if (!AcademicClassOrder.isValidClass(normClass)) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Invalid Class")
                            .errorMessage("Row " + excelRow + ": Invalid class: " + rawClass)
                            .build());
                }

                // Check class-specific template scope if expectedClassName is specified
                if (expectedClassName != null && !expectedClassName.isBlank() && !"ALL".equalsIgnoreCase(expectedClassName.trim()) && !"ALL CLASSES".equalsIgnoreCase(expectedClassName.trim())) {
                    if (!AcademicClassOrder.isClassMatch(expectedClassName, normClass)) {
                        String appExpected = AcademicClassOrder.toApplicationClassName(expectedClassName);
                        String errMsg;
                        if (rawName != null && !rawName.isBlank()) {
                            errMsg = String.format("Student %s belongs to %s. This upload is for %s.", rawName, rawClass, appExpected);
                        } else {
                            errMsg = String.format("Invalid class %s. This upload is for %s.", rawClass, appExpected);
                        }
                        errors.add(BulkUploadError.builder()
                                .row(excelRow)
                                .studentName(rawName)
                                .admissionNumber(rawAdmNo)
                                .className(appExpected)
                                .errorType("Class Mismatch")
                                .errorMessage(errMsg)
                                .build());
                    }
                }

                // Parent details (required for new students; existing students retain their data)
                boolean isExistingStudent = !normAdmNo.isEmpty() && dbStudentMap.containsKey(normAdmNo.toLowerCase());
                if (!isExistingStudent && normalize(fatherName).isEmpty() && normalize(motherName).isEmpty() && normalize(guardianName).isEmpty()) {
                    errors.add(BulkUploadError.builder()
                            .row(excelRow)
                            .studentName(rawName)
                            .admissionNumber(rawAdmNo)
                            .errorType("Missing Parent/Guardian")
                            .errorMessage("Row " + excelRow + ": At least one of Father Name, Mother Name, or Guardian Name is required.")
                            .build());
                }

                // Mobile validation
                validatePhoneNumberField(fatherMobile, "Father Mobile Number", excelRow, rawName, rawAdmNo, errors);
                validatePhoneNumberField(motherMobile, "Mother Mobile Number", excelRow, rawName, rawAdmNo, errors);
                validatePhoneNumberField(guardianMobile, "Guardian Mobile Number", excelRow, rawName, rawAdmNo, errors);
                validatePhoneNumberField(phoneNumber, "Parent Login Phone Number", excelRow, rawName, rawAdmNo, errors);

                // In-file duplicate admission number
                if (!normAdmNo.isEmpty()) {
                    String admKey = normAdmNo.toUpperCase();
                    if (seenAdmissionNumbers.containsKey(admKey)) {
                        int prevRow = seenAdmissionNumbers.get(admKey);
                        errors.add(BulkUploadError.builder()
                                .row(excelRow)
                                .studentName(rawName)
                                .admissionNumber(rawAdmNo)
                                .errorType("Duplicate Admission No")
                                .errorMessage("Duplicate Admission Number " + rawAdmNo + " found in the uploaded Excel.")
                                .duplicateWithRow(prevRow)
                                .build());
                    } else {
                        seenAdmissionNumbers.put(admKey, excelRow);
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

            // Cross-student identity duplication check (different Adm No, but same student)
            List<Student> allDbStudents = studentRepository.findBySchoolId(schoolId);
            for (ParsedStudentRow pr : parsedRows) {
                if (pr.normName.isEmpty()) continue;

                for (Student s : allDbStudents) {
                    if (s.getAdmissionNumber() != null && s.getAdmissionNumber().equalsIgnoreCase(pr.rawAdmNo.trim())) {
                        continue; // Same admission number -> will be handled as update/unchanged
                    }

                    // Check if name matches
                    boolean nameMatches = normalize(s.getName()).equalsIgnoreCase(pr.normName);
                    boolean dobMatches = (s.getDateOfBirth() != null && pr.dob != null && s.getDateOfBirth().equals(pr.dob));
                    
                    boolean parentMatches = false;
                    if (s.getFatherName() != null && pr.fatherName != null && !pr.fatherName.isBlank() && normalize(s.getFatherName()).equalsIgnoreCase(normalize(pr.fatherName))) {
                        parentMatches = true;
                    }
                    if (s.getMotherName() != null && pr.motherName != null && !pr.motherName.isBlank() && normalize(s.getMotherName()).equalsIgnoreCase(normalize(pr.motherName))) {
                        parentMatches = true;
                    }
                    if (s.getGuardianName() != null && pr.guardianName != null && !pr.guardianName.isBlank() && normalize(s.getGuardianName()).equalsIgnoreCase(normalize(pr.guardianName))) {
                        parentMatches = true;
                    }

                    if (nameMatches && dobMatches && parentMatches) {
                        errors.add(BulkUploadError.builder()
                                .row(pr.excelRow)
                                .studentName(pr.rawName)
                                .admissionNumber(pr.rawAdmNo)
                                .errorType("Duplicate Student Identity")
                                .errorMessage("Possible duplicate student detected. Similar student already exists with Admission No " + s.getAdmissionNumber() + ".")
                                .build());
                        break;
                    }
                }
            }

            // If any error exists, fail atomically
            if (!errors.isEmpty()) {
                return buildFailureResult(errors, parsedRows);
            }

            // Determine ADDED, UPDATED, UNCHANGED for each row
            BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
            List<Student> studentsToSave = new ArrayList<>();
            List<BulkUploadRowDetail> rowDetails = new ArrayList<>();
            int insertedCount = 0;
            int updatedCount = 0;
            int unchangedCount = 0;

            for (ParsedStudentRow pr : parsedRows) {
                String admKey = pr.rawAdmNo.trim().toLowerCase();
                Student existing = dbStudentMap.get(admKey);

                String bestContact = pr.fatherMobile != null && !pr.fatherMobile.isBlank() ? pr.fatherMobile.trim()
                        : (pr.motherMobile != null && !pr.motherMobile.isBlank() ? pr.motherMobile.trim()
                        : (pr.guardianMobile != null && !pr.guardianMobile.isBlank() ? pr.guardianMobile.trim() : null));

                if (existing != null) {
                    // Check if anything changed
                    boolean changed = false;
                    if (!normalize(existing.getName()).equalsIgnoreCase(pr.normName)) changed = true;
                    if (pr.rawClass != null && !AcademicClassOrder.isClassMatch(existing.getClassName(), pr.normClass)) changed = true;
                    if (pr.section != null && !normalize(existing.getSection()).equalsIgnoreCase(normalize(pr.section))) changed = true;
                    if (pr.dob != null && !Objects.equals(existing.getDateOfBirth(), pr.dob)) changed = true;
                    if (pr.gender != null && !normalize(existing.getGender()).equalsIgnoreCase(normalize(pr.gender))) changed = true;
                    if (pr.fatherName != null && !normalize(existing.getFatherName()).equalsIgnoreCase(normalize(pr.fatherName))) changed = true;
                    if (pr.motherName != null && !normalize(existing.getMotherName()).equalsIgnoreCase(normalize(pr.motherName))) changed = true;
                    if (pr.guardianName != null && !normalize(existing.getGuardianName()).equalsIgnoreCase(normalize(pr.guardianName))) changed = true;
                    if (pr.fatherMobile != null && !normalize(existing.getFatherMobileNumber()).equalsIgnoreCase(normalize(pr.fatherMobile))) changed = true;
                    if (pr.motherMobile != null && !normalize(existing.getMotherMobileNumber()).equalsIgnoreCase(normalize(pr.motherMobile))) changed = true;
                    if (pr.guardianMobile != null && !normalize(existing.getGuardianMobileNumber()).equalsIgnoreCase(normalize(pr.guardianMobile))) changed = true;
                    if (pr.address != null && !normalize(existing.getAddress()).equalsIgnoreCase(normalize(pr.address))) changed = true;
                    if (pr.bloodGroup != null && !normalize(existing.getBloodGroup()).equalsIgnoreCase(normalize(pr.bloodGroup))) changed = true;
                    if (pr.joiningDate != null && !Objects.equals(existing.getJoiningDate(), pr.joiningDate)) changed = true;
                    if (pr.phoneNumber != null && !pr.phoneNumber.isBlank() && !normalize(existing.getPhoneNumber()).equalsIgnoreCase(normalize(pr.phoneNumber))) changed = true;
                    if (pr.password != null && !pr.password.isBlank()) changed = true;

                    if (changed) {
                        existing.setName(pr.rawName.trim());
                        if (pr.rawClass != null && !pr.rawClass.isBlank()) existing.setClassName(AcademicClassOrder.toApplicationClassName(pr.normClass));
                        if (pr.section != null) existing.setSection(pr.section.trim());
                        if (pr.dob != null) existing.setDateOfBirth(pr.dob);
                        if (pr.gender != null) existing.setGender(pr.gender.trim());
                        if (pr.fatherName != null) existing.setFatherName(pr.fatherName.trim());
                        if (pr.motherName != null) existing.setMotherName(pr.motherName.trim());
                        if (pr.guardianName != null) existing.setGuardianName(pr.guardianName.trim());
                        if (pr.fatherMobile != null) existing.setFatherMobileNumber(pr.fatherMobile.trim());
                        if (pr.motherMobile != null) existing.setMotherMobileNumber(pr.motherMobile.trim());
                        if (pr.guardianMobile != null) existing.setGuardianMobileNumber(pr.guardianMobile.trim());
                        if (bestContact != null) existing.setContactNumber(bestContact);
                        if (pr.address != null) existing.setAddress(pr.address.trim());
                        if (pr.bloodGroup != null) existing.setBloodGroup(pr.bloodGroup.trim());
                        if (pr.joiningDate != null) existing.setJoiningDate(pr.joiningDate);
                        if (pr.phoneNumber != null && !pr.phoneNumber.isBlank()) existing.setPhoneNumber(pr.phoneNumber.trim());
                        if (pr.password != null && !pr.password.isBlank()) existing.setPasswordHash(passwordEncoder.encode(pr.password.trim()));

                        studentsToSave.add(existing);
                        updatedCount++;
                        rowDetails.add(BulkUploadRowDetail.builder()
                                .rowNumber(pr.excelRow)
                                .admissionNumber(pr.rawAdmNo.trim())
                                .studentName(pr.rawName.trim())
                                .className(existing.getClassName())
                                .action("UPDATED")
                                .detail(String.format("Student %s - %s updated successfully.", pr.rawAdmNo.trim(), pr.rawName.trim()))
                                .build());
                    } else {
                        unchangedCount++;
                        rowDetails.add(BulkUploadRowDetail.builder()
                                .rowNumber(pr.excelRow)
                                .admissionNumber(pr.rawAdmNo.trim())
                                .studentName(pr.rawName.trim())
                                .className(existing.getClassName())
                                .action("UNCHANGED")
                                .detail("Student already exists. No changes detected.")
                                .build());
                    }
                } else {
                    // New student
                    String appClass = AcademicClassOrder.toApplicationClassName(pr.normClass);
                    Student s = Student.builder()
                            .admissionNumber(pr.rawAdmNo.trim())
                            .name(pr.rawName.trim())
                            .className(appClass)
                            .section(pr.section != null ? pr.section.trim() : null)
                            .dateOfBirth(pr.dob)
                            .gender(pr.gender != null ? pr.gender.trim() : null)
                            .fatherName(pr.fatherName != null ? pr.fatherName.trim() : null)
                            .motherName(pr.motherName != null ? pr.motherName.trim() : null)
                            .guardianName(pr.guardianName != null ? pr.guardianName.trim() : null)
                            .fatherMobileNumber(pr.fatherMobile != null ? pr.fatherMobile.trim() : null)
                            .motherMobileNumber(pr.motherMobile != null ? pr.motherMobile.trim() : null)
                            .guardianMobileNumber(pr.guardianMobile != null ? pr.guardianMobile.trim() : null)
                            .contactNumber(bestContact)
                            .address(pr.address != null ? pr.address.trim() : null)
                            .bloodGroup(pr.bloodGroup != null ? pr.bloodGroup.trim() : null)
                            .joiningDate(pr.joiningDate)
                            .isActive(true)
                            .phoneNumber(pr.phoneNumber != null ? pr.phoneNumber.trim() : null)
                            .passwordHash((pr.password != null && !pr.password.isBlank()) ? passwordEncoder.encode(pr.password.trim()) : null)
                            .schoolId(schoolId)
                            .build();

                    studentsToSave.add(s);
                    insertedCount++;
                    rowDetails.add(BulkUploadRowDetail.builder()
                            .rowNumber(pr.excelRow)
                            .admissionNumber(pr.rawAdmNo.trim())
                            .studentName(pr.rawName.trim())
                            .className(appClass)
                            .action("ADDED")
                            .detail(String.format("Student %s - %s added successfully.", pr.rawAdmNo.trim(), pr.rawName.trim()))
                            .build());
                }
            }

            if (commitToDatabase && !studentsToSave.isEmpty()) {
                studentRepository.saveAll(studentsToSave);
                log.info("Bulk student upload committed: {} added, {} updated, {} unchanged.",
                        insertedCount, updatedCount, unchangedCount);
            }

            String summaryMessage;
            if (insertedCount == 0 && updatedCount == 0 && unchangedCount > 0) {
                summaryMessage = "No new students found. All students in this file already exist.";
            } else {
                summaryMessage = String.format("Bulk Upload Completed: %d added, %d updated, %d already up to date.",
                        insertedCount, updatedCount, unchangedCount);
            }

            return BulkUploadResult.builder()
                    .success(true)
                    .canCommit(true)
                    .totalRows(parsedRows.size())
                    .insertedCount(insertedCount)
                    .updatedCount(updatedCount)
                    .unchangedCount(unchangedCount)
                    .errorCount(0)
                    .message(summaryMessage)
                    .rowDetails(rowDetails)
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

    private void addDateInputHint(Sheet sheet, DataValidationHelper dvHelper, CellRangeAddressList range, String label) {
        DataValidationConstraint anyText = dvHelper.createTextLengthConstraint(
                DataValidationConstraint.OperatorType.GREATER_OR_EQUAL, "0", null);
        DataValidation hint = dvHelper.createValidation(anyText, range);
        hint.setEmptyCellAllowed(true);
        hint.setShowErrorBox(false);
        hint.setShowPromptBox(true);
        hint.createPromptBox(label, "Enter as DD-MM-YYYY, e.g. 15-06-2018");
        sheet.addValidationData(hint);
    }

    private void validatePhoneNumberField(String value, String fieldName, int excelRow, String name, String admNo, List<BulkUploadError> errors) {
        if (value != null && !value.isBlank()) {
            String clean = value.replaceAll("[\\s\\-+()]", "");
            if (!clean.matches("^\\d{10}$")) {
                errors.add(BulkUploadError.builder()
                        .row(excelRow)
                        .studentName(name)
                        .admissionNumber(admNo)
                        .errorType("Invalid " + fieldName)
                        .errorMessage("Row " + excelRow + ": " + fieldName + " '" + value + "' is invalid (must be a valid 10-digit Indian mobile number).")
                        .build());
            }
        }
    }

    private LocalDate parseDateStrict(Row row, Map<String, Integer> colMap, int rowNum, String raw,
                                      List<BulkUploadError> errors, String studentName, String admNo,
                                      String fieldName, String... possibleKeys) {
        for (String key : possibleKeys) {
            String norm = key.toLowerCase().replaceAll("[._\\-\\s]+", " ");
            Integer idx = colMap.get(norm);
            if (idx != null) {
                Cell cell = row.getCell(idx);
                if (cell != null && cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                    try {
                        java.util.Date d = cell.getDateCellValue();
                        if (d != null) {
                            return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        String trimmed = raw.trim();
        for (DateTimeFormatter fmt : STRICT_FORMATTERS) {
            try {
                return LocalDate.parse(trimmed, fmt);
            } catch (DateTimeParseException ignored) {}
        }

        errors.add(BulkUploadError.builder()
                .row(rowNum)
                .studentName(studentName)
                .admissionNumber(admNo)
                .errorType("Invalid " + fieldName)
                .errorMessage("Row " + rowNum + ": Invalid " + fieldName + ": " + raw)
                .build());
        return null;
    }

    private BulkUploadResult buildFailureResult(List<BulkUploadError> errors, List<ParsedStudentRow> parsedRows) {
        String errorExcelBase64 = null;
        try {
            byte[] errBytes = generateErrorReport(errors, parsedRows);
            errorExcelBase64 = Base64.getEncoder().encodeToString(errBytes);
        } catch (Exception e) {
            log.warn("Could not generate error excel report", e);
        }

        return BulkUploadResult.builder()
                .success(false)
                .canCommit(false)
                .totalRows(parsedRows.size())
                .insertedCount(0)
                .updatedCount(0)
                .unchangedCount(0)
                .errorCount(errors.size())
                .message("Bulk Upload Failed: " + errors.size() + " issue(s) detected. No changes saved.")
                .errors(errors)
                .errorExcelBase64(errorExcelBase64)
                .build();
    }

    public byte[] generateErrorReport(List<BulkUploadError> errors, List<ParsedStudentRow> rows) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet errSheet = workbook.createSheet("Upload Errors");

            CellStyle errHeaderStyle = workbook.createCellStyle();
            Font errHeaderFont = workbook.createFont();
            errHeaderFont.setBold(true);
            errHeaderFont.setColor(IndexedColors.WHITE.getIndex());
            errHeaderStyle.setFont(errHeaderFont);
            errHeaderStyle.setFillForegroundColor(IndexedColors.RED.getIndex());
            errHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            errHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            errHeaderStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle cellStyle = workbook.createCellStyle();
            cellStyle.setBorderBottom(BorderStyle.THIN);
            cellStyle.setBorderTop(BorderStyle.THIN);
            cellStyle.setBorderLeft(BorderStyle.THIN);
            cellStyle.setBorderRight(BorderStyle.THIN);

            String[] errHeaders = {"Row #", "Adm No", "Student Name", "Error Type", "Error Description"};
            Row hRow = errSheet.createRow(0);
            hRow.setHeightInPoints(24);
            for (int i = 0; i < errHeaders.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(errHeaders[i]);
                c.setCellStyle(errHeaderStyle);
            }

            int rIdx = 1;
            for (BulkUploadError err : errors) {
                Row r = errSheet.createRow(rIdx++);
                r.setHeightInPoints(20);

                Cell c0 = r.createCell(0);
                if (err.getRow() > 0) c0.setCellValue(err.getRow());
                else c0.setCellValue("File");
                c0.setCellStyle(cellStyle);

                Cell c1 = r.createCell(1);
                c1.setCellValue(err.getAdmissionNumber() != null ? err.getAdmissionNumber() : "");
                c1.setCellStyle(cellStyle);

                Cell c2 = r.createCell(2);
                c2.setCellValue(err.getStudentName() != null ? err.getStudentName() : "");
                c2.setCellStyle(cellStyle);

                Cell c3 = r.createCell(3);
                c3.setCellValue(err.getErrorType() != null ? err.getErrorType() : "Validation Error");
                c3.setCellStyle(cellStyle);

                Cell c4 = r.createCell(4);
                c4.setCellValue(err.getErrorMessage() != null ? err.getErrorMessage() : "");
                c4.setCellStyle(cellStyle);
            }

            for (int i = 0; i < errHeaders.length; i++) {
                errSheet.autoSizeColumn(i);
                errSheet.setColumnWidth(i, Math.max(errSheet.getColumnWidth(i) + 1024, 3800));
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public ImportResult importStudents(MultipartFile file, Long schoolId) throws IOException {
        BulkUploadResult bulkResult = processBulkUpload(file, null, schoolId);
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

    private String normalize(String str) {
        if (str == null) return "";
        return str.trim().replaceAll("\\s+", " ");
    }

    private Map<String, Integer> buildColumnMap(Row header) {
        Map<String, Integer> map = new HashMap<>();
        if (header == null) return map;
        for (int c = 0; c < header.getLastCellNum(); c++) {
            Cell cell = header.getCell(c);
            if (cell != null) {
                String key = cell.toString().trim().toLowerCase().replaceAll("[._\\-\\s]+", " ");
                map.put(key, c);
            }
        }
        return map;
    }

    private boolean isHeaderRow(Row row) {
        if (row == null) return false;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null) {
                String val = cell.toString().trim().toLowerCase();
                if (val.equals("adm no") || val.equals("admission no") || val.equals("admission number") || val.equals("register number") || val.equals("student name")) {
                    return true;
                }
            }
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
                    if (cell.getCellType() == CellType.NUMERIC) {
                        if (DateUtil.isCellDateFormatted(cell)) {
                            LocalDate ld = cell.getLocalDateTimeCellValue().toLocalDate();
                            return ld.format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                        } else {
                            double num = cell.getNumericCellValue();
                            if (num == (long) num) {
                                return String.valueOf((long) num);
                            } else {
                                return String.valueOf(num);
                            }
                        }
                    }
                    String val = cell.toString().trim();
                    if (!val.isBlank()) return val;
                }
            }
        }
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
        public String rawAdmNo;
        public String normAdmNo;
        public String rawName;
        public String normName;
        public String rawClass;
        public String normClass;
        public String section;
        public LocalDate dob;
        public String gender;
        public String fatherName;
        public String motherName;
        public String guardianName;
        public String fatherMobile;
        public String motherMobile;
        public String guardianMobile;
        public String address;
        public String bloodGroup;
        public LocalDate joiningDate;
        public String phoneNumber;
        public String password;
    }
}
