package com.school.auth.service;

import com.school.auth.dto.AuditLogDTO;
import com.school.auth.dto.AuthResponse;
import com.school.auth.dto.LoginRequest;
import com.school.auth.dto.RegisterRequest;
import com.school.auth.dto.UserSummaryDTO;
import com.school.auth.entity.AuditLogEntry;
import com.school.auth.entity.School;
import com.school.auth.entity.User;
import com.school.auth.repository.AuditLogRepository;
import com.school.auth.repository.SchoolRepository;
import com.school.auth.repository.UserRepository;
import com.school.auth.security.JwtUtil;
import com.school.common.enums.Role;
import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service layer for authentication operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final StudentServiceClient studentServiceClient;
    private final AuditLogRepository auditLogRepository;
    private final SchoolRepository schoolRepository;

    /** The email of whoever's JWT is driving the current request, or "system" outside a request. */
    private String currentActorEmail() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (authentication != null && authentication.getName() != null) ? authentication.getName() : "system";
    }

    /**
     * The school a newly-created user should belong to: the acting admin's own school, or
     * (for public self-registration, where there's no acting admin) the sole existing school,
     * if there is exactly one. Returns null otherwise — e.g. a SUPER_ADMIN actor, who has no
     * school of their own, or self-registration once more than one school exists.
     */
    private Long resolveSchoolIdForNewUser() {
        String actorEmail = currentActorEmail();
        if (!"system".equals(actorEmail)) {
            Long actorSchoolId = userRepository.findByEmail(actorEmail).map(User::getSchoolId).orElse(null);
            if (actorSchoolId != null) {
                return actorSchoolId;
            }
        }
        List<School> schools = schoolRepository.findAll();
        return schools.size() == 1 ? schools.get(0).getId() : null;
    }

    private void logAudit(String action, String targetEmail, String targetRole, String details) {
        auditLogRepository.save(AuditLogEntry.builder()
                .actorEmail(currentActorEmail())
                .action(action)
                .targetEmail(targetEmail)
                .targetRole(targetRole)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build());
    }

    /**
     * Register a new user. For PARENT role, studentId should be provided.
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered: " + request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .studentId(request.getRole() == Role.PARENT ? request.getStudentId() : null)
                .assignedClass(request.getRole() == Role.TEACHER ? request.getAssignedClass() : null)
                .assignedSection(request.getRole() == Role.TEACHER ? request.getAssignedSection() : null)
                .dateOfBirth(request.getRole() != Role.PARENT ? request.getDateOfBirth() : null)
                .schoolId(request.getRole() == Role.SUPER_ADMIN ? null : resolveSchoolIdForNewUser())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered new user: {} with role: {}", savedUser.getEmail(), savedUser.getRole());
        if (savedUser.getRole() != Role.PARENT) {
            // Only an authenticated ADMIN can reach this branch for non-PARENT roles (enforced in the controller).
            logAudit("CREATE_STAFF", savedUser.getEmail(), savedUser.getRole().name(), null);
        }

        String token = jwtUtil.generateToken(
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getId(),
                savedUser.getStudentId(),
                savedUser.getAssignedClass(),
                savedUser.getAssignedSection(),
                savedUser.getSchoolId()
        );
        return AuthResponse.of(token, savedUser.getId(), savedUser.getName(),
                savedUser.getEmail(), savedUser.getRole(), savedUser.getStudentId(),
                savedUser.getAssignedClass(), savedUser.getAssignedSection(), savedUser.getSchoolId());
    }

    /**
     * Create a parent user with an explicit studentId. Returns 409 if email already exists.
     */
    public AuthResponse createParent(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A user with email '" + request.getEmail() + "' already exists.");
        }
        if (request.getStudentId() == null) {
            throw new BadRequestException("studentId is required when creating a parent account.");
        }

        // Force role = PARENT regardless of what was sent
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.PARENT)
                .studentId(request.getStudentId())
                .schoolId(resolveSchoolIdForNewUser())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Admin created parent account: {} linked to studentId={}", savedUser.getEmail(), savedUser.getStudentId());

        String token = jwtUtil.generateToken(
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getId(),
                savedUser.getStudentId(),
                null,
                null,
                savedUser.getSchoolId()
        );
        return AuthResponse.of(token, savedUser.getId(), savedUser.getName(),
                savedUser.getEmail(), savedUser.getRole(), savedUser.getStudentId(),
                null, null, savedUser.getSchoolId());
    }

    /**
     * Authenticate an existing user and return a JWT token.
     * Supports both email (Admin/Teacher/Parent) and phone number (Parent).
     */
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()
                ? request.getPhoneNumber().trim()
                : (request.getEmail() != null ? request.getEmail().trim() : "");

        if (identifier.isBlank()) {
            throw new BadRequestException("Email or phone number is required");
        }

        // If identifier does not contain '@' (i.e. is a phone number), route to parent login
        if (!identifier.contains("@")) {
            return parentLogin(com.school.auth.dto.ParentLoginRequest.builder()
                    .phoneNumber(identifier)
                    .password(request.getPassword())
                    .build());
        }

        // Try standard email login
        java.util.Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            // In case a phone number was passed that somehow contained characters or was registered as phone
            try {
                return parentLogin(com.school.auth.dto.ParentLoginRequest.builder()
                        .phoneNumber(identifier)
                        .password(request.getPassword())
                        .build());
            } catch (Exception e) {
                throw new BadRequestException("Invalid email or password");
            }
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        log.info("User logged in: {}", user.getEmail());
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getId(),
                user.getStudentId(),
                user.getAssignedClass(),
                user.getAssignedSection(),
                user.getSchoolId()
        );
        return AuthResponse.of(token, user.getId(), user.getName(),
                user.getEmail(), user.getRole(), user.getStudentId(),
                user.getAssignedClass(), user.getAssignedSection(), user.getSchoolId());
    }

    /**
     * Authenticate parent by phone number + password against credentials stored in student-service.
     */
    public AuthResponse parentLogin(com.school.auth.dto.ParentLoginRequest request) {
        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isBlank()) {
            throw new BadRequestException("Phone number is required");
        }
        if (request.getPassword() == null || request.getPassword().trim().isBlank()) {
            throw new BadRequestException("Password is required");
        }

        String phone = request.getPhoneNumber().trim();
        com.school.auth.dto.StudentAuthDTO student = studentServiceClient.verifyParentCredentials(phone, request.getPassword());
        if (student == null || student.getStudentId() == null) {
            throw new BadRequestException("Unable to resolve student for these credentials");
        }

        // Find or create parent user in auth-service users table so userId is consistent
        User user = userRepository.findByEmail(phone)
                .or(() -> userRepository.findFirstByRoleAndStudentId(Role.PARENT, student.getStudentId()))
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .name(student.getStudentName() != null ? student.getStudentName() + " (Parent)" : "Parent")
                            .email(phone)
                            .password(passwordEncoder.encode(request.getPassword()))
                            .role(Role.PARENT)
                            .studentId(student.getStudentId())
                            // Not resolveSchoolIdForNewUser(): this is a public self-service login
                            // with no authenticated actor, and that heuristic falls back to null
                            // once there's more than one school. The student's own schoolId
                            // (resolved via student-service) is the actual source of truth here.
                            .schoolId(student.getSchoolId())
                            .build();
                    return userRepository.save(newUser);
                });

        // Ensure user's studentId, name, phone/email, and schoolId are in sync with the resolved student
        boolean changed = false;
        if (!student.getStudentId().equals(user.getStudentId())) {
            user.setStudentId(student.getStudentId());
            changed = true;
        }
        if (student.getSchoolId() != null && !student.getSchoolId().equals(user.getSchoolId())) {
            user.setSchoolId(student.getSchoolId());
            changed = true;
        }
        if (student.getStudentName() != null && !student.getStudentName().isBlank()) {
            user.setName(student.getStudentName() + " (Parent)");
            changed = true;
        }
        if (!phone.equals(user.getEmail()) && !userRepository.existsByEmail(phone)) {
            user.setEmail(phone);
            changed = true;
        }
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        changed = true;

        if (changed) {
            user = userRepository.save(user);
        }


        log.info("Parent logged in successfully: phone={}, studentId={}", phone, student.getStudentId());
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getId(),
                student.getStudentId(),
                null,
                null,
                user.getSchoolId()
        );
        return AuthResponse.of(token, user.getId(), user.getName(),
                user.getEmail(), user.getRole(), student.getStudentId(),
                null, null, user.getSchoolId());
    }

    /**
     * Fetch all users by role (e.g. all PARENTs for Admin dropdown).
     */
    public List<UserSummaryDTO> getUsersByRole(String roleName) {
        Role role = Role.valueOf(roleName);
        return userRepository.findByRole(role).stream()
                .map(u -> UserSummaryDTO.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .studentId(u.getStudentId())
                        .build())
                .toList();
    }

    /** Every Admin and Teacher account, for the admin-facing Staff Accounts page. */
    public List<UserSummaryDTO> getStaffUsers() {
        return java.util.stream.Stream.concat(
                        userRepository.findByRole(Role.ADMIN).stream(),
                        userRepository.findByRole(Role.TEACHER).stream())
                .map(u -> UserSummaryDTO.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .role(u.getRole().name())
                        .assignedClass(u.getAssignedClass())
                        .assignedSection(u.getAssignedSection())
                        .dateOfBirth(u.getDateOfBirth())
                        .build())
                .sorted(java.util.Comparator.comparing(UserSummaryDTO::getRole).thenComparing(UserSummaryDTO::getName))
                .toList();
    }

    /**
     * Admin resets any user's password — staff or a parent account created via
     * POST /api/auth/parents. Deliberately scoped to just the password field.
     */
    public void resetPassword(Long userId, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 4) {
            throw new BadRequestException("Password must be at least 4 characters.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
        log.info("Admin reset password for user id: {} ({})", userId, user.getEmail());
        logAudit("RESET_PASSWORD", user.getEmail(), user.getRole().name(), null);
    }

    /**
     * Admin deletes a staff (ADMIN/TEACHER) account. Refuses to delete your own account or the
     * last remaining administrator, so the school can never lock itself out of the admin portal.
     */
    public void deleteStaff(Long userId) {
        String actorEmail = currentActorEmail();
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (target.getRole() != Role.ADMIN && target.getRole() != Role.TEACHER) {
            throw new BadRequestException("Only Admin or Teacher accounts can be deleted here.");
        }
        if (target.getEmail().equalsIgnoreCase(actorEmail)) {
            throw new BadRequestException("You cannot delete your own account.");
        }
        if (target.getRole() == Role.ADMIN && userRepository.findByRole(Role.ADMIN).size() <= 1) {
            throw new BadRequestException("Cannot delete the last remaining administrator account.");
        }

        userRepository.delete(target);
        log.info("{} deleted {} account: {}", actorEmail, target.getRole(), target.getEmail());
        logAudit("DELETE_STAFF", target.getEmail(), target.getRole().name(), null);
    }

    /** Most recent account-management actions (staff created/deleted, password resets). ADMIN only. */
    public List<AuditLogDTO> getRecentAuditLog() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 100)).stream()
                .map(e -> AuditLogDTO.builder()
                        .id(e.getId())
                        .actorEmail(e.getActorEmail())
                        .action(e.getAction())
                        .targetEmail(e.getTargetEmail())
                        .targetRole(e.getTargetRole())
                        .details(e.getDetails())
                        .createdAt(e.getCreatedAt())
                        .build())
                .toList();
    }
}
