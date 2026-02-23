package com.flowlite.service;

import com.flowlite.dto.*;
import com.flowlite.entity.*;
import com.flowlite.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {
    
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final TaskCommentRepository commentRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;
    private final UserService userService;
    private final TaskWebSocketService webSocketService;
    private final NotificationService notificationService;
    private final InputSanitizer inputSanitizer;
    
    // ==================== READ OPERATIONS (Everyone can read) ====================
    
    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks() {
        // Filter tasks by current user's organization
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        return taskRepository.findAllWithDetailsByOrganizationId(orgId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<TaskResponse> getArchivedTasks() {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        return taskRepository.findByOrganizationIdAndStatus(orgId, TaskStatus.ARCHIVED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<TaskResponse> getCancelledTasks() {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        return taskRepository.findByOrganizationIdAndStatus(orgId, TaskStatus.CANCELLED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<TaskResponse> getDeletedTasks() {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        return taskRepository.findByOrganizationIdAndStatus(orgId, TaskStatus.DELETED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * EMPTY TRASH: Permanently deletes all soft-deleted tasks in the organization.
     * Only ADMIN or PRODUCT_MANAGER can perform this action.
     */
    @Transactional
    public void emptyTrash() {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isManager = currentUser.getRole() == Role.PRODUCT_MANAGER;
        if (!isAdmin && !isManager) {
            throw new AccessDeniedException("Only admins or product managers can empty the trash");
        }
        
        List<Task> deletedTasks = taskRepository.findByOrganizationIdAndStatus(orgId, TaskStatus.DELETED);
        if (!deletedTasks.isEmpty()) {
            taskRepository.deleteAll(deletedTasks);
            log.info("Trash emptied: {} tasks permanently deleted by user: {}", 
                    deletedTasks.size(), currentUser.getUsername());
        }
    }
    
    /**
     * Paginated task retrieval for infinite scroll
     * Excludes ARCHIVED, CANCELLED, DELETED tasks
     */
    @Transactional(readOnly = true)
    public Page<TaskResponse> getTasksPaginated(int page, int size) {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        
        List<TaskStatus> excludedStatuses = List.of(
                TaskStatus.ARCHIVED, 
                TaskStatus.CANCELLED, 
                TaskStatus.DELETED
        );
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Task> taskPage = taskRepository.findByOrganizationIdAndStatusNotIn(orgId, excludedStatuses, pageable);
        
        return taskPage.map(this::mapToResponse);
    }
    
    /**
     * Board-filtered task retrieval with pagination
     */
    @Transactional(readOnly = true)
    public Page<TaskResponse> getTasksByBoard(Long boardId, int page, int size) {
        List<TaskStatus> excludedStatuses = List.of(
                TaskStatus.ARCHIVED, 
                TaskStatus.CANCELLED, 
                TaskStatus.DELETED
        );
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Task> taskPage = taskRepository.findByBoardIdAndStatusNotIn(boardId, excludedStatuses, pageable);
        
        return taskPage.map(this::mapToResponse);
    }
    
    /**
     * Board-filtered task retrieval (non-paginated, all active tasks)
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByBoardAll(Long boardId) {
        List<TaskStatus> excludedStatuses = List.of(
                TaskStatus.ARCHIVED, 
                TaskStatus.CANCELLED, 
                TaskStatus.DELETED
        );
        
        List<Task> tasks = taskRepository.findByBoardIdAndStatusNotInList(boardId, excludedStatuses);
        
        return tasks.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        return mapToResponse(task);
    }
    
    // ==================== CREATE ====================
    
    @Transactional
    public TaskResponse createTask(TaskRequest request) {
        User currentUser = getCurrentUser();
        Organization org = currentUser.getOrganization();
        
        // Validate board exists and user has access
        Board board = boardRepository.findAccessibleBoard(
            request.getBoardId(),
            org.getId(),
            currentUser.getId()
        ).orElseThrow(() -> new RuntimeException(
            "Board not found or you don't have access to it"
        ));
        
        // Authorization: only the owner can create tasks on a personal board
        if (board.isPersonal() && board.getOwner() != null 
                && !board.getOwner().getId().equals(currentUser.getId())) {
            log.warn("User {} tried to create task on another user's personal board",
                    currentUser.getUsername());
            throw new AccessDeniedException(
                    "You cannot create tasks on another user's personal board");
        }
        
        Task task = new Task();
        task.setTitle(inputSanitizer.sanitizeStrict(request.getTitle()));
        task.setDescription(inputSanitizer.sanitizeBasicFormatting(request.getDescription()));
        task.setPriority(request.getPriority());
        task.setStatus(TaskStatus.CREATED);
        task.setCreatedBy(currentUser);
        task.setBoard(board);
        task.setWorkflowVersion(Task.WORKFLOW_VERSION);
        task.setDueDate(request.getDueDate());
        
        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("Project not found"));
            task.setProject(project);
        }
        
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new RuntimeException("Assignee not found"));
            task.setAssignee(assignee);
            task.setStatus(TaskStatus.ASSIGNED);
        }
        
        if (request.getApproverId() != null) {
            User approver = userRepository.findById(request.getApproverId())
                    .orElseThrow(() -> new RuntimeException("Approver not found"));
            if (approver.getRole() != Role.TEAM_LEAD && approver.getRole() != Role.ADMIN) {
                throw new IllegalArgumentException("Approver must be a Team Lead or Admin");
            }
            task.setApprover(approver);
        }
        
        task = taskRepository.save(task);
        log.info("Task created: {} on board: {} by user: {}", 
            task.getId(), board.getName(), currentUser.getUsername());
        
        // Send email notification if task is assigned
        if (task.getAssignee() != null) {
            emailService.sendTaskAssignedEmail(task, task.getAssignee());
            if (!task.getAssignee().getId().equals(currentUser.getId())) {
                notificationService.createNotification(
                    task.getAssignee(), 
                    "You have been assigned to task: " + task.getTitle(),
                    Notification.NotificationType.TASK_ASSIGNED,
                    task.getId()
                );
            }
        }
        
        TaskResponse response = mapToResponse(task);
        Long orgId = currentUser.getOrganization().getId();
        webSocketService.broadcastTaskEvent("CREATE", response, orgId);
        return response;
    }
    
    // ==================== UPDATE ====================
    
    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        // Can only update tasks that are not DONE, CANCELLED, or ARCHIVED
        if (task.getStatus() == TaskStatus.DONE || 
            task.getStatus() == TaskStatus.CANCELLED || 
            task.getStatus() == TaskStatus.ARCHIVED) {
            throw new IllegalStateException("Cannot update a completed, cancelled, or archived task");
        }
        
        // Capture old assignee for change detection
        Long oldAssigneeId = task.getAssignee() != null ? task.getAssignee().getId() : null;
        
        task.setTitle(inputSanitizer.sanitizeStrict(request.getTitle()));
        task.setDescription(inputSanitizer.sanitizeBasicFormatting(request.getDescription()));
        task.setPriority(request.getPriority());
        task.setDueDate(request.getDueDate());
        
        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("Project not found"));
            task.setProject(project);
        }
        
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new RuntimeException("Assignee not found"));
            task.setAssignee(assignee);
        }
        
        if (request.getApproverId() != null) {
            User approver = userRepository.findById(request.getApproverId())
                    .orElseThrow(() -> new RuntimeException("Approver not found"));
            if (approver.getRole() != Role.TEAM_LEAD && approver.getRole() != Role.ADMIN) {
                throw new IllegalArgumentException("Approver must be a Team Lead or Admin");
            }
            task.setApprover(approver);
        }
        
        // Notify new assignee if changed
        if (request.getAssigneeId() != null && !request.getAssigneeId().equals(oldAssigneeId)) {
            User newAssignee = task.getAssignee();
            if (newAssignee != null && !newAssignee.getId().equals(getCurrentUser().getId())) {
                notificationService.createNotification(
                    newAssignee,
                    "You have been assigned to task: " + task.getTitle(),
                    Notification.NotificationType.TASK_ASSIGNED,
                    task.getId()
                );
            }
        }
        
        task = taskRepository.save(task);
        TaskResponse response = mapToResponse(task);
        Long orgId = getCurrentUser().getOrganization().getId();
        webSocketService.broadcastTaskEvent("UPDATE", response, orgId);
        return response;
    }
    
    // ==================== DELETE / CANCEL / ARCHIVE ====================
    
    /**
     * DELETE: Soft delete - sets deletedAt timestamp
     * Can be undone within a time window
     * Also works for archived/cancelled tasks from dropdown
     */
    @Transactional
    public TaskResponse deleteTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        User currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isManager = currentUser.getRole() == Role.PRODUCT_MANAGER;
        boolean isCreator = task.getCreatedBy() != null && 
                            task.getCreatedBy().getId().equals(currentUser.getId());
        
        // Only creator, manager, or admin can delete
        if (!isCreator && !isManager && !isAdmin) {
            throw new AccessDeniedException("Only the task creator, manager, or admin can delete this task");
        }
        
        // Store previous status for potential undo
        task.setPreviousStatus(task.getStatus().name());
        task.setStatus(TaskStatus.DELETED);
        task.setDeletedAt(LocalDateTime.now());
        task = taskRepository.save(task);
        
        log.info("Task soft-deleted: {} by user: {}", task.getId(), currentUser.getUsername());
        TaskResponse response = mapToResponse(task);
        webSocketService.broadcastTaskEvent("DELETE", response, currentUser.getOrganization().getId());
        return response;
    }
    
    /**
     * UNDO DELETE: Restores a soft-deleted task
     * Returns task to its previous status
     */
    @Transactional
    public TaskResponse undoDelete(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        if (task.getStatus() != TaskStatus.DELETED) {
            throw new IllegalStateException("Task is not deleted");
        }
        
        User currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isManager = currentUser.getRole() == Role.PRODUCT_MANAGER;
        boolean isCreator = task.getCreatedBy() != null && 
                            task.getCreatedBy().getId().equals(currentUser.getId());
        
        if (!isCreator && !isManager && !isAdmin) {
            throw new AccessDeniedException("Only the task creator, manager, or admin can undo delete");
        }
        
        // Restore to previous status
        if (task.getPreviousStatus() != null) {
            task.setStatus(TaskStatus.valueOf(task.getPreviousStatus()));
        } else {
            task.setStatus(TaskStatus.CREATED);
        }
        
        task.setDeletedAt(null);
        task.setPreviousStatus(null);
        task = taskRepository.save(task);
        
        log.info("Task delete undone: {} by user: {}", task.getId(), currentUser.getUsername());
        TaskResponse response = mapToResponse(task);
        webSocketService.broadcastTaskEvent("CREATE", response, currentUser.getOrganization().getId());
        return response;
    }
    
    /**
     * CANCEL: Allowed after assignment, before DONE
     * Marks task as cancelled (soft delete)
     */
    @Transactional
    public TaskResponse cancelTask(Long id, String reason) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        User currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isCreator = task.getCreatedBy() != null && 
                            task.getCreatedBy().getId().equals(currentUser.getId());
        boolean isManager = currentUser.getRole() == Role.PRODUCT_MANAGER;
        
        // Cannot cancel already completed, cancelled, or archived tasks
        if (task.getStatus() == TaskStatus.DONE || 
            task.getStatus() == TaskStatus.CANCELLED || 
            task.getStatus() == TaskStatus.ARCHIVED) {
            throw new IllegalStateException("Cannot cancel a completed, already cancelled, or archived task");
        }
        
        // Only creator, manager, or admin can cancel
        if (!isCreator && !isManager && !isAdmin) {
            throw new AccessDeniedException("Only the task creator, product manager, or admin can cancel this task");
        }
        
        task.setPreviousStatus(task.getStatus().name());
        task.setStatus(TaskStatus.CANCELLED);
        task.setCancelledAt(LocalDateTime.now());
        
        // Save cancellation reason as comment
        if (reason != null && !reason.trim().isEmpty()) {
            saveComment(task, currentUser, "Task cancelled: " + reason, TaskComment.CommentType.STATUS_CHANGE);
        } else {
            saveComment(task, currentUser, "Task cancelled", TaskComment.CommentType.STATUS_CHANGE);
        }
        
        task = taskRepository.save(task);
        log.info("Task cancelled: {} by user: {}", task.getId(), currentUser.getUsername());
        
        // Send cancellation email to assignee
        if (task.getAssignee() != null) {
            emailService.sendTaskCancelledEmail(task, task.getAssignee(), reason);
        }
        
        TaskResponse response = mapToResponse(task);
        webSocketService.broadcastTaskEvent("STATUS_CHANGE", response, currentUser.getOrganization().getId());
        return response;
    }
    
    /**
     * ARCHIVE: Only allowed after DONE
     * Moves completed task to archive
     */
    @Transactional
    public TaskResponse archiveTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        User currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isManager = currentUser.getRole() == Role.PRODUCT_MANAGER;
        
        // Only DONE tasks can be archived
        if (task.getStatus() != TaskStatus.DONE) {
            throw new IllegalStateException("Only completed tasks can be archived");
        }
        
        // Only manager or admin can archive
        if (!isManager && !isAdmin) {
            throw new AccessDeniedException("Only product managers or admins can archive tasks");
        }
        
        task.setPreviousStatus(task.getStatus().name());
        task.setStatus(TaskStatus.ARCHIVED);
        task.setArchivedAt(LocalDateTime.now());
        
        saveComment(task, currentUser, "Task archived", TaskComment.CommentType.STATUS_CHANGE);
        
        task = taskRepository.save(task);
        log.info("Task archived: {} by user: {}", task.getId(), currentUser.getUsername());
        TaskResponse response = mapToResponse(task);
        webSocketService.broadcastTaskEvent("STATUS_CHANGE", response, currentUser.getOrganization().getId());
        return response;
    }
    
    /**
     * RESTORE: Restores archived or cancelled tasks
     * Uses previousStatus field for accurate restoration
     * Falls back to DONE for archived, ASSIGNED/CREATED for cancelled
     */
    @Transactional
    public TaskResponse restoreTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        User currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isManager = currentUser.getRole() == Role.PRODUCT_MANAGER;
        
        // Only archived or cancelled tasks can be restored
        if (task.getStatus() != TaskStatus.ARCHIVED && task.getStatus() != TaskStatus.CANCELLED) {
            throw new IllegalStateException("Only archived or cancelled tasks can be restored");
        }
        
        // Only manager or admin can restore
        if (!isManager && !isAdmin) {
            throw new AccessDeniedException("Only product managers or admins can restore tasks");
        }
        
        TaskStatus currentStatus = task.getStatus();
        TaskStatus newStatus;
        
        // Use previousStatus if available, otherwise use sensible defaults
        if (task.getPreviousStatus() != null) {
            try {
                newStatus = TaskStatus.valueOf(task.getPreviousStatus());
            } catch (IllegalArgumentException e) {
                // Fallback if previousStatus is invalid
                newStatus = currentStatus == TaskStatus.ARCHIVED ? TaskStatus.DONE : 
                           (task.getAssignee() != null ? TaskStatus.ASSIGNED : TaskStatus.CREATED);
            }
        } else {
            // Fallback for tasks without previousStatus (legacy data)
            newStatus = currentStatus == TaskStatus.ARCHIVED ? TaskStatus.DONE : 
                       (task.getAssignee() != null ? TaskStatus.ASSIGNED : TaskStatus.CREATED);
        }
        
        task.setStatus(newStatus);
        task.setPreviousStatus(null);
        task.setArchivedAt(null);
        task.setCancelledAt(null);
        
        saveComment(task, currentUser, "Task restored from " + currentStatus.name() + " to " + newStatus.name(), TaskComment.CommentType.STATUS_CHANGE);
        
        task = taskRepository.save(task);
        log.info("Task restored: {} from {} to {} by user: {}", task.getId(), currentStatus, newStatus, currentUser.getUsername());
        TaskResponse response = mapToResponse(task);
        webSocketService.broadcastTaskEvent("STATUS_CHANGE", response, currentUser.getOrganization().getId());
        return response;
    }
    
    // ==================== WORKFLOW STATUS TRANSITIONS ====================
    
    /**
     * STRICT WORKFLOW ENFORCEMENT (v1-default):
     * - ONLY assignee can: Start task (ASSIGNED → IN_PROGRESS), Submit for review (IN_PROGRESS → REVIEW)
     * - ONLY assigned approver (or ADMIN) can: Approve (REVIEW → DONE), Reject (REVIEW → IN_PROGRESS)
     * - Rejection REQUIRES a comment
     */
    @Transactional
    public TaskResponse updateTaskStatus(Long id, StatusUpdateRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        User currentUser = getCurrentUser();
        TaskStatus currentStatus = task.getStatus();
        TaskStatus newStatus = request.getNewStatus();
        
        // Cannot transition cancelled or archived tasks
        if (currentStatus == TaskStatus.CANCELLED || currentStatus == TaskStatus.ARCHIVED) {
            throw new IllegalStateException("Cannot change status of cancelled or archived tasks");
        }
        
        // Validate and enforce ownership
        validateStatusTransition(task, currentUser, currentStatus, newStatus, request.getComment());
        
        // Handle rejection - MUST have comment
        if (currentStatus == TaskStatus.REVIEW && newStatus == TaskStatus.IN_PROGRESS) {
            if (request.getComment() == null || request.getComment().trim().isEmpty()) {
                throw new IllegalArgumentException("Rejection reason is required");
            }
            saveComment(task, currentUser, request.getComment(), TaskComment.CommentType.REJECTION);
            // Send rejection email to assignee
            if (task.getAssignee() != null) {
                emailService.sendTaskRejectedEmail(task, task.getAssignee(), request.getComment());
                notificationService.createNotification(
                    task.getAssignee(),
                    "Task rejected: " + task.getTitle(),
                    Notification.NotificationType.TASK_UPDATED,
                    task.getId()
                );
            }
        }
        
        // Handle approval
        if (currentStatus == TaskStatus.REVIEW && newStatus == TaskStatus.DONE) {
            task.setCompletedAt(LocalDateTime.now());
            if (request.getComment() != null && !request.getComment().trim().isEmpty()) {
                saveComment(task, currentUser, request.getComment(), TaskComment.CommentType.APPROVAL);
            } else {
                saveComment(task, currentUser, "Task approved", TaskComment.CommentType.APPROVAL);
            }
            // Send approval email to assignee
            if (task.getAssignee() != null) {
                emailService.sendTaskApprovedEmail(task, task.getAssignee());
                notificationService.createNotification(
                    task.getAssignee(),
                    "Task approved: " + task.getTitle(),
                    Notification.NotificationType.TASK_COMPLETED,
                    task.getId()
                );
            }
        }
        
        // Handle submit for review
        if (newStatus == TaskStatus.REVIEW) {
            if (request.getComment() != null && !request.getComment().trim().isEmpty()) {
                saveComment(task, currentUser, request.getComment(), TaskComment.CommentType.STATUS_CHANGE);
            }
            // Send review request email to approver
            if (task.getApprover() != null) {
                emailService.sendReviewRequestEmail(task, task.getApprover());
                notificationService.createNotification(
                    task.getApprover(),
                    "Task submitted for review: " + task.getTitle(),
                    Notification.NotificationType.TASK_UPDATED,
                    task.getId()
                );
            }
        }
        
        task.setStatus(newStatus);
        task = taskRepository.save(task);
        
        log.info("Task {} status changed from {} to {} by {}", 
                task.getId(), currentStatus, newStatus, currentUser.getUsername());
        
        TaskResponse response = mapToResponse(task);
        webSocketService.broadcastTaskEvent("STATUS_CHANGE", response, currentUser.getOrganization().getId());
        return response;
    }
    
    private void validateStatusTransition(Task task, User user, TaskStatus currentStatus, TaskStatus newStatus, String comment) {
        Role userRole = user.getRole();
        boolean isAdmin = userRole == Role.ADMIN;
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(user.getId());
        boolean isApprover = task.getApprover() != null && task.getApprover().getId().equals(user.getId());
        
        // START TASK: ASSIGNED → IN_PROGRESS
        if (currentStatus == TaskStatus.ASSIGNED && newStatus == TaskStatus.IN_PROGRESS) {
            if (!isAssignee && !isAdmin) {
                throw new AccessDeniedException("Only the assigned user can start this task");
            }
            return;
        }
        
        // SUBMIT FOR REVIEW: IN_PROGRESS → REVIEW
        if (currentStatus == TaskStatus.IN_PROGRESS && newStatus == TaskStatus.REVIEW) {
            if (!isAssignee && !isAdmin) {
                throw new AccessDeniedException("Only the assigned user can submit this task for review");
            }
            return;
        }
        
        // APPROVE: REVIEW → DONE
        if (currentStatus == TaskStatus.REVIEW && newStatus == TaskStatus.DONE) {
            if (!isApprover && !isAdmin) {
                throw new AccessDeniedException("Only the assigned approver can approve this task");
            }
            if (userRole != Role.TEAM_LEAD && userRole != Role.ADMIN) {
                throw new AccessDeniedException("You don't have permission to approve tasks");
            }
            return;
        }
        
        // REJECT: REVIEW → IN_PROGRESS
        if (currentStatus == TaskStatus.REVIEW && newStatus == TaskStatus.IN_PROGRESS) {
            if (!isApprover && !isAdmin) {
                throw new AccessDeniedException("Only the assigned approver can reject this task");
            }
            if (userRole != Role.TEAM_LEAD && userRole != Role.ADMIN) {
                throw new AccessDeniedException("You don't have permission to reject tasks");
            }
            return;
        }
        
        // Any other transition - only ADMIN allowed
        if (!isAdmin) {
            throw new AccessDeniedException("This status transition is not allowed");
        }
    }
    
    // ==================== COMMENTS ====================
    
    private void saveComment(Task task, User author, String comment, TaskComment.CommentType type) {
        TaskComment taskComment = new TaskComment();
        taskComment.setTask(task);
        taskComment.setAuthor(author);
        taskComment.setComment(comment);
        taskComment.setType(type);
        commentRepository.save(taskComment);
    }
    
    @Transactional
    public CommentResponse addComment(Long taskId, CommentRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        User currentUser = getCurrentUser();
        
        TaskComment comment = new TaskComment();
        comment.setTask(task);
        comment.setAuthor(currentUser);
        comment.setComment(request.getComment());
            comment.setType(request.getType() != null ? request.getType() : TaskComment.CommentType.GENERAL);
        
        comment = commentRepository.save(comment);
        
        // Notify Assignee if author is not assignee
        if (task.getAssignee() != null && !task.getAssignee().getId().equals(currentUser.getId())) {
             notificationService.createNotification(
                task.getAssignee(),
                "New comment on task: " + task.getTitle(),
                Notification.NotificationType.COMMENT_ADDED,
                task.getId()
            );
        }
        
        // Notify Approver if author is not approver (and approver exists)
        if (task.getApprover() != null && !task.getApprover().getId().equals(currentUser.getId())) {
             notificationService.createNotification(
                task.getApprover(),
                "New comment on task: " + task.getTitle(),
                Notification.NotificationType.COMMENT_ADDED,
                task.getId()
            );
        }

        return mapCommentToResponse(comment);
    }
    
    @Transactional(readOnly = true)
    public List<CommentResponse> getTaskComments(Long taskId) {
        return commentRepository.findByTaskIdWithAuthor(taskId).stream()
                .map(this::mapCommentToResponse)
                .collect(Collectors.toList());
    }
    
    // ==================== AUDIT REPORT ====================
    
    @Transactional(readOnly = true)
    public AuditReportResponse getAuditReport(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        // Audit report available for DONE and ARCHIVED tasks
        if (task.getStatus() != TaskStatus.DONE && task.getStatus() != TaskStatus.ARCHIVED) {
            throw new IllegalStateException("Audit report is only available for completed or archived tasks");
        }
        
        List<TaskComment> comments = commentRepository.findByTaskIdWithAuthor(taskId);
        
        AuditReportResponse report = new AuditReportResponse();
        report.setTaskId(task.getId());
        report.setTaskTitle(task.getTitle());
        report.setTaskDescription(task.getDescription());
        report.setPriority(task.getPriority());
        report.setFinalStatus(task.getStatus().name());
        report.setCreatedAt(task.getCreatedAt());
        report.setCompletedAt(task.getCompletedAt());
        
        if (task.getProject() != null) {
            report.setProjectName(task.getProject().getName());
            report.setProjectId(task.getProject().getId());
        }
        
        if (task.getCreatedBy() != null) {
            report.setCreatedBy(task.getCreatedBy().getUsername());
        }
        
        if (task.getAssignee() != null) {
            report.setAssignedTo(task.getAssignee().getUsername());
        }
        
        if (task.getApprover() != null) {
            report.setApprovedBy(task.getApprover().getUsername());
        }
        
        // Map comments to report
        List<AuditReportResponse.CommentEntry> commentEntries = comments.stream()
                .map(c -> new AuditReportResponse.CommentEntry(
                        c.getAuthor().getUsername(),
                        c.getType().name(),
                        c.getComment(),
                        c.getCreatedAt()
                ))
                .collect(Collectors.toList());
        report.setComments(commentEntries);
        
        report.setStatusHistory(new ArrayList<>());
        
        return report;
    }
    
    // ==================== MY TASKS & SEARCH ====================
    
    @Transactional(readOnly = true)
    public List<TaskResponse> getMyTasks() {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        List<TaskStatus> excludedStatuses = List.of(TaskStatus.ARCHIVED, TaskStatus.CANCELLED, TaskStatus.DELETED);
        return taskRepository.findByAssigneeIdAndOrganizationId(currentUser.getId(), orgId, excludedStatuses)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Page<TaskResponse> searchTasks(String search, String priority, TaskStatus status, Long assigneeId, int page, int size, String sortBy) {
        User currentUser = userService.getCurrentUser();
        Long orgId = currentUser.getOrganization().getId();
        List<TaskStatus> excludedStatuses = List.of(TaskStatus.ARCHIVED, TaskStatus.CANCELLED, TaskStatus.DELETED);
        
        String sortField = switch (sortBy != null ? sortBy : "createdAt") {
            case "dueDate" -> "dueDate";
            case "priority" -> "priority";
            default -> "createdAt";
        };
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sortField));
        Page<Task> taskPage = taskRepository.searchTasks(orgId, excludedStatuses, search, priority, status, assigneeId, pageable);
        return taskPage.map(this::mapToResponse);
    }
    
    // ==================== HELPERS ====================
    
    private User getCurrentUser() {
        return userService.getCurrentUser();
    }
    
    private TaskResponse mapToResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        response.setPriority(task.getPriority());
        response.setStatus(task.getStatus());
        response.setDueDate(task.getDueDate());
        response.setCreatedAt(task.getCreatedAt());
        response.setCompletedAt(task.getCompletedAt());
        response.setDeletedAt(task.getDeletedAt());
        response.setVersion(task.getVersion());
        
        if (task.getProject() != null) {
            response.setProjectId(task.getProject().getId());
            response.setProjectName(task.getProject().getName());
        }
        
        if (task.getBoard() != null) {
            response.setBoardId(task.getBoard().getId());
            response.setBoardName(task.getBoard().getName());
            response.setBoardType(task.getBoard().getBoardType() != null 
                    ? task.getBoard().getBoardType().name() : null);
        }
        
        if (task.getAssignee() != null) {
            response.setAssigneeId(task.getAssignee().getId());
            response.setAssigneeName(task.getAssignee().getUsername());
        }
        
        if (task.getApprover() != null) {
            response.setApproverId(task.getApprover().getId());
            response.setApproverName(task.getApprover().getUsername());
        }
        
        if (task.getCreatedBy() != null) {
            response.setCreatedById(task.getCreatedBy().getId());
            response.setCreatedByName(task.getCreatedBy().getUsername());
        }
        
        // Load comments
        List<TaskComment> comments = commentRepository.findByTaskIdWithAuthor(task.getId());
        response.setComments(comments.stream()
                .map(this::mapCommentToResponse)
                .collect(Collectors.toList()));
        
        return response;
    }
    
    private CommentResponse mapCommentToResponse(TaskComment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setTaskId(comment.getTask().getId());
        response.setAuthorId(comment.getAuthor().getId());
        response.setAuthorName(comment.getAuthor().getUsername());
        response.setAuthorRole(comment.getAuthor().getRole().name());
        response.setComment(comment.getComment());
        response.setType(comment.getType());
        response.setCreatedAt(comment.getCreatedAt());
        return response;
    }
}
