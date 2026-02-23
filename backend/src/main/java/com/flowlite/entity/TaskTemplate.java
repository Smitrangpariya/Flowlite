package com.flowlite.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Size(max = 255, message = "Template name must not exceed 255 characters")
    private String name;

    @Column(nullable = false)
    @Size(max = 255, message = "Default title must not exceed 255 characters")
    private String defaultTitle;

    @Column(length = 2000)
    @Size(max = 2000, message = "Default description must not exceed 2000 characters")
    private String defaultDescription;

    @Column(nullable = false)
    private String defaultPriority; // LOW, MEDIUM, HIGH

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column
    private LocalDateTime createdAt;

    @Column
    private boolean active = true;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
