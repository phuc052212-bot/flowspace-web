using System;

namespace FlowSpace.Application.Common.Dtos
{
    public class UpdateTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid? AssigneeId { get; set; }
        public string Status { get; set; } = "todo";
        public string Priority { get; set; } = "medium";
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }
        public int EstimatedHours { get; set; }
        public decimal LoggedHours { get; set; }
        public string? Difficulty { get; set; }
        public int? CompletionScore { get; set; }
    }
}
