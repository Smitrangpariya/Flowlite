package com.flowlite.service;

import com.flowlite.dto.StatusUpdateRequest;
import com.flowlite.dto.TaskRequest;
import com.flowlite.dto.TaskResponse;
import com.flowlite.entity.*;
import com.flowlite.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private UserRepository userRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private TaskCommentRepository commentRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private EmailService emailService;
    @Mock private UserService userService;
    @Mock private TaskWebSocketService webSocketService;
    @Mock private NotificationService notificationService;
    @Mock private InputSanitizer inputSanitizer;

    @InjectMocks
    private TaskService taskService;

    private User adminUser;
    private User memberUser;
    private Organization org1;
    private Project project1;
    private Board board1;
    private Task sampleTask;

    @BeforeEach
    void setUp() {
        org1 = new Organization();
        org1.setId(1L);
        org1.setName("Org 1");

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setUsername("admin");
        adminUser.setRole(Role.ADMIN);
        adminUser.setOrganization(org1);
        adminUser.setActive(true);

        memberUser = new User();
        memberUser.setId(2L);
        memberUser.setUsername("member");
        memberUser.setRole(Role.TEAM_MEMBER);
        memberUser.setOrganization(org1);
        memberUser.setActive(true);

        project1 = new Project();
        project1.setId(1L);
        project1.setName("Project 1");
        project1.setOrganization(org1);

        board1 = new Board();
        board1.setId(1L);
        board1.setName("Team Board");
        board1.setOrganization(org1);

        sampleTask = new Task();
        sampleTask.setId(1L);
        sampleTask.setTitle("Test Task");
        sampleTask.setDescription("Description");
        sampleTask.setPriority("MED");
        sampleTask.setStatus(TaskStatus.CREATED);
        sampleTask.setProject(project1);
        sampleTask.setBoard(board1);
        sampleTask.setCreatedBy(adminUser);
        sampleTask.setCreatedAt(LocalDateTime.now());

        // Default sanitization behavior: return input unchanged for tests
        lenient().when(inputSanitizer.sanitizeStrict(anyString()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(inputSanitizer.sanitizeBasicFormatting(anyString()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    /** Stub commentRepository for mapToResponse */
    private void stubComments() {
        lenient().when(commentRepository.findByTaskIdWithAuthor(anyLong()))
                .thenReturn(Collections.emptyList());
    }

    // ==================== ORG ISOLATION TESTS ====================

    @Nested
    @DisplayName("Organization Isolation")
    class OrgIsolation {

        @Test
        @DisplayName("getAllTasks returns only tasks from user's org")
        void getAllTasks_filtersByOrg() {
            stubComments();
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(taskRepository.findAllWithDetailsByOrganizationId(1L)).thenReturn(List.of(sampleTask));

            List<TaskResponse> tasks = taskService.getAllTasks();

            assertThat(tasks).hasSize(1);
            verify(taskRepository).findAllWithDetailsByOrganizationId(1L);
        }

        @Test
        @DisplayName("getArchivedTasks returns only archived tasks from user's org")
        void getArchivedTasks_filtersByOrg() {
            stubComments();
            when(userService.getCurrentUser()).thenReturn(adminUser);
            Task archivedTask = new Task();
            archivedTask.setId(2L);
            archivedTask.setTitle("Archived");
            archivedTask.setStatus(TaskStatus.ARCHIVED);
            archivedTask.setProject(project1);
            archivedTask.setCreatedAt(LocalDateTime.now());
            when(taskRepository.findByOrganizationIdAndStatus(1L, TaskStatus.ARCHIVED))
                    .thenReturn(List.of(archivedTask));

            List<TaskResponse> tasks = taskService.getArchivedTasks();

            assertThat(tasks).hasSize(1);
            verify(taskRepository).findByOrganizationIdAndStatus(1L, TaskStatus.ARCHIVED);
        }

        @Test
        @DisplayName("getCancelledTasks returns only cancelled tasks from user's org")
        void getCancelledTasks_filtersByOrg() {
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(taskRepository.findByOrganizationIdAndStatus(1L, TaskStatus.CANCELLED))
                    .thenReturn(List.of());

            List<TaskResponse> tasks = taskService.getCancelledTasks();

            assertThat(tasks).isEmpty();
            verify(taskRepository).findByOrganizationIdAndStatus(1L, TaskStatus.CANCELLED);
        }
    }

    // ==================== CREATE TASK TESTS ====================

    @Nested
    @DisplayName("Create Task")
    class CreateTask {

        @Test
        @DisplayName("Create task with dueDate succeeds")
        void createTask_withDueDate() {
            stubComments();
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(boardRepository.findAccessibleBoard(1L, 1L, 1L)).thenReturn(Optional.of(board1));
            when(projectRepository.findById(1L)).thenReturn(Optional.of(project1));
            when(userRepository.findById(2L)).thenReturn(Optional.of(memberUser));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                t.setId(99L);
                return t;
            });

            TaskRequest request = new TaskRequest();
            request.setTitle("New Task");
            request.setDescription("Desc");
            request.setPriority("HIGH");
            request.setProjectId(1L);
            request.setBoardId(1L);
            request.setAssigneeId(2L);
            request.setDueDate(LocalDate.of(2026, 3, 15));

            TaskResponse response = taskService.createTask(request);

            assertThat(response).isNotNull();
            assertThat(response.getDueDate()).isEqualTo(LocalDate.of(2026, 3, 15));
            verify(webSocketService).broadcastTaskEvent(eq("CREATE"), any(TaskResponse.class), eq(1L));
        }

        @Test
        @DisplayName("Create task without assignee sets CREATED status")
        void createTask_noAssignee_createdStatus() {
            stubComments();
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(boardRepository.findAccessibleBoard(1L, 1L, 1L)).thenReturn(Optional.of(board1));
            when(projectRepository.findById(1L)).thenReturn(Optional.of(project1));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                t.setId(99L);
                return t;
            });

            TaskRequest request = new TaskRequest();
            request.setTitle("Unassigned");
            request.setPriority("LOW");
            request.setProjectId(1L);
            request.setBoardId(1L);

            TaskResponse response = taskService.createTask(request);

            assertThat(response.getStatus()).isEqualTo(TaskStatus.CREATED);
        }

        @Test
        @DisplayName("Create task with inaccessible board throws exception")
        void createTask_invalidBoard_throws() {
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(boardRepository.findAccessibleBoard(999L, 1L, 1L)).thenReturn(Optional.empty());

            TaskRequest request = new TaskRequest();
            request.setTitle("Bad Board");
            request.setPriority("LOW");
            request.setBoardId(999L);

            assertThatThrownBy(() -> taskService.createTask(request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Board not found");
        }
    }

    // ==================== STATUS TRANSITION TESTS ====================

    @Nested
    @DisplayName("Status Transitions")
    class StatusTransitions {

        @Test
        @DisplayName("Assignee can start assigned task")
        void startTask_assignee_succeeds() {
            stubComments();
            sampleTask.setStatus(TaskStatus.ASSIGNED);
            sampleTask.setAssignee(memberUser);
            when(userService.getCurrentUser()).thenReturn(memberUser);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));
            when(taskRepository.save(any(Task.class))).thenReturn(sampleTask);

            StatusUpdateRequest request = new StatusUpdateRequest(TaskStatus.IN_PROGRESS, null);
            taskService.updateTaskStatus(1L, request);

            assertThat(sampleTask.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
            verify(webSocketService).broadcastTaskEvent(eq("STATUS_CHANGE"), any(), eq(1L));
        }

        @Test
        @DisplayName("Non-assignee cannot start task")
        void startTask_nonAssignee_throws() {
            sampleTask.setStatus(TaskStatus.ASSIGNED);
            sampleTask.setAssignee(memberUser);
            User otherMember = new User();
            otherMember.setId(5L);
            otherMember.setUsername("other");
            otherMember.setRole(Role.TEAM_MEMBER);
            otherMember.setOrganization(org1);

            when(userService.getCurrentUser()).thenReturn(otherMember);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));

            StatusUpdateRequest request = new StatusUpdateRequest(TaskStatus.IN_PROGRESS, null);
            assertThatThrownBy(() -> taskService.updateTaskStatus(1L, request))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("Invalid status transition throws exception")
        void invalidTransition_throws() {
            sampleTask.setStatus(TaskStatus.CANCELLED);
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));

            StatusUpdateRequest request = new StatusUpdateRequest(TaskStatus.DONE, null);
            assertThatThrownBy(() -> taskService.updateTaskStatus(1L, request))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    // ==================== WEBSOCKET BROADCAST TESTS ====================

    @Nested
    @DisplayName("WebSocket Broadcasts")
    class WebSocketBroadcasts {

        @Test
        @DisplayName("Delete broadcasts DELETE event")
        void deleteTask_broadcastsEvent() {
            stubComments();
            sampleTask.setStatus(TaskStatus.CREATED);
            sampleTask.setCreatedBy(adminUser);
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));
            when(taskRepository.save(any(Task.class))).thenReturn(sampleTask);

            taskService.deleteTask(1L);

            verify(webSocketService).broadcastTaskEvent(eq("DELETE"), any(TaskResponse.class), eq(1L));
        }

        @Test
        @DisplayName("Archive broadcasts STATUS_CHANGE event")
        void archiveTask_broadcastsEvent() {
            stubComments();
            sampleTask.setStatus(TaskStatus.DONE);
            when(userService.getCurrentUser()).thenReturn(adminUser);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));
            when(taskRepository.save(any(Task.class))).thenReturn(sampleTask);

            taskService.archiveTask(1L);

            verify(webSocketService).broadcastTaskEvent(eq("STATUS_CHANGE"), any(TaskResponse.class), eq(1L));
        }
    }

    // ==================== MY TASKS TESTS ====================

    @Nested
    @DisplayName("My Tasks")
    class MyTasks {

        @Test
        @DisplayName("getMyTasks returns only tasks assigned to current user in same org")
        void getMyTasks_filtersCorrectly() {
            stubComments();
            Task myTask = new Task();
            myTask.setId(10L);
            myTask.setTitle("My task");
            myTask.setStatus(TaskStatus.IN_PROGRESS);
            myTask.setAssignee(memberUser);
            myTask.setProject(project1);
            myTask.setCreatedAt(LocalDateTime.now());

            when(userService.getCurrentUser()).thenReturn(memberUser);
            when(taskRepository.findByAssigneeIdAndOrganizationId(eq(2L), eq(1L), any()))
                    .thenReturn(List.of(myTask));

            List<TaskResponse> tasks = taskService.getMyTasks();

            assertThat(tasks).hasSize(1);
            assertThat(tasks.get(0).getTitle()).isEqualTo("My task");
        }
    }

    // ==================== PERMISSIONS TESTS ====================

    @Nested
    @DisplayName("Permissions")
    class Permissions {

        @Test
        @DisplayName("Only creator or admin can delete CREATED tasks")
        void deleteTask_asMember_notCreator_throws() {
            sampleTask.setStatus(TaskStatus.CREATED);
            sampleTask.setCreatedBy(adminUser); // created by admin
            when(userService.getCurrentUser()).thenReturn(memberUser); // member trying to delete
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));

            assertThatThrownBy(() -> taskService.deleteTask(1L))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("Admin can delete any CREATED task")
        void deleteTask_asAdmin_succeeds() {
            stubComments();
            sampleTask.setStatus(TaskStatus.CREATED);
            sampleTask.setCreatedBy(memberUser); // created by member
            when(userService.getCurrentUser()).thenReturn(adminUser); // admin deleting
            when(taskRepository.findById(1L)).thenReturn(Optional.of(sampleTask));
            when(taskRepository.save(any(Task.class))).thenReturn(sampleTask);

            taskService.deleteTask(1L);

            assertThat(sampleTask.getStatus()).isEqualTo(TaskStatus.DELETED);
        }
    }
}
