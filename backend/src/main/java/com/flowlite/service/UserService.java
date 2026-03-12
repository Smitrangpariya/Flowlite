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
 * Service for organisation-scoped user management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // -------------------------------------------------------------------------
    // Read helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the currently authenticated user, with their LAZY relations
     * (organisation, team) accessible within the caller's transaction.
     *
     * FIX: added @Transactional(readOnly = true) so that callers which are
     * themselves non-transactional (e.g. the old AdminController) can still
     * navigate lazy relations.  When called from within an existing transaction
     * Spring reuses that transaction — no extra cost.
     */
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }

    /**
     * Returns all active users belonging to the same organisation as the
     * currently authenticated user.
     *
     * The returned User entities still have their LAZY organisation proxy
     * attached — callers must access it within their own @Transactional scope
     * (AdminController.getAllUsers() now carries @Transactional(readOnly=true)).
     */
    @Transactional(readOnly = true)
    public List<User> getUsersInOrganization() {
        User currentUser = getCurrentUser();
        return userRepository.findByOrganizationIdAndActiveTrue(
                currentUser.getOrganization().getId()
        );
    }

    /**
     * Returns a single user by ID, scoped to the current user's organisation.
     */
    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        User currentUser = getCurrentUser();
        return userRepository.findByIdAndOrganizationId(id, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));
    }

    // -------------------------------------------------------------------------
    // Write operations
    // -------------------------------------------------------------------------

    /**
     * Creates a new user inside the current admin's organisation.
     */
    @Transactional
    public User createUserInOrganization(CreateUserRequest request) {
        User currentUser = getCurrentUser();
        Organization organization = currentUser.getOrganization();

        // FIX (Issue 2): only block the username if an *active* user already holds it.
        // Soft-deleted users (active=false) free up their username for reuse.
        if (userRepository.existsByUsernameAndActiveTrue(request.getUsername())) {
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

        if (request.getJobTitle() != null) {
            newUser.setJobTitle(request.getJobTitle().trim());
        }

        User savedUser = userRepository.save(newUser);
        log.info("User {} created in organisation {} by admin {}",
                savedUser.getUsername(), organization.getName(), currentUser.getUsername());

        return savedUser;
    }

    /**
     * Soft-deletes (deactivates) a user within the current admin's organisation.
     * An admin cannot deactivate themselves.
     */
    @Transactional
    public void deactivateUser(Long userId) {
        User currentUser = getCurrentUser();
        User userToDelete = userRepository.findByIdAndOrganizationId(
                        userId, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));

        if (userToDelete.getId().equals(currentUser.getId())) {
            throw new RuntimeException("Cannot deactivate your own account");
        }

        userToDelete.setActive(false);
        userRepository.save(userToDelete);
        log.info("User {} deactivated by admin {}", userToDelete.getUsername(), currentUser.getUsername());
    }

    /**
     * Updates the role of a user within the current admin's organisation.
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
     * Updates the job title of a user within the current admin's organisation.
     * Job title is metadata only — it has no effect on authentication or authorisation.
     */
    @Transactional
    public User updateUserJobTitle(Long userId, String jobTitle) {
        User currentUser = getCurrentUser();
        User userToUpdate = userRepository.findByIdAndOrganizationId(
                        userId, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));

        userToUpdate.setJobTitle(jobTitle != null ? jobTitle.trim() : null);
        User updatedUser = userRepository.save(userToUpdate);
        log.info("User {} job title updated to '{}' by admin {}",
                userToUpdate.getUsername(), jobTitle, currentUser.getUsername());

        return updatedUser;
    }

    /**
     * Resets the password of a user within the current admin's organisation.
     */
    @Transactional
    public User resetUserPassword(Long userId, String newPassword) {
        User currentUser = getCurrentUser();
        User userToUpdate = userRepository.findByIdAndOrganizationId(
                        userId, currentUser.getOrganization().getId())
                .orElseThrow(() -> new RuntimeException("User not found in your organization"));

        userToUpdate.setPassword(passwordEncoder.encode(newPassword));
        User updatedUser = userRepository.save(userToUpdate);
        log.info("User {} password reset by admin {}", userToUpdate.getUsername(), currentUser.getUsername());

        return updatedUser;
    }

    // -------------------------------------------------------------------------
    // Role helpers (used by other services)
    // -------------------------------------------------------------------------

    public boolean isAdminOrManager(User user) {
        if (user == null) {
            log.warn("isAdminOrManager called with null user");
            return false;
        }
        Role role = user.getRole();
        return role == Role.ADMIN || role == Role.PRODUCT_MANAGER;
    }

    public boolean isAdmin(User user) {
        return user != null && user.getRole() == Role.ADMIN;
    }

    public boolean isTeamLead(User user) {
        return user != null && user.getRole() == Role.TEAM_LEAD;
    }
}
