package com.flowlite.dto;

import com.flowlite.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private String priority;
    private TaskStatus status;
    private Long projectId;
    private String projectName;
    private Long boardId;
    private String boardName;
    private String boardType;
    private Long assigneeId;
    private String assigneeName;
    private Long approverId;
    private String approverName;
    private Long createdById;
    private String createdByName;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private LocalDateTime deletedAt;
    private Long version;
    private List<CommentResponse> comments;
}
