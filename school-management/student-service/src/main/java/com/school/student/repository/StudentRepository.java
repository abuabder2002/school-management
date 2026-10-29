package com.school.student.repository;

import com.school.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Repository for Student entity.
 */
@Repository
public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {

    Optional<Student> findByAdmissionNumber(String admissionNumber);

    List<Student> findAllByPhoneNumber(String phoneNumber);

    Optional<Student> findFirstByPhoneNumber(String phoneNumber);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM Student s WHERE " +
           "(s.phoneNumber IS NOT NULL AND (s.phoneNumber = :phone OR s.phoneNumber = :stripped OR s.phoneNumber = :zeroPrefixed)) OR " +
           "(s.contactNumber IS NOT NULL AND (s.contactNumber = :phone OR s.contactNumber = :stripped OR s.contactNumber = :zeroPrefixed)) OR " +
           "(s.fatherMobileNumber IS NOT NULL AND (s.fatherMobileNumber = :phone OR s.fatherMobileNumber = :stripped OR s.fatherMobileNumber = :zeroPrefixed)) OR " +
           "(s.motherMobileNumber IS NOT NULL AND (s.motherMobileNumber = :phone OR s.motherMobileNumber = :stripped OR s.motherMobileNumber = :zeroPrefixed)) OR " +
           "(s.guardianMobileNumber IS NOT NULL AND (s.guardianMobileNumber = :phone OR s.guardianMobileNumber = :stripped OR s.guardianMobileNumber = :zeroPrefixed))")
    List<Student> findByAnyPhoneNumber(
            @org.springframework.data.repository.query.Param("phone") String phone,
            @org.springframework.data.repository.query.Param("stripped") String stripped,
            @org.springframework.data.repository.query.Param("zeroPrefixed") String zeroPrefixed);


    List<Student> findByClassName(String className);

    List<Student> findByClassNameAndIsActiveTrue(String className);

    List<Student> findByIsActiveTrue();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT s.className FROM Student s WHERE s.className IS NOT NULL ORDER BY s.className")
    List<String> findDistinctClassNames();

    List<Student> findByParentId(Long parentId);

    List<Student> findByAdmissionNumberIn(java.util.Collection<String> admissionNumbers);

    boolean existsByAdmissionNumber(String admissionNumber);

    List<Student> findByNameIgnoreCase(String name);

    long countByIsActiveTrue();
    long countByIsActiveFalse();

    Optional<Student> findByIdAndSchoolId(Long id, Long schoolId);

    boolean existsByIdAndSchoolId(Long id, Long schoolId);

    List<Student> findBySchoolId(Long schoolId);

    long countBySchoolId(Long schoolId);
    long countBySchoolIdAndIsActiveTrue(Long schoolId);
    long countBySchoolIdAndIsActiveFalse(Long schoolId);

    long deleteBySchoolId(Long schoolId);

    List<Student> findByParentIdAndSchoolId(Long parentId, Long schoolId);
    // Present/Absent requires attendance repository or complex query, but I will mock it temporarily or implement it properly if attendance entity exists.

    default boolean isDuplicateStudent(String name, String fatherName, String motherName, String guardianName, String address, java.time.LocalDate dateOfBirth) {
        if (name == null) return false;
        List<Student> students = findByNameIgnoreCase(name.trim());
        for (Student s : students) {
            if (matches(s, fatherName, motherName, guardianName, address, dateOfBirth)) {
                return true;
            }
        }
        return false;
    }

    default boolean isDuplicateStudentExcludingId(Long id, String name, String fatherName, String motherName, String guardianName, String address, java.time.LocalDate dateOfBirth) {
        if (name == null) return false;
        List<Student> students = findByNameIgnoreCase(name.trim());
        for (Student s : students) {
            if (!s.getId().equals(id) && matches(s, fatherName, motherName, guardianName, address, dateOfBirth)) {
                return true;
            }
        }
        return false;
    }

    default boolean matches(Student s, String fatherName, String motherName, String guardianName, String address, java.time.LocalDate dateOfBirth) {
        return normalizeString(s.getFatherName()).equals(normalizeString(fatherName)) &&
               normalizeString(s.getMotherName()).equals(normalizeString(motherName)) &&
               normalizeString(s.getGuardianName()).equals(normalizeString(guardianName)) &&
               normalizeString(s.getAddress()).equals(normalizeString(address)) &&
               java.util.Objects.equals(s.getDateOfBirth(), dateOfBirth);
    }

    default String normalizeString(String val) {
        if (val == null) return "";
        return val.trim().toLowerCase();
    }
}
