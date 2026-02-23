package com.flowlite.controller;

import com.flowlite.entity.User;
import com.flowlite.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User information endpoints for task assignment")
@SecurityRequirement(name = "bearerAuth")
public class UserController {
    
    private final UserRepository userRepository;
    
    @Operation(summary = "List all users", description = "Retrieves all active users in the same team for assignee/approver selection")
    @ApiResponse(responseCode = "200", description = "Users retrieved successfully")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        User currentUser = getCurrentUser();
        List<UserDTO> users;
        
        if (currentUser.getTeam() != null) {
            // Filter by current user's team and only active users
            users = userRepository.findByTeamIdAndActiveTrue(currentUser.getTeam().getId()).stream()
                    .map(this::toDTO)
                    .collect(Collectors.toList());
        } else {
            // Fallback: show all active users (for legacy users without team)
            users = userRepository.findByActiveTrue().stream()
                    .map(this::toDTO)
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(users);
    }
    
    @Operation(summary = "Get user by ID", description = "Retrieves a specific user by their ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User found"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(toDTO(user));
    }
    
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }
    
    private UserDTO toDTO(User user) {
        return new UserDTO(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name());
    }
    
    public record UserDTO(Long id, String username, String email, String role) {}
}


