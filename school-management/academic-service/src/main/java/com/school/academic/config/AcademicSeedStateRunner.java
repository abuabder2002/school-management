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
 * Brings schools that existed before the "seed once" marker into line. Idempotent, safe every boot.
 *
 *  1. Marks every school that already has any exam, subject or class as seeded, so nothing it has
 *     deleted (or chooses to delete) is ever re-created.
 *  2. Removes exact duplicate exams/subjects left by the old first-load race (same school, same
 *     name, same date/marks/code) when no marks point at the duplicate. The lowest id is kept, so
 *     marks recorded by exam/subject name still resolve.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class AcademicSeedStateRunner implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        execute("mark already-populated schools as seeded",
                "INSERT INTO academic_seed_markers (school_id, seeded_at) "
                        + "SELECT DISTINCT school_id, now() FROM ("
                        + "  SELECT school_id FROM exams UNION SELECT school_id FROM subjects "
                        + "  UNION SELECT school_id FROM academic_classes) s "
                        + "WHERE school_id IS NOT NULL ON CONFLICT (school_id) DO NOTHING");

        execute("remove duplicate exams",
                "DELETE FROM exams e USING exams keep "
                        + "WHERE e.school_id = keep.school_id AND lower(e.name) = lower(keep.name) AND e.id > keep.id "
                        + "AND e.exam_date IS NOT DISTINCT FROM keep.exam_date "
                        + "AND e.total_marks IS NOT DISTINCT FROM keep.total_marks "
                        + "AND e.class_id IS NOT DISTINCT FROM keep.class_id "
                        + "AND e.subject_id IS NOT DISTINCT FROM keep.subject_id "
                        + "AND NOT EXISTS (SELECT 1 FROM marks m WHERE m.exam_id = e.id)");

        execute("remove duplicate subjects",
                "DELETE FROM subjects s USING subjects keep "
                        + "WHERE s.school_id = keep.school_id AND lower(s.name) = lower(keep.name) AND s.id > keep.id "
                        + "AND s.code IS NOT DISTINCT FROM keep.code "
                        + "AND s.class_id IS NOT DISTINCT FROM keep.class_id "
                        + "AND NOT EXISTS (SELECT 1 FROM marks m WHERE m.subject_id = s.id)");
    }

    private void execute(String what, String sql) {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            int rows = stmt.executeUpdate(sql);
            if (rows > 0) {
                log.info("Academic seed state: {} ({} row(s))", what, rows);
            }
        } catch (Exception e) {
            log.warn("Academic seed state: could not {} (non-fatal): {}", what, e.getMessage());
        }
    }
}
