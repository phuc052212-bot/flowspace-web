using System;

namespace FlowSpace.Application.Common.Dtos
{
    public class DashboardSummaryDto
    {
        public int TotalProjects { get; set; }
        public int ActiveProjects { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int PendingTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int PendingApprovalsCount { get; set; }
        public decimal TotalLoggedHours { get; set; }
        public TaskStatusSummaryDto TaskStatuses { get; set; } = new TaskStatusSummaryDto();

        // Bổ sung các trường dữ liệu thật
        public List<TaskResponse> Tasks { get; set; } = new List<TaskResponse>();
        public List<ProjectResponse> Projects { get; set; } = new List<ProjectResponse>();
        public List<AuditLogDto> Activities { get; set; } = new List<AuditLogDto>();
        public List<TimeLogDto> WeeklyTimeLogs { get; set; } = new List<TimeLogDto>();
    }

    public class TaskStatusSummaryDto
    {
        public int Todo { get; set; }
        public int InProgress { get; set; }
        public int Review { get; set; }
        public int Done { get; set; }
    }

    public class AuditLogDto
    {
        public Guid Id { get; set; }
        public Guid? UserId { get; set; }
        public string UserName { get; set; } = "System";
        public string Action { get; set; } = string.Empty;
        public string? Detail { get; set; }
        public string Module { get; set; } = "System";
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SearchResultDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "project" | "task" | "user"
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
    }
}
