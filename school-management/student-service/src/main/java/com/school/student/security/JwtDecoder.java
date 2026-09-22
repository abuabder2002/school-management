package com.school.student.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;

/**
 * Read-only JWT decoder used by Student Service to verify ownership.
 * This does NOT generate tokens — it only validates and extracts claims.
 * Uses the same secret as Auth Service so tokens can be decoded without a network call.
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

    /**
     * Extract the studentId claim (present only in PARENT JWTs).
     * Returns null for ADMIN and TEACHER tokens.
     */
    public Long getStudentId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody();
        return claims.get("studentId", Long.class);
    }

    public String getRole(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody();
        return claims.get("role", String.class);
    }

    /** Strips "Bearer " prefix and returns the raw token. */
    public String extractRaw(String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
