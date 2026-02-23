package com.flowlite.config;

import com.flowlite.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserRepository userRepository;

    /** Constant prefix for organization-scoped topics */
    private static final String ORG_TOPIC_PREFIX = "/topic/org/";

    /**
     * Safely extract org ID from destinations like "/topic/org/42/tasks".
     * Uses regex instead of split() to prevent IndexOutOfBounds on malformed paths.
     */
    private static final Pattern ORG_TOPIC_PATTERN = Pattern.compile("^/topic/org/(\\d+)(/.*)?$");

    @EventListener
    public void handleWebSocketConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();

        if (user != null) {
            log.info("WebSocket CONNECTED: user={} sessionId={}",
                user.getName(), accessor.getSessionId());
        } else {
            log.warn("WebSocket CONNECTED with no authentication: sessionId={}",
                accessor.getSessionId());
        }
    }

    @EventListener
    public void handleWebSocketSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        String destination = accessor.getDestination();

        if (user == null) {
            log.warn("Unauthenticated WebSocket subscription attempt to: {}", destination);
            return;
        }

        // Validate org-scoped subscriptions using constant prefix + regex
        if (destination != null && destination.startsWith(ORG_TOPIC_PREFIX)) {
            Matcher matcher = ORG_TOPIC_PATTERN.matcher(destination);

            if (!matcher.matches()) {
                log.warn("SECURITY: Malformed org topic subscription blocked: {}", destination);
                throw new IllegalStateException("Invalid organization topic format");
            }

            Long topicOrgId;
            try {
                topicOrgId = Long.parseLong(matcher.group(1));
            } catch (NumberFormatException e) {
                log.warn("Invalid org ID in subscription: {}", destination);
                throw new IllegalStateException("Invalid organization in subscription topic");
            }

            userRepository.findByUsername(user.getName()).ifPresentOrElse(
                (dbUser) -> {
                    Long userOrgId = dbUser.getOrganization() != null
                        ? dbUser.getOrganization().getId() : null;

                    if (!topicOrgId.equals(userOrgId)) {
                        log.warn(
                            "SECURITY: Cross-org WebSocket subscription blocked. " +
                            "User={} (org={}) tried to subscribe to org={} topic",
                            user.getName(), userOrgId, topicOrgId
                        );
                        throw new IllegalStateException(
                            "Access denied: cannot subscribe to another organization's topic"
                        );
                    } else {
                        log.debug("WebSocket SUBSCRIBED: user={} to={}",
                            user.getName(), destination);
                    }
                },
                () -> {
                    log.warn("WebSocket subscription from unknown user: {}", user.getName());
                    throw new IllegalStateException("Unknown user attempted subscription");
                }
            );
        }
    }

    @EventListener
    public void handleWebSocketDisconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();

        log.debug("WebSocket DISCONNECTED: user={} sessionId={}",
            user != null ? user.getName() : "anonymous",
            accessor.getSessionId());
    }
}
