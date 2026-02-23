package com.flowlite.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Validates critical configuration at startup.
 * In production, fails the application if insecure defaults are detected.
 */
@Configuration
@Slf4j
public class StartupValidationConfig {

    @Value("${jwt.secret:CHANGE_THIS_TO_A_SECURE_SECRET_KEY_AT_LEAST_256_BITS}")
    private String jwtSecret;

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String corsOrigins;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @PostConstruct
    public void validateConfiguration() {
        boolean isProduction = "prod".equalsIgnoreCase(activeProfile) || "production".equalsIgnoreCase(activeProfile);

        if (isProduction) {
            // CRITICAL: Validate JWT secret is not default
            if (jwtSecret.contains("CHANGE_THIS") || jwtSecret.length() < 32) {
                log.error("FATAL: JWT secret is insecure! Set a strong JWT_SECRET environment variable.");
                throw new IllegalStateException(
                    "Application cannot start in production with default JWT secret. " +
                    "Set the JWT_SECRET environment variable to a secure value (minimum 32 characters)."
                );
            }

            // CRITICAL: Validate CORS origins are not localhost
            if (corsOrigins.contains("localhost")) {
                log.error("FATAL: CORS allowed-origins contains localhost in production!");
                throw new IllegalStateException(
                    "Application cannot start in production with localhost CORS origins. " +
                    "Set the CORS_ALLOWED_ORIGINS environment variable to your production domain."
                );
            }

            log.info("Startup validation passed for production environment.");
        } else {
            // Development mode — warn about defaults but don't fail
            if (jwtSecret.contains("CHANGE_THIS")) {
                log.warn("Using default JWT secret — this is acceptable for development only.");
            }
            if (corsOrigins.contains("localhost")) {
                log.info("CORS configured for localhost (development mode).");
            }
        }
    }
}
