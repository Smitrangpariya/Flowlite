package com.flowlite.repository;

import com.flowlite.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {
    
    @Query("SELECT c FROM TaskComment c LEFT JOIN FETCH c.author WHERE c.task.id = :taskId ORDER BY c.createdAt DESC")
    List<TaskComment> findByTaskIdWithAuthor(Long taskId);
    
    List<TaskComment> findByTaskIdOrderByCreatedAtDesc(Long taskId);
}
