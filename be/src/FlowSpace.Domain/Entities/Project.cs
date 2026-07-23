using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FlowSpace.Domain.Enums;

namespace FlowSpace.Domain.Entities
{
    public class Project
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public ProjectStatus Status { get; set; } = ProjectStatus.Active;

        [Required]
        public ProjectPriority Priority { get; set; } = ProjectPriority.Medium;

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [Range(0, 100)]
        public int Progress { get; set; } = 0;

        [Required]
        public Guid OwnerId { get; set; }

        [ForeignKey(nameof(OwnerId))]
        public User? Owner { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? Client { get; set; }
        public decimal? Budget { get; set; }

        public ICollection<User> Members { get; set; } = new List<User>();
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}
