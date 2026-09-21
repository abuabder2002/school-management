package com.school.student.service;

import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import com.school.student.dto.StudentDTO;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Business logic for Student management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;

    public List<StudentDTO> getAllStudents() {
        return studentRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    public List<StudentDTO> getStudentsByParent(Long parentId) {
        return studentRepository.findByParentId(parentId).stream()
                .map(this::toDTO)
                .toList();
    }

    public StudentDTO getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        return toDTO(student);
    }

    public StudentDTO createStudent(StudentDTO dto) {
        if (studentRepository.existsByAdmissionNumber(dto.getAdmissionNumber())) {
            throw new BadRequestException("Admission number already exists: " + dto.getAdmissionNumber());
        }
        Student student = toEntity(dto);
        Student saved = studentRepository.save(student);
        log.info("Created student: {} ({})", saved.getName(), saved.getAdmissionNumber());
        return toDTO(saved);
    }

    public StudentDTO updateStudent(Long id, StudentDTO dto) {
        Student existing = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        existing.setName(dto.getName());
        existing.setDateOfBirth(dto.getDateOfBirth());
        existing.setGender(dto.getGender());
        existing.setParentId(dto.getParentId());
        existing.setClassName(dto.getClassName());
        existing.setSection(dto.getSection());
        existing.setFatherName(dto.getFatherName());
        existing.setMotherName(dto.getMotherName());
        existing.setContactNumber(dto.getContactNumber());
        existing.setAddress(dto.getAddress());
        existing.setBloodGroup(dto.getBloodGroup());

        Student updated = studentRepository.save(existing);
        log.info("Updated student id: {}", id);
        return toDTO(updated);
    }

    public void deleteStudent(Long id) {
        if (!studentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Student", "id", id);
        }
        studentRepository.deleteById(id);
        log.info("Deleted student id: {}", id);
    }

    // --- Mapping helpers ---

    private StudentDTO toDTO(Student student) {
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
                .contactNumber(student.getContactNumber())
                .address(student.getAddress())
                .bloodGroup(student.getBloodGroup())
                .build();
    }

    private Student toEntity(StudentDTO dto) {
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
                .contactNumber(dto.getContactNumber())
                .address(dto.getAddress())
                .bloodGroup(dto.getBloodGroup())
                .build();
    }
}
