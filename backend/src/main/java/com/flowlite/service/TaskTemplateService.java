package com.flowlite.service;

import com.flowlite.dto.TaskTemplateRequest;
import com.flowlite.dto.TaskTemplateResponse;
import com.flowlite.entity.TaskTemplate;
import com.flowlite.entity.User;
import com.flowlite.repository.TaskTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskTemplateService {

    private final TaskTemplateRepository templateRepository;
    private final UserService userService;

    public List<TaskTemplateResponse> getTemplates() {
        User currentUser = userService.getCurrentUser();
        return templateRepository.findByOrganizationAndActiveTrue(currentUser.getOrganization())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskTemplateResponse createTemplate(TaskTemplateRequest request) {
        User currentUser = userService.getCurrentUser();

        TaskTemplate template = new TaskTemplate();
        template.setName(request.getName());
        template.setDefaultTitle(request.getDefaultTitle());
        template.setDefaultDescription(request.getDefaultDescription());
        template.setDefaultPriority(request.getDefaultPriority());
        template.setOrganization(currentUser.getOrganization());
        template.setCreatedBy(currentUser);

        return mapToResponse(templateRepository.save(template));
    }

    @Transactional
    public void deleteTemplate(Long id) {
        User currentUser = userService.getCurrentUser();
        TaskTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        // Verify same organization
        if (!template.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new RuntimeException("Access denied");
        }

        template.setActive(false);
        templateRepository.save(template);
    }

    private TaskTemplateResponse mapToResponse(TaskTemplate template) {
        TaskTemplateResponse response = new TaskTemplateResponse();
        response.setId(template.getId());
        response.setName(template.getName());
        response.setDefaultTitle(template.getDefaultTitle());
        response.setDefaultDescription(template.getDefaultDescription());
        response.setDefaultPriority(template.getDefaultPriority());
        response.setCreatedByName(template.getCreatedBy() != null ? template.getCreatedBy().getUsername() : "N/A");
        response.setCreatedAt(template.getCreatedAt());
        return response;
    }
}
