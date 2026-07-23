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
    [Route("api/v1/users")]
    public class UsersController : BaseApiController
    {
        private readonly FlowSpaceDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public UsersController(FlowSpaceDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        // GET /api/v1/users?departmentId=&roleId=&page=1&pageSize=20
        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetAll([FromQuery] Guid? departmentId, [FromQuery] Guid? roleId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var query = _context.Users.AsQueryable();
            if (departmentId.HasValue)
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            if (roleId.HasValue)
                query = query.Where(u => u.UserRoles != null && u.UserRoles.Any(ur => ur.RoleId == roleId.Value));

            var total = await query.CountAsync();
            var users = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return OkResponse<IEnumerable<User>>(users, "Users retrieved successfully.");
        }

        // GET /api/v1/users/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ApiResponse<User>>> GetById(Guid id)
        {
            var user = await _context.Users
                .Include(u => u.Department)
                .Include(u => u.UserRoles!)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return FailResponse<User>("User not found.", StatusCodes.Status404NotFound);

            return OkResponse(user, "User retrieved successfully.");
        }

        // PUT /api/v1/users/{id}
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<ApiResponse<User>>> Update(Guid id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return FailResponse<User>("User not found.", StatusCodes.Status404NotFound);

            if (!string.IsNullOrWhiteSpace(request.Email))
                user.Email = request.Email;
            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName;
            if (request.DepartmentId.HasValue)
                user.DepartmentId = request.DepartmentId.Value;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return OkResponse(user, "User updated successfully.");
        }

        // PUT /api/v1/users/{id}/deactivate (soft delete)
        [HttpPut("{id:guid}/deactivate")]
        public async Task<ActionResult<ApiResponse<string>>> Deactivate(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return FailResponse<string>("User not found.", StatusCodes.Status404NotFound);

            user.IsDeleted = true;
            user.UpdatedAt = DateTime.UtcNow;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return OkResponse("User deactivated.", "User deactivated successfully.");
        }
    }

    public class UpdateUserRequest
    {
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public Guid? DepartmentId { get; set; }
    }
}
