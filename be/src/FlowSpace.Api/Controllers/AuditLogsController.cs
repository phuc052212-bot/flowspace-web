using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Domain.Entities;
using FlowSpace.Persistence.Contexts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowSpace.Api.Controllers
{
    [Authorize(Policy = "TeamLeadOrAbove")]
    [Route("api/v1/auditlogs")]
    public class AuditLogsController : BaseApiController
    {
        private readonly FlowSpaceDbContext _context;

        public AuditLogsController(FlowSpaceDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<AuditLogDto>>>> GetLogs(
            [FromQuery] string? action,
            [FromQuery] Guid? userId,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var query = _context.AuditLogs
                .Include(a => a.User)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(a => a.Action.ToLower() == action.ToLower());
            }

            if (userId.HasValue)
            {
                query = query.Where(a => a.UserId == userId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.ToLower();
                query = query.Where(a => (a.Detail != null && a.Detail.ToLower().Contains(q)) ||
                                         a.Action.ToLower().Contains(q));
            }

            var total = await query.CountAsync();
            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = logs.Select(l => new AuditLogDto
            {
                Id = l.Id,
                UserId = l.UserId,
                UserName = l.User != null ? l.User.Name : "Hệ thống",
                Action = l.Action.ToUpper(),
                Detail = l.Detail ?? string.Empty,
                Module = DeriveModule(l.Action),
                IpAddress = l.IpAddress ?? "127.0.0.1",
                CreatedAt = l.CreatedAt
            });

            return OkResponse<IEnumerable<AuditLogDto>>(dtos, "Audit logs retrieved successfully.");
        }

        private static string DeriveModule(string action)
        {
            var act = action.ToUpper();
            if (act.Contains("LOGIN") || act.Contains("LOGOUT") || act.Contains("REGISTER") || act.Contains("PASSWORD"))
                return "Tài khoản";
            if (act.Contains("TASK") || act.Contains("PROJECT") || act.Contains("SUBTASK"))
                return "Công việc & Dự án";
            if (act.Contains("APPROVE") || act.Contains("REJECT") || act.Contains("REQUEST"))
                return "Phê duyệt";
            if (act.Contains("TIME") || act.Contains("LOG"))
                return "Time Tracking";
            return "Hệ thống";
        }
    }
}
