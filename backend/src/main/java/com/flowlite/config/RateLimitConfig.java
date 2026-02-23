package com.flowlite.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiting Configuration
 * Prevents brute force attacks and spam
 */
@Configuration
public class RateLimitConfig {
    
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();
    
    /**
     * Get or create bucket for IP address
     * Limit: 5 requests per minute for auth endpoints
     */
    public Bucket resolveBucket(String key) {
        return cache.computeIfAbsent(key, k -> createNewBucket());
    }
    
    private Bucket createNewBucket() {
        // 5 requests per minute using new API
        Bandwidth limit = Bandwidth.builder()
            .capacity(5)
            .refillIntervally(5, Duration.ofMinutes(1))
            .build();
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
    
    /**
     * Different limit for registration (stricter)
     */
    public Bucket resolveRegistrationBucket(String key) {
        return cache.computeIfAbsent("reg:" + key, k -> createRegistrationBucket());
    }
    
    private Bucket createRegistrationBucket() {
        // 3 registrations per hour per IP using new API
        Bandwidth limit = Bandwidth.builder()
            .capacity(3)
            .refillIntervally(3, Duration.ofHours(1))
            .build();
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
    
    /**
     * General API rate limit per authenticated user
     * 100 requests per minute - prevents abuse by authenticated users
     */
    public Bucket resolveApiUserBucket(String userIdentifier) {
        return cache.computeIfAbsent("api:" + userIdentifier, k -> createApiUserBucket());
    }
    
    private Bucket createApiUserBucket() {
        Bandwidth limit = Bandwidth.builder()
            .capacity(100)
            .refillIntervally(100, Duration.ofMinutes(1))
            .build();
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
    
    /**
     * Stricter limit for write operations (POST/PUT/DELETE)
     * 30 write operations per minute
     */
    public Bucket resolveWriteOperationBucket(String userIdentifier) {
        return cache.computeIfAbsent("write:" + userIdentifier, k -> createWriteBucket());
    }
    
    private Bucket createWriteBucket() {
        Bandwidth limit = Bandwidth.builder()
            .capacity(30)
            .refillIntervally(30, Duration.ofMinutes(1))
            .build();
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
}
