package com.school.student;

import com.school.student.dto.StudentDTO;
import com.school.student.entity.Student;
import com.school.student.repository.StudentRepository;
import com.school.student.service.AcademicServiceClient;
import com.school.student.service.StudentService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The Super Admin's Board Result "pick a student" search spans every school (no school picker
 * first) — it must carry each match's schoolId so the caller can tell which school a same-named
 * student belongs to, sort by name, and respect the caller's cap.
 */
public class CrossSchoolStudentSearchTest {

    @SuppressWarnings("unchecked")
    @Test
    void mapsEachMatchWithItsOwnSchoolIdSortedByNameAndCappedAtTheLimit() {
        StudentRepository repo = Mockito.mock(StudentRepository.class);
        StudentService service = new StudentService(repo, Mockito.mock(AcademicServiceClient.class));

        Student zed = student(1L, "Zed", 7L);
        Student amy = student(2L, "Amy", 3L);
        Student bob = student(3L, "Bob", 3L);
        Mockito.when(repo.findAll(Mockito.any(Specification.class))).thenReturn(List.of(zed, amy, bob));

        List<StudentDTO> result = service.searchStudentsAcrossSchools("", "", 2);

        assertEquals(2, result.size(), "must respect the limit");
        assertEquals("Amy", result.get(0).getName());
        assertEquals(3L, result.get(0).getSchoolId(), "schoolId must travel with each match");
        assertEquals("Bob", result.get(1).getName());
    }

    @SuppressWarnings("unchecked")
    @Test
    void anEmptyRepositoryResultIsAnEmptyList() {
        StudentRepository repo = Mockito.mock(StudentRepository.class);
        StudentService service = new StudentService(repo, Mockito.mock(AcademicServiceClient.class));
        Mockito.when(repo.findAll(Mockito.any(Specification.class))).thenReturn(List.of());

        List<StudentDTO> result = service.searchStudentsAcrossSchools("nobody", "", 50);

        assertTrue(result.isEmpty());
    }

    private static Student student(Long id, String name, Long schoolId) {
        Student s = new Student();
        s.setId(id);
        s.setName(name);
        s.setAdmissionNumber("ADM-" + id);
        s.setClassName("Class 10");
        s.setIsActive(true);
        s.setSchoolId(schoolId);
        return s;
    }
}
