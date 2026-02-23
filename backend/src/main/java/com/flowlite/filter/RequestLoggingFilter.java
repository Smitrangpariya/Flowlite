package com.flowlite.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Request logging filter for tracing and observability.
 * Adds a unique X-Request-Id header to each request and logs
 * request method, URI, status, and duration.
 */
@Component
@Order(1)
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        // Generate unique request ID
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        response.setHeader("X-Request-Id", requestId);
        
        long startTime = System.currentTimeMillis();
        String method = request.getMethod();
        String uri = request.getRequestURI();
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            
            // Log request details (skip static assets and health checks)
            if (!uri.startsWith("/static") && !uri.equals("/actuator/health")) {
                if (status >= 400) {
                    log.warn("[{}] {} {} -> {} ({}ms)", requestId, method, uri, status, duration);
                } else {
                    log.info("[{}] {} {} -> {} ({}ms)", requestId, method, uri, status, duration);
                }
            }
        }
    }
}
