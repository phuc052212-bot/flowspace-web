using System;

namespace FlowSpace.Application.Common.Dtos
{
    public class TimeLogDto
    {
        public Guid Id { get; set; }
        public Guid TaskId { get; set; }
        public string TaskTitle { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public decimal Hours { get; set; }
        public string? Description { get; set; }
        public DateTime LoggedDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
    }
}
