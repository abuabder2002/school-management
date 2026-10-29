package com.school.attendance.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Backfills schoolId = 1 (Default School) on every pre-existing row across this service's 5
 * tables with a null schoolId — safe because, before this release, attendance-service had no
 * tenant concept at all. Idempotent: runs every boot, safe to repeat.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class SchoolIdBackfillRunner implements CommandLineRunner {

    private static final String[] TABLES = {
            "holidays", "attendance", "leave_reasons", "leave_requests", "teacher_leave_requests"
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

        // Pre-existing, unrelated to schoolId: the Attendance entity was refactored from a
        // student-only "studentId" column to a polymorphic personId/personType pair, but the old
        // "student_id" DB column (still NOT NULL) was never dropped — every attendance insert has
        // been failing outright. Found while verifying this task; fixed here since it's the same
        // table and the same "ddl-auto never relaxes an old constraint" root cause as this
        // runner's actual job.
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE attendance ALTER COLUMN student_id DROP NOT NULL");
            log.info("attendance.student_id legacy NOT NULL constraint verified/repaired");
        } catch (Exception e) {
            log.warn("Could not repair attendance.student_id constraint (non-fatal): {}", e.getMessage());
        }
    }
}
