package com.school.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * Utility class for JWT token generation and validation.
 */
@Component
@Slf4j
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    private Key getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate a JWT token embedding email, role, userId and optionally studentId.
     * studentId is null for ADMIN/TEACHER users.
     */
    public String generateToken(String email, String role, Long userId, Long studentId) {
        return generateToken(email, role, userId, studentId, null, null, null);
    }

    /**
     * Generate a JWT token embedding email, role, userId, studentId, assignedClass, assignedSection.
     */
    public String generateToken(String email, String role, Long userId, Long studentId, String assignedClass, String assignedSection) {
        return generateToken(email, role, userId, studentId, assignedClass, assignedSection, null);
    }

    /**
     * Generate a JWT token embedding email, role, userId, studentId, assignedClass, assignedSection, schoolId.
     * schoolId is null only for SUPER_ADMIN users.
     */
    public String generateToken(String email, String role, Long userId, Long studentId, String assignedClass, String assignedSection, Long schoolId) {
        var builder = Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .claim("userId", userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration));

        if (studentId != null) {
            builder.claim("studentId", studentId);
        }
        if (assignedClass != null && !assignedClass.isBlank()) {
            builder.claim("assignedClass", assignedClass);
        }
        if (assignedSection != null && !assignedSection.isBlank()) {
            builder.claim("assignedSection", assignedSection);
        }
        if (schoolId != null) {
            builder.claim("schoolId", schoolId);
        }

        return builder.signWith(getSigningKey(), SignatureAlgorithm.HS256).compact();
    }

    /**
     * Extract the userId claim from a JWT token.
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("userId", Long.class);
    }

    /**
     * Extract the studentId claim from a JWT token (PARENT users only, null otherwise).
     */
    public Long getStudentIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("studentId", Long.class);
    }

    /**
     * Extract the schoolId claim from a JWT token (null for SUPER_ADMIN users).
     */
    public Long getSchoolIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("schoolId", Long.class);
    }

    /**
     * Extract the role claim from a JWT token.
     */
    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("role", String.class);
    }

    /**
     * Extract the email (subject) from a JWT token.
     */
    public String getEmailFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    /**
     * Validate a JWT token. Returns true if valid.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }
}
