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
 * Board results are now entered by Super Admin as free text, with no student account and no
 * school. ddl-auto=update never relaxes an existing NOT NULL constraint, so on a database where
 * board_results already exists these columns must be relaxed explicitly or every save fails.
 * Idempotent, so it runs every boot.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class BoardResultMigrationRunner implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        for (String column : new String[] {"student_id", "school_id"}) {
            try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE board_results ALTER COLUMN " + column + " DROP NOT NULL");
                log.info("board_results.{} is nullable", column);
            } catch (Exception e) {
                log.warn("Could not relax board_results.{} (non-fatal): {}", column, e.getMessage());
            }
        }
    }
}
