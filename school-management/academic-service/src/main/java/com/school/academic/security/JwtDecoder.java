package com.school.academic.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;

/**
 * Read-only JWT decoder for academic-service.
 * Used to extract user role and identity for role-based authorization.
 */
@Component
@Slf4j
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
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public String getRole(String token) {
        if (!StringUtils.hasText(token)) return null;
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
            return claims.get("role", String.class);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Cannot extract role from JWT: {}", e.getMessage());
            return null;
        }
    }

    public Long getUserId(String token) {
        if (!StringUtils.hasText(token)) return null;
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
            return claims.get("userId", Long.class);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
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

    public Long getStudentId(String token) {
        if (!StringUtils.hasText(token)) return null;
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
            return claims.get("studentId", Long.class);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public String extractRaw(String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }
}
