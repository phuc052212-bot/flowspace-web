using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FlowSpace.Domain.Enums;
using TaskStatus = FlowSpace.Domain.Enums.TaskStatus;

namespace FlowSpace.Domain.Entities
{
    public class TaskItem
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }

        public Guid? AssigneeId { get; set; }

        [ForeignKey(nameof(AssigneeId))]
        public User? Assignee { get; set; }

        [Required]
        public TaskStatus Status { get; set; } = TaskStatus.Todo;

        [Required]
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;

        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }

        public DateTime? CompletedAt { get; set; }

        [Range(0, int.MaxValue)]
        public int EstimatedHours { get; set; } = 0;

        [Column(TypeName = "decimal(5,2)")]
        [Range(0.00, 999.99)]
        public decimal LoggedHours { get; set; } = 0.00m;

        public Guid CreatedBy { get; set; }

        [ForeignKey(nameof(CreatedBy))]
        public User? Creator { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? Difficulty { get; set; }

        [Range(0, 100)]
        public int? CompletionScore { get; set; }

        public ICollection<Subtask> Subtasks { get; set; } = new List<Subtask>();
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public ICollection<TaskItem> Dependencies { get; set; } = new List<TaskItem>();
    }
}
