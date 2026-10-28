package com.school.academic.repository;

import com.school.academic.entity.ClassSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassScheduleRepository extends JpaRepository<ClassSchedule, Long> {
    List<ClassSchedule> findByClassNameAndSectionOrderByDayOfWeekAscPeriodNumberAsc(String className, String section);
    List<ClassSchedule> findByClassNameOrderByDayOfWeekAscPeriodNumberAsc(String className);
}
