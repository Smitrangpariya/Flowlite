package com.flowlite.filter;

import com.flowlite.config.JwtUtil;
import com.flowlite.config.RateLimitConfig;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Rate Limiting Filter
 * Tiered rate limiting: auth (IP-based), API general (user-based), write ops (stricter)
 */
@Component
@Order(1)
public class RateLimitFilter implements Filter {
    
    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);
    
    private final RateLimitConfig rateLimitConfig;
    private final JwtUtil jwtUtil;
    
    public RateLimitFilter(RateLimitConfig rateLimitConfig, JwtUtil jwtUtil) {
        this.rateLimitConfig = rateLimitConfig;
        this.jwtUtil = jwtUtil;
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
                String username = jwtUtil.extractUsername(token);
                if (username != null) {
                    return "user:" + username;
                }
            } catch (Exception e) {
                // Fallback to IP if JWT parsing fails
            }
        }
        
        // Check cookie for JWT — extract real username instead of falling back to IP
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) {
                    try {
                        String username = jwtUtil.extractUsername(cookie.getValue());
                        if (username != null) {
                            return "user:" + username;
                        }
                    } catch (Exception e) {
                        // Invalid cookie — fall through to IP
                    }
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
     * Extract client IP — only trust proxy headers from known trusted proxies.
     * Prevents IP spoofing via X-Forwarded-For header manipulation.
     */
    private String getClientIP(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        
        // Only trust X-Forwarded-For if request comes from trusted proxy
        if (isTrustedProxy(remoteAddr)) {
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader != null && !xfHeader.isEmpty()) {
                return xfHeader.split(",")[0].trim();
            }
            
            String xRealIP = request.getHeader("X-Real-IP");
            if (xRealIP != null && !xRealIP.isEmpty()) {
                return xRealIP;
            }
        }
        
        return remoteAddr;
    }
    
    /**
     * Check if the remote address is a trusted proxy (loopback or Docker subnets).
     */
    private boolean isTrustedProxy(String remoteAddr) {
        if (remoteAddr == null) return false;
        try {
            InetAddress addr = InetAddress.getByName(remoteAddr);
            return addr.isLoopbackAddress()
                || addr.isSiteLocalAddress();  // 10.x, 172.16-31.x, 192.168.x
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
