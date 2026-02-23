package com.flowlite.dto;

import com.flowlite.entity.TaskComment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {
    @NotBlank(message = "Comment is required")
    private String comment;
    
    private TaskComment.CommentType type = TaskComment.CommentType.GENERAL;
}
