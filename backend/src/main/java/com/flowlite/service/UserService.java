package com.flowlite.service;

import com.flowlite.dto.CreateUserRequest;
import com.flowlite.entity.Organization;
import com.flowlite.entity.Role;
import com.flowlite.entity.User;
import com.flowlite.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for organization-scoped user management
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    /**
     * Get currently authenticated user
     */
    public User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }
    
    /**
     * Get all active users in current user's organization
     */
    @Transactional(readOnly = true)
    public List<User> getUsersInOrganization() {
        User currentUser = getCurrentUser();
        return userRepository.findByOrganizationIdAndActiveTrue(
                currentUser.getOrganization().getId()
        );
    }
    
    /**
     * Get user by ID within current user's organization
     */
    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        User currentUser = getCurrentUser();
        return userRepository.findByIdAndOrganizationId(id, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));
    }
    
    /**
     * Create a new user in current user's organization (admin only)
     */
    @Transactional
    public User createUserInOrganization(CreateUserRequest request) {
        User currentUser = getCurrentUser();
        Organization organization = currentUser.getOrganization();
        
        // Validate unique constraints
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(request.getEmail().toLowerCase().trim())) {
            throw new RuntimeException("Email already exists");
        }
        
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setEmail(request.getEmail().toLowerCase().trim());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole(request.getRole() != null ? request.getRole() : Role.TEAM_MEMBER);
        newUser.setOrganization(organization);
        newUser.setActive(true);
        
        User savedUser = userRepository.save(newUser);
        log.info("User {} created in organization {} by admin {}", 
                savedUser.getUsername(), organization.getName(), currentUser.getUsername());
        
        return savedUser;
    }
    
    /**
     * Soft delete a user in current user's organization
     */
    @Transactional
    public void deactivateUser(Long userId) {
        User currentUser = getCurrentUser();
        User userToDelete = userRepository.findByIdAndOrganizationId(
                userId, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));
        
        // Prevent self-deletion
        if (userToDelete.getId().equals(currentUser.getId())) {
            throw new RuntimeException("Cannot deactivate your own account");
        }
        
        userToDelete.setActive(false);
        userRepository.save(userToDelete);
        log.info("User {} deactivated by admin {}", userToDelete.getUsername(), currentUser.getUsername());
    }
    
    /**
     * Update user role within organization
     */
    @Transactional
    public User updateUserRole(Long userId, Role newRole) {
        User currentUser = getCurrentUser();
        User userToUpdate = userRepository.findByIdAndOrganizationId(
                userId, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));
        
        userToUpdate.setRole(newRole);
        User updatedUser = userRepository.save(userToUpdate);
        log.info("User {} role updated to {} by admin {}", 
                userToUpdate.getUsername(), newRole, currentUser.getUsername());
        
        return updatedUser;
    }
    
    /**
     * Check if user has admin or product manager privileges
     */
    public boolean isAdminOrManager(User user) {
        if (user == null) {
            log.warn("isAdminOrManager called with null user");
            return false;
        }
        Role role = user.getRole();
        return role == Role.ADMIN || role == Role.PRODUCT_MANAGER;
    }

    /**
     * Check if user is admin
     */
    public boolean isAdmin(User user) {
        return user != null && user.getRole() == Role.ADMIN;
    }

    /**
     * Check if user is team lead
     */
    public boolean isTeamLead(User user) {
        return user != null && user.getRole() == Role.TEAM_LEAD;
    }
}
