package com.school.academic.service;

import com.school.academic.entity.ClassSchedule;
import com.school.academic.repository.ClassScheduleRepository;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassScheduleService {

    private final ClassScheduleRepository scheduleRepository;

    public List<ClassSchedule> getForClass(String className, String section) {
        if (section != null && !section.isBlank()) {
            return scheduleRepository.findByClassNameAndSectionOrderByDayOfWeekAscPeriodNumberAsc(className, section);
        }
        return scheduleRepository.findByClassNameOrderByDayOfWeekAscPeriodNumberAsc(className);
    }

    public ClassSchedule create(ClassSchedule entry) {
        return scheduleRepository.save(entry);
    }

    public ClassSchedule update(Long id, ClassSchedule updated) {
        ClassSchedule existing = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClassSchedule", "id", id));
        existing.setClassName(updated.getClassName());
        existing.setSection(updated.getSection());
        existing.setDayOfWeek(updated.getDayOfWeek());
        existing.setPeriodNumber(updated.getPeriodNumber());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setSubjectName(updated.getSubjectName());
        existing.setTeacherName(updated.getTeacherName());
        return scheduleRepository.save(existing);
    }

    public void delete(Long id) {
        if (!scheduleRepository.existsById(id)) {
            throw new ResourceNotFoundException("ClassSchedule", "id", id);
        }
        scheduleRepository.deleteById(id);
    }
}
