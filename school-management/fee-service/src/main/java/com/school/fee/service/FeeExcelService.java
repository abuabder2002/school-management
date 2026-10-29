package com.school.fee.service;

import com.school.common.enums.FeeStatus;
import com.school.fee.dto.BulkUploadBillingError;
import com.school.fee.dto.BulkUploadBillingResult;
import com.school.fee.dto.StudentInfoDTO;
import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;
import com.school.fee.repository.FeeRepository;
import com.school.fee.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeeExcelService {

    private final StudentServiceClient studentServiceClient;
    private final FeeRepository feeRepository;
    private final PaymentRepository paymentRepository;

    public static final String[] TEMPLATE_HEADERS = {
            "S.No",
            "Student Name",
            "Adm No",
            "Class",
            "Term Fees - 1",
            "Term Fees - 2",
            "Term Fees - 3",
            "Bus Fees",
            "Exam Fees",
            "Paid Amount"
    };

    /**
     * Generate an Excel template pre-filled with active students.
     * If className is empty or "ALL", generates a multi-class template with all active students across all classes.
     */
    public byte[] generateTemplate(String className, Long schoolId) throws IOException {
        List<StudentInfoDTO> activeStudents;
        String sheetTitle;
        if (className == null || className.isBlank() || "ALL".equalsIgnoreCase(className) || "All Classes".equalsIgnoreCase(className)) {
            List<StudentInfoDTO> all = studentServiceClient.getAllStudents(schoolId);
            activeStudents = (all != null) ? all.stream()
                    .filter(s -> !Boolean.FALSE.equals(s.getIsActive()))
                    .sorted((a, b) -> {
                        int c = FeeService.naturalClassCompare(a.getClassName(), b.getClassName());
                        if (c != 0) return c;
                        return String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName()));
                    })
                    .toList() : Collections.emptyList();
            sheetTitle = "Multi-Class Billing Template";
        } else {
            List<StudentInfoDTO> byClass = studentServiceClient.getActiveStudentsByClass(className, schoolId);
            activeStudents = (byClass != null) ? byClass.stream()
                    .filter(s -> !Boolean.FALSE.equals(s.getIsActive()))
                    .sorted(Comparator.comparing(s -> s.getName() != null ? s.getName().trim() : ""))
                    .toList() : Collections.emptyList();
            sheetTitle = className + " Billing Template";
        }

        // Pre-fetch current billing records for these active students
        Set<Long> studentIds = activeStudents.stream()
                .map(StudentInfoDTO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, Fee> feeMap = new HashMap<>();
        if (!studentIds.isEmpty()) {
            try {
                List<Fee> existingFees = feeRepository.findByStudentIdInAndSchoolId(studentIds, schoolId);
                if (existingFees != null) {
                    for (Fee f : existingFees) {
                        if (f.getStudentId() != null) {
                            if (className == null || className.isBlank() || "ALL".equalsIgnoreCase(className) ||
                                    (f.getClassName() != null && f.getClassName().equalsIgnoreCase(className))) {
                                feeMap.put(f.getStudentId(), f);
                            } else if (!feeMap.containsKey(f.getStudentId())) {
                                feeMap.put(f.getStudentId(), f);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch existing fees for template generation: {}", e.getMessage());
            }
        }

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet(sheetTitle);
            sheet.createFreezePane(0, 1);

            // Header Style
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

            // Data Style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Numeric/Currency Data Style
            CellStyle numberStyle = workbook.createCellStyle();
            numberStyle.cloneStyleFrom(dataStyle);
            numberStyle.setAlignment(HorizontalAlignment.RIGHT);

            // Center Data Style
            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.cloneStyleFrom(dataStyle);
            centerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);

            for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(TEMPLATE_HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Hidden Columns for internal Student ID / Admission Number mapping
            Cell hiddenHeaderCell = headerRow.createCell(TEMPLATE_HEADERS.length);
            hiddenHeaderCell.setCellValue("Student_Internal_ID");
            hiddenHeaderCell.setCellStyle(headerStyle);

            Cell hiddenAdmHeaderCell = headerRow.createCell(TEMPLATE_HEADERS.length + 1);
            hiddenAdmHeaderCell.setCellValue("Admission_Number");
            hiddenAdmHeaderCell.setCellStyle(headerStyle);

            // Populate active students with existing billing values
            int rowIndex = 1;
            for (StudentInfoDTO student : activeStudents) {
                Row row = sheet.createRow(rowIndex);
                row.setHeightInPoints(20);

                // Col 0: S.No (Display only, 1-based)
                Cell c0 = row.createCell(0);
                c0.setCellValue(rowIndex);
                c0.setCellStyle(centerStyle);

                // Col 1: Student Name
                Cell c1 = row.createCell(1);
                c1.setCellValue(student.getName() != null ? student.getName() : "");
                c1.setCellStyle(dataStyle);

                // Col 2: Adm No
                Cell c2 = row.createCell(2);
                c2.setCellValue(student.getAdmissionNumber() != null ? student.getAdmissionNumber() : "");
                c2.setCellStyle(centerStyle);

                // Col 3: Class
                Cell c3 = row.createCell(3);
                c3.setCellValue(student.getClassName() != null ? student.getClassName() : (className != null ? className : ""));
                c3.setCellStyle(centerStyle);

                Fee fee = feeMap.get(student.getId());

                double t1 = (fee != null && fee.getTermFees1() != null) ? fee.getTermFees1().doubleValue() : 0.0;
                double t2 = (fee != null && fee.getTermFees2() != null) ? fee.getTermFees2().doubleValue() : 0.0;
                double t3 = (fee != null && fee.getTermFees3() != null) ? fee.getTermFees3().doubleValue() : 0.0;
                double bus = (fee != null && fee.getBusFees() != null) ? fee.getBusFees().doubleValue() : 0.0;
                double exam = (fee != null && fee.getExamFees() != null) ? fee.getExamFees().doubleValue() : 0.0;
                double paid = (fee != null && fee.getPaidAmount() != null) ? fee.getPaidAmount().doubleValue() : 0.0;

                // Col 4: Term Fees - 1
                Cell c4 = row.createCell(4);
                c4.setCellValue(t1);
                c4.setCellStyle(numberStyle);

                // Col 5: Term Fees - 2
                Cell c5 = row.createCell(5);
                c5.setCellValue(t2);
                c5.setCellStyle(numberStyle);

                // Col 6: Term Fees - 3
                Cell c6 = row.createCell(6);
                c6.setCellValue(t3);
                c6.setCellStyle(numberStyle);

                // Col 7: Bus Fees
                Cell c7 = row.createCell(7);
                c7.setCellValue(bus);
                c7.setCellStyle(numberStyle);

                // Col 8: Exam Fees
                Cell c8 = row.createCell(8);
                c8.setCellValue(exam);
                c8.setCellStyle(numberStyle);

                // Col 9: Paid Amount
                Cell c9 = row.createCell(9);
                c9.setCellValue(paid);
                c9.setCellStyle(numberStyle);

                // Hidden Cols: Internal Student ID & Admission Number
                Cell cHiddenId = row.createCell(TEMPLATE_HEADERS.length);
                cHiddenId.setCellValue(student.getId() != null ? student.getId().toString() : "");

                Cell cHiddenAdm = row.createCell(TEMPLATE_HEADERS.length + 1);
                cHiddenAdm.setCellValue(student.getAdmissionNumber() != null ? student.getAdmissionNumber() : "");

                rowIndex++;
            }

            // Hide internal tracking columns
            sheet.setColumnHidden(TEMPLATE_HEADERS.length, true);
            sheet.setColumnHidden(TEMPLATE_HEADERS.length + 1, true);

            // Adjust column widths
            for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.max(currentWidth + 1024, 3800));
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Process bulk upload of billing records across multiple classes.
     * Reads each row individually, determines class from the Excel file,
     * validates that the student actually belongs to that class, and enforces atomicity:
     * if any row fails validation, zero records are committed.
     */
    @Transactional
    public BulkUploadBillingResult processBulkUpload(String expectedClassName, MultipartFile file, Long schoolId) throws IOException {
        if (file.isEmpty()) {
            return BulkUploadBillingResult.builder()
                    .success(false)
                    .errorCount(1)
                    .message("Uploaded file is empty.")
                    .errors(List.of(BulkUploadBillingError.builder()
                            .row(0)
                            .errorType("Empty File")
                            .errorMessage("The uploaded file contains no data.")
                            .build()))
                    .build();
        }

        List<StudentInfoDTO> allStudents = studentServiceClient.getAllStudents(schoolId);
        Map<Long, StudentInfoDTO> studentByIdMap = new HashMap<>();
        Map<String, StudentInfoDTO> studentByAdmMap = new HashMap<>();
        Map<String, List<StudentInfoDTO>> studentByNameMap = new HashMap<>();
        Map<String, List<StudentInfoDTO>> studentByNameAndClassMap = new HashMap<>();

        for (StudentInfoDTO s : allStudents) {
            if (s.getId() != null) studentByIdMap.put(s.getId(), s);
            if (s.getAdmissionNumber() != null) studentByAdmMap.put(s.getAdmissionNumber().trim().toLowerCase(), s);
            if (s.getName() != null) {
                studentByNameMap.computeIfAbsent(s.getName().trim().toLowerCase(), k -> new ArrayList<>()).add(s);
            }
            if (s.getName() != null && s.getClassName() != null) {
                String key = s.getName().trim().toLowerCase() + "|" + s.getClassName().trim().toLowerCase();
                studentByNameAndClassMap.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
            }
        }

        List<BulkUploadBillingError> errors = new ArrayList<>();
        List<FeeRecordToSave> recordsToSave = new ArrayList<>();
        Map<Long, Integer> seenStudentIdToRow = new HashMap<>();

        try (InputStream in = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(in)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getLastRowNum() < 1) {
                return BulkUploadBillingResult.builder()
                        .success(false)
                        .errorCount(1)
                        .message("Excel sheet contains no student billing data rows.")
                        .errors(List.of(BulkUploadBillingError.builder()
                                .row(1)
                                .errorType("No Data")
                                .errorMessage("The worksheet has headers but no data rows.")
                                .build()))
                        .build();
            }

            // Validate Header Row and resolve dynamic column indexes
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return BulkUploadBillingResult.builder()
                        .success(false)
                        .errorCount(1)
                        .message("Missing header row in Excel file.")
                        .build();
            }

            int studentNameCol = -1;
            int admissionNoCol = -1;
            int classCol = -1;
            int term1Col = -1;
            int term2Col = -1;
            int term3Col = -1;
            int busCol = -1;
            int examCol = -1;
            int paidCol = -1;
            int totalCol = -1;
            int outstandingCol = -1;
            int hiddenIdCol = -1;
            int hiddenAdmCol = -1;

            short minCol = headerRow.getFirstCellNum();
            short maxCol = headerRow.getLastCellNum();
            for (short c = minCol; c < maxCol; c++) {
                Cell cell = headerRow.getCell(c);
                if (cell == null) continue;
                String text = getCellString(cell);
                if (text == null || text.isBlank()) continue;
                String clean = text.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
                if (clean.equals("studentname") || clean.equals("name") || clean.equals("student")) {
                    if (studentNameCol == -1) studentNameCol = c;
                } else if (clean.contains("admissionno") || clean.contains("admissionnumber") || clean.contains("admno") || clean.equals("admission")) {
                    if (admissionNoCol == -1) admissionNoCol = c;
                } else if (clean.equals("class") || clean.equals("grade") || clean.equals("standard") || clean.equals("classname")) {
                    if (classCol == -1) classCol = c;
                } else if (clean.contains("termfee1") || clean.contains("termfees1") || clean.contains("term1") || clean.equals("term1fee")) {
                    if (term1Col == -1) term1Col = c;
                } else if (clean.contains("termfee2") || clean.contains("termfees2") || clean.contains("term2") || clean.equals("term2fee")) {
                    if (term2Col == -1) term2Col = c;
                } else if (clean.contains("termfee3") || clean.contains("termfees3") || clean.contains("term3") || clean.equals("term3fee")) {
                    if (term3Col == -1) term3Col = c;
                } else if (clean.contains("busfee") || clean.contains("busfees") || clean.contains("transport")) {
                    if (busCol == -1) busCol = c;
                } else if (clean.contains("examfee") || clean.contains("examfees") || clean.contains("examination")) {
                    if (examCol == -1) examCol = c;
                } else if (clean.contains("paidamount") || clean.contains("paidfee") || clean.equals("paid")) {
                    if (paidCol == -1) paidCol = c;
                } else if (clean.contains("totalamount") || clean.contains("totalfee") || clean.equals("total")) {
                    if (totalCol == -1) totalCol = c;
                } else if (clean.contains("outstanding") || clean.contains("pending")) {
                    if (outstandingCol == -1) outstandingCol = c;
                } else if (clean.contains("studentinternalid") || clean.contains("studentid")) {
                    if (hiddenIdCol == -1) hiddenIdCol = c;
                } else if (clean.contains("admissionnumber") && c >= TEMPLATE_HEADERS.length) {
                    if (hiddenAdmCol == -1) hiddenAdmCol = c;
                }
            }

            // Defaults if matching headers not found or standard template positions used
            if (studentNameCol == -1) studentNameCol = 1;
            if (admissionNoCol == -1) admissionNoCol = 2;
            if (classCol == -1) classCol = 3;
            if (term1Col == -1) term1Col = 4;
            if (term2Col == -1) term2Col = 5;
            if (term3Col == -1) term3Col = 6;
            if (busCol == -1) busCol = 7;
            if (examCol == -1) examCol = 8;
            if (paidCol == -1) paidCol = 9;
            if (hiddenIdCol == -1) hiddenIdCol = TEMPLATE_HEADERS.length;
            if (hiddenAdmCol == -1) hiddenAdmCol = TEMPLATE_HEADERS.length + 1;

            int lastRowNum = sheet.getLastRowNum();
            for (int r = 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowCompletelyEmpty(row)) {
                    continue;
                }

                int excelRow = r + 1; // 1-based display row

                String studentName = studentNameCol >= 0 ? getCellString(row.getCell(studentNameCol)) : null;
                String rowClassName = classCol >= 0 ? getCellString(row.getCell(classCol)) : null;
                String rowAdmNo = admissionNoCol >= 0 ? getCellString(row.getCell(admissionNoCol)) : null;

                if (studentName == null || studentName.isBlank()) {
                    errors.add(BulkUploadBillingError.builder()
                            .row(excelRow)
                            .errorType("Missing Student Name")
                            .errorMessage("Student name cannot be empty.")
                            .build());
                    continue;
                }

                // Check hidden columns if available
                String hiddenIdStr = hiddenIdCol >= 0 ? getCellString(row.getCell(hiddenIdCol)) : null;
                String hiddenAdmStr = hiddenAdmCol >= 0 ? getCellString(row.getCell(hiddenAdmCol)) : null;

                StudentInfoDTO matchedStudent = null;
                boolean admNoProvided = (rowAdmNo != null && !rowAdmNo.isBlank());

                if (admNoProvided) {
                    matchedStudent = studentByAdmMap.get(rowAdmNo.trim().toLowerCase());
                } else {
                    // 1. Match by internal Student ID if available
                    if (hiddenIdStr != null && !hiddenIdStr.isBlank()) {
                        try {
                            Long sid = Long.parseLong(hiddenIdStr.trim());
                            matchedStudent = studentByIdMap.get(sid);
                        } catch (NumberFormatException ignored) {}
                    }

                    // 2. Match by hidden tracking admission number
                    if (matchedStudent == null && hiddenAdmStr != null && !hiddenAdmStr.isBlank()) {
                        matchedStudent = studentByAdmMap.get(hiddenAdmStr.trim().toLowerCase());
                    }

                    // 3. Match by Student Name + Class
                    if (matchedStudent == null && rowClassName != null && !rowClassName.isBlank()) {
                        String key = studentName.trim().toLowerCase() + "|" + rowClassName.trim().toLowerCase();
                        List<StudentInfoDTO> matches = studentByNameAndClassMap.get(key);
                        if (matches != null && !matches.isEmpty()) {
                            matchedStudent = matches.get(0);
                        }
                    }

                    // 4. Match by Name alone across student directory
                    if (matchedStudent == null) {
                        List<StudentInfoDTO> nameMatches = studentByNameMap.get(studentName.trim().toLowerCase());
                        if (nameMatches != null && !nameMatches.isEmpty()) {
                            matchedStudent = nameMatches.get(0);
                        }
                    }
                }

                // Student not found anywhere in student directory
                if (matchedStudent == null) {
                    String targetClass = (rowClassName != null && !rowClassName.isBlank())
                            ? rowClassName : ((expectedClassName != null && !expectedClassName.isBlank() && !"ALL".equalsIgnoreCase(expectedClassName)) ? expectedClassName : "—");
                    String errorMsg = (rowAdmNo != null && !rowAdmNo.isBlank())
                            ? String.format("Student '%s' with Admission No '%s' does not exist in the Student Portal.", studentName, rowAdmNo)
                            : String.format("Student '%s' does not exist in the Student Portal.", studentName);
                    errors.add(BulkUploadBillingError.builder()
                            .row(excelRow)
                            .studentName(studentName)
                            .admissionNumber(rowAdmNo != null ? rowAdmNo : "—")
                            .className(targetClass)
                            .errorType("Student Not Found")
                            .errorMessage(errorMsg)
                            .build());
                    continue;
                }

                // Verify student actually belongs to the class for which billing is being uploaded (if class-scoped)
                if (expectedClassName != null && !expectedClassName.isBlank() && !"ALL".equalsIgnoreCase(expectedClassName) && !"All Classes".equalsIgnoreCase(expectedClassName)) {
                    if (matchedStudent.getClassName() == null || !expectedClassName.trim().equalsIgnoreCase(matchedStudent.getClassName().trim())) {
                        String admOrName = (matchedStudent.getAdmissionNumber() != null && !matchedStudent.getAdmissionNumber().isBlank())
                                ? matchedStudent.getAdmissionNumber() : matchedStudent.getName();
                        errors.add(BulkUploadBillingError.builder()
                                .row(excelRow)
                                .studentName(matchedStudent.getName())
                                .admissionNumber(matchedStudent.getAdmissionNumber() != null ? matchedStudent.getAdmissionNumber() : rowAdmNo)
                                .className(expectedClassName)
                                .errorType("Class Mismatch")
                                .errorMessage(String.format("Student %s belongs to %s, but this upload is restricted to %s.",
                                        admOrName, matchedStudent.getClassName(), expectedClassName))
                                .build());
                        continue;
                    }
                }

                // Class validation: verify student belongs to the class specified in Excel
                if (rowClassName == null || rowClassName.isBlank()) {
                    errors.add(BulkUploadBillingError.builder()
                            .row(excelRow)
                            .studentName(matchedStudent.getName())
                            .admissionNumber(matchedStudent.getAdmissionNumber())
                            .className("Missing")
                            .errorType("Missing Class")
                            .errorMessage(String.format("Class is missing in Excel for student \"%s\".", matchedStudent.getName()))
                            .build());
                    continue;
                }

                if (!rowClassName.trim().equalsIgnoreCase(matchedStudent.getClassName() != null ? matchedStudent.getClassName().trim() : "")) {
                    String admOrName = (matchedStudent.getAdmissionNumber() != null && !matchedStudent.getAdmissionNumber().isBlank())
                            ? matchedStudent.getAdmissionNumber() : matchedStudent.getName();
                    errors.add(BulkUploadBillingError.builder()
                            .row(excelRow)
                            .studentName(matchedStudent.getName())
                            .admissionNumber(matchedStudent.getAdmissionNumber() != null ? matchedStudent.getAdmissionNumber() : rowAdmNo)
                            .className(rowClassName)
                            .errorType("Class Mismatch")
                            .errorMessage(String.format("Student %s belongs to %s, but the uploaded Excel specifies %s.",
                                    admOrName, matchedStudent.getClassName(), rowClassName))
                            .build());
                    continue;
                }

                // Check inactive status
                if (Boolean.FALSE.equals(matchedStudent.getIsActive())) {
                    errors.add(BulkUploadBillingError.builder()
                            .row(excelRow)
                            .studentName(matchedStudent.getName())
                            .admissionNumber(matchedStudent.getAdmissionNumber())
                            .className(matchedStudent.getClassName())
                            .errorType("Inactive Student")
                            .errorMessage(String.format("Student \"%s\" is inactive and cannot be included in the active billing upload.",
                                    matchedStudent.getName()))
                            .build());
                    continue;
                }

                // Check duplicate student within the uploaded Excel file
                if (seenStudentIdToRow.containsKey(matchedStudent.getId())) {
                    int prevRow = seenStudentIdToRow.get(matchedStudent.getId());
                    errors.add(BulkUploadBillingError.builder()
                            .row(excelRow)
                            .studentName(matchedStudent.getName())
                            .admissionNumber(matchedStudent.getAdmissionNumber())
                            .className(matchedStudent.getClassName())
                            .errorType("Duplicate Student")
                            .errorMessage(String.format("Duplicate billing record for student \"%s\". First occurrence: Row %d. Duplicate occurrence: Row %d.",
                                    matchedStudent.getName(), prevRow, excelRow))
                            .duplicateWithRow(prevRow)
                            .build());
                    continue;
                }
                seenStudentIdToRow.put(matchedStudent.getId(), excelRow);

                // Parse & Validate numeric fee amounts
                BigDecimal termFees1 = term1Col >= 0 ? parseAmount(row.getCell(term1Col), "Term Fees - 1", excelRow, matchedStudent, errors) : BigDecimal.ZERO;
                BigDecimal termFees2 = term2Col >= 0 ? parseAmount(row.getCell(term2Col), "Term Fees - 2", excelRow, matchedStudent, errors) : BigDecimal.ZERO;
                BigDecimal termFees3 = term3Col >= 0 ? parseAmount(row.getCell(term3Col), "Term Fees - 3", excelRow, matchedStudent, errors) : BigDecimal.ZERO;
                BigDecimal busFees = busCol >= 0 ? parseAmount(row.getCell(busCol), "Bus Fees", excelRow, matchedStudent, errors) : BigDecimal.ZERO;
                BigDecimal examFees = examCol >= 0 ? parseAmount(row.getCell(examCol), "Exam Fees", excelRow, matchedStudent, errors) : BigDecimal.ZERO;
                BigDecimal paidAmount = paidCol >= 0 ? parseAmount(row.getCell(paidCol), "Paid Amount", excelRow, matchedStudent, errors) : BigDecimal.ZERO;

                if (termFees1 == null || termFees2 == null || termFees3 == null ||
                        busFees == null || examFees == null || paidAmount == null) {
                    // Numeric error already added to errors list
                    continue;
                }

                // Calculate Total & Outstanding
                BigDecimal totalAmount = termFees1.add(termFees2).add(termFees3).add(busFees).add(examFees);
                BigDecimal outstandingAmount = totalAmount.subtract(paidAmount);
                if (outstandingAmount.compareTo(BigDecimal.ZERO) < 0) {
                    outstandingAmount = BigDecimal.ZERO;
                }

                recordsToSave.add(new FeeRecordToSave(
                        matchedStudent,
                        termFees1,
                        termFees2,
                        termFees3,
                        busFees,
                        examFees,
                        totalAmount,
                        paidAmount,
                        outstandingAmount
                ));
            }
        }

        // If any error exists across any row, fail atomically!
        if (!errors.isEmpty()) {
            String errorExcelBase64 = generateErrorExcelBase64(errors);
            return BulkUploadBillingResult.builder()
                    .success(false)
                    .totalRows(recordsToSave.size() + errors.size())
                    .insertedCount(0)
                    .errorCount(errors.size())
                    .message(String.format("Bulk Upload Failed: %d error(s) found. No billing records added.", errors.size()))
                    .errors(errors)
                    .errorExcelBase64(errorExcelBase64)
                    .build();
        }

        // All rows are 100% valid -> Commit to database atomically
        int savedCount = 0;
        Set<String> distinctProcessedClasses = new LinkedHashSet<>();
        for (FeeRecordToSave rec : recordsToSave) {
            String studentClass = rec.student.getClassName();
            distinctProcessedClasses.add(studentClass);

            Fee fee = feeRepository.findByStudentIdAndSchoolId(rec.student.getId(), schoolId).stream()
                    .filter(f -> studentClass.equalsIgnoreCase(f.getClassName()))
                    .findFirst()
                    .orElse(feeRepository.findFirstByStudentIdAndSchoolId(rec.student.getId(), schoolId).orElse(null));

            FeeStatus status;
            if (rec.outstandingAmount.compareTo(BigDecimal.ZERO) == 0 && rec.totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                status = FeeStatus.PAID;
            } else if (rec.paidAmount.compareTo(BigDecimal.ZERO) > 0 && rec.outstandingAmount.compareTo(BigDecimal.ZERO) > 0) {
                status = FeeStatus.PARTIAL;
            } else {
                status = FeeStatus.PENDING;
            }

            if (fee == null) {
                fee = Fee.builder()
                        .studentId(rec.student.getId())
                        .admissionNumber(rec.student.getAdmissionNumber())
                        .studentName(rec.student.getName())
                        .className(studentClass)
                        .termFees1(rec.termFees1)
                        .termFees2(rec.termFees2)
                        .termFees3(rec.termFees3)
                        .busFees(rec.busFees)
                        .examFees(rec.examFees)
                        .totalAmount(rec.totalAmount)
                        .paidAmount(rec.paidAmount)
                        .pendingAmount(rec.outstandingAmount)
                        .status(status)
                        .description("Academic Year 2026-2027 Fee")
                        .schoolId(schoolId)
                        .build();
            } else {
                fee.setAdmissionNumber(rec.student.getAdmissionNumber());
                fee.setStudentName(rec.student.getName());
                fee.setClassName(studentClass);
                fee.setTermFees1(rec.termFees1);
                fee.setTermFees2(rec.termFees2);
                fee.setTermFees3(rec.termFees3);
                fee.setBusFees(rec.busFees);
                fee.setExamFees(rec.examFees);
                fee.setTotalAmount(rec.totalAmount);
                fee.setPaidAmount(rec.paidAmount);
                fee.setPendingAmount(rec.outstandingAmount);
                fee.setStatus(status);
            }
            feeRepository.save(fee);
            savedCount++;
        }

        String classListStr = String.join(", ", distinctProcessedClasses);
        String msg = distinctProcessedClasses.size() > 1
                ? String.format("Bulk Upload Successful: %d billing records committed across %d classes (%s)!", savedCount, distinctProcessedClasses.size(), classListStr)
                : String.format("Bulk Upload Successful: %d billing records committed for %s!", savedCount, classListStr);

        return BulkUploadBillingResult.builder()
                .success(true)
                .totalRows(recordsToSave.size())
                .insertedCount(savedCount)
                .errorCount(0)
                .message(msg)
                .errors(Collections.emptyList())
                .build();
    }

    private BigDecimal parseAmount(Cell cell, String fieldName, int row, StudentInfoDTO student, List<BulkUploadBillingError> errors) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return BigDecimal.ZERO;
        }

        if (cell.getCellType() == CellType.NUMERIC) {
            double val = cell.getNumericCellValue();
            if (val < 0) {
                errors.add(BulkUploadBillingError.builder()
                        .row(row)
                        .studentName(student.getName())
                        .admissionNumber(student.getAdmissionNumber())
                        .className(student.getClassName())
                        .errorType("Negative Amount")
                        .errorMessage(String.format("Field \"%s\" cannot be negative (found: %.2f).", fieldName, val))
                        .build());
                return null;
            }
            return BigDecimal.valueOf(val);
        }

        if (cell.getCellType() == CellType.STRING) {
            String str = cell.getStringCellValue().trim();
            if (str.isEmpty()) return BigDecimal.ZERO;

            // Remove currency symbols and commas if present
            String cleaned = str.replace("₹", "").replace("$", "").replace(",", "").trim();
            try {
                BigDecimal bd = new BigDecimal(cleaned);
                if (bd.compareTo(BigDecimal.ZERO) < 0) {
                    errors.add(BulkUploadBillingError.builder()
                            .row(row)
                            .studentName(student.getName())
                            .admissionNumber(student.getAdmissionNumber())
                            .className(student.getClassName())
                            .errorType("Negative Amount")
                            .errorMessage(String.format("Field \"%s\" cannot be negative (found: %s).", fieldName, str))
                            .build());
                    return null;
                }
                return bd;
            } catch (NumberFormatException e) {
                errors.add(BulkUploadBillingError.builder()
                        .row(row)
                        .studentName(student.getName())
                        .admissionNumber(student.getAdmissionNumber())
                        .className(student.getClassName())
                        .errorType("Invalid Number")
                        .errorMessage(String.format("Invalid numeric amount for \"%s\": \"%s\". Must be a valid non-negative number.", fieldName, str))
                        .build());
                return null;
            }
        }

        errors.add(BulkUploadBillingError.builder()
                .row(row)
                .studentName(student.getName())
                .admissionNumber(student.getAdmissionNumber())
                .className(student.getClassName())
                .errorType("Invalid Format")
                .errorMessage(String.format("Invalid cell format for \"%s\".", fieldName))
                .build());
        return null;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue().trim();
        if (cell.getCellType() == CellType.NUMERIC) {
            long l = (long) cell.getNumericCellValue();
            if (l == cell.getNumericCellValue()) return String.valueOf(l);
            return String.valueOf(cell.getNumericCellValue());
        }
        return null;
    }

    private boolean isRowCompletelyEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                if (cell.getCellType() == CellType.STRING && !cell.getStringCellValue().trim().isEmpty()) {
                    return false;
                }
                if (cell.getCellType() == CellType.NUMERIC) {
                    return false;
                }
            }
        }
        return true;
    }

    private String generateErrorExcelBase64(List<BulkUploadBillingError> errors) {
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Bulk Upload Errors");
            sheet.createFreezePane(0, 1);

            CellStyle headerStyle = wb.createCellStyle();
            Font hFont = wb.createFont();
            hFont.setBold(true);
            hFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(hFont);
            headerStyle.setFillForegroundColor(IndexedColors.RED.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            Row hRow = sheet.createRow(0);
            String[] errorHeaders = {"Excel Row", "Student Name", "Admission No", "Class", "Error Type", "Error Message"};
            for (int i = 0; i < errorHeaders.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(errorHeaders[i]);
                c.setCellStyle(headerStyle);
            }

            int r = 1;
            for (BulkUploadBillingError err : errors) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(err.getRow() > 0 ? "Row " + err.getRow() : "File Header");
                row.createCell(1).setCellValue(err.getStudentName() != null ? err.getStudentName() : "—");
                row.createCell(2).setCellValue(err.getAdmissionNumber() != null ? err.getAdmissionNumber() : "—");
                row.createCell(3).setCellValue(err.getClassName() != null ? err.getClassName() : "—");
                row.createCell(4).setCellValue(err.getErrorType() != null ? err.getErrorType() : "Error");
                row.createCell(5).setCellValue(err.getErrorMessage() != null ? err.getErrorMessage() : "—");
            }

            for (int i = 0; i < errorHeaders.length; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            log.error("Failed to generate error Excel report: {}", e.getMessage());
            return null;
        }
    }

    private int naturalClassCompare(String a, String b) {
        return FeeService.naturalClassCompare(a, b);
    }

    private static class FeeRecordToSave {
        final StudentInfoDTO student;
        final BigDecimal termFees1;
        final BigDecimal termFees2;
        final BigDecimal termFees3;
        final BigDecimal busFees;
        final BigDecimal examFees;
        final BigDecimal totalAmount;
        final BigDecimal paidAmount;
        final BigDecimal outstandingAmount;

        FeeRecordToSave(StudentInfoDTO student, BigDecimal termFees1, BigDecimal termFees2, BigDecimal termFees3,
                        BigDecimal busFees, BigDecimal examFees, BigDecimal totalAmount, BigDecimal paidAmount, BigDecimal outstandingAmount) {
            this.student = student;
            this.termFees1 = termFees1;
            this.termFees2 = termFees2;
            this.termFees3 = termFees3;
            this.busFees = busFees;
            this.examFees = examFees;
            this.totalAmount = totalAmount;
            this.paidAmount = paidAmount;
            this.outstandingAmount = outstandingAmount;
        }
    }
}
