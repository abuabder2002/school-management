package com.school.auth.config;

import com.school.auth.entity.User;
import com.school.auth.repository.UserRepository;
import com.school.common.enums.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Creates the first SUPER_ADMIN account from BOOTSTRAP_SUPERADMIN_EMAIL / BOOTSTRAP_SUPERADMIN_PASSWORD.
 * Runs only when no SUPER_ADMIN exists yet. Mirrors BootstrapAdminRunner.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class BootstrapSuperAdminRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-superadmin.email:}")
    private String email;

    @Value("${app.bootstrap-superadmin.password:}")
    private String password;

    @Value("${app.bootstrap-superadmin.name:Super Admin}")
    private String name;

    @Override
    public void run(String... args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.info("Bootstrap super admin disabled: BOOTSTRAP_SUPERADMIN_EMAIL / BOOTSTRAP_SUPERADMIN_PASSWORD not set.");
            return;
        }
        if (!userRepository.findByRole(Role.SUPER_ADMIN).isEmpty()) {
            log.info("A SUPER_ADMIN account already exists; bootstrap super admin skipped.");
            return;
        }
        if (password.length() < 8) {
            log.error("BOOTSTRAP_SUPERADMIN_PASSWORD must be at least 8 characters; first super admin not created");
            return;
        }
        if (userRepository.existsByEmail(email)) {
            log.error("CONFIGURATION ERROR: BOOTSTRAP_SUPERADMIN_EMAIL belongs to an existing user. "
                    + "No super admin was created. Operator action required.");
            return;
        }
        User superAdmin = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.SUPER_ADMIN)
                .schoolId(null)
                .build();
        userRepository.save(superAdmin);
        log.info("Created first super admin account: {}", email);
    }
}
