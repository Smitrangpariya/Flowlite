package com.flowlite.service;

import com.flowlite.entity.Task;
import com.flowlite.entity.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username:}")
    private String mailUsername;
    
    @Value("${flowlite.app.name:FlowLite}")
    private String appName;
    
    @Value("${flowlite.app.url:http://localhost:3000}")
    private String appUrl;
    
    // Rate limiting: max emails per recipient per window
    private static final int MAX_EMAILS_PER_WINDOW = 5;
    private static final long WINDOW_MILLIS = 15 * 60 * 1000; // 15 minutes
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Instant>> emailRateMap = new ConcurrentHashMap<>();
    
    /**
     * Checks if email is configured
     */
    private boolean isEmailConfigured() {
        return mailUsername != null && !mailUsername.trim().isEmpty();
    }
    
    /**
     * Sends email when a task is assigned to a user
     */
    @Async("emailExecutor")
    public void sendTaskAssignedEmail(Task task, User assignee) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping task assigned notification");
            return;
        }
        if (assignee == null || assignee.getEmail() == null) {
            log.warn("Cannot send task assigned email - assignee or email is null");
            return;
        }
        
        String subject = appName + " - New Task Assigned: " + task.getTitle();
        String body = buildHtmlEmail(
            "Task Assigned to You",
            assignee.getUsername(),
            "You have been assigned a new task:",
            task,
            "View Task",
            appUrl + "/tasks/" + task.getId()
        );
        
        sendEmail(assignee.getEmail(), subject, body);
    }
    
    /**
     * Sends email when a task is submitted for review
     */
    @Async("emailExecutor")
    public void sendReviewRequestEmail(Task task, User approver) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping review request notification");
            return;
        }
        if (approver == null || approver.getEmail() == null) {
            log.warn("Cannot send review request email - approver or email is null");
            return;
        }
        
        String submitter = task.getAssignee() != null ? task.getAssignee().getUsername() : "A team member";
        String subject = appName + " - Review Requested: " + task.getTitle();
        String body = buildHtmlEmail(
            "Review Requested",
            approver.getUsername(),
            submitter + " has submitted the following task for your review:",
            task,
            "Review Task",
            appUrl + "/tasks/" + task.getId()
        );
        
        sendEmail(approver.getEmail(), subject, body);
    }
    
    /**
     * Sends email when a task is approved
     */
    @Async("emailExecutor")
    public void sendTaskApprovedEmail(Task task, User assignee) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping task approved notification");
            return;
        }
        if (assignee == null || assignee.getEmail() == null) {
            log.warn("Cannot send task approved email - assignee or email is null");
            return;
        }
        
        String approver = task.getApprover() != null ? task.getApprover().getUsername() : "The reviewer";
        String subject = appName + " - Task Approved: " + task.getTitle();
        String body = buildHtmlEmail(
            "Task Approved! ✓",
            assignee.getUsername(),
            approver + " has approved your task. Great work!",
            task,
            "View Completed Task",
            appUrl + "/tasks/" + task.getId()
        );
        
        sendEmail(assignee.getEmail(), subject, body);
    }
    
    /**
     * Sends email when a task is rejected
     */
    @Async("emailExecutor")
    public void sendTaskRejectedEmail(Task task, User assignee, String rejectionReason) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping task rejected notification");
            return;
        }
        if (assignee == null || assignee.getEmail() == null) {
            log.warn("Cannot send task rejected email - assignee or email is null");
            return;
        }
        
        String approver = task.getApprover() != null ? task.getApprover().getUsername() : "The reviewer";
        String additionalInfo = rejectionReason != null && !rejectionReason.isEmpty() 
            ? approver + " has requested changes with the following feedback:<br><br><em>\"" + rejectionReason + "\"</em>"
            : approver + " has requested changes to this task.";
        
        String subject = appName + " - Changes Requested: " + task.getTitle();
        String body = buildHtmlEmail(
            "Changes Requested",
            assignee.getUsername(),
            additionalInfo,
            task,
            "View Task",
            appUrl + "/tasks/" + task.getId()
        );
        
        sendEmail(assignee.getEmail(), subject, body);
    }
    
    /**
     * Sends email when a task is cancelled
     */
    @Async("emailExecutor")
    public void sendTaskCancelledEmail(Task task, User assignee, String reason) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping task cancelled notification");
            return;
        }
        if (assignee == null || assignee.getEmail() == null) {
            log.warn("Cannot send task cancelled email - assignee or email is null");
            return;
        }
        
        String reasonText = reason != null && !reason.isEmpty() 
            ? "Reason: <em>\"" + reason + "\"</em>"
            : "";
        
        String subject = appName + " - Task Cancelled: " + task.getTitle();
        String body = buildHtmlEmail(
            "Task Cancelled",
            assignee.getUsername(),
            "The following task has been cancelled. " + reasonText,
            task,
            "View Cancelled Task",
            appUrl + "/tasks/" + task.getId()
        );
        
        sendEmail(assignee.getEmail(), subject, body);
    }
    
    private String buildHtmlEmail(String title, String recipientName, String message, 
                                   Task task, String buttonText, String buttonUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px;">%s</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Hi <strong>%s</strong>,
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            %s
                        </p>
                        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1e293b;">
                                %s
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 14px;">
                                Priority: <strong>%s</strong> | Project: <strong>%s</strong>
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                %s
                            </a>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
                        <p style="margin: 0;">
                            Sent by %s | 
                            <a href="%s" style="color: #3b82f6; text-decoration: none;">Open Dashboard</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                title,
                recipientName,
                message,
                task.getTitle(),
                task.getPriority(),
                task.getProject() != null ? task.getProject().getName() : "No Project",
                buttonUrl,
                buttonText,
                appName,
                appUrl
            );
    }
    
    private void sendEmail(String to, String subject, String htmlBody) {
        // Rate limit check
        if (!checkRateLimit(to)) {
            log.warn("Email rate limit exceeded for recipient: {}", to);
            return;
        }
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(mailUsername);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            
            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
            // Don't throw - email failures should not break the main flow
        } catch (Exception e) {
            log.warn("Unexpected error sending email to {}: {}", to, e.getMessage());
            // Don't throw - email failures should not break the main flow
        }
    }
    
    /**
     * Simple per-recipient rate limiter.
     * Returns true if the email can be sent, false if rate limit exceeded.
     */
    private boolean checkRateLimit(String recipient) {
        ConcurrentLinkedDeque<Instant> timestamps = emailRateMap
                .computeIfAbsent(recipient, k -> new ConcurrentLinkedDeque<>());
        
        Instant cutoff = Instant.now().minusMillis(WINDOW_MILLIS);
        
        // Remove expired entries
        while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(cutoff)) {
            timestamps.pollFirst();
        }
        
        if (timestamps.size() >= MAX_EMAILS_PER_WINDOW) {
            return false;
        }
        
        timestamps.addLast(Instant.now());
        return true;
    }
    
    /**
     * Send password reset email
     */
    public void sendPasswordResetEmail(String to, String username, String resetLink) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping password reset email");
            log.info("Password reset link for {}: {}", to, resetLink);
            return;
        }
        
        String subject = appName + " - Password Reset Request";
        String body = buildPasswordResetEmail(username, resetLink);
        sendEmail(to, subject, body);
    }
    
    private String buildPasswordResetEmail(String username, String resetLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%%, #1d4ed8 100%%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px;">Password Reset Request</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Hello <strong>%s</strong>,
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            You requested to reset your password. Click the button below to set a new password:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%%, #1d4ed8 100%%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #ef4444; font-size: 14px; font-weight: bold;">
                            This link will expire in 1 hour.
                        </p>
                        <p style="color: #64748b; font-size: 14px;">
                            If you didn't request this password reset, please ignore this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(username, resetLink);
    }
    
    /**
     * Send email verification email
     */
    public void sendVerificationEmail(String to, String username, String verificationLink) {
        if (!isEmailConfigured()) {
            log.debug("Email not configured, skipping verification email");
            log.info("Email verification link for {}: {}", to, verificationLink);
            return;
        }
        
        String subject = appName + " - Verify Your Email";
        String body = buildVerificationEmail(username, verificationLink);
        sendEmail(to, subject, body);
    }
    
    private String buildVerificationEmail(String username, String verificationLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px;">Welcome to FlowLite!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Hello <strong>%s</strong>,
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Thank you for registering! Please verify your email address to activate your account:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                Verify Email
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">
                            This link will expire in 24 hours.
                        </p>
                        <p style="color: #64748b; font-size: 14px;">
                            If you didn't create this account, please ignore this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(username, verificationLink);
    }
}

