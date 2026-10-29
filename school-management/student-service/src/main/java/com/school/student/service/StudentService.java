package com.school.student.service;

import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import com.school.student.dto.StudentDTO;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import com.school.student.util.AcademicClassOrder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Business logic for Student management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final AcademicServiceClient academicServiceClient;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public Page<StudentDTO> searchStudents(String search, String className, String status, Pageable pageable, Long schoolId) {
        Specification<Student> spec = Specification.where(null);
        spec = spec.and((root, query, cb) -> cb.equal(root.get("schoolId"), schoolId));
        if (search != null && !search.isBlank()) {
            String likeSearch = "%" + search.toLowerCase().trim() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), likeSearch),
                cb.like(cb.lower(root.get("admissionNumber")), likeSearch),
                cb.like(cb.lower(root.get("fatherMobileNumber")), likeSearch),
                cb.like(cb.lower(root.get("motherMobileNumber")), likeSearch),
                cb.like(cb.lower(root.get("guardianMobileNumber")), likeSearch),
                cb.like(cb.lower(root.get("contactNumber")), likeSearch),
                cb.like(cb.lower(root.get("phoneNumber")), likeSearch)
            ));
        }
        if (className != null && !className.isBlank() && !"all".equalsIgnoreCase(className.trim()) && !"all classes".equalsIgnoreCase(className.trim())) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("className")), className.toLowerCase().trim()));
        }
        if ("active".equalsIgnoreCase(status)) {
            spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isActive")));
        } else if ("inactive".equalsIgnoreCase(status)) {
            spec = spec.and((root, query, cb) -> cb.isFalse(root.get("isActive")));
        }

        List<Student> allMatched = new ArrayList<>(studentRepository.findAll(spec));
        allMatched.sort((s1, s2) -> {
            int classComp = com.school.student.util.AcademicClassOrder.CLASS_COMPARATOR.compare(s1.getClassName(), s2.getClassName());
            if (classComp != 0) return classComp;
            String sec1 = s1.getSection() != null ? s1.getSection() : "";
            String sec2 = s2.getSection() != null ? s2.getSection() : "";
            int secComp = sec1.compareToIgnoreCase(sec2);
            if (secComp != 0) return secComp;
            return com.school.student.util.AcademicClassOrder.compareNatural(s1.getAdmissionNumber(), s2.getAdmissionNumber());
        });

        int total = allMatched.size();
        int fromIndex = (int) pageable.getOffset();
        int toIndex = Math.min(fromIndex + pageable.getPageSize(), total);
        List<StudentDTO> pageList = (fromIndex >= total) ? Collections.emptyList()
                : allMatched.subList(fromIndex, toIndex).stream().map(this::toDTO).toList();

        return new org.springframework.data.domain.PageImpl<>(pageList, pageable, total);
    }

    public List<java.util.Map<String, Object>> getClassStudentSummaries(Long schoolId) {
        List<Student> allStudents = studentRepository.findBySchoolId(schoolId);
        java.util.Map<String, Long> countByClass = new java.util.LinkedHashMap<>();
        
        for (Student s : allStudents) {
            if (s.getClassName() != null && !s.getClassName().isBlank()) {
                String cName = s.getClassName().trim();
                if (cName.matches("(?i)class\\s*\\d+")) {
                    cName = "Class " + cName.replaceAll("(?i)class\\s*", "").trim();
                } else if ("lkg".equalsIgnoreCase(cName)) {
                    cName = "LKG";
                } else if ("ukg".equalsIgnoreCase(cName)) {
                    cName = "UKG";
                }
                countByClass.put(cName, countByClass.getOrDefault(cName, 0L) + 1L);
            }
        }

        return countByClass.entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
                .sorted(java.util.Comparator.comparing(java.util.Map.Entry::getKey, com.school.student.util.AcademicClassOrder.CLASS_COMPARATOR))
                .map(entry -> {
                    java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
                    map.put("className", entry.getKey());
                    map.put("studentCount", entry.getValue());
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    public long countTotalStudents(Long schoolId) { return studentRepository.countBySchoolId(schoolId); }
    public long countActiveStudents(Long schoolId) { return studentRepository.countBySchoolIdAndIsActiveTrue(schoolId); }
    public long countInactiveStudents(Long schoolId) { return studentRepository.countBySchoolIdAndIsActiveFalse(schoolId); }

    public List<StudentDTO> getAllStudents() {
        return studentRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    public List<StudentDTO> getActiveStudentsByClass(String className) {
        return studentRepository.findByClassNameAndIsActiveTrue(className).stream()
                .map(this::toDTO)
                .sorted(java.util.Comparator.comparing(StudentDTO::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public List<String> getDistinctClasses() {
        return studentRepository.findDistinctClassNames().stream()
                .sorted(com.school.student.util.AcademicClassOrder.CLASS_COMPARATOR)
                .toList();
    }

    public java.util.Map<String, List<StudentDTO>> getActiveStudentsGroupedByClass() {
        return studentRepository.findByIsActiveTrue().stream()
                .filter(s -> s.getClassName() != null && !s.getClassName().isBlank())
                .map(this::toDTO)
                .collect(java.util.stream.Collectors.groupingBy(StudentDTO::getClassName));
    }

    public List<StudentDTO> getStudentsByParent(Long parentId, Long schoolId) {
        return studentRepository.findByParentIdAndSchoolId(parentId, schoolId).stream()
                .map(this::toDTO)
                .toList();
    }

    public StudentDTO getStudentById(Long id, Long schoolId) {
        Student student = studentRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        return toDTO(student);
    }

    public StudentDTO createStudent(StudentDTO dto, Long schoolId) {
        if (dto.getClassName() == null || dto.getClassName().isBlank()) {
            throw new BadRequestException("Class name is required");
        }
        if (!AcademicClassOrder.isValidClass(dto.getClassName())) {
            throw new BadRequestException("Invalid class name: " + dto.getClassName());
        }
        dto.setClassName(AcademicClassOrder.toApplicationClassName(dto.getClassName()));

        if ((dto.getFatherName() == null || dto.getFatherName().isBlank()) &&
            (dto.getMotherName() == null || dto.getMotherName().isBlank()) &&
            (dto.getGuardianName() == null || dto.getGuardianName().isBlank())) {
            throw new BadRequestException("Please provide at least one Father Name, Mother Name, or Guardian Name.");
        }

        if (studentRepository.existsByAdmissionNumber(dto.getAdmissionNumber())) {
            throw new BadRequestException("Admission number already exists: " + dto.getAdmissionNumber());
        }
        if (studentRepository.isDuplicateStudent(dto.getName(), dto.getFatherName(), dto.getMotherName(), dto.getGuardianName(), dto.getAddress(), dto.getDateOfBirth())) {
            throw new BadRequestException("A student with the same Name, Father Name, Address and DOB already exists.");
        }
        Student student = toEntity(dto);
        student.setSchoolId(schoolId);
        Student saved = studentRepository.save(student);
        log.info("Created student: {} ({})", saved.getName(), saved.getAdmissionNumber());
        return toDTO(saved);
    }

    public StudentDTO updateStudent(Long id, StudentDTO dto, Long schoolId) {
        if ((dto.getFatherName() == null || dto.getFatherName().isBlank()) &&
            (dto.getMotherName() == null || dto.getMotherName().isBlank()) &&
            (dto.getGuardianName() == null || dto.getGuardianName().isBlank())) {
            throw new BadRequestException("Please provide at least one Father Name, Mother Name, or Guardian Name.");
        }

        Student existing = studentRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        // Validate Class Promotion Rule: allow current class and higher classes, reject lower classes
        if (dto.getClassName() != null && !dto.getClassName().trim().isBlank()) {
            String requestedClass = dto.getClassName().trim();
            String currentClass = existing.getClassName();

            int currentRank = AcademicClassOrder.getClassRank(currentClass);
            int requestedRank = AcademicClassOrder.getClassRank(requestedClass);

            if (requestedRank < currentRank) {
                throw new BadRequestException("Student cannot be demoted to a lower class.");
            }

            existing.setClassName(AcademicClassOrder.toApplicationClassName(requestedClass));
        }

        if (studentRepository.isDuplicateStudentExcludingId(id, dto.getName(), dto.getFatherName(), dto.getMotherName(), dto.getGuardianName(), dto.getAddress(), dto.getDateOfBirth())) {
            throw new BadRequestException("A student with the same Name, Father Name, Address and DOB already exists.");
        }

        existing.setName(dto.getName());
        existing.setDateOfBirth(dto.getDateOfBirth());
        existing.setGender(dto.getGender());
        existing.setParentId(dto.getParentId());
        existing.setSection(dto.getSection());
        existing.setFatherName(dto.getFatherName());
        existing.setMotherName(dto.getMotherName());
        existing.setGuardianName(dto.getGuardianName());
        existing.setFatherMobileNumber(dto.getFatherMobileNumber());
        existing.setMotherMobileNumber(dto.getMotherMobileNumber());
        existing.setGuardianMobileNumber(dto.getGuardianMobileNumber());
        String contact = dto.getContactNumber() != null && !dto.getContactNumber().isBlank()
                ? dto.getContactNumber()
                : (dto.getFatherMobileNumber() != null && !dto.getFatherMobileNumber().isBlank()
                    ? dto.getFatherMobileNumber()
                    : (dto.getMotherMobileNumber() != null && !dto.getMotherMobileNumber().isBlank()
                        ? dto.getMotherMobileNumber()
                        : dto.getGuardianMobileNumber()));
        existing.setContactNumber(contact);
        existing.setAddress(dto.getAddress());
        existing.setBloodGroup(dto.getBloodGroup());
        existing.setJoiningDate(dto.getJoiningDate());
        existing.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : existing.getIsActive());
        existing.setPhoneNumber(dto.getPhoneNumber());
        if (dto.getPhoto() != null) {
            existing.setPhoto(dto.getPhoto());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            existing.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        }

        Student updated = studentRepository.save(existing);
        log.info("Updated student id: {}", id);
        return toDTO(updated);
    }

    /**
     * Admin resets a student's parent-portal login password directly — deliberately separate
     * from updateStudent (which overwrites every field) so resetting a forgotten password can
     * never accidentally blank out the rest of the student's record.
     */
    public void resetParentPassword(Long id, String newPassword, Long schoolId) {
        if (newPassword == null || newPassword.trim().length() < 4) {
            throw new BadRequestException("Password must be at least 4 characters.");
        }
        Student existing = studentRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        existing.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        studentRepository.save(existing);
        log.info("Admin reset parent login password for student id: {}", id);
    }

    public void deleteStudent(Long id, Long schoolId) {
        if (!studentRepository.existsByIdAndSchoolId(id, schoolId)) {
            throw new ResourceNotFoundException("Student", "id", id);
        }
        studentRepository.deleteById(id);
        academicServiceClient.deleteMarksForStudent(id);
        log.info("Deleted student id: {}", id);
    }

    /**
     * Deletes every student record. Mirrors {@link #deleteStudent(Long)}'s scope exactly: only
     * this service's own rows. Marks, fees, attendance and leave records in the other services
     * are untouched (same as a single delete already leaves them), since they're separate
     * databases with no cross-service cascade in this architecture.
     */
    public long clearAllStudents(Long schoolId) {
        long count = studentRepository.deleteBySchoolId(schoolId);
        log.warn("Cleared all student records for schoolId {}: {} deleted", schoolId, count);
        return count;
    }

    public StudentDTO updateStudentStatus(Long id, boolean isActive, Long schoolId) {
        Student existing = studentRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        existing.setIsActive(isActive);
        Student updated = studentRepository.save(existing);
        log.info("Updated student id: {} to isActive={}", id, isActive);
        return toDTO(updated);
    }

    public com.school.student.dto.ParentAuthResultDTO verifyParentCredentials(String phoneNumber, String password) {
        if (phoneNumber == null || phoneNumber.trim().isBlank()) {
            throw new BadRequestException("Parent login phone number is required");
        }
        if (password == null || password.trim().isBlank()) {
            throw new BadRequestException("Password is required");
        }

        String cleanPhone = phoneNumber.trim();
        String digitsOnly = cleanPhone.replaceAll("[^0-9]", "");
        String stripped = digitsOnly.length() >= 10 ? digitsOnly.substring(digitsOnly.length() - 10) : digitsOnly;
        String zeroPrefixed = "0" + stripped;

        List<Student> students = studentRepository.findByAnyPhoneNumber(cleanPhone, stripped, zeroPrefixed);
        if (students.isEmpty()) {
            throw new BadRequestException("No student account found with this phone number");
        }


        for (Student s : students) {
            if (s.getPasswordHash() != null && !s.getPasswordHash().isBlank()) {
                if (passwordEncoder.matches(password, s.getPasswordHash())) {
                    return com.school.student.dto.ParentAuthResultDTO.builder()
                            .studentId(s.getId())
                            .studentName(s.getName())
                            .admissionNumber(s.getAdmissionNumber())
                            .className(s.getClassName())
                            .section(s.getSection())
                            .phoneNumber(s.getPhoneNumber())
                            .isActive(s.getIsActive())
                            .build();
                }
            }
        }

        boolean anyConfigured = students.stream().anyMatch(s -> s.getPasswordHash() != null && !s.getPasswordHash().isBlank());
        if (!anyConfigured) {
            throw new BadRequestException("Parent login password has not been configured. Please contact the administrator.");
        }

        throw new BadRequestException("Invalid phone number or password");
    }

    // --- Mapping helpers ---

    private StudentDTO toDTO(Student student) {
        String fatherMobile = student.getFatherMobileNumber();
        if ((fatherMobile == null || fatherMobile.isBlank()) && student.getContactNumber() != null) {
            fatherMobile = student.getContactNumber();
        }
        return StudentDTO.builder()
                .id(student.getId())
                .admissionNumber(student.getAdmissionNumber())
                .name(student.getName())
                .dateOfBirth(student.getDateOfBirth())
                .gender(student.getGender())
                .parentId(student.getParentId())
                .className(student.getClassName())
                .section(student.getSection())
                .fatherName(student.getFatherName())
                .motherName(student.getMotherName())
                .guardianName(student.getGuardianName())
                .fatherMobileNumber(fatherMobile)
                .motherMobileNumber(student.getMotherMobileNumber())
                .guardianMobileNumber(student.getGuardianMobileNumber())
                .contactNumber(student.getContactNumber())
                .address(student.getAddress())
                .bloodGroup(student.getBloodGroup())
                .joiningDate(student.getJoiningDate())
                .isActive(student.getIsActive())
                .phoneNumber(student.getPhoneNumber())
                .photo(student.getPhoto())
                .hasParentLogin(student.getPasswordHash() != null && !student.getPasswordHash().isBlank())
                .build();
    }

    private Student toEntity(StudentDTO dto) {
        String contact = dto.getContactNumber() != null && !dto.getContactNumber().isBlank()
                ? dto.getContactNumber()
                : (dto.getFatherMobileNumber() != null && !dto.getFatherMobileNumber().isBlank()
                    ? dto.getFatherMobileNumber()
                    : (dto.getMotherMobileNumber() != null && !dto.getMotherMobileNumber().isBlank()
                        ? dto.getMotherMobileNumber()
                        : dto.getGuardianMobileNumber()));

        return Student.builder()
                .admissionNumber(dto.getAdmissionNumber())
                .name(dto.getName())
                .dateOfBirth(dto.getDateOfBirth())
                .gender(dto.getGender())
                .parentId(dto.getParentId())
                .className(dto.getClassName())
                .section(dto.getSection())
                .fatherName(dto.getFatherName())
                .motherName(dto.getMotherName())
                .guardianName(dto.getGuardianName())
                .fatherMobileNumber(dto.getFatherMobileNumber())
                .motherMobileNumber(dto.getMotherMobileNumber())
                .guardianMobileNumber(dto.getGuardianMobileNumber())
                .contactNumber(contact)
                .address(dto.getAddress())
                .bloodGroup(dto.getBloodGroup())
                .joiningDate(dto.getJoiningDate())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .phoneNumber(dto.getPhoneNumber())
                .photo(dto.getPhoto())
                .passwordHash(dto.getPassword() != null && !dto.getPassword().isBlank() ? passwordEncoder.encode(dto.getPassword()) : null)
                .build();
    }
}
