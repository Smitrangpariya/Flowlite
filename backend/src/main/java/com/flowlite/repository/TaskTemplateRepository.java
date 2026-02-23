package com.flowlite.repository;

import com.flowlite.entity.Organization;
import com.flowlite.entity.TaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskTemplateRepository extends JpaRepository<TaskTemplate, Long> {
    List<TaskTemplate> findByOrganizationAndActiveTrue(Organization organization);
}
