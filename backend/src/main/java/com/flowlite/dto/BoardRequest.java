package com.flowlite.dto;

import com.flowlite.entity.BoardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BoardRequest {

    @NotBlank(message = "Board name is required")
    @Size(min = 3, max = 100, message = "Board name must be between 3 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    private BoardType boardType = BoardType.TEAM;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Invalid color format. Use hex format: #RRGGBB")
    private String boardColor;

    @Size(max = 50, message = "Icon name too long")
    private String boardIcon;

    private Boolean isDefault = false;

    private Integer displayOrder = 0;
}
