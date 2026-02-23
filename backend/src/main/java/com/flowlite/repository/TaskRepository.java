package com.flowlite.repository;

import com.flowlite.entity.Task;
import com.flowlite.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    List<Task> findByAssigneeId(Long assigneeId);
    List<Task> findByStatus(TaskStatus status);

    // ✅ FIX: Use t.board.organization.id — board is always non-null on Task.
    //         Previously used t.project.organization.id which silently dropped
    //         every task where projectId was null (tasks created without a project).
    @Query("SELECT t FROM Task t WHERE t.board.organization.id = :organizationId")
    List<Task> findByOrganizationId(@Param("organizationId") Long organizationId);

    @Query("SELECT t FROM Task t WHERE t.id = :id AND t.board.organization.id = :organizationId")
    Optional<Task> findByIdAndOrganizationId(@Param("id") Long id, @Param("organizationId") Long organizationId);

    // ✅ FIX: Filter by board.organization, LEFT JOIN project (it's optional)
    @Query("SELECT t FROM Task t " +
           "LEFT JOIN FETCH t.assignee " +
           "LEFT JOIN FETCH t.project " +
           "LEFT JOIN FETCH t.approver " +
           "LEFT JOIN FETCH t.createdBy " +
           "WHERE t.board.organization.id = :organizationId")
    List<Task> findAllWithDetailsByOrganizationId(@Param("organizationId") Long organizationId);

    @Query("SELECT t FROM Task t " +
           "LEFT JOIN FETCH t.assignee " +
           "LEFT JOIN FETCH t.project " +
           "LEFT JOIN FETCH t.approver " +
           "LEFT JOIN FETCH t.createdBy")
    List<Task> findAllWithDetails();

    @Query("SELECT t FROM Task t " +
           "LEFT JOIN FETCH t.assignee " +
           "LEFT JOIN FETCH t.project " +
           "LEFT JOIN FETCH t.approver " +
           "LEFT JOIN FETCH t.createdBy " +
           "WHERE t.id = :id")
    Optional<Task> findByIdWithDetails(Long id);

    // Dashboard statistics
    long countByStatus(TaskStatus status);
    long count();

    // ✅ FIX: org from board
    @Query("SELECT COUNT(t) FROM Task t WHERE t.board.organization.id = :organizationId AND t.status = :status")
    long countByOrganizationIdAndStatus(@Param("organizationId") Long organizationId, @Param("status") TaskStatus status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.board.organization.id = :organizationId")
    long countByOrganizationId(@Param("organizationId") Long organizationId);

    // Paginated queries
    Page<Task> findByStatus(TaskStatus status, Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.status NOT IN (:excludedStatuses)")
    Page<Task> findByStatusNotIn(@Param("excludedStatuses") List<TaskStatus> excludedStatuses, Pageable pageable);

    // ✅ FIX: org from board
    @Query("SELECT t FROM Task t WHERE t.board.organization.id = :organizationId AND t.status NOT IN (:excludedStatuses)")
    Page<Task> findByOrganizationIdAndStatusNotIn(
            @Param("organizationId") Long organizationId,
            @Param("excludedStatuses") List<TaskStatus> excludedStatuses,
            Pageable pageable);

    // Orphaned task cleanup (board is now required, but keep for safety)
    @Query("SELECT t FROM Task t WHERE t.board IS NULL")
    List<Task> findOrphanedTasks();

    // Board-filtered queries
    List<Task> findByBoardId(Long boardId);

    @Query("SELECT t FROM Task t WHERE t.board.id = :boardId AND t.status NOT IN (:excludedStatuses)")
    Page<Task> findByBoardIdAndStatusNotIn(
            @Param("boardId") Long boardId,
            @Param("excludedStatuses") List<TaskStatus> excludedStatuses,
            Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.board.id = :boardId AND t.status NOT IN (:excludedStatuses) ORDER BY t.createdAt DESC")
    List<Task> findByBoardIdAndStatusNotInList(
            @Param("boardId") Long boardId,
            @Param("excludedStatuses") List<TaskStatus> excludedStatuses);

    // Board task count (for board cards)
    @Query("SELECT COUNT(t) FROM Task t WHERE t.board.id = :boardId AND t.status NOT IN (:excludedStatuses)")
    int countByBoardIdAndStatusNotIn(@Param("boardId") Long boardId,
                                     @Param("excludedStatuses") List<TaskStatus> excludedStatuses);

    // ✅ FIX: org from board
    @Query("SELECT t FROM Task t WHERE t.board.organization.id = :orgId AND t.status = :status")
    List<Task> findByOrganizationIdAndStatus(@Param("orgId") Long orgId, @Param("status") TaskStatus status);

    // ✅ FIX: org from board
    @Query("SELECT t FROM Task t WHERE t.assignee.id = :userId AND t.board.organization.id = :orgId AND t.status NOT IN (:excludedStatuses)")
    List<Task> findByAssigneeIdAndOrganizationId(
            @Param("userId") Long userId,
            @Param("orgId") Long orgId,
            @Param("excludedStatuses") List<TaskStatus> excludedStatuses);

    // ✅ FIX: org from board, project is optional so no project filter in WHERE
    @Query("""
        SELECT t FROM Task t
        WHERE t.board.organization.id = :orgId
        AND t.status NOT IN (:excludedStatuses)
        AND (:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:priority IS NULL OR t.priority = :priority)
        AND (:status IS NULL OR t.status = :status)
        AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
        """)
    Page<Task> searchTasks(
            @Param("orgId") Long orgId,
            @Param("excludedStatuses") List<TaskStatus> excludedStatuses,
            @Param("search") String search,
            @Param("priority") String priority,
            @Param("status") TaskStatus status,
            @Param("assigneeId") Long assigneeId,
            Pageable pageable);
}
