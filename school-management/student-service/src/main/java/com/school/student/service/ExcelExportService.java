package com.school.student.service;

import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * Service for exporting school data to Excel workbook.
 * Returns school_management_backup.xlsx with:
 *   - Sheet 1: Students
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private final StudentRepository studentRepository;

    public byte[] generateBackup() throws IOException {
        List<Student> students = studentRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            createStudentSheet(workbook, students);

            workbook.write(out);
            log.info("Generated Excel backup with {} students", students.size());
            return out.toByteArray();
        }
    }

    private void createStudentSheet(Workbook workbook, List<Student> students) {
        Sheet sheet = workbook.createSheet("Students");

        // Style for headers
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(BorderStyle.THIN);

        // Header row
        String[] headers = {
                "Student ID", "Admission No", "Name", "Date of Birth",
                "Gender", "Class", "Section", "Parent ID"
        };
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Freeze header row
        sheet.createFreezePane(0, 1);

        // Enable auto-filter
        sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, headers.length - 1));

        // Date cell style
        CellStyle dateStyle = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("yyyy-MM-dd"));

        // Data rows
        int rowNum = 1;
        for (Student s : students) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(s.getId() != null ? s.getId() : 0);
            row.createCell(1).setCellValue(s.getAdmissionNumber() != null ? s.getAdmissionNumber() : "");
            row.createCell(2).setCellValue(s.getName() != null ? s.getName() : "");

            if (s.getDateOfBirth() != null) {
                Cell dobCell = row.createCell(3);
                dobCell.setCellValue(s.getDateOfBirth().toString());
            } else {
                row.createCell(3).setCellValue("");
            }

            row.createCell(4).setCellValue(s.getGender() != null ? s.getGender() : "");
            row.createCell(5).setCellValue(s.getClassName() != null ? s.getClassName() : "");
            row.createCell(6).setCellValue(s.getSection() != null ? s.getSection() : "");
            row.createCell(7).setCellValue(s.getParentId() != null ? s.getParentId() : 0);
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}
