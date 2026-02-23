package com.flowlite.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditReportResponse {
    private Long taskId;
    private String taskTitle;
    private String taskDescription;
    private String priority;
    private String finalStatus;
    
    private String projectName;
    private Long projectId;
    
    private String createdBy;
    private String assignedTo;
    private String approvedBy;
    
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    
    private List<StatusTransition> statusHistory;
    private List<CommentEntry> comments;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusTransition {
        private String fromStatus;
        private String toStatus;
        private String changedBy;
        private LocalDateTime timestamp;
        private String comment;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentEntry {
        private String author;
        private String type;
        private String comment;
        private LocalDateTime timestamp;
    }
}
