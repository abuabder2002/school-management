package com.school.student.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Backfills schoolId = 1 (Default School) on every pre-existing row with a null schoolId.
 * Safe because, before this release, student-service had no tenant concept at all — every row
 * belonged to the single shared dataset that is now Default School. Idempotent: a row already
 * backfilled (or genuinely created under another school) has a non-null schoolId and is
 * untouched on subsequent boots.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class SchoolIdBackfillRunner implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            int updated = stmt.executeUpdate("UPDATE students SET school_id = 1 WHERE school_id IS NULL");
            if (updated > 0) {
                log.info("Backfilled school_id=1 on {} student row(s)", updated);
            }
        } catch (Exception e) {
            log.warn("Could not backfill students.school_id (non-fatal): {}", e.getMessage());
        }
    }
}
