package com.flowlite.repository;

import com.flowlite.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    // Organization-filtered queries
    List<Project> findByOrganizationId(Long organizationId);
    Optional<Project> findByIdAndOrganizationId(Long id, Long organizationId);
    List<Project> findByOrganizationIdAndStatus(Long organizationId, String status);
    
    // Owner-based queries
    List<Project> findByOwnerId(Long ownerId);
}
