package com.school.auth.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Repairs the "users_role_check" CHECK constraint: Hibernate auto-generated it from the Role
 * enum's values back when the users table/column was first created (ADMIN/TEACHER/PARENT
 * only); ddl-auto=update never revisits an existing constraint, so adding SUPER_ADMIN to the
 * enum alone would make every SUPER_ADMIN insert fail at the DB level. Must run before any
 * runner that might insert a SUPER_ADMIN row (hence @Order(0), lower/first than the bootstrap
 * runners). Runs every boot (cheap, idempotent) so it self-heals wherever this constraint exists.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class RoleCheckConstraintRepairRunner implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            stmt.execute("ALTER TABLE users ADD CONSTRAINT users_role_check "
                    + "CHECK (role IN ('SUPER_ADMIN','ADMIN','TEACHER','PARENT'))");
            log.info("users_role_check constraint verified/repaired");
        } catch (Exception e) {
            log.warn("Could not repair users_role_check constraint (non-fatal): {}", e.getMessage());
        }
    }
}
