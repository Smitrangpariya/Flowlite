package com.flowlite.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
@Slf4j
public class JwtUtil {
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration}")
    private Long expiration;
    
    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
    
    /**
     * Generate JWT with role claim embedded
     * Token payload: { "sub": username, "role": "ROLE_ADMIN" | "ROLE_TEAM_LEAD" | etc. }
     */
    public String generateToken(String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        // Spring Security expects roles with ROLE_ prefix
        claims.put("role", "ROLE_" + role);
        return createToken(claims, username);
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }
    
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    /**
     * Extract role from JWT token
     * Returns role with ROLE_ prefix (e.g., "ROLE_ADMIN")
     */
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }
    
    /**
     * Extract role without ROLE_ prefix (e.g., "ADMIN")
     */
    public String extractRoleWithoutPrefix(String token) {
        String role = extractRole(token);
        if (role != null && role.startsWith("ROLE_")) {
            return role.substring(5);
        }
        return role;
    }
    
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    public Boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            return true; // Treat parsing errors as expired
        }
    }
    
    public Boolean validateToken(String token, String username) {
        try {
            final String extractedUsername = extractUsername(token);
            boolean valid = extractedUsername != null 
                    && extractedUsername.trim().equalsIgnoreCase(username.trim()) 
                    && !isTokenExpired(token);
            if (!valid) {
                log.debug("Token validation failed: extracted='{}', expected='{}', expired={}", 
                    extractedUsername, username, isTokenExpired(token));
            }
            return valid;
        } catch (Exception e) {
            log.debug("Token validation exception: {}", e.getMessage());
            return false;
        }
    }
}
