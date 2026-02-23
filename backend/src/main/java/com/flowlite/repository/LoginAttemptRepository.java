package com.flowlite.repository;

import com.flowlite.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {
    
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE la.email = :email " +
           "AND la.successful = false AND la.attemptTime > :since")
    long countFailedAttempts(@Param("email") String email, @Param("since") LocalDateTime since);
    
    void deleteByAttemptTimeBefore(LocalDateTime cutoff);
}
