using System;
using System.Collections.Generic;

namespace FlowSpace.Application.Common.Dtos
{
    public class ProjectResponse
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Progress { get; set; }
        public Guid OwnerId { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? Client { get; set; }
        public decimal? Budget { get; set; }
        public List<UserDto> Members { get; set; } = new List<UserDto>();
        public int TaskCount { get; set; }
        public int CompletedTaskCount { get; set; }
    }
}
