package com.flowlite.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Login Attempt tracking for account lockout
 */
@Entity
@Table(name = "login_attempts", indexes = {
    @Index(name = "idx_attempt_email", columnList = "email"),
    @Index(name = "idx_attempt_ip", columnList = "ip_address")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginAttempt {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String email;
    
    @Column(name = "ip_address", nullable = false, length = 50)
    private String ipAddress;
    
    @Column(nullable = false)
    private Boolean successful;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime attemptTime;
}
