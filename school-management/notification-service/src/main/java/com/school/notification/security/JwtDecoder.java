package com.school.notification.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;

/**
 * Read-only JWT decoder used by Notification Service.
 * Validates and extracts claims using the shared secret.
 */
@Component
public class JwtDecoder {

    @Value("${jwt.secret:defaultSecretKeyForDevelopmentMustBe32BytesLong}")
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
        Claims claims = getClaims(token);
        return claims != null ? claims.get("userId", Long.class) : null;
    }

    public Long getStudentId(String token) {
        Claims claims = getClaims(token);
        return claims != null ? claims.get("studentId", Long.class) : null;
    }

    public String getRole(String token) {
        Claims claims = getClaims(token);
        return claims != null ? claims.get("role", String.class) : null;
    }

    public Claims getClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()).build()
                    .parseClaimsJws(token).getBody();
        } catch (Exception e) {
            return null;
        }
    }

    /** Strips "Bearer " prefix and returns the raw token. */
    public String extractRaw(String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
