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
        // admissionNumber used to be globally unique; two different schools must be able to reuse
        // the same admission number (e.g. both start numbering at "001"). Hibernate's ddl-auto
        // never drops a constraint that's no longer declared on the entity, so this replaces it
        // explicitly. Idempotent: DROP ... IF EXISTS, then re-add only if the composite one is
        // missing (duplicate ADD CONSTRAINT would error on every later boot otherwise).
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE students DROP CONSTRAINT IF EXISTS uk4ijilwehsq4n3vhrdlq722lnc");
            stmt.execute("ALTER TABLE students DROP CONSTRAINT IF EXISTS uk_students_admission_school");
            stmt.execute("ALTER TABLE students ADD CONSTRAINT uk_students_admission_school UNIQUE (admission_number, school_id)");
            log.info("students admission_number uniqueness verified/repaired as (admission_number, school_id)");
        } catch (Exception e) {
            log.warn("Could not repair students admission_number uniqueness (non-fatal): {}", e.getMessage());
        }
    }
}
