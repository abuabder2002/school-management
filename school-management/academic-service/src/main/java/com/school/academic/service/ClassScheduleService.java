package com.school.academic.service;

import com.school.academic.entity.ClassSchedule;
import com.school.academic.repository.ClassScheduleRepository;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassScheduleService {

    private final ClassScheduleRepository scheduleRepository;

    public List<ClassSchedule> getForClass(String className, String section, LocalDate date, Long schoolId) {
        boolean hasSection = section != null && !section.isBlank();
        if (date != null) {
            return hasSection
                    ? scheduleRepository.findByClassNameAndSectionAndScheduleDateAndSchoolIdOrderByBlockAsc(className, section, date, schoolId)
                    : scheduleRepository.findByClassNameAndScheduleDateAndSchoolIdOrderByBlockAsc(className, date, schoolId);
        }
        return hasSection
                ? scheduleRepository.findByClassNameAndSectionAndSchoolIdOrderByScheduleDateDescBlockAsc(className, section, schoolId)
                : scheduleRepository.findByClassNameAndSchoolIdOrderByScheduleDateDescBlockAsc(className, schoolId);
    }

    public ClassSchedule create(ClassSchedule entry, Long schoolId) {
        entry.setSchoolId(schoolId);
        return scheduleRepository.save(entry);
    }

    public ClassSchedule update(Long id, ClassSchedule updated, Long schoolId) {
        ClassSchedule existing = scheduleRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassSchedule", "id", id));
        existing.setClassName(updated.getClassName());
        existing.setSection(updated.getSection());
        existing.setScheduleDate(updated.getScheduleDate());
        existing.setBlock(updated.getBlock());
        existing.setSubjectName(updated.getSubjectName());
        existing.setTeacherName(updated.getTeacherName());
        return scheduleRepository.save(existing);
    }

    public void delete(Long id, Long schoolId) {
        if (!scheduleRepository.findByIdAndSchoolId(id, schoolId).isPresent()) {
            throw new ResourceNotFoundException("ClassSchedule", "id", id);
        }
        scheduleRepository.deleteById(id);
    }
}
