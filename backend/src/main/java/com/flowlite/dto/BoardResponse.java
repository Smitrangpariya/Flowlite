package com.flowlite.dto;

import com.flowlite.entity.BoardType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BoardResponse {
    private Long id;
    private String name;
    private String description;
    private BoardType boardType;
    private Long organizationId;
    private String organizationName;
    private Long ownerId;
    private String ownerName;
    private String boardColor;
    private String boardIcon;
    private Boolean isDefault;
    private Integer displayOrder;
    private Integer taskCount;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
