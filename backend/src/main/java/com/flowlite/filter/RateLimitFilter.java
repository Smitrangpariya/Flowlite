package com.flowlite.filter;

import com.flowlite.config.RateLimitConfig;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Rate Limiting Filter
 * Tiered rate limiting: auth (IP-based), API general (user-based), write ops (stricter)
 */
@Component
@Order(1)
public class RateLimitFilter implements Filter {
    
    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);
    
    private final RateLimitConfig rateLimitConfig;
    
    public RateLimitFilter(RateLimitConfig rateLimitConfig) {
        this.rateLimitConfig = rateLimitConfig;
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();
        String clientIP = getClientIP(httpRequest);
        
        // ─── TIER 1: Auth endpoint rate limiting (by IP) ──────────────────
        if (isAuthPath(path)) {
            Bucket bucket;
            if (path.contains("/register")) {
                bucket = rateLimitConfig.resolveRegistrationBucket(clientIP);
            } else {
                bucket = rateLimitConfig.resolveBucket(clientIP);
            }
            
            if (!bucket.tryConsume(1)) {
                logger.warn("Auth rate limit exceeded for IP: {} on path: {}", clientIP, path);
                sendRateLimitResponse(httpResponse,
                    "Too many authentication attempts. Please try again later.");
                return;
            }
            
            chain.doFilter(request, response);
            return;
        }
        
        // ─── TIER 2: General API rate limiting (by user) ──────────────────
        if (path.startsWith("/api/")) {
            String userIdentifier = getUserIdentifier(httpRequest, clientIP);
            
            // Per-user global limit: 100 req/min
            Bucket apiBucket = rateLimitConfig.resolveApiUserBucket(userIdentifier);
            if (!apiBucket.tryConsume(1)) {
                logger.warn("API rate limit exceeded for user: {} on path: {}", userIdentifier, path);
                sendRateLimitResponse(httpResponse,
                    "Rate limit exceeded. You are making too many requests. Please slow down.");
                return;
            }
            
            // Stricter limit for write operations: 30/min
            boolean isWriteOperation = "POST".equals(method) ||
                                       "PUT".equals(method) ||
                                       "PATCH".equals(method) ||
                                       "DELETE".equals(method);
            
            if (isWriteOperation) {
                Bucket writeBucket = rateLimitConfig.resolveWriteOperationBucket(userIdentifier);
                if (!writeBucket.tryConsume(1)) {
                    logger.warn("Write rate limit exceeded for user: {} on {} {}",
                        userIdentifier, method, path);
                    sendRateLimitResponse(httpResponse,
                        "Too many write operations. Please wait before making more changes.");
                    return;
                }
            }
        }
        
        chain.doFilter(request, response);
    }
    
    /**
     * Extract user identifier: prefer username from JWT, fallback to IP
     */
    private String getUserIdentifier(HttpServletRequest request, String clientIP) {
        // Check Authorization header for JWT
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                // Simple base64 decode of JWT payload to extract username
                String[] parts = token.split("\\.");
                if (parts.length == 3) {
                    String payload = new String(
                        java.util.Base64.getUrlDecoder().decode(parts[1])
                    );
                    int subIndex = payload.indexOf("\"sub\":\"");
                    if (subIndex != -1) {
                        int start = subIndex + 7;
                        int end = payload.indexOf("\"", start);
                        if (end != -1) {
                            return "user:" + payload.substring(start, end);
                        }
                    }
                }
            } catch (Exception e) {
                // Fallback to IP if JWT parsing fails
            }
        }
        
        // Check cookie for JWT (cookie-based auth)
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) {
                    return "cookie-user:" + clientIP;
                }
            }
        }
        
        return "ip:" + clientIP;
    }
    
    private boolean isAuthPath(String path) {
        return path.startsWith("/api/auth/login") ||
               path.startsWith("/api/auth/register") ||
               path.startsWith("/api/auth/forgot-password");
    }
    
    private void sendRateLimitResponse(HttpServletResponse response, String message)
            throws IOException {
        response.setStatus(429);
        response.setContentType("application/json");
        response.setHeader("Retry-After", "60");
        response.getWriter().write(
            "{\"error\":\"Too Many Requests\",\"message\":\"" + message + "\"}"
        );
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
