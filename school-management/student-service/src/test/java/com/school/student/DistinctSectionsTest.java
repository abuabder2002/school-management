package com.school.student;

import com.school.student.repository.StudentRepository;
import com.school.student.service.AcademicServiceClient;
import com.school.student.service.StudentService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The class-details Section filter must show only the sections this school actually uses for that
 * class (e.g. "North"/"South", or none at all) — never a hardcoded A/B/C/D list.
 */
public class DistinctSectionsTest {

    @Test
    void returnsSectionsTheRepositoryReportsForThatClassAndSchool() {
        StudentRepository repo = Mockito.mock(StudentRepository.class);
        AcademicServiceClient academicClient = Mockito.mock(AcademicServiceClient.class);
        StudentService service = new StudentService(repo, academicClient);

        Mockito.when(repo.findDistinctSectionsByClassNameAndSchoolId("State Board Boys", 7L))
                .thenReturn(List.of("North", "South"));

        List<String> sections = service.getDistinctSectionsForClass("State Board Boys", 7L);

        assertEquals(List.of("North", "South"), sections);
    }

    @Test
    void aClassWithNoSectionsOnFileReturnsAnEmptyList() {
        StudentRepository repo = Mockito.mock(StudentRepository.class);
        AcademicServiceClient academicClient = Mockito.mock(AcademicServiceClient.class);
        StudentService service = new StudentService(repo, academicClient);

        Mockito.when(repo.findDistinctSectionsByClassNameAndSchoolId("Class 10", 7L))
                .thenReturn(List.of());

        assertEquals(List.of(), service.getDistinctSectionsForClass("Class 10", 7L));
    }
}
