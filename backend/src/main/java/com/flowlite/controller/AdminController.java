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
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
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
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.createUserInOrganization(request);
        return ResponseEntity.ok(toDTO(user));
    }
    
    @Operation(summary = "List organization users", description = "Retrieves all active users in admin's organization")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userService.getUsersInOrganization().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
    
    @Operation(summary = "Delete user (soft delete)", description = "Deactivates a user in admin's organization")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "User deactivated successfully"),
        @ApiResponse(responseCode = "404", description = "User not found in organization"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }
    
    @Operation(summary = "Update user role", description = "Updates the role of a user in admin's organization")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Role updated successfully"),
        @ApiResponse(responseCode = "404", description = "User not found in organization"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> updateUserRole(@PathVariable Long id, @RequestBody RoleUpdateRequest request) {
        User user = userService.updateUserRole(id, request.role());
        return ResponseEntity.ok(toDTO(user));
    }
    
    @Operation(summary = "Get current organization", description = "Returns information about admin's organization")
    @GetMapping("/organization")
    @PreAuthorize("hasRole('ADMIN')")
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
    
    @Operation(summary = "Get audit logs", description = "Retrieves recent audit logs for the organization")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Audit logs retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied - Admin role required")
    })
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
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
    
    private UserDTO toDTO(User user) {
        return new UserDTO(
                user.getId(), 
                user.getUsername(), 
                user.getEmail(), 
                user.getRole().name(),
                user.getOrganization() != null ? user.getOrganization().getName() : null
        );
    }
    
    public record UserDTO(Long id, String username, String email, String role, String organizationName) {}
    public record RoleUpdateRequest(Role role) {}
    public record OrganizationDTO(Long id, String name, String slug, boolean active) {}
    public record AuditLogDTO(Long id, String action, String entity, String username, String details, LocalDateTime timestamp) {}
}

