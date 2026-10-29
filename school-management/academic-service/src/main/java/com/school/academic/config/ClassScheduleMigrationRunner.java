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
 * The class_schedule table was originally day-of-week/period based; those columns (day_of_week,
 * period_number) were created NOT NULL by Hibernate. The entity has moved to a date+block model
 * and no longer sets those columns, but ddl-auto=update never relaxes an existing NOT NULL
 * constraint — left as-is, every new schedule insert would fail at the DB level. Runs every
 * boot (cheap, idempotent) so it self-heals wherever this constraint exists.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class ClassScheduleMigrationRunner implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE class_schedule ALTER COLUMN day_of_week DROP NOT NULL");
            stmt.execute("ALTER TABLE class_schedule ALTER COLUMN period_number DROP NOT NULL");
            log.info("class_schedule legacy column constraints verified/repaired");
        } catch (Exception e) {
            log.warn("Could not repair class_schedule legacy constraints (non-fatal): {}", e.getMessage());
        }
        // Rows from the old day-of-week model never got a schedule_date (that column didn't exist
        // yet when they were created) — they're orphaned test/legacy data under the new date+block
        // model and would otherwise clutter the new date-based summary. Deleting is safe because a
        // row created under the new model always sets schedule_date.
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            int removed = stmt.executeUpdate("DELETE FROM class_schedule WHERE schedule_date IS NULL");
            if (removed > 0) {
                log.info("Removed {} legacy class_schedule row(s) with no schedule_date", removed);
            }
        } catch (Exception e) {
            log.warn("Could not clean up legacy class_schedule rows (non-fatal): {}", e.getMessage());
        }
    }
}
