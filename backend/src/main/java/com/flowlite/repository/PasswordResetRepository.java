package com.flowlite.repository;

import com.flowlite.entity.PasswordReset;
import com.flowlite.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {
    
    /**
     * Find valid reset token
     */
    @Query("SELECT pr FROM PasswordReset pr WHERE pr.token = :token " +
           "AND pr.used = false AND pr.expiresAt > :now")
    Optional<PasswordReset> findValidToken(@Param("token") String token, 
                                           @Param("now") LocalDateTime now);
    
    /**
     * Find by token
     */
    Optional<PasswordReset> findByToken(String token);
    
    /**
     * Delete expired tokens (cleanup)
     */
    void deleteByExpiresAtBefore(LocalDateTime expiryDate);
    
    /**
     * Find latest token for user
     */
    Optional<PasswordReset> findFirstByUserOrderByCreatedAtDesc(User user);
}
