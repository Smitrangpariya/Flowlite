package com.flowlite.controller;

import com.flowlite.dto.*;
import com.flowlite.service.ExportService;
import com.flowlite.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Task workflow management endpoints")
@SecurityRequirement(name = "bearerAuth")
public class TaskController {
    
    private final TaskService taskService;
    private final ExportService exportService;
    
    // ==================== READ (All authenticated users) ====================
    
    @Operation(summary = "List all tasks", description = "Retrieves all tasks in the system")
    @ApiResponse(responseCode = "200", description = "Tasks retrieved successfully")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskResponse>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }
    
    @Operation(summary = "List archived tasks", description = "Retrieves all archived tasks")
    @ApiResponse(responseCode = "200", description = "Archived tasks retrieved successfully")
    @GetMapping("/archived")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskResponse>> getArchivedTasks() {
        return ResponseEntity.ok(taskService.getArchivedTasks());
    }
    
    @Operation(summary = "List cancelled tasks", description = "Retrieves all cancelled tasks")
    @ApiResponse(responseCode = "200", description = "Cancelled tasks retrieved successfully")
    @GetMapping("/cancelled")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskResponse>> getCancelledTasks() {
        return ResponseEntity.ok(taskService.getCancelledTasks());
    }
    
    @Operation(summary = "List deleted tasks (trash)", description = "Retrieves all soft-deleted tasks for the recycle bin")
    @ApiResponse(responseCode = "200", description = "Deleted tasks retrieved successfully")
    @GetMapping("/trash")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskResponse>> getDeletedTasks() {
        return ResponseEntity.ok(taskService.getDeletedTasks());
    }
    
    @Operation(summary = "Empty trash", description = "Permanently deletes all soft-deleted tasks (irreversible)")
    @ApiResponse(responseCode = "204", description = "Trash emptied successfully")
    @DeleteMapping("/trash")
    @PreAuthorize("hasAnyRole('PRODUCT_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> emptyTrash() {
        taskService.emptyTrash();
        return ResponseEntity.noContent().build();
    }
    
    @Operation(summary = "List tasks paginated", description = "Retrieves tasks with pagination for infinite scroll")
    @ApiResponse(responseCode = "200", description = "Tasks page retrieved successfully")
    @GetMapping("/paginated")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TaskResponse>> getTasksPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(taskService.getTasksPaginated(page, size));
    }
    
    @Operation(summary = "List tasks by board", description = "Retrieves tasks filtered by board ID with pagination")
    @ApiResponse(responseCode = "200", description = "Board tasks retrieved successfully")
    @GetMapping("/board/{boardId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TaskResponse>> getTasksByBoard(
            @PathVariable Long boardId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(taskService.getTasksByBoard(boardId, page, size));
    }
    
    @Operation(summary = "List all tasks by board", description = "Retrieves all active tasks for a specific board (non-paginated)")
    @ApiResponse(responseCode = "200", description = "Board tasks retrieved successfully")
    @GetMapping("/board/{boardId}/all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskResponse>> getTasksByBoardAll(@PathVariable Long boardId) {
        return ResponseEntity.ok(taskService.getTasksByBoardAll(boardId));
    }
    
    @Operation(summary = "My tasks", description = "Retrieves tasks assigned to the current user")
    @ApiResponse(responseCode = "200", description = "My tasks retrieved successfully")
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskResponse>> getMyTasks() {
        return ResponseEntity.ok(taskService.getMyTasks());
    }
    
    @Operation(summary = "Search tasks", description = "Search and filter tasks with optional parameters")
    @ApiResponse(responseCode = "200", description = "Search results retrieved")
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TaskResponse>> searchTasks(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) com.flowlite.entity.TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy) {
        return ResponseEntity.ok(taskService.searchTasks(search, priority, status, assigneeId, page, size, sortBy));
    }
    
    @Operation(summary = "Get task by ID", description = "Retrieves a specific task by its ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task found"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }
    
    // ==================== CREATE (All authenticated users) ====================
    
    @Operation(summary = "Create task", description = "Creates a new task with initial status CREATED")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid task data")
    })
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.createTask(request));
    }
    
    // ==================== UPDATE (All authenticated users, service validates ownership) ====================
    
    @Operation(summary = "Update task", description = "Updates task details (title, description, etc.)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task updated successfully"),
        @ApiResponse(responseCode = "404", description = "Task not found"),
        @ApiResponse(responseCode = "403", description = "Not authorized to update this task")
    })
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, 
                                                    @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }
    
    // ==================== DELETE / CANCEL / ARCHIVE ====================
    
    @Operation(summary = "Delete task", description = "Soft deletes a task (can be undone)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Not authorized to delete this task")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskResponse> deleteTask(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.deleteTask(id));
    }
    
    @Operation(summary = "Cancel task", description = "Cancels a task (allowed after assignment, before DONE)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task cancelled successfully"),
        @ApiResponse(responseCode = "400", description = "Cannot cancel task in current state"),
        @ApiResponse(responseCode = "403", description = "Only creator, manager, or admin can cancel")
    })
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PRODUCT_MANAGER', 'ADMIN') or @taskService.isTaskCreator(#id)")
    public ResponseEntity<TaskResponse> cancelTask(@PathVariable Long id,
                                                    @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(taskService.cancelTask(id, reason));
    }
    
    @Operation(summary = "Archive task", description = "Archives a completed task (only allowed after DONE)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task archived successfully"),
        @ApiResponse(responseCode = "400", description = "Task must be DONE before archiving"),
        @ApiResponse(responseCode = "403", description = "Only PRODUCT_MANAGER or ADMIN can archive")
    })
    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('PRODUCT_MANAGER', 'ADMIN')")
    public ResponseEntity<TaskResponse> archiveTask(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.archiveTask(id));
    }
    
    @Operation(summary = "Restore task", description = "Restores an archived or cancelled task back to active status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Task restored successfully"),
        @ApiResponse(responseCode = "400", description = "Task is not archived or cancelled"),
        @ApiResponse(responseCode = "403", description = "Only PRODUCT_MANAGER or ADMIN can restore")
    })
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('PRODUCT_MANAGER', 'ADMIN')")
    public ResponseEntity<TaskResponse> restoreTask(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.restoreTask(id));
    }
    
    @Operation(summary = "Undo delete", description = "Restores a soft-deleted task back to its previous status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Delete undone successfully"),
        @ApiResponse(responseCode = "400", description = "Task is not in deleted state"),
        @ApiResponse(responseCode = "403", description = "Not authorized to undo delete")
    })
    @PutMapping("/{id}/undo-delete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskResponse> undoDelete(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.undoDelete(id));
    }
    
    // ==================== WORKFLOW STATUS TRANSITIONS ====================
    
    @Operation(summary = "Update task status", description = "Updates task workflow status. Assignee: start/submit for review. Approver: approve/reject")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid status transition"),
        @ApiResponse(responseCode = "403", description = "Not authorized for this status change")
    })
    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable Long id,
                                                          @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(taskService.updateTaskStatus(id, request));
    }
    
    // ==================== COMMENTS ====================
    
    @Operation(summary = "Get task comments", description = "Retrieves all comments for a task")
    @ApiResponse(responseCode = "200", description = "Comments retrieved successfully")
    @GetMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CommentResponse>> getTaskComments(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskComments(id));
    }
    
    @Operation(summary = "Add comment", description = "Adds a comment to a task")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Comment added successfully"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long id,
                                                       @Valid @RequestBody CommentRequest request) {
        return ResponseEntity.ok(taskService.addComment(id, request));
    }
    
    // ==================== AUDIT REPORT ====================
    
    @Operation(summary = "Get audit report", description = "Retrieves complete audit trail for a task")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Audit report retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/{id}/audit-report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuditReportResponse> getAuditReport(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getAuditReport(id));
    }
    
    @Operation(summary = "Export audit report as Excel", description = "Downloads audit report as Excel file (only for DONE/ARCHIVED tasks)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Excel file generated successfully"),
        @ApiResponse(responseCode = "400", description = "Task must be DONE or ARCHIVED to export"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/{id}/audit-report/excel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportAuditToExcel(@PathVariable Long id) {
        AuditReportResponse report = taskService.getAuditReport(id);
        
        // Validate task status
        if (!report.getFinalStatus().equals("DONE") && !report.getFinalStatus().equals("ARCHIVED")) {
            throw new RuntimeException("Export is only available for completed or archived tasks");
        }
        
        byte[] excelBytes = exportService.exportAuditToExcel(report);
        String filename = exportService.generateExportFilename(
            report.getTaskId(), report.getTaskTitle(), "xlsx");
        
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
            .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .header("Content-Length", String.valueOf(excelBytes.length))
            .header("Cache-Control", "no-cache, no-store, must-revalidate")
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .body(excelBytes);
    }
    
    @Operation(summary = "Export audit report as PDF", description = "Downloads audit report as PDF file (only for DONE/ARCHIVED tasks)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "PDF file generated successfully"),
        @ApiResponse(responseCode = "400", description = "Task must be DONE or ARCHIVED to export"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/{id}/audit-report/pdf")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportAuditToPdf(@PathVariable Long id) {
        AuditReportResponse report = taskService.getAuditReport(id);
        
        // Validate task status
        if (!report.getFinalStatus().equals("DONE") && !report.getFinalStatus().equals("ARCHIVED")) {
            throw new RuntimeException("Export is only available for completed or archived tasks");
        }
        
        byte[] pdfBytes = exportService.exportAuditToPdf(report);
        String filename = exportService.generateExportFilename(
            report.getTaskId(), report.getTaskTitle(), "pdf");
        
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
            .header("Content-Type", "application/pdf")
            .header("Content-Length", String.valueOf(pdfBytes.length))
            .header("Cache-Control", "no-cache, no-store, must-revalidate")
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .body(pdfBytes);
    }
}



