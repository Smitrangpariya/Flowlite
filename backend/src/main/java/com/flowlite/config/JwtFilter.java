package com.flowlite.config;

import com.flowlite.repository.RevokedTokenRepository;
import com.flowlite.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {
    
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final RevokedTokenRepository revokedTokenRepository;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        String method = request.getMethod();
        
        String username = null;
        String jwt = null;
        String role = null;
        
        // 1. Try Authorization header first
        final String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
        }
        
        // 2. Fallback to httpOnly cookie
        if (jwt == null) {
            jwt = extractJwtFromCookie(request);
        }
        
        if (jwt != null) {
            // CHECK IF TOKEN IS REVOKED
            if (revokedTokenRepository.existsByToken(jwt)) {
                log.warn("Revoked token attempt on {} {}", method, path);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Token has been revoked\"}");
                return;
            }
            
            try {
                username = jwtUtil.extractUsername(jwt);
                role = jwtUtil.extractRole(jwt);
                log.debug("JWT extracted: username={}, role={}, path={} {}", username, role, method, path);
            } catch (Exception e) {
                log.error("JWT extraction failed on {} {}: {}", method, path, e.getMessage());
            }
        } else {
            log.debug("No JWT found in request to {} {}", method, path);
        }
        
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                
                // Trust the JWT — signature + expiration already validated during extractUsername()
                // Create authorities from the role in JWT
                List<SimpleGrantedAuthority> authorities;
                if (role != null) {
                    authorities = Collections.singletonList(new SimpleGrantedAuthority(role));
                } else {
                    // Fallback to user details authorities
                    authorities = userDetails.getAuthorities().stream()
                            .map(a -> new SimpleGrantedAuthority(a.getAuthority()))
                            .toList();
                }
                
                UsernamePasswordAuthenticationToken authToken = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                
                log.debug("JWT authentication set for user: {} on {} {}", username, method, path);
                
            } catch (Exception e) {
                log.warn("Failed to authenticate JWT for user {} on {} {}: {}", 
                    username, method, path, e.getMessage());
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    /**
     * Extract JWT from httpOnly cookie named "jwt"
     */
    private String extractJwtFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("jwt".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
