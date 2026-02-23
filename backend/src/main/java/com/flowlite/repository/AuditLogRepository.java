package com.flowlite.repository;

import com.flowlite.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    List<AuditLog> findByEntityOrderByTimestampDesc(String entity);
    
    List<AuditLog> findByUsernameOrderByTimestampDesc(String username);
    
    List<AuditLog> findTop100ByOrderByTimestampDesc();
    
    List<AuditLog> findByActionOrderByTimestampDesc(String action);
    
    @Query("SELECT a FROM AuditLog a WHERE a.timestamp > :since ORDER BY a.timestamp DESC")
    List<AuditLog> findRecentSince(@Param("since") LocalDateTime since);
    
    void deleteByTimestampBefore(LocalDateTime cutoff);
}

