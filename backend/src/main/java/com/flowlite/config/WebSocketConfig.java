package com.flowlite.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for topic and user-scoped queue subscriptions
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for application destination mappings (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-scoped destinations (convertAndSendToUser)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.split(","))
                .addInterceptors(jwtCookieHandshakeInterceptor())
                .withSockJS();
    }
    
    /**
     * HTTP-level interceptor: reads the JWT from the httpOnly cookie during
     * the SockJS handshake and stores it in WebSocket session attributes.
     * The STOMP-level interceptor can then read it from there.
     */
    private HandshakeInterceptor jwtCookieHandshakeInterceptor() {
        return new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                           WebSocketHandler wsHandler, Map<String, Object> attributes) {
                if (request instanceof ServletServerHttpRequest servletRequest) {
                    var cookies = servletRequest.getServletRequest().getCookies();
                    if (cookies != null) {
                        for (var cookie : cookies) {
                            if ("jwt".equals(cookie.getName())) {
                                attributes.put("jwt", cookie.getValue());
                                break;
                            }
                        }
                    }
                }
                return true;
            }
            
            @Override
            public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       WebSocketHandler wsHandler, Exception exception) {
                // no-op
            }
        };
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {

            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                    MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String jwt = null;

                    // Try Authorization header first (standard STOMP)
                    List<String> authHeaders = accessor.getNativeHeader("Authorization");
                    if (authHeaders != null && !authHeaders.isEmpty()) {
                        String authHeader = authHeaders.get(0);
                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            jwt = authHeader.substring(7);
                        }
                    }

                    // Fallback: try token header (for SockJS clients)
                    if (jwt == null) {
                        List<String> tokenHeaders = accessor.getNativeHeader("token");
                        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
                            jwt = tokenHeaders.get(0);
                        }
                    }
                    
                    // Fallback: read from session attributes (set by HandshakeInterceptor from cookie)
                    if (jwt == null) {
                        Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
                        if (sessionAttrs != null && sessionAttrs.containsKey("jwt")) {
                            jwt = (String) sessionAttrs.get("jwt");
                        }
                    }

                    // Lenient: try to authenticate but don't fail connection if token invalid
                    // Org-scoped topics prevent cross-tenant leaks anyway
                    if (jwt != null) {
                        try {
                            String username = jwtUtil.extractUsername(jwt);
                            String role = jwtUtil.extractRole(jwt);

                            if (username != null && !jwtUtil.isTokenExpired(jwt)) {
                                UsernamePasswordAuthenticationToken authToken =
                                    new UsernamePasswordAuthenticationToken(
                                        username,
                                        null,
                                        Collections.singletonList(new SimpleGrantedAuthority(role))
                                    );
                                accessor.setUser(authToken);
                                log.debug("WebSocket authenticated for user: {}", username);
                            } else {
                                log.warn("WebSocket JWT expired or username null — rejecting connection");
                                throw new org.springframework.messaging.MessageDeliveryException("JWT expired");
                            }
                        } catch (org.springframework.messaging.MessageDeliveryException e) {
                            throw e;
                        } catch (Exception e) {
                            log.warn("WebSocket JWT validation failed: {}", e.getMessage());
                            throw new org.springframework.messaging.MessageDeliveryException("JWT invalid");
                        }
                    } else {
                        log.warn("WebSocket CONNECT without JWT token — rejecting");
                        throw new org.springframework.messaging.MessageDeliveryException("Authentication required");
                    }
                }

                return message;
            }
        });
    }
}
