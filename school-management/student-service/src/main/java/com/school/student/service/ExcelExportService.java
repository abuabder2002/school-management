package com.school.student.service;

import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import com.school.student.util.AcademicClassOrder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

/**
 * Exports every student using the exact same column layout as the bulk-import template
 * (see ExcelImportService.TEMPLATE_HEADERS), so the downloaded file can be edited and
 * re-uploaded through bulk-upload without any reformatting.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private final StudentRepository studentRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    public byte[] generateBackup(String className, Long schoolId) throws IOException {
        boolean filterByClass = className != null && !className.isBlank()
                && !"ALL".equalsIgnoreCase(className.trim()) && !"ALL CLASSES".equalsIgnoreCase(className.trim());

        List<Student> students = studentRepository.findBySchoolId(schoolId).stream()
                .filter(s -> !filterByClass || AcademicClassOrder.isClassMatch(s.getClassName(), className))
                .sorted(Comparator
                        .comparingInt((Student s) -> AcademicClassOrder.getClassRank(s.getClassName()))
                        .thenComparing((Student s) -> s.getSection() != null ? s.getSection() : "", String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Student::getAdmissionNumber, AcademicClassOrder::compareNatural))
                .toList();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            createStudentSheet(workbook, students);
            workbook.write(out);
            log.info("Generated student export (import-template format) with {} students", students.size());
            return out.toByteArray();
        }
    }

    private void createStudentSheet(Workbook workbook, List<Student> students) {
        Sheet sheet = workbook.createSheet("All Students");

        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setFontName("Calibri");

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setBorderBottom(BorderStyle.THIN);

        DataFormat dataFormat = workbook.createDataFormat();
        CellStyle textStyle = workbook.createCellStyle();
        textStyle.setDataFormat(dataFormat.getFormat("@"));
        textStyle.setBorderBottom(BorderStyle.THIN);
        textStyle.setBorderTop(BorderStyle.THIN);
        textStyle.setBorderLeft(BorderStyle.THIN);
        textStyle.setBorderRight(BorderStyle.THIN);
        textStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        String[] headers = ExcelImportService.TEMPLATE_HEADERS;
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(26);
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        sheet.createFreezePane(0, 1);

        int rowNum = 1;
        int serialNo = 1;
        for (Student s : students) {
            Row row = sheet.createRow(rowNum++);
            row.setHeightInPoints(20);

            setText(row, 0, textStyle, String.valueOf(serialNo++));
            setText(row, 1, textStyle, s.getAdmissionNumber());
            setText(row, 2, textStyle, s.getName());
            setText(row, 3, textStyle, AcademicClassOrder.toDisplayClassName(s.getClassName()));
            setText(row, 4, textStyle, s.getSection());
            setText(row, 5, textStyle, s.getDateOfBirth() != null ? s.getDateOfBirth().format(DATE_FMT) : "");
            setText(row, 6, textStyle, s.getGender());
            setText(row, 7, textStyle, s.getFatherName());
            setText(row, 8, textStyle, s.getMotherName());
            setText(row, 9, textStyle, s.getGuardianName());
            String fatherMobile = (s.getFatherMobileNumber() != null && !s.getFatherMobileNumber().isBlank())
                    ? s.getFatherMobileNumber() : s.getContactNumber();
            setText(row, 10, textStyle, fatherMobile);
            setText(row, 11, textStyle, s.getMotherMobileNumber());
            setText(row, 12, textStyle, s.getGuardianMobileNumber());
            setText(row, 13, textStyle, s.getAddress());
            setText(row, 14, textStyle, s.getBloodGroup());
            setText(row, 15, textStyle, s.getJoiningDate() != null ? s.getJoiningDate().format(DATE_FMT) : "");
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.setDefaultColumnStyle(i, textStyle);
            sheet.autoSizeColumn(i);
            int currentWidth = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.max(currentWidth + 800, 3600));
        }

        sheet.setAutoFilter(new CellRangeAddress(0, Math.max(1, rowNum - 1), 0, headers.length - 1));
    }

    private void setText(Row row, int col, CellStyle style, String value) {
        Cell c = row.createCell(col);
        c.setCellValue(value != null ? value.trim() : "");
        c.setCellStyle(style);
    }
}
