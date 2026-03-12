package com.flowlite.service;

import com.flowlite.dto.AuthResponse;
import com.flowlite.dto.ChangePasswordRequest;
import com.flowlite.dto.ProfileRequest;
import com.flowlite.entity.User;
import com.flowlite.repository.UserRepository;
import com.flowlite.validation.InputValidator;
import com.flowlite.service.InputSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final InputValidator inputValidator;
    private final InputSanitizer inputSanitizer;

    public AuthResponse getUserProfile(User user) {
        return mapToAuthResponse(user, null);
    }

    @Transactional
    public AuthResponse updateUserProfile(User user, ProfileRequest request) {
        log.info("Updating profile for user: {}", user.getUsername());

        // Validate first/last name length if provided
        if (request.getFirstName() != null && (request.getFirstName().length() < 2 || request.getFirstName().length() > 50)) {
            throw new IllegalArgumentException("First name must be between 2 and 50 characters");
        }
        if (request.getLastName() != null && (request.getLastName().length() < 2 || request.getLastName().length() > 50)) {
            throw new IllegalArgumentException("Last name must be between 2 and 50 characters");
        }

        // Update fields
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        
        // Only update email if changed and valid
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (!inputValidator.isValidEmail(request.getEmail())) {
                throw new IllegalArgumentException("Invalid email format");
            }
            if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new IllegalArgumentException("Email already in use");
            }
            user.setEmail(request.getEmail());
            user.setEmailVerified(false); // Reset verification if email changes
            // TODO: Trigger new verification email?
        }
        
        // Update job title if provided (metadata only, no auth impact)
        if (request.getJobTitle() != null) {
            String sanitizedJobTitle = inputSanitizer.sanitizeStrict(request.getJobTitle().trim());
            user.setJobTitle(sanitizedJobTitle.isEmpty() ? null : sanitizedJobTitle);
        }

        User savedUser = userRepository.save(user);
        return mapToAuthResponse(savedUser, null);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {
        log.info("Changing password for user: {}", user.getUsername());

        // Verify old password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid current password");
        }

        // Validate new password strength
        if (!inputValidator.isStrongPassword(request.getNewPassword())) {
            throw new IllegalArgumentException("New password is too weak. Use at least 8 characters with mix of uppercase, lowercase, numbers, and symbols.");
        }
        
        // Enforce different password
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
             throw new IllegalArgumentException("New password cannot be the same as the current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed successfully for user: {}", user.getUsername());
    }

    private AuthResponse mapToAuthResponse(User user, String token) {
        return new AuthResponse(
            token,
            user.getUsername(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getRole(),
            user.getId(),
            user.getOrganization() != null ? user.getOrganization().getId() : null,
            user.getOrganization() != null ? user.getOrganization().getName() : null,
            user.getJobTitle()
        );
    }
}
