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
 * Creates the first ADMIN account from BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD.
 * Runs only when no ADMIN exists yet, so it cannot overwrite an existing admin.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class BootstrapAdminRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.email:}")
    private String email;

    @Value("${app.bootstrap-admin.password:}")
    private String password;

    @Value("${app.bootstrap-admin.name:School Admin}")
    private String name;

    @Override
    public void run(String... args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.info("Bootstrap admin disabled: BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set.");
            return;
        }
        if (!userRepository.findByRole(Role.ADMIN).isEmpty()) {
            log.info("An ADMIN account already exists; bootstrap admin skipped.");
            return;
        }
        if (password.length() < 8) {
            log.error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters; first admin not created");
            return;
        }
        if (userRepository.existsByEmail(email)) {
            log.error("CONFIGURATION ERROR: BOOTSTRAP_ADMIN_EMAIL belongs to an existing non-admin user. "
                    + "No admin was created and no user was promoted. Operator action required.");
            return;
        }
        User admin = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .build();
        userRepository.save(admin);
        log.info("Created first admin account: {}", email);
    }
}
