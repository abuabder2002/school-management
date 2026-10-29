package com.school.academic.service;

import com.school.academic.dto.BulkUploadError;
import com.school.academic.dto.BulkUploadResult;
import com.school.academic.dto.StudentInfoDTO;
import com.school.academic.entity.Exam;
import com.school.academic.entity.Mark;
import com.school.academic.entity.Subject;
import com.school.academic.repository.ExamRepository;
import com.school.academic.repository.MarkRepository;
import com.school.academic.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bulk marks upload using the school's mark sheet layout — one row per student:
 *
 * <pre>
 * S.No | Mobile | Name | Class | &lt;Subject 1&gt; ... &lt;Subject N&gt; | Total | Average | Grade | A &lt;Subject 1&gt; ... A &lt;Subject N&gt;
 * </pre>
 *
 * Subject columns carry the real subject names from the Subjects master. The "A &lt;Subject&gt;"
 * columns are absent flags. The exam is not part of the sheet; it is chosen on the upload screen.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MarkBulkUploadService {

    public static final String ABSENT_GRADE = "AB";
    public static final String ABSENT_REMARK = "Absent";

    private static final String[] FIXED_HEADERS = {"S.No", "Mobile", "Name", "Class"};
    private static final String[] SUMMARY_HEADERS = {"Total", "Average", "Grade"};
    private static final String ABSENT_HEADER_PREFIX = "A ";
    private static final int BLANK_TEMPLATE_ROWS = 20;

    private static final Pattern ABSENT_HEADER = Pattern.compile("(?i)^(?:absent|abs|ab|a)[\\s\\-_:.]+(.+)$");
    private static final Pattern ABSENT_MARK = Pattern.compile("(?i)^(?:a|ab|abs|absent)$");

    private static final Set<String> IGNORED_HEADERS = Set.of(
            "", "s no", "sno", "sl no", "slno", "serial no", "serial number", "no", "#",
            "total", "average", "avg", "grade", "percentage", "%", "rank", "result", "remarks",
            "section", "sec", "roll no", "roll number", "max marks", "maximum marks");
    private static final Set<String> ADMISSION_HEADERS = Set.of(
            "adm no", "admno", "admission no", "admission number");
    private static final Set<String> MOBILE_HEADERS = Set.of(
            "mobile", "mobile no", "mobile number", "phone", "phone no", "phone number",
            "contact", "contact no", "contact number", "father mobile number");
    private static final Set<String> NAME_HEADERS = Set.of("name", "student name", "student");
    private static final Set<String> CLASS_HEADERS = Set.of("class", "class name", "std", "standard");

    private static final Set<String> ABSENT_YES = Set.of("a", "ab", "abs", "absent", "y", "yes", "true", "1", "x");
    private static final Set<String> ABSENT_NO = Set.of("", "-", "p", "present", "n", "no", "false", "0");

    private static final String[] ROMAN = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"};

    private final MarkRepository markRepository;
    private final SubjectRepository subjectRepository;
    private final ExamRepository examRepository;
    private final StudentServiceClient studentServiceClient;

    // =========================================================================
    // 1. TEMPLATE GENERATION
    // =========================================================================

    /**
     * Generates the mark sheet template (.xlsx) for the chosen subjects, pre-filled with the
     * students of {@code className} (or every class when blank / "ALL").
     */
    public byte[] generateTemplate(String className, List<Long> subjectIds, String examName, Long schoolId) throws IOException {
        if (subjectIds == null || subjectIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one subject for the template.");
        }
        List<Subject> subjects = new ArrayList<>();
        for (Long id : subjectIds) {
            Subject subject = subjectRepository.findByIdAndSchoolId(id, schoolId)
                    .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + id));
            if (!subjects.contains(subject)) subjects.add(subject);
        }

        double maxMarks = 100.0;
        if (examName != null && !examName.isBlank()) {
            maxMarks = maxMarksOf(findExam(examName, schoolId));
        }

        boolean allClasses = className == null || className.isBlank() || "ALL".equalsIgnoreCase(className.trim());
        String targetKey = allClasses ? null : classKey(className);

        List<StudentInfoDTO> students = new ArrayList<>();
        for (StudentInfoDTO s : studentServiceClient.getAllStudents(schoolId)) {
            if (Boolean.FALSE.equals(s.getIsActive())) continue;
            if (targetKey != null && !targetKey.equals(classKey(s.getClassName()))) continue;
            students.add(s);
        }
        students.sort(Comparator
                .comparingInt((StudentInfoDTO s) -> classRank(classKey(s.getClassName())))
                .thenComparing(s -> s.getName() != null ? s.getName() : "", String.CASE_INSENSITIVE_ORDER));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Marks");

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setDataFormat(workbook.createDataFormat().getFormat("@"));

            int n = subjects.size();
            int subjectStart = FIXED_HEADERS.length;
            int totalCol = subjectStart + n;
            int averageCol = totalCol + 1;
            int gradeCol = totalCol + 2;
            int absentStart = totalCol + SUMMARY_HEADERS.length;

            List<String> headers = new ArrayList<>(List.of(FIXED_HEADERS));
            subjects.forEach(s -> headers.add(s.getName().trim()));
            headers.addAll(List.of(SUMMARY_HEADERS));
            subjects.forEach(s -> headers.add(ABSENT_HEADER_PREFIX + s.getName().trim()));

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            String firstSubjectCol = CellReference.convertNumToColString(subjectStart);
            String lastSubjectCol = CellReference.convertNumToColString(subjectStart + n - 1);
            String totalColName = CellReference.convertNumToColString(totalCol);
            String averageColName = CellReference.convertNumToColString(averageCol);

            int rowCount = students.isEmpty() ? BLANK_TEMPLATE_ROWS : students.size();
            for (int i = 0; i < rowCount; i++) {
                Row row = sheet.createRow(i + 1);
                int excelRow = i + 2;
                row.createCell(0).setCellValue(i + 1);

                Cell mobileCell = row.createCell(1);
                mobileCell.setCellStyle(textStyle);
                if (i < students.size()) {
                    StudentInfoDTO s = students.get(i);
                    mobileCell.setCellValue(s.getContactNumber() != null ? s.getContactNumber() : "");
                    row.createCell(2).setCellValue(s.getName() != null ? s.getName().trim() : "");
                    row.createCell(3).setCellValue(toExcelClassName(s.getClassName()));
                } else if (!allClasses) {
                    row.createCell(3).setCellValue(toExcelClassName(className));
                }

                String range = firstSubjectCol + excelRow + ":" + lastSubjectCol + excelRow;
                String totalRef = totalColName + excelRow;
                String averageRef = averageColName + excelRow;
                row.createCell(totalCol).setCellFormula("IF(COUNT(" + range + ")=0,\"\",SUM(" + range + "))");
                row.createCell(averageCol).setCellFormula("IF(" + totalRef + "=\"\",\"\"," + totalRef + "/" + n + ")");
                row.createCell(gradeCol).setCellFormula(gradeFormula(averageRef, maxMarks));
            }

            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i) + 600, 2800));
            }
            sheet.setColumnWidth(1, Math.max(sheet.getColumnWidth(1), 4200));
            sheet.setColumnWidth(2, Math.max(sheet.getColumnWidth(2), 6500));

            // Absent flag columns: type "A" when the student was absent for that subject
            DataValidationHelper dvHelper = sheet.getDataValidationHelper();
            DataValidation absentValidation = dvHelper.createValidation(
                    dvHelper.createExplicitListConstraint(new String[]{"A"}),
                    new CellRangeAddressList(1, Math.max(rowCount + 200, 500), absentStart, absentStart + n - 1));
            absentValidation.setEmptyCellAllowed(true);
            absentValidation.setShowPromptBox(true);
            absentValidation.createPromptBox("Absent", "Enter A if the student was absent for this subject.");
            absentValidation.setShowErrorBox(true);
            absentValidation.createErrorBox("Absent flag", "Enter A for absent, or leave the cell empty.");
            sheet.addValidationData(absentValidation);

            sheet.createFreezePane(FIXED_HEADERS.length, 1);
            sheet.setForceFormulaRecalculation(true);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /** Excel formula mirroring {@link Mark#calculateGrade(Double, Double)}. */
    private String gradeFormula(String averageRef, double maxMarks) {
        String[] grades = {"A+", "A", "B+", "B", "C", "D"};
        int[] percentages = {90, 80, 70, 60, 50, 40};
        StringBuilder formula = new StringBuilder("IF(" + averageRef + "=\"\",\"\",");
        for (int i = 0; i < grades.length; i++) {
            String threshold = BigDecimal.valueOf(maxMarks * percentages[i] / 100.0).stripTrailingZeros().toPlainString();
            formula.append("IF(").append(averageRef).append(">=").append(threshold).append(",\"").append(grades[i]).append("\",");
        }
        formula.append("\"F\"");
        formula.append(")".repeat(grades.length + 1));
        return formula.toString();
    }

    // =========================================================================
    // 2. UPLOAD
    // =========================================================================

    /**
     * Processes a mark sheet upload for one exam. Valid entries are saved (created or updated);
     * every problem is reported per row / subject.
     */
    @Transactional
    public BulkUploadResult processBulkUpload(MultipartFile file, String examName, Long schoolId) throws IOException {
        AcademicService.requireSchoolId(schoolId);
        if (file.isEmpty()) {
            throw new IllegalArgumentException("The uploaded file is empty.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.toLowerCase().endsWith(".xlsx") && !filename.toLowerCase().endsWith(".xls"))) {
            throw new IllegalArgumentException("Invalid file format. Please upload an Excel file (.xlsx or .xls).");
        }
        if (examName == null || examName.isBlank()) {
            throw new IllegalArgumentException("Please select the exam these marks belong to.");
        }
        Exam exam = findExam(examName, schoolId);
        double maxMarks = maxMarksOf(exam);

        // Students indexed for matching
        List<StudentInfoDTO> allStudents = studentServiceClient.getAllStudents(schoolId);
        Map<String, StudentInfoDTO> studentByAdmission = new HashMap<>();
        for (StudentInfoDTO s : allStudents) {
            if (s.getAdmissionNumber() != null && !s.getAdmissionNumber().isBlank()) {
                studentByAdmission.put(s.getAdmissionNumber().trim().toLowerCase(), s);
            }
        }

        // Master subjects by name and by code
        Map<String, Subject> subjectLookup = new HashMap<>();
        List<Subject> allSubjects = subjectRepository.findBySchoolId(schoolId);
        for (Subject sub : allSubjects) {
            if (sub.getCode() != null && !sub.getCode().isBlank()) {
                subjectLookup.put(normalizeText(sub.getCode()), sub);
            }
        }
        for (Subject sub : allSubjects) {
            if (sub.getName() != null) {
                subjectLookup.put(normalizeText(sub.getName()), sub);
            }
        }

        int totalRows = 0;
        int created = 0;
        int updated = 0;
        int skipped = 0;
        List<BulkUploadError> errors = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            int headerRowIndex = findHeaderRow(sheet);
            if (headerRowIndex < 0) {
                throw new IllegalArgumentException(
                        "Could not find the header row. The sheet must have 'Name' and 'Class' columns — please use the downloaded template.");
            }
            Row headerRow = sheet.getRow(headerRowIndex);

            int colAdmission = -1;
            int colMobile = -1;
            int colName = -1;
            int colClass = -1;
            Map<Long, SubjectColumns> subjectColumns = new LinkedHashMap<>();

            for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                String rawHeader = cellText(headerRow, c);
                String header = normalizeHeader(rawHeader);

                if (IGNORED_HEADERS.contains(header)) continue;
                if (ADMISSION_HEADERS.contains(header)) { colAdmission = c; continue; }
                if (MOBILE_HEADERS.contains(header)) { if (colMobile < 0) colMobile = c; continue; }
                if (NAME_HEADERS.contains(header)) { if (colName < 0) colName = c; continue; }
                if (CLASS_HEADERS.contains(header)) { if (colClass < 0) colClass = c; continue; }

                boolean absentColumn = false;
                Subject subject = subjectLookup.get(normalizeText(rawHeader));
                if (subject == null) {
                    Matcher m = ABSENT_HEADER.matcher(rawHeader.trim());
                    if (m.matches()) {
                        subject = subjectLookup.get(normalizeText(m.group(1)));
                        absentColumn = subject != null;
                    }
                }
                if (subject == null) {
                    errors.add(BulkUploadError.builder()
                            .rowNumber(headerRowIndex + 1)
                            .subject(rawHeader)
                            .exam(exam.getName())
                            .issue("Unknown Column")
                            .details("Column '" + rawHeader + "' does not match any subject in the Subjects master. "
                                    + "Download a fresh template, or rename the column to the exact subject name.")
                            .build());
                    continue;
                }

                SubjectColumns cols = subjectColumns.computeIfAbsent(subject.getId(), id -> new SubjectColumns());
                cols.subject = subject;
                boolean duplicate = absentColumn ? cols.absentCol >= 0 : cols.markCol >= 0;
                if (duplicate) {
                    errors.add(BulkUploadError.builder()
                            .rowNumber(headerRowIndex + 1)
                            .subject(rawHeader)
                            .exam(exam.getName())
                            .issue("Duplicate Column")
                            .details("Column '" + rawHeader + "' appears more than once.")
                            .build());
                } else if (absentColumn) {
                    cols.absentCol = c;
                } else {
                    cols.markCol = c;
                }
            }

            if (subjectColumns.isEmpty() && errors.isEmpty()) {
                throw new IllegalArgumentException(
                        "No subject columns found. Download the template with the subjects you want to upload.");
            }
            if (!errors.isEmpty()) {
                // A bad header would silently drop a whole column of marks — save nothing.
                return buildResult(0, 0, 0, 0, errors,
                        "No marks saved: fix the column headers listed below and upload again.");
            }

            for (int r = headerRowIndex + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                int rowNumber = r + 1; // 1-based for user readability

                String rawName = cellText(row, colName);
                String rawClass = cellText(row, colClass);
                String rawMobile = colMobile >= 0 ? cellText(row, colMobile) : "";
                String rawAdmission = colAdmission >= 0 ? cellText(row, colAdmission) : "";

                boolean hasEntries = false;
                for (SubjectColumns cols : subjectColumns.values()) {
                    if (!cellText(row, cols.markCol).isEmpty() || !cellText(row, cols.absentCol).isEmpty()) {
                        hasEntries = true;
                        break;
                    }
                }
                // Unfilled template row (only S.No / Class / formulas)
                if (rawName.isEmpty() && rawAdmission.isEmpty() && !hasEntries) continue;

                totalRows++;

                StudentMatch match = matchStudent(rawAdmission, rawName, rawClass, rawMobile, allStudents, studentByAdmission);
                if (match.student == null) {
                    errors.add(BulkUploadError.builder()
                            .rowNumber(rowNumber)
                            .studentName(rawName)
                            .mobile(rawMobile)
                            .admissionNumber(rawAdmission)
                            .className(rawClass)
                            .exam(exam.getName())
                            .issue(match.issue)
                            .details(match.details)
                            .build());
                    continue;
                }
                StudentInfoDTO student = match.student;

                boolean savedAny = false;
                boolean rowHasError = false;
                for (SubjectColumns cols : subjectColumns.values()) {
                    String markText = cellText(row, cols.markCol);
                    String absentText = cellText(row, cols.absentCol);
                    String problem = null;
                    String problemDetails = null;

                    boolean absent = false;
                    String absentFlag = absentText.toLowerCase();
                    if (ABSENT_YES.contains(absentFlag)) {
                        absent = true;
                    } else if (!ABSENT_NO.contains(absentFlag)) {
                        problem = "Invalid Absent Flag";
                        problemDetails = "'" + absentText + "' is not valid in the absent column. Enter A for absent or leave it empty.";
                    }

                    Double marks = null;
                    if (problem == null && !markText.isEmpty() && !"-".equals(markText)) {
                        if (ABSENT_MARK.matcher(markText).matches()) {
                            absent = true;
                        } else {
                            try {
                                marks = Double.parseDouble(markText);
                            } catch (NumberFormatException e) {
                                problem = "Invalid Number Format";
                                problemDetails = "Marks '" + markText + "' is not a valid number.";
                            }
                            if (marks != null && (marks.isNaN() || marks.isInfinite())) {
                                marks = null;
                                problem = "Invalid Number Format";
                                problemDetails = "Marks '" + markText + "' is not a valid number.";
                            }
                        }
                    }

                    if (problem == null && absent && marks != null && marks > 0) {
                        problem = "Conflicting Entry";
                        problemDetails = "Marked absent but marks " + markText + " are also entered. Clear one of them.";
                    }
                    if (problem == null && !absent && marks != null && (marks < 0 || marks > maxMarks)) {
                        problem = "Invalid Marks";
                        problemDetails = "Marks " + markText + " must be between 0 and Maximum Marks ("
                                + BigDecimal.valueOf(maxMarks).stripTrailingZeros().toPlainString() + ").";
                    }

                    if (problem != null) {
                        rowHasError = true;
                        errors.add(BulkUploadError.builder()
                                .rowNumber(rowNumber)
                                .studentName(student.getName())
                                .mobile(rawMobile)
                                .admissionNumber(student.getAdmissionNumber())
                                .className(rawClass)
                                .section(student.getSection())
                                .subject(cols.subject.getName())
                                .exam(exam.getName())
                                .issue(problem)
                                .details(problemDetails)
                                .build());
                        continue;
                    }
                    if (!absent && marks == null) continue; // nothing entered for this subject

                    if (saveMark(student, cols.subject, exam, absent ? 0.0 : marks, maxMarks, absent, schoolId)) {
                        created++;
                    } else {
                        updated++;
                    }
                    savedAny = true;
                }

                if (!savedAny && !rowHasError) skipped++;
            }
        }

        String summaryMsg = String.format(
                "Processed %d student rows for %s: %d marks added, %d updated, %d errors.",
                totalRows, exam.getName(), created, updated, errors.size());
        log.info("Bulk marks upload finished: {}", summaryMsg);
        return buildResult(totalRows, created, updated, skipped, errors, summaryMsg);
    }

    private BulkUploadResult buildResult(int totalRows, int created, int updated, int skipped,
                                         List<BulkUploadError> errors, String message) {
        return BulkUploadResult.builder()
                .totalRows(totalRows)
                .successful(created)
                .updated(updated)
                .skipped(skipped)
                .failed(errors.size())
                .errors(errors)
                .message(message)
                .build();
    }

    /** Creates or updates one mark. Returns true when a new record was created. */
    private boolean saveMark(StudentInfoDTO student, Subject subject, Exam exam,
                             double marks, double maxMarks, boolean absent, Long schoolId) {
        String grade = absent ? ABSENT_GRADE : Mark.calculateGrade(marks, maxMarks);
        Optional<Mark> existingOpt = markRepository
                .findFirstByStudentIdAndSubjectNameIgnoreCaseAndExamNameIgnoreCaseAndSchoolId(
                        student.getId(), subject.getName(), exam.getName(), schoolId);

        if (existingOpt.isPresent()) {
            Mark existing = existingOpt.get();
            existing.setMarksObtained(marks);
            existing.setMaxMarks(maxMarks);
            existing.setGrade(grade);
            if (absent) {
                existing.setRemarks(ABSENT_REMARK);
            } else if (ABSENT_REMARK.equalsIgnoreCase(existing.getRemarks())) {
                existing.setRemarks(null);
            }
            existing.setClassName(student.getClassName());
            existing.setSection(student.getSection());
            existing.setStudentName(student.getName());
            existing.setAdmissionNumber(student.getAdmissionNumber());
            existing.setExamId(exam.getId());
            existing.setSubjectId(subject.getId());
            existing.setUpdatedAt(LocalDateTime.now());
            markRepository.save(existing);
            return false;
        }

        markRepository.save(Mark.builder()
                .studentId(student.getId())
                .admissionNumber(student.getAdmissionNumber())
                .studentName(student.getName())
                .className(student.getClassName())
                .section(student.getSection())
                .examId(exam.getId())
                .examName(exam.getName())
                .subjectId(subject.getId())
                .subjectName(subject.getName())
                .marksObtained(marks)
                .maxMarks(maxMarks)
                .grade(grade)
                .remarks(absent ? ABSENT_REMARK : null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .schoolId(schoolId)
                .build());
        return true;
    }

    // =========================================================================
    // 3. STUDENT MATCHING (Name + Class, Mobile to tell namesakes apart)
    // =========================================================================

    private StudentMatch matchStudent(String rawAdmission, String rawName, String rawClass, String rawMobile,
                                      List<StudentInfoDTO> allStudents,
                                      Map<String, StudentInfoDTO> studentByAdmission) {
        // Optional "Adm No" column wins when present and known
        if (!rawAdmission.isEmpty()) {
            StudentInfoDTO byAdmission = studentByAdmission.get(rawAdmission.toLowerCase());
            if (byAdmission != null) {
                if (!rawClass.isEmpty() && !classKey(rawClass).equals(classKey(byAdmission.getClassName()))) {
                    return StudentMatch.failure("Invalid Class", "Student " + byAdmission.getName() + " belongs to "
                            + byAdmission.getClassName() + ", but the sheet says " + rawClass + ".");
                }
                return StudentMatch.of(byAdmission);
            }
        }

        if (rawName.isEmpty()) {
            return StudentMatch.failure("Missing Name", "Student name is required.");
        }
        if (rawClass.isEmpty()) {
            return StudentMatch.failure("Missing Class", "Class is required.");
        }

        String nameKey = normalizeText(rawName);
        String clsKey = classKey(rawClass);
        List<StudentInfoDTO> sameName = new ArrayList<>();
        List<StudentInfoDTO> candidates = new ArrayList<>();
        for (StudentInfoDTO s : allStudents) {
            if (!nameKey.equals(normalizeText(s.getName()))) continue;
            sameName.add(s);
            if (clsKey.equals(classKey(s.getClassName()))) candidates.add(s);
        }

        // Prefer active students when a name matches both an active and an inactive record
        List<StudentInfoDTO> active = candidates.stream().filter(s -> !Boolean.FALSE.equals(s.getIsActive())).toList();
        if (!active.isEmpty()) candidates = active;

        if (candidates.isEmpty()) {
            String details = "No student named '" + rawName + "' found in class " + rawClass + ".";
            if (!sameName.isEmpty()) {
                details += " A student with this name exists in " + sameName.get(0).getClassName() + ".";
            }
            return StudentMatch.failure("Student Not Found", details);
        }
        if (candidates.size() == 1) {
            return StudentMatch.of(candidates.get(0));
        }

        String mobileKey = mobileKey(rawMobile);
        List<StudentInfoDTO> byMobile = new ArrayList<>();
        if (!mobileKey.isEmpty()) {
            for (StudentInfoDTO s : candidates) {
                if (s.getMobileNumbers() != null
                        && s.getMobileNumbers().stream().anyMatch(m -> mobileKey.equals(mobileKey(m)))) {
                    byMobile.add(s);
                }
            }
        }
        if (byMobile.size() == 1) {
            return StudentMatch.of(byMobile.get(0));
        }
        return StudentMatch.failure("Ambiguous Student", candidates.size() + " students named '" + rawName
                + "' are in class " + rawClass + ". Fill the Mobile column with the number on record to tell them apart.");
    }

    private static class StudentMatch {
        StudentInfoDTO student;
        String issue;
        String details;

        static StudentMatch of(StudentInfoDTO student) {
            StudentMatch m = new StudentMatch();
            m.student = student;
            return m;
        }

        static StudentMatch failure(String issue, String details) {
            StudentMatch m = new StudentMatch();
            m.issue = issue;
            m.details = details;
            return m;
        }
    }

    private static class SubjectColumns {
        Subject subject;
        int markCol = -1;
        int absentCol = -1;
    }

    // =========================================================================
    // 4. HELPERS
    // =========================================================================

    private Exam findExam(String examName, Long schoolId) {
        String wanted = normalizeText(examName);
        for (Exam ex : examRepository.findBySchoolId(schoolId)) {
            if (ex.getName() != null && normalizeText(ex.getName()).equals(wanted)) {
                return ex;
            }
        }
        throw new IllegalArgumentException("Exam '" + examName.trim() + "' does not exist in master exams.");
    }

    private double maxMarksOf(Exam exam) {
        return exam.getTotalMarks() != null && exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100.0;
    }

    private int findHeaderRow(Sheet sheet) {
        for (int r = 0; r <= Math.min(sheet.getLastRowNum(), 10); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            boolean hasName = false;
            boolean hasClass = false;
            for (int c = 0; c < row.getLastCellNum(); c++) {
                String header = normalizeHeader(cellText(row, c));
                if (NAME_HEADERS.contains(header)) hasName = true;
                if (CLASS_HEADERS.contains(header)) hasClass = true;
            }
            if (hasName && hasClass) return r;
        }
        return -1;
    }

    /** Lower-case, whitespace-collapsed text for name / subject / exam comparison. */
    private static String normalizeText(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private static String normalizeHeader(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase().replaceAll("[._\\-\\s]+", " ").trim();
    }

    /** Last 10 digits, so "+91 98765 43210" and "9876543210" compare equal. */
    private static String mobileKey(String value) {
        if (value == null) return "";
        String digits = value.replaceAll("\\D", "");
        return digits.length() > 10 ? digits.substring(digits.length() - 10) : digits;
    }

    /**
     * Canonical class key so every spelling compares equal:
     * "Class 3", "III", "Std 3", "3" -> "3"; "L.K.G" -> "LKG".
     */
    public static String classKey(String className) {
        if (className == null) return "";
        String s = className.toUpperCase().replace(".", "").replaceAll("\\s+", " ").trim();
        s = s.replaceFirst("^(?:CLASS|GRADE|STANDARD|STD)\\s*", "").trim();
        if (s.equals("PRE-KG") || s.equals("PREKG") || s.equals("PRE KG")) return "PREKG";
        if (s.matches("\\d+(?:ST|ND|RD|TH)?")) {
            return String.valueOf(Integer.parseInt(s.replaceAll("\\D", "")));
        }
        for (int i = 0; i < ROMAN.length; i++) {
            if (ROMAN[i].equals(s)) return String.valueOf(i + 1);
        }
        return s;
    }

    private static int classRank(String classKey) {
        switch (classKey) {
            case "PREKG": return -3;
            case "LKG": return -2;
            case "UKG": return -1;
            default:
                return classKey.matches("\\d+") ? Integer.parseInt(classKey) : 99;
        }
    }

    /** Class as written in the school's mark sheet: LKG, UKG, I, II ... XII. */
    public static String toExcelClassName(String className) {
        if (className == null) return "";
        String key = classKey(className);
        if (key.matches("\\d+")) {
            int num = Integer.parseInt(key);
            if (num >= 1 && num <= ROMAN.length) return ROMAN[num - 1];
        }
        return key.isEmpty() ? "" : (key.equals("LKG") || key.equals("UKG") ? key : className.trim());
    }

    /** Cell content as plain text; formula cells yield their cached value. */
    private static String cellText(Row row, int index) {
        if (row == null || index < 0) return "";
        Cell cell = row.getCell(index);
        if (cell == null) return "";
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        switch (type) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                double d = cell.getNumericCellValue();
                if (d == Math.rint(d) && Math.abs(d) < 1e15) {
                    return String.valueOf((long) d);
                }
                return BigDecimal.valueOf(d).stripTrailingZeros().toPlainString();
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return "";
        }
    }
}
