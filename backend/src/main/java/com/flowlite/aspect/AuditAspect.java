package com.flowlite.aspect;

import com.flowlite.entity.AuditLog;
import com.flowlite.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Audit Logging Aspect
 * Automatically logs security and admin actions
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {
    
    private final AuditLogRepository auditLogRepository;
    
    // ==================== AUTH POINTCUTS ====================
    
    @Pointcut("execution(* com.flowlite.service.AuthService.register(..))")
    public void userRegistration() {}
    
    @Pointcut("execution(* com.flowlite.service.AuthService.login(..))")
    public void userLogin() {}
    
    @Pointcut("execution(* com.flowlite.service.AuthService.logout(..))")
    public void userLogout() {}
    
    @Pointcut("execution(* com.flowlite.service.AuthService.requestPasswordReset(..))")
    public void passwordResetRequest() {}
    
    @Pointcut("execution(* com.flowlite.service.AuthService.resetPassword(..))")
    public void passwordReset() {}
    
    @Pointcut("execution(* com.flowlite.service.AuthService.verifyEmail(..))")
    public void emailVerification() {}
    
    // ==================== TASK POINTCUTS ====================
    
    @Pointcut("execution(* com.flowlite.service.TaskService.createTask(..))")
    public void taskCreation() {}
    
    @Pointcut("execution(* com.flowlite.service.TaskService.updateTask(..))")
    public void taskUpdate() {}
    
    @Pointcut("execution(* com.flowlite.service.TaskService.deleteTask(..))")
    public void taskDeletion() {}
    
    @Pointcut("execution(* com.flowlite.service.TaskService.updateTaskStatus(..))")
    public void taskStatusChange() {}
    
    // ==================== PROJECT POINTCUTS ====================
    
    @Pointcut("execution(* com.flowlite.service.ProjectService.createProject(..))")
    public void projectCreation() {}
    
    // ==================== AUTH LOGGING ====================
    
    @AfterReturning(pointcut = "userRegistration()", returning = "result")
    public void logUserRegistration(JoinPoint joinPoint, Object result) {
        logAction("USER_REGISTRATION", "User", "New user registered", joinPoint);
    }
    
    @AfterReturning(pointcut = "userLogin()", returning = "result")
    public void logUserLogin(JoinPoint joinPoint, Object result) {
        logAction("USER_LOGIN", "Session", "User logged in successfully", joinPoint);
    }
    
    @AfterReturning("userLogout()")
    public void logUserLogout(JoinPoint joinPoint) {
        logAction("USER_LOGOUT", "Session", "User logged out", joinPoint);
    }
    
    @AfterReturning("passwordResetRequest()")
    public void logPasswordResetRequest(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        String email = args.length > 0 ? (String) args[0] : "unknown";
        
        AuditLog auditLog = new AuditLog();
        auditLog.setAction("PASSWORD_RESET_REQUEST");
        auditLog.setEntity("User");
        auditLog.setDetails("Password reset requested for: " + maskEmail(email));
        auditLog.setUsername(email);
        auditLog.setTimestamp(LocalDateTime.now());
        
        try {
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to log password reset request", e);
        }
    }
    
    @AfterReturning("passwordReset()")
    public void logPasswordReset(JoinPoint joinPoint) {
        logAction("PASSWORD_RESET_COMPLETE", "User", "Password was reset successfully", joinPoint);
    }
    
    @AfterReturning("emailVerification()")
    public void logEmailVerification(JoinPoint joinPoint) {
        logAction("EMAIL_VERIFIED", "User", "Email address verified", joinPoint);
    }
    
    // ==================== TASK LOGGING ====================
    
    @AfterReturning(pointcut = "taskCreation()", returning = "result")
    public void logTaskCreation(JoinPoint joinPoint, Object result) {
        logAction("TASK_CREATED", "Task", "New task created", joinPoint);
    }
    
    @AfterReturning(pointcut = "taskUpdate()", returning = "result")
    public void logTaskUpdate(JoinPoint joinPoint, Object result) {
        Object[] args = joinPoint.getArgs();
        Long taskId = (Long) args[0];
        logAction("TASK_UPDATED", "Task", "Task #" + taskId + " updated", joinPoint);
    }
    
    @AfterReturning("taskDeletion()")
    public void logTaskDeletion(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        Long taskId = (Long) args[0];
        logAction("TASK_DELETED", "Task", "Task #" + taskId + " deleted", joinPoint);
    }
    
    @AfterReturning(pointcut = "taskStatusChange()", returning = "result")
    public void logTaskStatusChange(JoinPoint joinPoint, Object result) {
        Object[] args = joinPoint.getArgs();
        Long taskId = (Long) args[0];
        logAction("TASK_STATUS_CHANGED", "Task", "Task #" + taskId + " status changed", joinPoint);
    }
    
    // ==================== PROJECT LOGGING ====================
    
    @AfterReturning(pointcut = "projectCreation()", returning = "result")
    public void logProjectCreation(JoinPoint joinPoint, Object result) {
        logAction("PROJECT_CREATED", "Project", "New project created", joinPoint);
    }
    
    // ==================== BOARD POINTCUTS ====================
    
    @Pointcut("execution(* com.flowlite.service.BoardService.createBoard(..))")
    public void boardCreation() {}
    
    @Pointcut("execution(* com.flowlite.service.BoardService.deleteBoard(..))")
    public void boardDeletion() {}
    
    @Pointcut("execution(* com.flowlite.service.BoardService.updateBoard(..))")
    public void boardUpdate() {}
    
    // ==================== ADMIN POINTCUTS ====================
    
    @Pointcut("execution(* com.flowlite.service.UserService.updateUserRole(..))")
    public void roleChange() {}
    
    @Pointcut("execution(* com.flowlite.service.UserService.deactivateUser(..))")
    public void userDeactivation() {}
    
    @Pointcut("execution(* com.flowlite.service.UserService.createUserInOrganization(..))")
    public void adminUserCreation() {}
    
    // ==================== BOARD LOGGING ====================
    
    @AfterReturning(pointcut = "boardCreation()", returning = "result")
    public void logBoardCreation(JoinPoint joinPoint, Object result) {
        logAction("BOARD_CREATED", "Board", "New board created", joinPoint);
    }
    
    @AfterReturning("boardDeletion()")
    public void logBoardDeletion(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        Long boardId = (Long) args[0];
        logAction("BOARD_DELETED", "Board", "Board #" + boardId + " deleted", joinPoint);
    }
    
    @AfterReturning(pointcut = "boardUpdate()", returning = "result")
    public void logBoardUpdate(JoinPoint joinPoint, Object result) {
        Object[] args = joinPoint.getArgs();
        Long boardId = (Long) args[0];
        logAction("BOARD_UPDATED", "Board", "Board #" + boardId + " updated", joinPoint);
    }
    
    // ==================== ADMIN LOGGING ====================
    
    @AfterReturning(pointcut = "roleChange()", returning = "result")
    public void logRoleChange(JoinPoint joinPoint, Object result) {
        Object[] args = joinPoint.getArgs();
        String details = "Role change";
        if (args.length >= 2) {
            // args[1] is the new Role enum
            String newRole = String.valueOf(args[1]);
            String username = "unknown";
            // result is the updated User — extract username for clarity
            if (result != null) {
                try {
                    username = ((com.flowlite.entity.User) result).getUsername();
                } catch (Exception ignored) {}
            }
            details = "Role changed for user '" + username + "' (id=" + args[0] + ") → " + newRole;
        }
        logAction("ROLE_CHANGED", "User", details, joinPoint);
    }
    
    @AfterReturning("userDeactivation()")
    public void logUserDeactivation(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        Long userId = (Long) args[0];
        logAction("USER_DEACTIVATED", "User", "User #" + userId + " deactivated by admin", joinPoint);
    }
    
    @AfterReturning(pointcut = "adminUserCreation()", returning = "result")
    public void logAdminUserCreation(JoinPoint joinPoint, Object result) {
        logAction("ADMIN_USER_CREATED", "User", "User created by admin", joinPoint);
    }
    
    // ==================== HELPER METHODS ====================
    
    private void logAction(String action, String entity, String details, JoinPoint joinPoint) {
        try {
            String username = getCurrentUsername();
            
            AuditLog auditLog = new AuditLog();
            auditLog.setAction(action);
            auditLog.setEntity(entity);
            auditLog.setDetails(details + " by " + username);
            auditLog.setUsername(username);
            auditLog.setTimestamp(LocalDateTime.now());
            
            auditLogRepository.save(auditLog);
            log.debug("Audit log saved: {} - {} - {}", action, entity, details);
        } catch (Exception e) {
            log.error("Failed to save audit log", e);
        }
    }
    
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "anonymous";
    }
    
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "******";
        int atIndex = email.indexOf("@");
        if (atIndex <= 2) return "***" + email.substring(atIndex);
        return email.substring(0, 2) + "***" + email.substring(atIndex);
    }
}

