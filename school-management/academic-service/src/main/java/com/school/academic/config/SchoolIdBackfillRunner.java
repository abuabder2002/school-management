package com.school.academic.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Backfills schoolId = 1 (Default School) on every pre-existing row across this service's 7
 * tables with a null schoolId — safe because, before this release, academic-service had no
 * tenant concept at all. Also replaces academic_classes' old globally-unique "name" constraint
 * with a per-school composite one (two schools must each be able to have their own "Class 1").
 * Idempotent: runs every boot, safe to repeat.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class SchoolIdBackfillRunner implements CommandLineRunner {

    private static final String[] TABLES = {
            "academic_classes", "exams", "homework", "subjects", "marks", "board_results", "class_schedule"
    };

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        for (String table : TABLES) {
            try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
                int updated = stmt.executeUpdate("UPDATE " + table + " SET school_id = 1 WHERE school_id IS NULL");
                if (updated > 0) {
                    log.info("Backfilled school_id=1 on {} row(s) in {}", updated, table);
                }
            } catch (Exception e) {
                log.warn("Could not backfill {}.school_id (non-fatal): {}", table, e.getMessage());
            }
        }

        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE academic_classes DROP CONSTRAINT IF EXISTS ukht57nns1qytguq5165nyv3te1");
            stmt.execute("ALTER TABLE academic_classes DROP CONSTRAINT IF EXISTS uk_academic_classes_name_school");
            stmt.execute("ALTER TABLE academic_classes ADD CONSTRAINT uk_academic_classes_name_school UNIQUE (name, school_id)");
            log.info("academic_classes name uniqueness verified/repaired as (name, school_id)");
        } catch (Exception e) {
            log.warn("Could not repair academic_classes name uniqueness (non-fatal): {}", e.getMessage());
        }
    }
}
