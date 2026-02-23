package com.flowlite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskTemplateRequest {
    @NotBlank(message = "Template name is required")
    @Size(max = 255, message = "Template name must not exceed 255 characters")
    private String name;

    @NotBlank(message = "Default title is required")
    @Size(max = 255, message = "Default title must not exceed 255 characters")
    private String defaultTitle;

    @Size(max = 2000, message = "Default description must not exceed 2000 characters")
    private String defaultDescription;

    @NotBlank(message = "Default priority is required")
    private String defaultPriority;
}
