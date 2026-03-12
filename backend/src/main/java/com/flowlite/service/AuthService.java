package com.flowlite.service;

import com.flowlite.dto.AuthResponse;
import com.flowlite.dto.LoginRequest;
import com.flowlite.dto.RegisterRequest;
import com.flowlite.entity.*;
import com.flowlite.repository.*;
import com.flowlite.config.JwtUtil;
import com.flowlite.validation.InputValidator;
import com.flowlite.service.InputSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final TeamRepository teamRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final InputValidator inputValidator;
    private final InputSanitizer inputSanitizer;
    private final EmailService emailService;
    
    @Value("${flowlite.app.url:http://localhost:3000}")
    private String appUrl;
    
    /**
     * Register a new user with a new organization
     * First user of organization becomes ADMIN automatically
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        try {
            log.info("=== REGISTRATION START ===");
            log.info("Username: {}", request.getUsername());
            log.info("Email: {}", request.getEmail());
            log.info("Organization: {}", request.getOrganizationName());
            
            // 1. Validate and normalize email
            String normalizedEmail = request.getEmail().toLowerCase().trim();
            
            if (!inputValidator.isValidEmail(normalizedEmail)) {
                throw new RuntimeException("Invalid email format");
            }
            
            // 2. Validate username
            if (!inputValidator.isValidUsername(request.getUsername())) {
                throw new RuntimeException("Invalid username format. Use 3-20 alphanumeric characters, underscores, or hyphens.");
            }
            
            // 3. Validate password strength (BACKEND ENFORCEMENT)
            if (!inputValidator.isStrongPassword(request.getPassword())) {
                throw new RuntimeException("Password too weak. Use at least 8 characters with mix of uppercase, lowercase, numbers, and symbols.");
            }
            
            // 4. Sanitize inputs (OWASP HTML sanitizer — not regex)
            String sanitizedUsername = inputSanitizer.sanitizeStrict(request.getUsername());
            String sanitizedOrgName = inputValidator.sanitizeOrganizationName(request.getOrganizationName());
            
            // 5. Validate organization name
            if (!inputValidator.isValidOrganizationName(sanitizedOrgName)) {
                throw new RuntimeException("Invalid organization name. Use 2-100 characters with letters, numbers, and basic punctuation.");
            }
            
            // Validate unique constraints
            // FIX: only block reuse if an *active* user holds the username.
            // Soft-deleted users (active=false) free up their username.
            if (userRepository.existsByUsernameAndActiveTrue(sanitizedUsername)) {
                log.error("Username already exists: {}", sanitizedUsername);
                throw new RuntimeException("Username already exists");
            }
            if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                log.error("Email already exists: {}", normalizedEmail);
                throw new RuntimeException("Email already exists");
            }
            
            // Check organization name uniqueness (case-insensitive)
            if (organizationRepository.existsByNameIgnoreCase(sanitizedOrgName)) {
                log.error("Organization already exists: {}", sanitizedOrgName);
                throw new RuntimeException("Organization already exists. Please choose a different name or contact the organization admin to add you.");
            }
            
            // Create new organization
            log.info("Creating new organization...");
            Organization organization = new Organization();
            organization.setName(sanitizedOrgName);
            organization.setActive(true);
            // Generate URL-safe slug from org name
            String slug = sanitizedOrgName.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
            organization.setSlug(slug);
            Organization savedOrg = organizationRepository.save(organization);
            log.info("Organization created with ID: {}", savedOrg.getId());
            
            // Create user as ADMIN (first user of organization)
            log.info("Creating user entity as ADMIN...");
            User user = new User();
            user.setUsername(sanitizedUsername);
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setEmail(normalizedEmail);
            user.setRole(Role.ADMIN); // First user is always ADMIN
            user.setOrganization(savedOrg);
            user.setActive(true);
            user.setEmailVerified(false); // Default: unverified
            
            User savedUser = userRepository.save(user);
            log.info("User saved successfully with ID: {}", savedUser.getId());
            
            // Create default team for the organization
            Team team = new Team();
            team.setName(savedOrg.getName() + " - Default Team");
            team.setOrganization(savedOrg);
            team.setCreatedBy(savedUser);
            Team savedTeam = teamRepository.save(team);
            log.info("Created default team '{}' for organization", savedTeam.getName());
            
            // Assign user to default team
            savedUser.setTeam(savedTeam);
            userRepository.save(savedUser);
            
            // Send email verification (optional - depends on email config)
            try {
                EmailVerification verification = new EmailVerification();
                verification.setEmail(normalizedEmail);
                verification = emailVerificationRepository.save(verification);
                
                String verificationLink = appUrl + "/verify-email?token=" + verification.getToken();
                emailService.sendVerificationEmail(normalizedEmail, sanitizedUsername, verificationLink);
            } catch (Exception e) {
                log.warn("Failed to send verification email: {}", e.getMessage());
                // Don't fail registration if email fails
            }
            
            // Generate token
            log.info("Generating JWT token...");
            String token = jwtUtil.generateToken(savedUser.getUsername(), savedUser.getRole().name());
            log.info("Token generated successfully");
            
            // Create response with organization info
            log.info("Creating AuthResponse...");
            AuthResponse response = new AuthResponse(
                token, 
                savedUser.getUsername(),
                null, // firstName
                null, // lastName
                savedUser.getEmail(),
                savedUser.getRole(), 
                savedUser.getId(),
                savedOrg.getId(),
                savedOrg.getName(),
                null // jobTitle
            );
            
            log.info("=== REGISTRATION SUCCESS ===");
            return response;
            
        } catch (Exception e) {
            log.error("=== REGISTRATION ERROR ===");
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            log.error("Stack trace:", e);
            throw e;
        }
    }
    
    /**
     * Login user with account lockout protection
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request, String ipAddress) {
        try {
            String email = request.getUsername().toLowerCase().trim();
            log.info("Login attempt for username: {}", request.getUsername());
            
            // CHECK FOR ACCOUNT LOCKOUT
            long failedAttempts = loginAttemptRepository.countFailedAttempts(
                email, 
                LocalDateTime.now().minusMinutes(15)
            );
            
            if (failedAttempts >= 5) {
                log.warn("Account locked due to too many failed attempts: {}", email);
                // Calculate approximate remaining lockout time
                throw new RuntimeException(
                    "Too many failed login attempts. Your account is temporarily locked. Please try again in approximately 15 minutes."
                );
            }
            
            // Find user first to record attempts
            User user = userRepository.findByUsername(request.getUsername())
                    .or(() -> userRepository.findByEmailIgnoreCase(email))
                    .orElse(null);
            
            try {
                Authentication authentication = authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                request.getUsername(),
                                request.getPassword()
                        )
                );
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                if (user == null) {
                    user = userRepository.findByUsername(request.getUsername())
                            .orElseThrow(() -> new RuntimeException("User not found"));
                }
                
                // Check if user is active
                if (!user.isActive()) {
                    throw new RuntimeException("Account is deactivated. Please contact your administrator.");
                }
                
                // RECORD SUCCESSFUL ATTEMPT
                LoginAttempt attempt = new LoginAttempt();
                attempt.setEmail(user.getEmail());
                attempt.setIpAddress(ipAddress != null ? ipAddress : "unknown");
                attempt.setSuccessful(true);
                loginAttemptRepository.save(attempt);
                
                String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
                
                // Get organization info
                Organization org = user.getOrganization();
                
                log.info("Login successful for username: {}", request.getUsername());
                return new AuthResponse(
                    token, 
                    user.getUsername(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getEmail(),
                    user.getRole(), 
                    user.getId(),
                    org != null ? org.getId() : null,
                    org != null ? org.getName() : null,
                    user.getJobTitle()
                );
                
            } catch (Exception authException) {
                // RECORD FAILED ATTEMPT
                LoginAttempt attempt = new LoginAttempt();
                attempt.setEmail(email);
                attempt.setIpAddress(ipAddress != null ? ipAddress : "unknown");
                attempt.setSuccessful(false);
                loginAttemptRepository.save(attempt);
                
                throw authException;
            }
            
        } catch (Exception e) {
            log.error("Login failed for username: {}", request.getUsername());
            log.error("Error: {}", e.getMessage());
            throw e;
        }
    }
    
    /**
     * Login user (backwards compatibility - no IP)
     */
    public AuthResponse login(LoginRequest request) {
        return login(request, null);
    }
    
    /**
     * Logout - revoke token
     */
    @Transactional
    public void logout(String token) {
        try {
            Date expiration = jwtUtil.extractExpiration(token);
            
            RevokedToken revokedToken = new RevokedToken();
            revokedToken.setToken(token);
            revokedToken.setExpiresAt(
                expiration.toInstant().atZone(ZoneId.of("UTC")).toLocalDateTime()
            );
            revokedToken.setReason("LOGOUT");
            
            revokedTokenRepository.save(revokedToken);
            
            log.info("Token revoked (logout)");
        } catch (Exception e) {
            log.error("Error revoking token: {}", e.getMessage());
        }
    }
    
    /**
     * Initiate password reset - send email with token
     */
    @Transactional
    public void requestPasswordReset(String email) {
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            // Silent return — same timing, no enumeration signal
            log.info("Password reset requested for unknown email (ignored)");
            return;
        }
        User user = userOpt.get();
        
        // Check if user already has a recent reset request (prevent spam)
        Optional<PasswordReset> existingReset = passwordResetRepository
            .findFirstByUserOrderByCreatedAtDesc(user);
        
        if (existingReset.isPresent() && 
            existingReset.get().getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(5))) {
            // Silent return — don't reveal that this is a recent request
            log.info("Password reset already requested recently (ignored)");
            return;
        }
        
        // Create reset token
        PasswordReset resetToken = new PasswordReset();
        resetToken.setUser(user);
        resetToken = passwordResetRepository.save(resetToken);
        
        // Send email with reset link
        String resetLink = appUrl + "/reset-password?token=" + resetToken.getToken();
        
        emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), resetLink);
        
        log.info("Password reset requested for user: {}", user.getEmail());
    }
    
    /**
     * Reset password using token
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        // Validate token
        PasswordReset resetToken = passwordResetRepository
            .findValidToken(token, LocalDateTime.now())
            .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));
        
        // Validate password strength
        if (!inputValidator.isStrongPassword(newPassword)) {
            throw new RuntimeException("Password too weak. Use at least 8 characters with mix of uppercase, lowercase, numbers, and symbols.");
        }
        
        // Update user password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // Mark token as used
        resetToken.markAsUsed();
        passwordResetRepository.save(resetToken);
        
        log.info("Password reset successfully for user: {}", user.getEmail());
    }
    
    /**
     * Verify email with token
     */
    @Transactional
    public void verifyEmail(String token) {
        EmailVerification verification = emailVerificationRepository
            .findValidToken(token, LocalDateTime.now())
            .orElseThrow(() -> new RuntimeException("Invalid or expired verification token"));
        
        // Find user and activate
        User user = userRepository.findByEmailIgnoreCase(verification.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Mark verification as complete
        verification.markAsVerified();
        emailVerificationRepository.save(verification);
        
        log.info("Email verified for user: {}", user.getEmail());
    }
    
    /**
     * Resend verification email
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.toLowerCase().trim())
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getEmailVerified()) {
            throw new RuntimeException("Email already verified");
        }
        
        // Create new verification token
        EmailVerification verification = new EmailVerification();
        verification.setEmail(email.toLowerCase().trim());
        verification = emailVerificationRepository.save(verification);
        
        // Send email
        String verificationLink = appUrl + "/verify-email?token=" + verification.getToken();
        emailService.sendVerificationEmail(email, user.getUsername(), verificationLink);
        
        log.info("Verification email resent to: {}", email);
    }
    
    /**
     * Check if token is revoked
     */
    public boolean isTokenRevoked(String token) {
        return revokedTokenRepository.existsByToken(token);
    }
}