package com.school.attendance.repository;

import com.school.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.school.common.enums.PersonType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Attendance entity.
 */
@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByPersonTypeAndPersonId(PersonType personType, Long personId);

    Optional<Attendance> findByPersonTypeAndPersonIdAndDate(PersonType personType, Long personId, LocalDate date);

    List<Attendance> findByPersonTypeAndDate(PersonType personType, LocalDate date);

    List<Attendance> findByPersonTypeAndPersonIdAndSchoolId(PersonType personType, Long personId, Long schoolId);

    Optional<Attendance> findByPersonTypeAndPersonIdAndDateAndSchoolId(PersonType personType, Long personId, LocalDate date, Long schoolId);

    List<Attendance> findByPersonTypeAndDateAndSchoolId(PersonType personType, LocalDate date, Long schoolId);
}
