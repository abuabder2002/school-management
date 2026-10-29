package com.school.auth.service;

import com.school.auth.dto.CreateSchoolRequest;
import com.school.auth.dto.SchoolDTO;
import com.school.auth.dto.UpdateSubscriptionRequest;
import com.school.auth.entity.School;
import com.school.auth.entity.User;
import com.school.auth.repository.SchoolRepository;
import com.school.auth.repository.UserRepository;
import com.school.common.enums.Role;
import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Super Admin management of Schools (tenants): creating a school + its first School Admin
 * login, listing schools, and editing subscription details.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SchoolService {

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public SchoolDTO createSchool(CreateSchoolRequest request) {
        if (userRepository.existsByEmail(request.getAdminEmail())) {
            throw new BadRequestException("Email is already registered: " + request.getAdminEmail());
        }

        School school = School.builder()
                .name(request.getName())
                .subscriptionStart(request.getSubscriptionStart())
                .subscriptionEnd(request.getSubscriptionEnd())
                .planType(request.getPlanType() != null ? request.getPlanType() : School.PlanType.TRIAL)
                .active(true)
                .build();
        School savedSchool = schoolRepository.save(school);

        User admin = User.builder()
                .name(request.getAdminName())
                .email(request.getAdminEmail())
                .password(passwordEncoder.encode(request.getAdminPassword()))
                .role(Role.ADMIN)
                .schoolId(savedSchool.getId())
                .build();
        userRepository.save(admin);

        log.info("Created school '{}' (id={}) with admin login {}", savedSchool.getName(), savedSchool.getId(), admin.getEmail());
        return toDTO(savedSchool, admin.getEmail());
    }

    public List<SchoolDTO> listSchools() {
        return schoolRepository.findAllByOrderByNameAsc().stream()
                .map(school -> {
                    String adminEmail = userRepository.findFirstBySchoolIdAndRole(school.getId(), Role.ADMIN)
                            .map(User::getEmail)
                            .orElse(null);
                    return toDTO(school, adminEmail);
                })
                .toList();
    }

    @Transactional
    public SchoolDTO updateSubscription(Long schoolId, UpdateSubscriptionRequest request) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));

        if (request.getSubscriptionStart() != null) {
            school.setSubscriptionStart(request.getSubscriptionStart());
        }
        if (request.getSubscriptionEnd() != null) {
            school.setSubscriptionEnd(request.getSubscriptionEnd());
        }
        if (request.getPlanType() != null) {
            school.setPlanType(request.getPlanType());
        }
        if (request.getActive() != null) {
            school.setActive(request.getActive());
        }
        School saved = schoolRepository.save(school);
        String adminEmail = userRepository.findFirstBySchoolIdAndRole(schoolId, Role.ADMIN)
                .map(User::getEmail)
                .orElse(null);
        return toDTO(saved, adminEmail);
    }

    /** The caller's own school, read-only (ADMIN role) — resolved from their own User row, never a path/body parameter. */
    public SchoolDTO getOwnSchool() {
        Long schoolId = resolveOwnSchoolId();
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = (authentication != null) ? authentication.getName() : null;
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));
        return toDTO(school, email);
    }

    /** Resolves the caller's own schoolId from their User row (never a path/body parameter). */
    public Long resolveOwnSchoolId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = (authentication != null) ? authentication.getName() : null;
        Long schoolId = email != null
                ? userRepository.findByEmail(email).map(User::getSchoolId).orElse(null)
                : null;
        if (schoolId == null) {
            throw new BadRequestException("Could not resolve your school; please log in again.");
        }
        return schoolId;
    }

    private SchoolDTO toDTO(School school, String adminEmail) {
        return SchoolDTO.builder()
                .id(school.getId())
                .name(school.getName())
                .adminEmail(adminEmail)
                .subscriptionStart(school.getSubscriptionStart())
                .subscriptionEnd(school.getSubscriptionEnd())
                .planType(school.getPlanType())
                .active(school.isActive())
                .createdAt(school.getCreatedAt())
                .build();
    }
}
