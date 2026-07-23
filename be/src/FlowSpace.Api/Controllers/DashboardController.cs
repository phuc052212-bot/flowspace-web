using System;
using System.Threading.Tasks;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

namespace FlowSpace.Api.Controllers
{
    [Authorize]
    [Route("api/v1/dashboard")]
    public class DashboardController : BaseApiController
    {
        private readonly IDashboardService _dashboardService;
        private readonly ICurrentUserService _currentUser;

        public DashboardController(IDashboardService dashboardService, ICurrentUserService currentUser)
        {
            _dashboardService = dashboardService;
            _currentUser = currentUser;
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> GetSummary()
        {
            Guid? parsedUserId = null;
            if (_currentUser.IsAuthenticated && !string.IsNullOrEmpty(_currentUser.UserId))
            {
                if (Guid.TryParse(_currentUser.UserId, out var guid))
                {
                    // Nếu là Director/Admin thì xem toàn bộ hệ thống (userId = null)
                    // Ngược lại nếu là Employee/TeamLead/Manager thì bắt buộc lọc theo UserId của họ
                    if (_currentUser.Role != "director")
                    {
                        parsedUserId = guid;
                    }
                }
            }

            var summary = await _dashboardService.GetSummaryAsync(parsedUserId);
            return OkResponse(summary, "Dashboard summary retrieved successfully.");
        }

        [HttpPost("seed-data")]
        public ActionResult<ApiResponse<string>> SeedData([FromServices] FlowSpace.Persistence.Contexts.FlowSpaceDbContext context)
        {
            if (_currentUser.Role != "director")
            {
                return FailResponse<string>("Chỉ Giám đốc/Quản trị viên mới được quyền nạp dữ liệu mẫu.", Microsoft.AspNetCore.Http.StatusCodes.Status403Forbidden);
            }

            try
            {
                FlowSpace.Persistence.DbInitializer.Initialize(context);
                return OkResponse("Database seeded successfully with production-grade data!", "Seeding complete.");
            }
            catch (Exception ex)
            {
                return FailResponse<string>($"Error seeding database: {ex.Message}", Microsoft.AspNetCore.Http.StatusCodes.Status500InternalServerError);
            }
        }

        [HttpGet("search")]
        public async Task<ActionResult<ApiResponse<List<SearchResultDto>>>> Search([FromQuery] string q, [FromServices] FlowSpace.Persistence.Contexts.FlowSpaceDbContext context)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            {
                return OkResponse(new List<SearchResultDto>(), "Query too short.");
            }

            var query = q.Trim().ToLower();
            var results = new List<SearchResultDto>();

            // 1. Lọc theo Project
            var projects = await context.Projects
                .Where(p => p.Name.ToLower().Contains(query) || p.Code.ToLower().Contains(query))
                .Take(5)
                .Select(p => new SearchResultDto
                {
                    Id = p.Id.ToString(),
                    Type = "project",
                    Title = p.Name,
                    Description = $"Dự án: {p.Code} - Trạng thái: {p.Status.ToString()}",
                    Icon = "bi-folder2"
                })
                .ToListAsync();
            results.AddRange(projects);

            // 2. Lọc theo Task
            var tasks = await context.Tasks
                .Where(t => t.Title.ToLower().Contains(query) || t.Code.ToLower().Contains(query))
                .Take(5)
                .Select(t => new SearchResultDto
                {
                    Id = t.Id.ToString(),
                    Type = "task",
                    Title = t.Title,
                    Description = $"Công việc: {t.Code} - Hạn chót: {(t.DueDate.HasValue ? t.DueDate.Value.ToString("dd/MM/yyyy") : "Không có")}",
                    Icon = "bi-check2-square"
                })
                .ToListAsync();
            results.AddRange(tasks);

            // 3. Lọc theo User
            var users = await context.Users
                .Where(u => u.Name.ToLower().Contains(query) || u.Email.ToLower().Contains(query))
                .Take(5)
                .Select(u => new SearchResultDto
                {
                    Id = u.Id.ToString(),
                    Type = "user",
                    Title = u.Name,
                    Description = $"Nhân sự: {u.Email} - Vai trò: {u.Role}",
                    Icon = "bi-person"
                })
                .ToListAsync();
            results.AddRange(users);

            return OkResponse(results, "Search completed successfully.");
        }
    }
}
