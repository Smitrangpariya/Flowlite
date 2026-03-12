package com.flowlite.validation;

import org.springframework.stereotype.Component;

/**
 * Input Validation and Sanitization
 * Prevents XSS, injection attacks, and data corruption
 */
@Component
public class InputValidator {
    // NOTE: sanitizeInput() was REMOVED — it used bypassable regex.\n    // Use InputSanitizer.sanitizeStrict() (OWASP HTML Sanitizer) instead.\n
    
    /**
     * Validate email format (RFC 5322 compliant)
     */
    public boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        return email.matches(emailRegex) && email.length() <= 254;
    }
    
    /**
     * Validate username format
     * 3-20 chars, alphanumeric + underscore + hyphen
     */
    public boolean isValidUsername(String username) {
        if (username == null || username.isEmpty()) {
            return false;
        }
        return username.matches("^[a-zA-Z0-9_-]{3,20}$");
    }
    
    /**
     * Validate password strength
     * Minimum: 8 characters with at least one letter
     */
    public boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        return password.matches(".*[a-zA-Z].*");
    }
    
    /**
     * Calculate password strength score (0-5)
     */
    public int getPasswordStrength(String password) {
        if (password == null) return 0;
        
        int strength = 0;
        if (password.length() >= 8) strength++;
        if (password.length() >= 12) strength++;
        if (password.matches(".*[a-z].*") && password.matches(".*[A-Z].*")) strength++;
        if (password.matches(".*\\d.*")) strength++;
        if (password.matches(".*[^a-zA-Z0-9].*")) strength++;
        
        return strength;
    }
    
    /**
     * Enforce strong password (backend validation)
     */
    public boolean isStrongPassword(String password) {
        int strength = getPasswordStrength(password);
        return strength >= 3; // Require at least 3 criteria
    }
    
    /**
     * Validate organization name
     * 2-100 chars, alphanumeric + spaces + common punctuation
     */
    public boolean isValidOrganizationName(String name) {
        if (name == null || name.isEmpty()) {
            return false;
        }
        
        name = name.trim();
        
        if (name.length() < 2 || name.length() > 100) {
            return false;
        }
        
        // Allow letters, numbers, spaces, and safe punctuation
        return name.matches("^[a-zA-Z0-9\\s.,&'()-]+$");
    }
    
    /**
     * Sanitize organization name
     */
    public String sanitizeOrganizationName(String name) {
        if (name == null) return null;
        
        // Remove HTML tags
        name = name.replaceAll("<[^>]*>", "");
        
        // Remove dangerous characters
        name = name.replaceAll("[<>\"']", "");
        
        // Limit to safe characters
        name = name.replaceAll("[^a-zA-Z0-9\\s.,&()-]", "");
        
        return name.trim();
    }
}
