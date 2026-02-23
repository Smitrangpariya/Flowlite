package com.flowlite.repository;

import com.flowlite.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    
    // Case-insensitive email methods for robust email matching
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    
    // Team-based queries
    List<User> findByTeamIdAndActiveTrue(Long teamId);
    List<User> findByActiveTrue();
    
    // Find active user by username (for login)
    Optional<User> findByUsernameAndActiveTrue(String username);
    
    // Organization-based queries
    List<User> findByOrganizationId(Long organizationId);
    List<User> findByOrganizationIdAndActiveTrue(Long organizationId);
    Optional<User> findByIdAndOrganizationId(Long id, Long organizationId);
}

