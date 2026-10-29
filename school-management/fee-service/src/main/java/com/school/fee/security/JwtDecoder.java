package com.school.fee.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;

/**
 * Read-only JWT decoder for fee-service.
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

    public String extractRaw(String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
