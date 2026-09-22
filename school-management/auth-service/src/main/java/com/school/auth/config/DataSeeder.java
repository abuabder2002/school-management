package com.school.auth.config;

import com.school.auth.entity.User;
import com.school.auth.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.school.common.enums.Role;

/**
 * Seeds demo users on startup. Only sets password/name/role — never overwrites
 * studentId so that any previously assigned parent-student link is preserved.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("Ensuring demo users exist with correct credentials...");
        upsertUser("Admin User",   "admin@school.com",   "Admin@123",   Role.ADMIN);
        upsertUser("Teacher User", "teacher@school.com", "Teacher@123", Role.TEACHER);
        // Note: parent@school.com is a demo seed. Real parents should be created via
        // POST /api/auth/parents with an assigned studentId.
        upsertUser("Demo Parent",  "parent@school.com",  "Parent@123",  Role.PARENT);
        logger.info("Demo users ready.");
    }

    private void upsertUser(String name, String email, String rawPassword, Role role) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setStudentId(null); // new user — no student linked yet
            logger.info("Creating demo user: {}", email);
        } else {
            logger.info("Updating demo user password: {}", email);
            // IMPORTANT: do NOT overwrite studentId — preserve any existing assignment
        }
        user.setName(name);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        userRepository.save(user);
    }
}
