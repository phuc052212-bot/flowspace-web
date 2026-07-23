using System;
using System.Collections.Generic;

namespace FlowSpace.Application.Common.Dtos
{
    public class TaskResponse
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public Guid? AssigneeId { get; set; }
        public string AssigneeName { get; set; } = string.Empty;
        public string AssigneeAvatar { get; set; } = string.Empty;
        public string AssigneeColor { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int EstimatedHours { get; set; }
        public decimal LoggedHours { get; set; }
        public Guid CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Difficulty { get; set; }
        public int? CompletionScore { get; set; }
        public List<SubtaskDto> Subtasks { get; set; } = new List<SubtaskDto>();
        public List<CommentDto> Comments { get; set; } = new List<CommentDto>();
    }
}
