package com.school.attendance.repository;

import com.school.attendance.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findAllByOrderByDateAsc();

    List<Holiday> findBySchoolIdOrderByDateAsc(Long schoolId);

    Optional<Holiday> findByIdAndSchoolId(Long id, Long schoolId);
}
