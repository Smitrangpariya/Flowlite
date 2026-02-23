package com.flowlite.controller;

import com.flowlite.dto.AuthResponse;
import com.flowlite.dto.LoginRequest;
import com.flowlite.dto.RegisterRequest;
import com.flowlite.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "User registration, login, password reset, and email verification endpoints")
public class AuthController {
    
    private final AuthService authService;
    private final Environment env;
    
    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;
    
    @Value("${jwt.expiration:3600000}")
    private long jwtExpiration;
    
    /**
     * Determine SameSite cookie policy based on active profile.
     * Strict in production, Lax in development.
     */
    private String getSameSitePolicy() {
        return env.acceptsProfiles(Profiles.of("prod", "production")) ? "Strict" : "Lax";
    }
    
    @Operation(summary = "Register new user", description = "Creates a new user account with organization")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or username/email already exists")
    })
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletResponse httpResponse) {
        AuthResponse response = authService.register(request);
        
        // Set JWT as httpOnly cookie (same as login)
        ResponseCookie jwtCookie = ResponseCookie.from("jwt", response.getToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMillis(jwtExpiration))
                .sameSite(getSameSitePolicy())
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, jwtCookie.toString());
        
        return ResponseEntity.ok(response);
    }
    
    @Operation(summary = "User login", description = "Authenticates user and returns JWT token with role embedded")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login successful, JWT token returned"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, 
                                              HttpServletRequest httpRequest,
                                              HttpServletResponse httpResponse) {
        String ipAddress = getClientIP(httpRequest);
        AuthResponse response = authService.login(request, ipAddress);
        
        // Set JWT as httpOnly cookie
        ResponseCookie jwtCookie = ResponseCookie.from("jwt", response.getToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMillis(jwtExpiration))
                .sameSite(getSameSitePolicy())
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, jwtCookie.toString());
        
        return ResponseEntity.ok(response);
    }
    
    @Operation(summary = "Logout", description = "Revokes the current JWT token")
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request,
                                                       HttpServletResponse httpResponse) {
        // Try Authorization header first
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        
        // Fallback to cookie
        if (token == null && request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        
        if (token != null) {
            authService.logout(token);
        }
        
        // Clear the JWT cookie
        ResponseCookie clearCookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite(getSameSitePolicy())
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, clearCookie.toString());
        
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
    
    @Operation(summary = "Request password reset", description = "Sends password reset email if account exists")
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Email is required"));
        }
        
        try {
            authService.requestPasswordReset(email);
            // Always return success to prevent email enumeration
            return ResponseEntity.ok(Map.of(
                "message", "If that email exists, a password reset link has been sent."
            ));
        } catch (Exception e) {
            // Log error but don't reveal if email exists
            log.error("Password reset error", e);
            return ResponseEntity.ok(Map.of(
                "message", "If that email exists, a password reset link has been sent."
            ));
        }
    }
    
    @Operation(summary = "Reset password", description = "Resets password using token from email")
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("password");
        
        if (token == null || token.isEmpty() || newPassword == null || newPassword.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Token and password are required"));
        }
        
        try {
            authService.resetPassword(token, newPassword);
            return ResponseEntity.ok(Map.of(
                "message", "Password reset successfully. You can now login with your new password."
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @Operation(summary = "Verify email", description = "Verifies email address using token from email link")
    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestParam String token) {
        try {
            authService.verifyEmail(token);
            return ResponseEntity.ok(Map.of(
                "message", "Email verified successfully! You can now access all features."
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @Operation(summary = "Resend verification email", description = "Resends email verification link")
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        try {
            authService.resendVerificationEmail(email);
            return ResponseEntity.ok(Map.of(
                "message", "Verification email sent!"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Extract client IP considering proxies
     */
    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isEmpty()) {
            return xfHeader.split(",")[0].trim();
        }
        
        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }
        
        return request.getRemoteAddr();
    }
}
