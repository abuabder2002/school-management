package com.school.auth.service;

import com.school.auth.dto.AuthResponse;
import com.school.auth.dto.LoginRequest;
import com.school.auth.dto.RegisterRequest;
import com.school.auth.dto.UserSummaryDTO;
import com.school.auth.entity.User;
import com.school.auth.repository.UserRepository;
import com.school.auth.security.JwtUtil;
import com.school.common.enums.Role;
import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered new user: {} with role: {}", savedUser.getEmail(), savedUser.getRole());

        String token = jwtUtil.generateToken(
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getId(),
                savedUser.getStudentId()
        );
        return AuthResponse.of(token, savedUser.getId(), savedUser.getName(),
                savedUser.getEmail(), savedUser.getRole(), savedUser.getStudentId());
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
                .build();

        User savedUser = userRepository.save(user);
        log.info("Admin created parent account: {} linked to studentId={}", savedUser.getEmail(), savedUser.getStudentId());

        String token = jwtUtil.generateToken(
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getId(),
                savedUser.getStudentId()
        );
        return AuthResponse.of(token, savedUser.getId(), savedUser.getName(),
                savedUser.getEmail(), savedUser.getRole(), savedUser.getStudentId());
    }

    /**
     * Authenticate an existing user and return a JWT token.
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        log.info("User logged in: {}", user.getEmail());
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getId(),
                user.getStudentId()
        );
        return AuthResponse.of(token, user.getId(), user.getName(),
                user.getEmail(), user.getRole(), user.getStudentId());
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
}
