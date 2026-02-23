package com.flowlite.seeder;

import com.flowlite.entity.*;
import com.flowlite.repository.BoardRepository;
import com.flowlite.repository.OrganizationRepository;
import com.flowlite.repository.ProjectRepository;
import com.flowlite.repository.TaskRepository;
import com.flowlite.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@Profile("!production")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {
    
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    
    private Organization defaultOrg;
    
    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedOrganization();
            seedUsers();
            seedProjectsAndTasks();
            log.info("Data seeding completed successfully!");
        }
    }
    
    private void seedOrganization() {
        Organization org = new Organization();
        org.setName("FlowLite Demo");
        org.setDescription("Default demo organization for FlowLite");
        org.setActive(true);
        defaultOrg = organizationRepository.save(org);
        log.info("Created default organization: {}", defaultOrg.getName());
    }
    
    private void seedUsers() {
        String encodedPassword = passwordEncoder.encode("password123");
        
        // Create Admin user
        User admin = new User();
        admin.setUsername("admin");
        admin.setPassword(encodedPassword);
        admin.setEmail("admin@flowlite.com");
        admin.setRole(Role.ADMIN);
        admin.setOrganization(defaultOrg);
        admin.setActive(true);
        userRepository.save(admin);
        
        // Create Product Manager user
        User manager = new User();
        manager.setUsername("manager");
        manager.setPassword(encodedPassword);
        manager.setEmail("manager@flowlite.com");
        manager.setRole(Role.PRODUCT_MANAGER);
        manager.setOrganization(defaultOrg);
        manager.setActive(true);
        userRepository.save(manager);
        
        // Create Team Lead user
        User lead = new User();
        lead.setUsername("lead");
        lead.setPassword(encodedPassword);
        lead.setEmail("lead@flowlite.com");
        lead.setRole(Role.TEAM_LEAD);
        lead.setOrganization(defaultOrg);
        lead.setActive(true);
        userRepository.save(lead);
        
        // Create Team Member user
        User member = new User();
        member.setUsername("member");
        member.setPassword(encodedPassword);
        member.setEmail("member@flowlite.com");
        member.setRole(Role.TEAM_MEMBER);
        member.setOrganization(defaultOrg);
        member.setActive(true);
        userRepository.save(member);
        
        log.info("Created 4 default users with password 'password123'");
    }
    
    private void seedProjectsAndTasks() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        User lead = userRepository.findByUsername("lead").orElseThrow();
        User member = userRepository.findByUsername("member").orElseThrow();
        
        // Create a default board for the organization
        Board defaultBoard = new Board();
        defaultBoard.setName("General");
        defaultBoard.setDescription("Default team board");
        defaultBoard.setBoardType(BoardType.TEAM);
        defaultBoard.setOrganization(defaultOrg);
        defaultBoard.setOwner(admin);
        defaultBoard.setIsDefault(true);
        defaultBoard.setBoardColor("#3B82F6");
        defaultBoard = boardRepository.save(defaultBoard);
        
        // Create a sample project
        Project project = new Project();
        project.setName("FlowLite MVP");
        project.setDescription("Initial MVP development for FlowLite platform");
        project.setStartDate(LocalDate.now());
        project.setStatus("ACTIVE");
        project.setOrganization(defaultOrg);
        project.setOwner(admin);
        project = projectRepository.save(project);
        
        // Task 1: DONE - shows audit report button
        Task task1 = new Task();
        task1.setTitle("Setup project structure");
        task1.setDescription("Initialize the project with proper folder structure and dependencies");
        task1.setPriority("HIGH");
        task1.setStatus(TaskStatus.DONE);
        task1.setProject(project);
        task1.setAssignee(member);
        task1.setApprover(lead);
        task1.setCreatedBy(admin);
        task1.setBoard(defaultBoard);
        taskRepository.save(task1);
        
        // Task 2: REVIEW - shows approve/reject for lead
        Task task2 = new Task();
        task2.setTitle("Implement user authentication");
        task2.setDescription("Add JWT-based authentication with login and register endpoints");
        task2.setPriority("HIGH");
        task2.setStatus(TaskStatus.REVIEW);
        task2.setProject(project);
        task2.setAssignee(member);
        task2.setApprover(lead);
        task2.setCreatedBy(admin);
        task2.setBoard(defaultBoard);
        taskRepository.save(task2);
        
        // Task 3: IN_PROGRESS - shows submit for review for member
        Task task3 = new Task();
        task3.setTitle("Design Kanban board UI");
        task3.setDescription("Create responsive Kanban board with drag-and-drop functionality");
        task3.setPriority("MEDIUM");
        task3.setStatus(TaskStatus.IN_PROGRESS);
        task3.setProject(project);
        task3.setAssignee(member);
        task3.setApprover(lead);
        task3.setCreatedBy(admin);
        task3.setBoard(defaultBoard);
        taskRepository.save(task3);
        
        // Task 4: ASSIGNED - shows start task for member
        Task task4 = new Task();
        task4.setTitle("Add task filtering");
        task4.setDescription("Implement filtering by priority, status, and assignee");
        task4.setPriority("LOW");
        task4.setStatus(TaskStatus.ASSIGNED);
        task4.setProject(project);
        task4.setAssignee(member);
        task4.setApprover(lead);
        task4.setCreatedBy(admin);
        task4.setBoard(defaultBoard);
        taskRepository.save(task4);
        
        // Task 5: CREATED - no workflow buttons
        Task task5 = new Task();
        task5.setTitle("Write API documentation");
        task5.setDescription("Document all REST endpoints using OpenAPI/Swagger");
        task5.setPriority("MEDIUM");
        task5.setStatus(TaskStatus.CREATED);
        task5.setProject(project);
        task5.setCreatedBy(admin);
        task5.setBoard(defaultBoard);
        taskRepository.save(task5);
        
        log.info("Created sample project with 5 tasks");
    }
}
