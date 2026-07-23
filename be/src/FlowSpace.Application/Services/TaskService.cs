using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Application.Interfaces;
using FlowSpace.Domain.Entities;
using FlowSpace.Domain.Enums;
using FlowSpace.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using TaskStatus = FlowSpace.Domain.Enums.TaskStatus;

namespace FlowSpace.Application.Services
{
    public class TaskService : ITaskService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TaskService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<TaskResponse>> GetAllTasksAsync(Guid? projectId = null, string? status = null, Guid? assigneeId = null)
        {
            var query = _unitOfWork.Repository<TaskItem>().GetQueryable()
                .Include(t => t.Project)
                .Include(t => t.Assignee)
                .Include(t => t.Subtasks)
                .Include(t => t.Comments).ThenInclude(c => c.User)
                .AsNoTracking();

            if (projectId.HasValue)
            {
                query = query.Where(t => t.ProjectId == projectId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TaskStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(t => t.Status == parsedStatus);
            }

            if (assigneeId.HasValue)
            {
                query = query.Where(t => t.AssigneeId == assigneeId.Value);
            }

            var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            return _mapper.Map<IEnumerable<TaskResponse>>(tasks);
        }

        public async Task<TaskResponse?> GetTaskByIdAsync(Guid id)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetQueryable()
                .Include(t => t.Project)
                .Include(t => t.Assignee)
                .Include(t => t.Subtasks)
                .Include(t => t.Comments).ThenInclude(c => c.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null) return null;
            return _mapper.Map<TaskResponse>(task);
        }

        public async Task<TaskResponse> CreateTaskAsync(CreateTaskRequest request, Guid createdById)
        {
            var task = new TaskItem
            {
                Id = Guid.NewGuid(),
                Code = string.IsNullOrWhiteSpace(request.Code) ? $"T-{new Random().Next(100, 999)}" : request.Code,
                Title = request.Title,
                Description = request.Description,
                ProjectId = request.ProjectId,
                AssigneeId = request.AssigneeId,
                Status = Enum.TryParse<TaskStatus>(request.Status, true, out var status) ? status : TaskStatus.Todo,
                Priority = Enum.TryParse<TaskPriority>(request.Priority, true, out var priority) ? priority : TaskPriority.Medium,
                StartDate = request.StartDate,
                DueDate = request.DueDate,
                EstimatedHours = request.EstimatedHours,
                LoggedHours = 0,
                CreatedBy = createdById,
                CreatedAt = DateTime.UtcNow,
                Difficulty = request.Difficulty,
                CompletionScore = request.CompletionScore
            };

            await _unitOfWork.Repository<TaskItem>().AddAsync(task);
            await _unitOfWork.SaveChangesAsync();

            return (await GetTaskByIdAsync(task.Id))!;
        }

        public async Task<TaskResponse?> UpdateTaskAsync(Guid id, UpdateTaskRequest request)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(id);
            if (task == null) return null;

            task.Title = request.Title;
            task.Description = request.Description;
            task.AssigneeId = request.AssigneeId;
            if (Enum.TryParse<TaskStatus>(request.Status, true, out var status))
            {
                if (status == TaskStatus.Done && task.Status != TaskStatus.Done)
                {
                    task.CompletedAt = DateTime.UtcNow;
                }
                else if (status != TaskStatus.Done)
                {
                    task.CompletedAt = null;
                }
                task.Status = status;
            }
            if (Enum.TryParse<TaskPriority>(request.Priority, true, out var priority)) task.Priority = priority;
            task.StartDate = request.StartDate;
            task.DueDate = request.DueDate;
            task.EstimatedHours = request.EstimatedHours;
            task.LoggedHours = request.LoggedHours;
            task.Difficulty = request.Difficulty;
            task.CompletionScore = request.CompletionScore;

            _unitOfWork.Repository<TaskItem>().Update(task);
            await _unitOfWork.SaveChangesAsync();

            return await GetTaskByIdAsync(id);
        }

        public async Task<TaskResponse?> UpdateTaskStatusAsync(Guid id, string status)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(id);
            if (task == null) return null;

            if (Enum.TryParse<TaskStatus>(status, true, out var parsedStatus))
            {
                if (parsedStatus == TaskStatus.Done && task.Status != TaskStatus.Done)
                {
                    task.CompletedAt = DateTime.UtcNow;
                }
                else if (parsedStatus != TaskStatus.Done)
                {
                    task.CompletedAt = null;
                }
                task.Status = parsedStatus;
                _unitOfWork.Repository<TaskItem>().Update(task);
                await _unitOfWork.SaveChangesAsync();
            }

            return await GetTaskByIdAsync(id);
        }

        public async Task<bool> DeleteTaskAsync(Guid id)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(id);
            if (task == null) return false;

            _unitOfWork.Repository<TaskItem>().Delete(task);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<SubtaskDto?> AddSubtaskAsync(Guid taskId, string title)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(taskId);
            if (task == null) return null;

            var subtask = new Subtask
            {
                Id = Guid.NewGuid(),
                TaskId = taskId,
                Title = title,
                Done = false,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Repository<Subtask>().AddAsync(subtask);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<SubtaskDto>(subtask);
        }

        public async Task<bool> ToggleSubtaskAsync(Guid subtaskId)
        {
            var subtask = await _unitOfWork.Repository<Subtask>().GetByIdAsync(subtaskId);
            if (subtask == null) return false;

            subtask.Done = !subtask.Done;
            _unitOfWork.Repository<Subtask>().Update(subtask);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteSubtaskAsync(Guid subtaskId)
        {
            var subtask = await _unitOfWork.Repository<Subtask>().GetByIdAsync(subtaskId);
            if (subtask == null) return false;

            _unitOfWork.Repository<Subtask>().Delete(subtask);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<CommentDto?> AddCommentAsync(Guid taskId, Guid userId, string text)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(taskId);
            if (task == null) return null;

            var comment = new Comment
            {
                Id = Guid.NewGuid(),
                TaskId = taskId,
                UserId = userId,
                Text = text,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Repository<Comment>().AddAsync(comment);
            await _unitOfWork.SaveChangesAsync();

            var createdComment = await _unitOfWork.Repository<Comment>().GetQueryable()
                .Include(c => c.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == comment.Id);

            return _mapper.Map<CommentDto>(createdComment);
        }
    }
}
