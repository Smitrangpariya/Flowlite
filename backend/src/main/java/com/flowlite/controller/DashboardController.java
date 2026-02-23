package com.flowlite.controller;

import com.flowlite.dto.DashboardStats;
import com.flowlite.entity.TaskStatus;
import com.flowlite.entity.User;
import com.flowlite.repository.TaskRepository;
import com.flowlite.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard analytics endpoints")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Get dashboard statistics",
               description = "Returns org-scoped aggregated task statistics")
    @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DashboardStats> getDashboardStats() {

        // Get current authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long orgId = currentUser.getOrganization().getId();

        // All counts scoped to user's organization
        long totalTasks      = taskRepository.countByOrganizationId(orgId);
        long created         = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.CREATED);
        long assigned        = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.ASSIGNED);
        long inProgress      = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.IN_PROGRESS);
        long pendingReview   = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.REVIEW);
        long completed       = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.DONE);
        long cancelled       = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.CANCELLED);
        long archived        = taskRepository.countByOrganizationIdAndStatus(orgId, TaskStatus.ARCHIVED);

        // Completion rate: completed / active (excluding cancelled + archived)
        long activeTasks = totalTasks - cancelled - archived;
        double completionRate = activeTasks > 0
                ? (double) completed / activeTasks * 100
                : 0.0;

        DashboardStats stats = new DashboardStats();
        stats.setTotalTasks(totalTasks);
        stats.setCreated(created);
        stats.setAssigned(assigned);
        stats.setInProgress(inProgress);
        stats.setPendingReview(pendingReview);
        stats.setCompleted(completed);
        stats.setCancelled(cancelled);
        stats.setArchived(archived);
        stats.setCompletionRate(Math.round(completionRate * 10.0) / 10.0);

        return ResponseEntity.ok(stats);
    }
}
