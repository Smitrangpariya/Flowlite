package com.flowlite.dto;

import com.flowlite.entity.TaskComment;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private Long taskId;
    private Long authorId;
    private String authorName;
    private String authorRole;
    private String comment;
    private TaskComment.CommentType type;
    private LocalDateTime createdAt;
}
