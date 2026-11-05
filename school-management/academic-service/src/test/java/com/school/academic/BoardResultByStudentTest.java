package com.school.academic;

import com.school.academic.dto.BoardResultDTO;
import com.school.academic.entity.BoardResult;
import com.school.academic.repository.AcademicClassRepository;
import com.school.academic.repository.BoardResultRepository;
import com.school.academic.repository.ExamRepository;
import com.school.academic.repository.HomeworkRepository;
import com.school.academic.repository.MarkRepository;
import com.school.academic.repository.SubjectRepository;
import com.school.academic.service.AcademicDefaultsSeeder;
import com.school.academic.service.AcademicService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * A parent's Board Result view (and the Admin portal's) reads one student's results — school- and
 * student-scoped, with schoolId carried through to the DTO so the Admin "view" page can show the
 * right one without an explicit school picker.
 */
public class BoardResultByStudentTest {

    private AcademicService newService(BoardResultRepository boardResultRepository) {
        return new AcademicService(
                Mockito.mock(AcademicClassRepository.class),
                Mockito.mock(SubjectRepository.class),
                Mockito.mock(ExamRepository.class),
                Mockito.mock(MarkRepository.class),
                Mockito.mock(HomeworkRepository.class),
                boardResultRepository,
                Mockito.mock(AcademicDefaultsSeeder.class));
    }

    @Test
    void returnsOnlyThatStudentsResultsForThatSchoolWithSchoolIdOnTheDto() {
        BoardResultRepository repo = Mockito.mock(BoardResultRepository.class);
        AcademicService service = newService(repo);

        BoardResult result = BoardResult.builder()
                .id(1L).studentId(501L).studentName("Kumar").board("STATE_BOARD").standard("X")
                .academicYear("2026-2027").subjects(List.of()).totalMarks(0.0).schoolId(3L)
                .build();
        Mockito.when(repo.findByStudentIdAndSchoolIdOrderByCreatedAtDesc(501L, 3L)).thenReturn(List.of(result));

        List<BoardResultDTO> dtos = service.getBoardResultsByStudent(501L, 3L);

        assertEquals(1, dtos.size());
        assertEquals(3L, dtos.get(0).getSchoolId());
        assertEquals("Kumar", dtos.get(0).getStudentName());
    }

    @Test
    void noResultsForThatStudentIsAnEmptyList() {
        BoardResultRepository repo = Mockito.mock(BoardResultRepository.class);
        AcademicService service = newService(repo);
        Mockito.when(repo.findByStudentIdAndSchoolIdOrderByCreatedAtDesc(999L, 3L)).thenReturn(List.of());

        assertTrue(service.getBoardResultsByStudent(999L, 3L).isEmpty());
    }
}
