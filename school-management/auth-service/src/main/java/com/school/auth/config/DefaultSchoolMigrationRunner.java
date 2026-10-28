package com.school.auth.config;

import com.school.auth.entity.School;
import com.school.auth.entity.User;
import com.school.auth.repository.SchoolRepository;
import com.school.auth.repository.UserRepository;
import com.school.common.enums.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * One-time multi-tenancy migration: if no School exists yet, creates a "Default School" row
 * (representing whatever single school this deployment already served) and backfills schoolId
 * on every existing non-SUPER_ADMIN User that doesn't have one. This keeps every pre-existing
 * admin/teacher/parent login working unchanged after this release. Runs after the bootstrap
 * admin/super-admin runners so any account they create is also backfilled.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(3)
public class DefaultSchoolMigrationRunner implements CommandLineRunner {

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;

    @Value("${app.default-school.name:Default School}")
    private String defaultSchoolName;

    @Override
    @Transactional
    public void run(String... args) {
        if (schoolRepository.count() > 0) {
            return;
        }

        School defaultSchool = School.builder()
                .name(defaultSchoolName)
                .subscriptionStart(LocalDate.now())
                .planType(School.PlanType.PAID)
                .active(true)
                .build();
        defaultSchool = schoolRepository.save(defaultSchool);
        log.info("Created default school '{}' (id={})", defaultSchool.getName(), defaultSchool.getId());

        List<User> toBackfill = userRepository.findAll().stream()
                .filter(u -> u.getSchoolId() == null && u.getRole() != Role.SUPER_ADMIN)
                .toList();
        for (User user : toBackfill) {
            user.setSchoolId(defaultSchool.getId());
        }
        userRepository.saveAll(toBackfill);
        log.info("Backfilled schoolId={} onto {} existing user(s)", defaultSchool.getId(), toBackfill.size());
    }
}
