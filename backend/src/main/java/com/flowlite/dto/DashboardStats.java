package com.flowlite.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {
    private long totalTasks;
    private long inProgress;
    private long pendingReview;
    private long completed;
    private long cancelled;
    private double completionRate;
    
    // Additional stats for detailed analytics
    private long created;
    private long assigned;
    private long archived;
}
