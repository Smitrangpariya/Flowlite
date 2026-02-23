package com.flowlite.controller;

import com.flowlite.dto.TaskTemplateRequest;
import com.flowlite.dto.TaskTemplateResponse;
import com.flowlite.service.TaskTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@Tag(name = "Task Templates", description = "Manage reusable task templates")
public class TaskTemplateController {

    private final TaskTemplateService templateService;

    @GetMapping
    @Operation(summary = "Get all active templates for the current organization")
    public ResponseEntity<List<TaskTemplateResponse>> getTemplates() {
        return ResponseEntity.ok(templateService.getTemplates());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCT_MANAGER')")
    @Operation(summary = "Create a new task template")
    public ResponseEntity<TaskTemplateResponse> createTemplate(@Valid @RequestBody TaskTemplateRequest request) {
        return ResponseEntity.ok(templateService.createTemplate(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCT_MANAGER')")
    @Operation(summary = "Delete a task template (soft delete)")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.ok().build();
    }
}
