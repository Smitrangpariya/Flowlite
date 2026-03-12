package com.flowlite.service;

import com.flowlite.entity.Notification;
import com.flowlite.entity.User;
import com.flowlite.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void createNotification(User recipient, String content, Notification.NotificationType type, Long relatedTaskId) {
        try {
            Notification notification = new Notification();
            notification.setRecipient(recipient);
            notification.setContent(content);
            notification.setType(type);
            notification.setRelatedTaskId(relatedTaskId);
            notification.setRead(false);
            
            Notification savedNotification = notificationRepository.save(notification);
            
            // Send to user-scoped queue — only the target user receives this
            messagingTemplate.convertAndSendToUser(
                recipient.getUsername(),
                "/queue/notifications",
                savedNotification
            );
            
            log.debug("Notification created for user {}: {}", recipient.getUsername(), content);
        } catch (Exception e) {
            log.error("Failed to create/send notification", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> getMyNotifications(User user) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markAsRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllAsRead(user.getId());
    }
}
