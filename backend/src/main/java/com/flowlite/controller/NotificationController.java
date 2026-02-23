package com.flowlite.controller;

import com.flowlite.entity.Notification;
import com.flowlite.entity.User;
import com.flowlite.service.NotificationService;
import com.flowlite.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notifications", description = "User notification endpoints")
public class NotificationController {

    private final UserService userService;
    private final NotificationService notificationService;

    @Operation(summary = "Get my notifications", description = "Returns all notifications for the current user, sorted by date")
    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications() {
        User currentUser = userService.getCurrentUser();
        return ResponseEntity.ok(notificationService.getMyNotifications(currentUser));
    }

    @Operation(summary = "Get unread count", description = "Returns the count of unread notifications")
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = userService.getCurrentUser();
        long count = notificationService.getUnreadCount(currentUser);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @Operation(summary = "Mark notification as read")
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        User currentUser = userService.getCurrentUser();
        notificationService.markAsRead(id, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Mark all notifications as read")
    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        User currentUser = userService.getCurrentUser();
        notificationService.markAllAsRead(currentUser);
        return ResponseEntity.ok().build();
    }
}
