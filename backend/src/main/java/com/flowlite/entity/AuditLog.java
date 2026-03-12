package com.flowlite.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String action;
    
    @Column(nullable = false)
    private String entity;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    private String username;
    
    @Column(columnDefinition = "TEXT")
    private String details;
    
    public AuditLog(String action, String entity, String username, String details) {
        this.action = action;
        this.entity = entity;
        this.username = username;
        this.details = details;
        this.timestamp = LocalDateTime.now();
    }
}
