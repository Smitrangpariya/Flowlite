package com.flowlite.scheduler;

import com.flowlite.repository.EmailVerificationRepository;
import com.flowlite.repository.PasswordResetRepository;
import com.flowlite.repository.RevokedTokenRepository;
import com.flowlite.repository.LoginAttemptRepository;
import com.flowlite.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Cleanup Scheduler
 * Removes expired tokens and old records to prevent database bloat
 * Runs daily at 2 AM
 */
@Profile("prod")
@Component
@RequiredArgsConstructor
@Slf4j
public class CleanupScheduler {
    
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final AuditLogRepository auditLogRepository;
    
    /**
     * Clean expired email verification tokens
     * Runs daily at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanExpiredEmailVerifications() {
        try {
            LocalDateTime cutoff = LocalDateTime.now();
            emailVerificationRepository.deleteByExpiresAtBefore(cutoff);
            log.info("Cleaned expired email verification tokens");
        } catch (Exception e) {
            log.error("Failed to clean email verification tokens", e);
        }
    }
    
    /**
     * Clean expired password reset tokens
     * Runs daily at 2:05 AM
     */
    @Scheduled(cron = "0 5 2 * * *")
    @Transactional
    public void cleanExpiredPasswordResets() {
        try {
            LocalDateTime cutoff = LocalDateTime.now();
            passwordResetRepository.deleteByExpiresAtBefore(cutoff);
            log.info("Cleaned expired password reset tokens");
        } catch (Exception e) {
            log.error("Failed to clean password reset tokens", e);
        }
    }
    
    /**
     * Clean expired revoked tokens (JWT blacklist)
     * Runs daily at 2:10 AM
     */
    @Scheduled(cron = "0 10 2 * * *")
    @Transactional
    public void cleanExpiredRevokedTokens() {
        try {
            LocalDateTime cutoff = LocalDateTime.now();
            revokedTokenRepository.deleteByExpiresAtBefore(cutoff);
            log.info("Cleaned expired revoked tokens from blacklist");
        } catch (Exception e) {
            log.error("Failed to clean revoked tokens", e);
        }
    }
    
    /**
     * Clean old login attempts (keep 30 days)
     * Runs daily at 2:15 AM
     */
    @Scheduled(cron = "0 15 2 * * *")
    @Transactional
    public void cleanOldLoginAttempts() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
            loginAttemptRepository.deleteByAttemptTimeBefore(cutoff);
            log.info("Cleaned login attempts older than 30 days");
        } catch (Exception e) {
            log.error("Failed to clean login attempts", e);
        }
    }
    
    /**
     * Clean old audit logs (keep 90 days)
     * Runs daily at 2:20 AM
     */
    @Scheduled(cron = "0 20 2 * * *")
    @Transactional
    public void cleanOldAuditLogs() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
            auditLogRepository.deleteByTimestampBefore(cutoff);
            log.info("Cleaned audit logs older than 90 days");
        } catch (Exception e) {
            log.error("Failed to clean audit logs", e);
        }
    }
}
