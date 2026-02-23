package com.flowlite.controller;

import com.flowlite.dto.ProjectResponse;
import com.flowlite.entity.Project;
import com.flowlite.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project management endpoints")
@SecurityRequirement(name = "bearerAuth")
public class ProjectController {
    
    private final ProjectService projectService;
    
    @Operation(summary = "List all projects", description = "Retrieves all projects in the system")
    @ApiResponse(responseCode = "200", description = "Projects retrieved successfully")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ProjectResponse>> getAllProjects() {
        List<ProjectResponse> responses = projectService.getAllProjects()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
    
    @Operation(summary = "Get project by ID", description = "Retrieves a specific project by its ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Project found"),
        @ApiResponse(responseCode = "404", description = "Project not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(projectService.getProjectById(id)));
    }
    
    @Operation(summary = "Create project", description = "Creates a new project (Product Manager or Admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Project created successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied - requires PRODUCT_MANAGER or ADMIN role")
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('PRODUCT_MANAGER', 'ADMIN')")
    public ResponseEntity<ProjectResponse> createProject(@RequestBody Project project) {
        return ResponseEntity.ok(toResponse(projectService.createProject(project)));
    }
    
    @Operation(summary = "Update project", description = "Updates an existing project (Product Manager or Admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Project updated successfully"),
        @ApiResponse(responseCode = "404", description = "Project not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PRODUCT_MANAGER', 'ADMIN')")
    public ResponseEntity<ProjectResponse> updateProject(@PathVariable Long id, @RequestBody Project project) {
        return ResponseEntity.ok(toResponse(projectService.updateProject(id, project)));
    }
    
    @Operation(summary = "Delete project", description = "Deletes a project (Admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Project deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied - requires ADMIN role")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Map Project entity to ProjectResponse DTO to avoid LAZY proxy serialization.
     */
    private ProjectResponse toResponse(Project project) {
        ProjectResponse response = new ProjectResponse();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setDescription(project.getDescription());
        response.setStartDate(project.getStartDate());
        response.setStatus(project.getStatus());
        
        if (project.getOrganization() != null) {
            response.setOrganizationId(project.getOrganization().getId());
        }
        if (project.getOwner() != null) {
            response.setOwnerId(project.getOwner().getId());
            response.setOwnerUsername(project.getOwner().getUsername());
        }
        
        return response;
    }
}
