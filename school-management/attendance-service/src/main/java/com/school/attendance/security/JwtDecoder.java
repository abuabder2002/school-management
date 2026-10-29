package com.school.attendance.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;

/**
 * Read-only JWT decoder for attendance-service.
 * Used to extract user identity, role, parent-student link, and teacher class assignment.
 */
@Component
public class JwtDecoder {

    @Value("${jwt.secret}")
    private String jwtSecret;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public boolean isValidToken(String token) {
        if (!StringUtils.hasText(token)) return false;
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody();
        return claims.get("userId", Long.class);
    }

    public Long getStudentId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody();
        return claims.get("studentId", Long.class);
    }

    /** Extract the schoolId claim. Null for SUPER_ADMIN tokens (by design). */
    public Long getSchoolId(String token) {
        if (!StringUtils.hasText(token)) return null;
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
            return claims.get("schoolId", Long.class);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public String getRole(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody();
        return claims.get("role", String.class);
    }

    public String getAssignedClass(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
            String cls = claims.get("assignedClass", String.class);
            if (cls != null && !cls.isBlank()) {
                return cls.trim();
            }
        } catch (Exception ignored) {}
        // Fallback for default demo teacher
        String role = getRole(token);
        if ("TEACHER".equalsIgnoreCase(role)) {
            return "Class 10";
        }
        return null;
    }

    public String getAssignedSection(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
            String sec = claims.get("assignedSection", String.class);
            if (sec != null && !sec.isBlank()) {
                return sec.trim();
            }
        } catch (Exception ignored) {}
        // Fallback for default demo teacher
        String role = getRole(token);
        if ("TEACHER".equalsIgnoreCase(role)) {
            return "A";
        }
        return null;
    }

    public String extractRaw(String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
