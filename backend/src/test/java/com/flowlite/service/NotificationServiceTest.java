package com.flowlite.service;

import com.flowlite.entity.Notification;
import com.flowlite.entity.User;
import com.flowlite.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private NotificationService notificationService;

    private User recipient;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        recipient = new User();
        recipient.setId(1L);
        recipient.setUsername("user1");
    }

    @Test
    void createNotification_ShouldSaveAndBroadcast() {
        String content = "Test Notification";
        Notification.NotificationType type = Notification.NotificationType.TASK_ASSIGNED;
        Long taskId = 100L;

        Notification savedNotification = new Notification();
        savedNotification.setId(1L);
        savedNotification.setRecipient(recipient);
        savedNotification.setContent(content);
        savedNotification.setType(type);
        savedNotification.setRelatedTaskId(taskId);
        
        when(notificationRepository.save(any(Notification.class))).thenReturn(savedNotification);

        notificationService.createNotification(recipient, content, type, taskId);

        verify(notificationRepository).save(any(Notification.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/user/1/notifications"), eq(savedNotification));
    }

    @Test
    void markAsRead_ShouldUpdateReadStatus_WhenUserIsRecipient() {
        Long notificationId = 1L;
        Notification notification = new Notification();
        notification.setId(notificationId);
        notification.setRecipient(recipient);
        notification.setRead(false);

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));
        
        notificationService.markAsRead(notificationId, recipient);

        assertTrue(notification.isRead());
        verify(notificationRepository).save(notification);
    }
    
    @Test
    void markAsRead_ShouldThrowException_WhenUserIsNotRecipient() {
        Long notificationId = 1L;
        User otherUser = new User();
        otherUser.setId(2L);
        
        Notification notification = new Notification();
        notification.setId(notificationId);
        notification.setRecipient(recipient); // recipient is user1 (1L)

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));
        
        assertThrows(RuntimeException.class, () -> notificationService.markAsRead(notificationId, otherUser));
        verify(notificationRepository, never()).save(any());
    }
    
    @Test
    void getUnreadCount_ShouldCallRepository() {
        when(notificationRepository.countByRecipientIdAndReadFalse(recipient.getId())).thenReturn(5L);
        
        long count = notificationService.getUnreadCount(recipient);
        
        assertEquals(5L, count);
        verify(notificationRepository).countByRecipientIdAndReadFalse(recipient.getId());
    }
}
