package com.flowlite.dto;

import lombok.Data;

@Data
public class BoardLimitsResponse {
    private int personalBoardsUsed;
    private int personalBoardsLimit;
    private int personalBoardsRemaining;
    private boolean canCreatePersonalBoard;

    private int teamBoardsUsed;
    private int teamBoardsLimit; // -1 for unlimited
    private boolean canCreateTeamBoard;

    private boolean limitsEnforced;
}
