package com.school.academic.repository;

import com.school.academic.entity.ClassSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClassScheduleRepository extends JpaRepository<ClassSchedule, Long> {
    List<ClassSchedule> findByClassNameAndSectionOrderByScheduleDateDescBlockAsc(String className, String section);
    List<ClassSchedule> findByClassNameOrderByScheduleDateDescBlockAsc(String className);
    List<ClassSchedule> findByClassNameAndSectionAndScheduleDateOrderByBlockAsc(String className, String section, LocalDate scheduleDate);
    List<ClassSchedule> findByClassNameAndScheduleDateOrderByBlockAsc(String className, LocalDate scheduleDate);

    List<ClassSchedule> findByClassNameAndSectionAndSchoolIdOrderByScheduleDateDescBlockAsc(String className, String section, Long schoolId);
    List<ClassSchedule> findByClassNameAndSchoolIdOrderByScheduleDateDescBlockAsc(String className, Long schoolId);
    List<ClassSchedule> findByClassNameAndSectionAndScheduleDateAndSchoolIdOrderByBlockAsc(String className, String section, LocalDate scheduleDate, Long schoolId);
    List<ClassSchedule> findByClassNameAndScheduleDateAndSchoolIdOrderByBlockAsc(String className, LocalDate scheduleDate, Long schoolId);

    Optional<ClassSchedule> findByIdAndSchoolId(Long id, Long schoolId);
}
