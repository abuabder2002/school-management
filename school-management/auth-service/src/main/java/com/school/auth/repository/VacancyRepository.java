package com.school.auth.repository;

import com.school.auth.entity.Vacancy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VacancyRepository extends JpaRepository<Vacancy, Long> {
    List<Vacancy> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
}
