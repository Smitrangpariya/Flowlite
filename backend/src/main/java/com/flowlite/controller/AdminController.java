package com.flowlite.controller;

import com.flowlite.dto.CreateUserRequest;
import com.flowlite.entity.AuditLog;
import com.flowlite.entity.Role;
import com.flowlite.entity.User;
import com.flowlite.repository.AuditLogRepository;
import com.flowlite.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin-only user management endpoints (organization-scoped)")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final UserService userService;
    private final AuditLogRepository auditLogRepository;

    @Operation(summary = "Create user", description = "Creates a new user in admin's organization with specified role")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User created successfully"),
        @ApiResponse(responseCode = "400", description = "Username or email already exists"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.createUserInOrganization(request);
        return ResponseEntity.ok(toDTO(user));
    }

    @Operation(summary = "List organisation users", description = "Retrieves all active users in admin's organisation")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)   
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userService.getUsersInOrganization().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @Operation(summary = "Delete user (soft delete)", description = "Deactivates a user in admin's organisation")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "User deactivated successfully"),
        @ApiResponse(responseCode = "404", description = "User not found in organisation"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Update user role", description = "Updates the role of a user in admin's organisation")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Role updated successfully"),
        @ApiResponse(responseCode = "404", description = "User not found in organisation"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<UserDTO> updateUserRole(@PathVariable Long id, @RequestBody RoleUpdateRequest request) {
        User user = userService.updateUserRole(id, request.role());
        return ResponseEntity.ok(toDTO(user));
    }

    @Operation(summary = "Update user job title", description = "Updates the job title of a user in admin's organisation (metadata only, no auth impact)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Job title updated successfully"),
        @ApiResponse(responseCode = "404", description = "User not found in organisation"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @PatchMapping("/users/{id}/job-title")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<UserDTO> updateUserJobTitle(@PathVariable Long id, @RequestBody JobTitleUpdateRequest request) {
        User user = userService.updateUserJobTitle(id, request.jobTitle());
        return ResponseEntity.ok(toDTO(user));
    }

    @Operation(summary = "Reset user password", description = "Resets the password of a user in admin's organisation")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password reset successfully"),
        @ApiResponse(responseCode = "404", description = "User not found in organisation"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @PatchMapping("/users/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable Long id, @RequestBody PasswordResetRequest request) {
        userService.resetUserPassword(id, request.password());
        // FIX (security audit H2): never echo the password back in the response body
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @Operation(summary = "Get current organisation", description = "Returns information about admin's organisation")
    @GetMapping("/organization")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)   // FIX: lazy-load organisation safely
    public ResponseEntity<OrganizationDTO> getOrganization() {
        User currentUser = userService.getCurrentUser();
        var org = currentUser.getOrganization();
        return ResponseEntity.ok(new OrganizationDTO(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.isActive()
        ));
    }

    @Operation(summary = "Get audit logs", description = "Retrieves recent audit logs for the organisation")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Audit logs retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AuditLogDTO>> getAuditLogs(
            @RequestParam(required = false, defaultValue = "7") int days) {

        List<AuditLog> logs;
        if (days > 0) {
            logs = auditLogRepository.findRecentSince(LocalDateTime.now().minusDays(days));
        } else {
            logs = auditLogRepository.findTop100ByOrderByTimestampDesc();
        }

        List<AuditLogDTO> dtos = logs.stream()
                .map(log -> new AuditLogDTO(
                        log.getId(),
                        log.getAction(),
                        log.getEntity(),
                        log.getUsername(),
                        log.getDetails(),
                        log.getTimestamp()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Maps a User entity to the AdminController-specific UserDTO.
     *
     * IMPORTANT: must be called while a Hibernate session is still open
     * (i.e. inside a @Transactional method) because organisation is LAZY.
     * All calling endpoints now carry @Transactional so this is guaranteed.
     */
    private UserDTO toDTO(User user) {
        String orgName = (user.getOrganization() != null)
                ? user.getOrganization().getName()
                : null;

        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),       // FIX: AdminUsers.jsx searches by full name —
                user.getLastName(),        //      these were missing from the original DTO
                user.getEmail(),
                user.getRole().name(),
                orgName,
                user.getJobTitle()
        );
    }

    // -------------------------------------------------------------------------
    // Inner record types
    // -------------------------------------------------------------------------

    /**
     * FIX: added firstName + lastName so the frontend name-search works correctly.
     * AdminUsers.jsx does: `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q)
     * The original record omitted both fields, silently breaking name search.
     */
    public record UserDTO(
            Long   id,
            String username,
            String firstName,
            String lastName,
            String email,
            String role,
            String organizationName,
            String jobTitle
    ) {}

    public record RoleUpdateRequest(Role role) {}
    public record JobTitleUpdateRequest(String jobTitle) {}
    public record PasswordResetRequest(String password) {}
    public record OrganizationDTO(Long id, String name, String slug, boolean active) {}
    public record AuditLogDTO(Long id, String action, String entity, String username, String details, LocalDateTime timestamp) {}
}
