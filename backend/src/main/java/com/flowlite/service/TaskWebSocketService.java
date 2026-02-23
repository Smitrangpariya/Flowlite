package com.flowlite.service;

import com.flowlite.dto.TaskResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for broadcasting task updates via WebSocket (org-scoped)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TaskWebSocketService {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    /**
     * Broadcast a task event to a specific organization's topic.
     * Events are always org-scoped to prevent cross-tenant leaks.
     * @param eventType CREATE, UPDATE, DELETE, STATUS_CHANGE
     * @param task The task response payload
     * @param organizationId The org to broadcast to
     */
    public void broadcastTaskEvent(String eventType, TaskResponse task, Long organizationId) {
        TaskEvent event = new TaskEvent(eventType, task);
        String destination = "/topic/org/" + organizationId + "/tasks";
        log.debug("Broadcasting {} for task {} to {}", eventType, task.getId(), destination);
        messagingTemplate.convertAndSend(destination, event);
    }
    
    /**
     * Event payload sent to WebSocket clients
     */
    public record TaskEvent(String type, TaskResponse task) {}
}
