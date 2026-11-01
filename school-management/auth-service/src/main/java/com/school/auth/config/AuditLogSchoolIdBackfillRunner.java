package com.school.auth.config;

import com.school.auth.entity.AuditLogEntry;
import com.school.auth.entity.User;
import com.school.auth.repository.AuditLogRepository;
import com.school.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Idempotent, safe to re-run every boot: stamps schoolId onto any pre-existing audit_log row
 * that predates the schoolId column, using the acting admin's current school. Rows whose actor
 * no longer resolves to a user (deleted account) are left null and simply won't show up in any
 * school's filtered audit log.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(4)
public class AuditLogSchoolIdBackfillRunner implements CommandLineRunner {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<AuditLogEntry> toBackfill = auditLogRepository.findAll().stream()
                .filter(e -> e.getSchoolId() == null)
                .toList();
        if (toBackfill.isEmpty()) {
            return;
        }
        Map<String, Long> schoolIdByEmail = userRepository.findAll().stream()
                .filter(u -> u.getSchoolId() != null)
                .collect(java.util.stream.Collectors.toMap(User::getEmail, User::getSchoolId, (a, b) -> a));
        int updated = 0;
        for (AuditLogEntry entry : toBackfill) {
            Long schoolId = schoolIdByEmail.get(entry.getActorEmail());
            if (schoolId != null) {
                entry.setSchoolId(schoolId);
                updated++;
            }
        }
        auditLogRepository.saveAll(toBackfill);
        log.info("Backfilled schoolId onto {}/{} audit_log row(s)", updated, toBackfill.size());
    }
}
