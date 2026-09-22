package com.school.auth.controller;

import com.school.auth.dto.AuthResponse;
import com.school.auth.dto.LoginRequest;
import com.school.auth.dto.RegisterRequest;
import com.school.auth.dto.UserSummaryDTO;
import com.school.auth.service.UserService;
import com.school.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing authentication endpoints.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /**
     * POST /api/auth/register — Register a new user (generic, for any role).
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = userService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", authResponse));
    }

    /**
     * POST /api/auth/login — Authenticate user and return JWT.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = userService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    /**
     * GET /api/auth/parents — Fetch all users with role PARENT (for Admin dropdown).
     */
    @GetMapping("/parents")
    public ResponseEntity<ApiResponse<List<UserSummaryDTO>>> getParents() {
        List<UserSummaryDTO> parents = userService.getUsersByRole("PARENT");
        return ResponseEntity.ok(ApiResponse.success(parents));
    }

    /**
     * POST /api/auth/parents — Admin creates a parent account linked to a student.
     * Request body: { name, email, password, studentId }
     * Returns 409 Conflict if email already exists.
     * Returns 400 Bad Request if studentId is missing.
     */
    @PostMapping("/parents")
    public ResponseEntity<ApiResponse<AuthResponse>> createParent(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = userService.createParent(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Parent account created and linked to student", authResponse));
    }
}
