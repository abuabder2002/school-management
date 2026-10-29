package com.school.student;

import com.school.common.exception.BadRequestException;
import com.school.student.dto.StudentDTO;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import com.school.student.service.StudentService;
import com.school.student.util.AcademicClassOrder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class StudentPromotionValidationTest {

    @Autowired
    private StudentService studentService;

    @Autowired
    private StudentRepository studentRepository;

    private Student testStudent;

    @BeforeEach
    void setUp() {
        // Create or find a test student in Class 10
        String testAdmNo = "TEST-PROMOTE-999";
        studentRepository.findByAdmissionNumber(testAdmNo).ifPresent(s -> studentRepository.delete(s));

        Student s = new Student();
        s.setAdmissionNumber(testAdmNo);
        s.setName("Test Student Class 10");
        s.setClassName("Class 10");
        s.setSection("A");
        s.setFatherName("Test Father");
        s.setFatherMobileNumber("9876543210");
        s.setAddress("123 Test Street");
        s.setDateOfBirth(LocalDate.of(2008, 1, 1));
        s.setGender("Male");
        s.setIsActive(true);
        s.setSchoolId(1L);
        testStudent = studentRepository.save(s);
    }

    @Test
    @DisplayName("Promotion Rule: X -> IX must be rejected")
    void testPromotion_X_to_IX_rejected() {
        StudentDTO dto = StudentDTO.builder()
                .admissionNumber(testStudent.getAdmissionNumber())
                .name(testStudent.getName())
                .className("IX") // Lower class
                .fatherName(testStudent.getFatherName())
                .fatherMobileNumber(testStudent.getFatherMobileNumber())
                .address(testStudent.getAddress())
                .dateOfBirth(testStudent.getDateOfBirth())
                .gender(testStudent.getGender())
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            studentService.updateStudent(testStudent.getId(), dto, 1L);
        });

        assertEquals("Student cannot be demoted to a lower class.", ex.getMessage());
    }

    @Test
    @DisplayName("Promotion Rule: X -> X must be allowed (retaining current class)")
    void testPromotion_X_to_X_allowed() {
        StudentDTO dto = StudentDTO.builder()
                .admissionNumber(testStudent.getAdmissionNumber())
                .name(testStudent.getName())
                .className("Class X") // Same class using Class X
                .fatherName(testStudent.getFatherName())
                .fatherMobileNumber(testStudent.getFatherMobileNumber())
                .address(testStudent.getAddress())
                .dateOfBirth(testStudent.getDateOfBirth())
                .gender(testStudent.getGender())
                .build();

        StudentDTO updated = studentService.updateStudent(testStudent.getId(), dto, 1L);
        assertNotNull(updated);
        assertEquals("Class 10", updated.getClassName());
    }

    @Test
    @DisplayName("Promotion Rule: X -> XI must be allowed")
    void testPromotion_X_to_XI_allowed() {
        StudentDTO dto = StudentDTO.builder()
                .admissionNumber(testStudent.getAdmissionNumber())
                .name(testStudent.getName())
                .className("XI") // Higher class
                .fatherName(testStudent.getFatherName())
                .fatherMobileNumber(testStudent.getFatherMobileNumber())
                .address(testStudent.getAddress())
                .dateOfBirth(testStudent.getDateOfBirth())
                .gender(testStudent.getGender())
                .build();

        StudentDTO updated = studentService.updateStudent(testStudent.getId(), dto, 1L);
        assertNotNull(updated);
        assertEquals("Class 11", updated.getClassName());

        // Verify in DB
        Student fromDb = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertEquals("Class 11", fromDb.getClassName());
    }

    @Test
    @DisplayName("Promotion Rule: X -> XII must be allowed")
    void testPromotion_X_to_XII_allowed() {
        StudentDTO dto = StudentDTO.builder()
                .admissionNumber(testStudent.getAdmissionNumber())
                .name(testStudent.getName())
                .className("XII") // Higher class
                .fatherName(testStudent.getFatherName())
                .fatherMobileNumber(testStudent.getFatherMobileNumber())
                .address(testStudent.getAddress())
                .dateOfBirth(testStudent.getDateOfBirth())
                .gender(testStudent.getGender())
                .build();

        StudentDTO updated = studentService.updateStudent(testStudent.getId(), dto, 1L);
        assertNotNull(updated);
        assertEquals("Class 12", updated.getClassName());
    }

    @Test
    @DisplayName("AcademicClassOrder isPromotionValid tests across all cases")
    void testAcademicClassOrder_PromotionRules() {
        // 1. LKG -> UKG through XII valid, LKG invalid
        assertFalse(AcademicClassOrder.isPromotionValid("LKG", "LKG"));
        assertTrue(AcademicClassOrder.isPromotionValid("LKG", "UKG"));
        assertTrue(AcademicClassOrder.isPromotionValid("LKG", "I"));
        assertTrue(AcademicClassOrder.isPromotionValid("LKG", "XII"));

        // 2. UKG -> I through XII valid, LKG and UKG invalid
        assertFalse(AcademicClassOrder.isPromotionValid("UKG", "LKG"));
        assertFalse(AcademicClassOrder.isPromotionValid("UKG", "UKG"));
        assertTrue(AcademicClassOrder.isPromotionValid("UKG", "I"));
        assertTrue(AcademicClassOrder.isPromotionValid("UKG", "XII"));

        // 3. I -> II through XII valid, I or lower invalid
        assertFalse(AcademicClassOrder.isPromotionValid("I", "LKG"));
        assertFalse(AcademicClassOrder.isPromotionValid("I", "UKG"));
        assertFalse(AcademicClassOrder.isPromotionValid("I", "I"));
        assertTrue(AcademicClassOrder.isPromotionValid("I", "II"));
        assertTrue(AcademicClassOrder.isPromotionValid("I", "XII"));

        // 4. V -> VI through XII valid
        assertFalse(AcademicClassOrder.isPromotionValid("V", "V"));
        assertFalse(AcademicClassOrder.isPromotionValid("V", "IV"));
        assertTrue(AcademicClassOrder.isPromotionValid("V", "VI"));
        assertTrue(AcademicClassOrder.isPromotionValid("V", "XII"));

        // 5. IX -> X, XI, XII valid
        assertFalse(AcademicClassOrder.isPromotionValid("IX", "IX"));
        assertFalse(AcademicClassOrder.isPromotionValid("IX", "VIII"));
        assertTrue(AcademicClassOrder.isPromotionValid("IX", "X"));
        assertTrue(AcademicClassOrder.isPromotionValid("IX", "XI"));
        assertTrue(AcademicClassOrder.isPromotionValid("IX", "XII"));

        // 6. X -> XI, XII valid
        assertFalse(AcademicClassOrder.isPromotionValid("X", "X"));
        assertFalse(AcademicClassOrder.isPromotionValid("X", "IX"));
        assertTrue(AcademicClassOrder.isPromotionValid("X", "XI"));
        assertTrue(AcademicClassOrder.isPromotionValid("X", "XII"));

        // 7. XI -> XII valid
        assertFalse(AcademicClassOrder.isPromotionValid("XI", "XI"));
        assertFalse(AcademicClassOrder.isPromotionValid("XI", "X"));
        assertTrue(AcademicClassOrder.isPromotionValid("XI", "XII"));

        // 8. XII -> no higher class available
        assertFalse(AcademicClassOrder.isPromotionValid("XII", "XII"));
        assertFalse(AcademicClassOrder.isPromotionValid("XII", "XI"));
        assertFalse(AcademicClassOrder.isPromotionValid("XII", "I"));
        assertFalse(AcademicClassOrder.isPromotionValid("XII", "LKG"));
    }

    @Test
    @DisplayName("Test toDisplayClassName produces exact required format")
    void testToDisplayClassName() {
        assertEquals("LKG", AcademicClassOrder.toDisplayClassName("LKG"));
        assertEquals("UKG", AcademicClassOrder.toDisplayClassName("UKG"));
        assertEquals("Class I", AcademicClassOrder.toDisplayClassName("Class 1"));
        assertEquals("Class II", AcademicClassOrder.toDisplayClassName("Class 2"));
        assertEquals("Class III", AcademicClassOrder.toDisplayClassName("Class 3"));
        assertEquals("Class IV", AcademicClassOrder.toDisplayClassName("Class 4"));
        assertEquals("Class V", AcademicClassOrder.toDisplayClassName("Class 5"));
        assertEquals("Class VI", AcademicClassOrder.toDisplayClassName("Class 6"));
        assertEquals("Class VII", AcademicClassOrder.toDisplayClassName("Class 7"));
        assertEquals("Class VIII", AcademicClassOrder.toDisplayClassName("Class 8"));
        assertEquals("Class IX", AcademicClassOrder.toDisplayClassName("Class 9"));
        assertEquals("Class X", AcademicClassOrder.toDisplayClassName("Class 10"));
        assertEquals("Class XI", AcademicClassOrder.toDisplayClassName("Class 11"));
        assertEquals("Class XII", AcademicClassOrder.toDisplayClassName("Class 12"));
    }
}
