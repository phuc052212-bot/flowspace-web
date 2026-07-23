using System;

namespace FlowSpace.Application.Common.Dtos
{
    public class UpdateProjectRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "active";
        public string Priority { get; set; } = "medium";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Progress { get; set; }
        public string? Client { get; set; }
        public decimal? Budget { get; set; }
    }
}
