package com.flowlite.repository;

import com.flowlite.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    
    @Query("SELECT ev FROM EmailVerification ev WHERE ev.token = :token " +
           "AND ev.verified = false AND ev.expiresAt > :now")
    Optional<EmailVerification> findValidToken(@Param("token") String token, 
                                               @Param("now") LocalDateTime now);
    
    Optional<EmailVerification> findByToken(String token);
    
    Optional<EmailVerification> findByEmail(String email);
    
    void deleteByExpiresAtBefore(LocalDateTime expiryDate);
}
