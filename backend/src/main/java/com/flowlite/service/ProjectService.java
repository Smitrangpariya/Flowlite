package com.flowlite.service;

import com.flowlite.entity.Project;
import com.flowlite.entity.User;
import com.flowlite.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {
    
    private final ProjectRepository projectRepository;
    private final UserService userService;
    
    /**
     * Get all projects in current user's organization
     */
    @Transactional(readOnly = true)
    public List<Project> getAllProjects() {
        User currentUser = userService.getCurrentUser();
        return projectRepository.findByOrganizationId(
                currentUser.getOrganization().getId()
        );
    }
    
    /**
     * Get project by ID (with organization check)
     */
    @Transactional(readOnly = true)
    public Project getProjectById(Long id) {
        User currentUser = userService.getCurrentUser();
        return projectRepository.findByIdAndOrganizationId(
                id, 
                currentUser.getOrganization().getId()
        ).orElseThrow(() -> new RuntimeException("Project not found in your organization"));
    }
    
    /**
     * Create project in current user's organization
     */
    @Transactional
    public Project createProject(Project project) {
        User currentUser = userService.getCurrentUser();
        project.setOrganization(currentUser.getOrganization());
        project.setOwner(currentUser);
        return projectRepository.save(project);
    }
    
    /**
     * Update project (with organization check)
     */
    @Transactional
    public Project updateProject(Long id, Project projectDetails) {
        Project project = getProjectById(id); // This checks org access
        project.setName(projectDetails.getName());
        project.setDescription(projectDetails.getDescription());
        project.setStartDate(projectDetails.getStartDate());
        project.setStatus(projectDetails.getStatus());
        return projectRepository.save(project);
    }
    
    /**
     * Delete project (with organization check)
     */
    @Transactional
    public void deleteProject(Long id) {
        Project project = getProjectById(id); // This checks org access
        projectRepository.delete(project);
    }
}
