using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Application.Interfaces;
using FlowSpace.Persistence.Contexts;
using FlowSpace.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowSpace.Api.Controllers
{
    [Authorize]
    [Route("api/v1/notifications")]
    public class NotificationsController : BaseApiController
    {
        private readonly FlowSpaceDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public NotificationsController(FlowSpaceDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        // GET /api/v1/notifications
        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Notification>>>> GetAll()
        {
            var userIdStr = _currentUser.UserId;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return FailResponse<IEnumerable<Notification>>("Invalid user credentials.", StatusCodes.Status401Unauthorized);

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return OkResponse<IEnumerable<Notification>>(notifications, "Notifications retrieved successfully.");
        }

        // PUT /api/v1/notifications/{id}/mark-read
        [HttpPut("{id:guid}/mark-read")]
        public async Task<ActionResult<ApiResponse<string>>> MarkRead(Guid id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                return FailResponse<string>("Notification not found.", StatusCodes.Status404NotFound);

            notification.IsRead = true;
            notification.UpdatedAt = DateTime.UtcNow;
            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();

            return OkResponse("Notification marked as read.", "Notification marked as read.");
        }

        // PUT /api/v1/notifications/mark-all-read
        [HttpPut("mark-all-read")]
        public async Task<ActionResult<ApiResponse<string>>> MarkAllRead()
        {
            var userIdStr = _currentUser.UserId;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return FailResponse<string>("Invalid user credentials.", StatusCodes.Status401Unauthorized);

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in notifications)
            {
                n.IsRead = true;
                n.UpdatedAt = DateTime.UtcNow;
            }
            _context.Notifications.UpdateRange(notifications);
            await _context.SaveChangesAsync();

            return OkResponse("All notifications marked as read.", "All notifications marked as read.");
        }
    }
}
