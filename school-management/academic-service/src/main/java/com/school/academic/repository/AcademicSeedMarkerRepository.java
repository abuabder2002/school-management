package com.school.academic.repository;

import com.school.academic.entity.AcademicSeedMarker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AcademicSeedMarkerRepository extends JpaRepository<AcademicSeedMarker, Long> {
}
