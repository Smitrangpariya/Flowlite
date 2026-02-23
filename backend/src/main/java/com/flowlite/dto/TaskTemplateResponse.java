package com.flowlite.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskTemplateResponse {
    private Long id;
    private String name;
    private String defaultTitle;
    private String defaultDescription;
    private String defaultPriority;
    private String createdByName;
    private LocalDateTime createdAt;
}
