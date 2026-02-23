package com.flowlite.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "flowlite.board-limits")
@Data
public class BoardLimitConfig {

    /** Maximum number of personal boards a user can create. Default: 5 */
    private int maxPersonalBoardsPerUser = 5;

    /** Maximum number of team boards per organization. -1 = unlimited. Default: -1 */
    private int maxTeamBoardsPerOrg = -1;

    /** Whether to enforce board limits. Default: true */
    private boolean enforceLimits = true;
}
