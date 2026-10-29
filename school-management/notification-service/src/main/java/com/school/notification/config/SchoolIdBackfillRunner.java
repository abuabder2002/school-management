package com.school.notification.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Backfills schoolId = 1 (Default School) on every pre-existing row with a null schoolId —
 * safe because, before this release, notification-service had no tenant concept at all.
 * Idempotent: runs every boot, safe to repeat.
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
            int updated = stmt.executeUpdate("UPDATE notifications SET school_id = 1 WHERE school_id IS NULL");
            if (updated > 0) {
                log.info("Backfilled school_id=1 on {} notification row(s)", updated);
            }
        } catch (Exception e) {
            log.warn("Could not backfill notifications.school_id (non-fatal): {}", e.getMessage());
        }
    }
}
