package com.school.auth.repository;

import com.school.auth.entity.AuditLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntry, Long> {

    List<AuditLogEntry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<AuditLogEntry> findBySchoolIdOrderByCreatedAtDesc(Long schoolId, Pageable pageable);
}
