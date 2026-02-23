package com.flowlite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;
    
    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;
    
    @NotBlank(message = "Priority is required")
    private String priority; // LOW, MEDIUM, HIGH
    
    private Long projectId;
    
    @NotNull(message = "Board is required")
    private Long boardId;
    
    private Long assigneeId;
    
    private Long approverId;
    
    private LocalDate dueDate;
}
