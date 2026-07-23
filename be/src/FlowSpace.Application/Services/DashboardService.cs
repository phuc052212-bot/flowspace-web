using System;
using System.Linq;
using System.Threading.Tasks;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Application.Interfaces;
using FlowSpace.Domain.Entities;
using FlowSpace.Domain.Enums;
using FlowSpace.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using TaskStatus = FlowSpace.Domain.Enums.TaskStatus;

namespace FlowSpace.Application.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IUnitOfWork _unitOfWork;

        public DashboardService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<DashboardSummaryDto> GetSummaryAsync(Guid? userId = null)
        {
            var projectQuery = _unitOfWork.Repository<Project>().GetQueryable().AsNoTracking();
            var taskQuery = _unitOfWork.Repository<TaskItem>().GetQueryable().AsNoTracking();
            var requestQuery = _unitOfWork.Repository<Request>().GetQueryable().AsNoTracking();
            var timeLogQuery = _unitOfWork.Repository<TimeLog>().GetQueryable().AsNoTracking();
            var auditLogQuery = _unitOfWork.Repository<AuditLog>().GetQueryable().AsNoTracking();

            // Lưu trữ bản lọc cho User hiện tại
            var userTaskQuery = taskQuery;
            var userProjectQuery = projectQuery;
            var userTimeLogQuery = timeLogQuery;

            if (userId.HasValue)
            {
                userTaskQuery = taskQuery.Where(t => t.AssigneeId == userId.Value);
                userProjectQuery = projectQuery.Where(p => p.OwnerId == userId.Value || p.Members.Any(m => m.Id == userId.Value));
                requestQuery = requestQuery.Where(r => r.RequesterId == userId.Value);
                userTimeLogQuery = timeLogQuery.Where(tl => tl.UserId == userId.Value);
            }

            var now = DateTime.UtcNow;

            var totalProjects = await userProjectQuery.CountAsync();
            var activeProjects = await userProjectQuery.CountAsync(p => p.Status == ProjectStatus.Active);

            var totalTasks = await userTaskQuery.CountAsync();
            var completedTasks = await userTaskQuery.CountAsync(t => t.Status == TaskStatus.Done);
            var pendingTasks = await userTaskQuery.CountAsync(t => t.Status != TaskStatus.Done);
            var overdueTasks = await userTaskQuery.CountAsync(t => t.Status != TaskStatus.Done && t.DueDate < now);

            var pendingApprovalsCount = await requestQuery.CountAsync(r => r.Status == RequestStatus.Pending);
            var totalLoggedHours = await userTimeLogQuery.SumAsync(tl => (decimal?)tl.Hours) ?? 0m;
            var taskStatusCounts = await userTaskQuery
                .GroupBy(t => t.Status)
                .Select(group => new { Status = group.Key, Count = group.Count() })
                .ToListAsync();

            // 1. Lấy danh sách MyTasks chưa hoàn thành (tối đa 6 task)
            var dbTasks = await userTaskQuery
                .Where(t => t.Status != TaskStatus.Done)
                .Include(t => t.Project)
                .Include(t => t.Assignee)
                .OrderBy(t => t.DueDate)
                .Take(6)
                .ToListAsync();

            var tasksDto = dbTasks.Select(t => new TaskResponse
            {
                Id = t.Id,
                Code = t.Code,
                Title = t.Title,
                Description = t.Description,
                ProjectId = t.ProjectId,
                ProjectName = t.Project != null ? t.Project.Name : "—",
                AssigneeId = t.AssigneeId,
                AssigneeName = t.Assignee != null ? t.Assignee.Name : "Unknown",
                AssigneeAvatar = t.Assignee != null ? t.Assignee.Avatar : "??",
                AssigneeColor = t.Assignee != null ? t.Assignee.Color : "#6366f1",
                Status = t.Status.ToString().ToLower(),
                Priority = t.Priority.ToString().ToLower(),
                StartDate = t.StartDate,
                DueDate = t.DueDate,
                CompletedAt = t.CompletedAt,
                EstimatedHours = t.EstimatedHours,
                LoggedHours = t.LoggedHours,
                CreatedAt = t.CreatedAt
            }).ToList();

            // 2. Lấy danh sách Active Projects (tối đa 5 dự án)
            var dbProjects = await userProjectQuery
                .Where(p => p.Status == ProjectStatus.Active)
                .Include(p => p.Owner)
                .Include(p => p.Members)
                .OrderByDescending(p => p.CreatedAt)
                .Take(5)
                .ToListAsync();

            var projectsDto = dbProjects.Select(p => new ProjectResponse
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Description = p.Description,
                Status = p.Status.ToString().ToLower(),
                Priority = p.Priority.ToString().ToLower(),
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                Progress = p.Progress,
                OwnerId = p.OwnerId,
                OwnerName = p.Owner != null ? p.Owner.Name : "Unknown",
                CreatedAt = p.CreatedAt,
                Members = p.Members.Select(m => new UserDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    Email = m.Email,
                    Role = m.Role,
                    Avatar = m.Avatar,
                    Color = m.Color
                }).ToList()
            }).ToList();

            // 3. Lấy 8 Hoạt động (AuditLogs) gần đây
            var dbLogs = await auditLogQuery
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt)
                .Take(8)
                .ToListAsync();

            var activitiesDto = dbLogs.Select(l => new AuditLogDto
            {
                Id = l.Id,
                UserId = l.UserId,
                UserName = l.User != null ? l.User.Name : "System",
                Action = l.Action,
                Detail = l.Detail,
                Module = l.Action.Contains("Login") || l.Action.Contains("Register") || l.Action.Contains("Logout") ? "Auth" :
                         l.Action.Contains("Task") ? "Task" :
                         l.Action.Contains("Project") ? "Project" :
                         l.Action.Contains("Request") || l.Action.Contains("Approve") || l.Action.Contains("Reject") ? "Request" : "System",
                CreatedAt = l.CreatedAt
            }).ToList();

            // 4. Lấy Logs thời gian trong tuần qua phục vụ vẽ biểu đồ (lọc 7 ngày qua)
            var startOfWeek = DateTime.UtcNow.Date.AddDays(-7);
            var dbWeeklyTimeLogs = await userTimeLogQuery
                .Where(tl => tl.Date >= startOfWeek)
                .Include(tl => tl.User)
                .OrderBy(tl => tl.Date)
                .ToListAsync();

            var weeklyTimeLogsDto = dbWeeklyTimeLogs.Select(tl => new TimeLogDto
            {
                Id = tl.Id,
                TaskId = tl.TaskId,
                UserId = tl.UserId,
                UserName = tl.User != null ? tl.User.Name : "Unknown",
                Hours = tl.Hours,
                LoggedDate = tl.Date,
                Description = tl.Note,
                CreatedAt = tl.CreatedAt
            }).ToList();

            return new DashboardSummaryDto
            {
                TotalProjects = totalProjects,
                ActiveProjects = activeProjects,
                TotalTasks = totalTasks,
                CompletedTasks = completedTasks,
                PendingTasks = pendingTasks,
                OverdueTasks = overdueTasks,
                PendingApprovalsCount = pendingApprovalsCount,
                TotalLoggedHours = totalLoggedHours,
                TaskStatuses = new TaskStatusSummaryDto
                {
                    Todo = taskStatusCounts.Where(x => x.Status == TaskStatus.Todo).Select(x => x.Count).FirstOrDefault(),
                    InProgress = taskStatusCounts.Where(x => x.Status == TaskStatus.InProgress).Select(x => x.Count).FirstOrDefault(),
                    Review = taskStatusCounts.Where(x => x.Status == TaskStatus.Review).Select(x => x.Count).FirstOrDefault(),
                    Done = taskStatusCounts.Where(x => x.Status == TaskStatus.Done).Select(x => x.Count).FirstOrDefault()
                },
                Tasks = tasksDto,
                Projects = projectsDto,
                Activities = activitiesDto,
                WeeklyTimeLogs = weeklyTimeLogsDto
            };
        }
    }
}
