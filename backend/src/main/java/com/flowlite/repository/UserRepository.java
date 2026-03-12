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

    // FIX (Issue 2): existsByUsername() matched ALL rows including soft-deleted
    // (active=false) users, blocking reuse of a deleted user's username.
    // Replaced with active-scoped variants everywhere username uniqueness is checked.
    boolean existsByUsernameAndActiveTrue(String username);

    // Keep the unscoped variant — still needed by CustomUserDetailsService
    // and any place that truly needs to find any record regardless of active flag.
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

