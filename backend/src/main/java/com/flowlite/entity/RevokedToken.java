package com.flowlite.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Revoked JWT Tokens
 * Blacklist of invalidated tokens (logout, forced logout, etc.)
 */
@Entity
@Table(name = "revoked_tokens", indexes = {
    @Index(name = "idx_revoked_token", columnList = "token")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevokedToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 500)
    private String token;
    
    @Column(nullable = false)
    private LocalDateTime expiresAt;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime revokedAt;
    
    private String reason; // "LOGOUT", "FORCED_LOGOUT", "SECURITY"
}
