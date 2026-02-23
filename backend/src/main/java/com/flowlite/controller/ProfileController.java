package com.flowlite.controller;

import com.flowlite.dto.AuthResponse;
import com.flowlite.dto.ChangePasswordRequest;
import com.flowlite.dto.ProfileRequest;
import com.flowlite.entity.User;
import com.flowlite.service.ProfileService;
import com.flowlite.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Profile", description = "User profile management endpoints")
public class ProfileController {

    private final UserService userService;
    private final ProfileService profileService;

    @Operation(summary = "Get current user profile", description = "Returns the profile of the currently authenticated user")
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getMyProfile() {
        User currentUser = userService.getCurrentUser();
        AuthResponse profile = profileService.getUserProfile(currentUser);
        return ResponseEntity.ok(profile);
    }

    @Operation(summary = "Update profile", description = "Update first name, last name, or email")
    @PutMapping("/me")
    public ResponseEntity<AuthResponse> updateMyProfile(@Valid @RequestBody ProfileRequest request) {
        User currentUser = userService.getCurrentUser();
        AuthResponse updatedProfile = profileService.updateUserProfile(currentUser, request);
        return ResponseEntity.ok(updatedProfile);
    }

    @Operation(summary = "Change password", description = "Change current user's password")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password changed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid current password or weak new password")
    })
    @PostMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User currentUser = userService.getCurrentUser();
        try {
            profileService.changePassword(currentUser, request);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
