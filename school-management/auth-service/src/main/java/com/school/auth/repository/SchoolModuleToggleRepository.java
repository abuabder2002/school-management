package com.school.auth.repository;

import com.school.auth.entity.SchoolModuleToggle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolModuleToggleRepository extends JpaRepository<SchoolModuleToggle, Long> {

    List<SchoolModuleToggle> findBySchoolId(Long schoolId);

    Optional<SchoolModuleToggle> findBySchoolIdAndModuleKey(Long schoolId, String moduleKey);
}
