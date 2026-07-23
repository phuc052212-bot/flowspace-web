using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FlowSpace.Api.Controllers
{
    [Authorize]
    public class ApprovalsController : BaseApiController
    {
        private readonly IWorkflowService _workflowService;
        private readonly ICurrentUserService _currentUser;

        public ApprovalsController(IWorkflowService workflowService, ICurrentUserService currentUser)
        {
            _workflowService = workflowService;
            _currentUser = currentUser;
        }

        [Authorize(Policy="TeamLeadOrAbove")]
        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<RequestResponse>>>> GetPendingApprovals()
        {
            var userIdStr = _currentUser.UserId;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                return FailResponse<IEnumerable<RequestResponse>>("Invalid user credentials.", StatusCodes.Status401Unauthorized);
            }

            var userRole = _currentUser.Role ?? "employee";
            var pendingRequests = await _workflowService.GetPendingApprovalsForUserAsync(userId, userRole);
            return OkResponse(pendingRequests, "Pending approval requests retrieved successfully.");
        }

        [HttpPost("{approvalId:guid}/action")]
        public async Task<ActionResult<ApiResponse<RequestResponse>>> ProcessApproval(Guid approvalId, [FromBody] ProcessApprovalInput input)
        {
            var userIdStr = _currentUser.UserId;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var approverId))
            {
                return FailResponse<RequestResponse>("Invalid user credentials.", StatusCodes.Status401Unauthorized);
            }

            var updatedRequest = await _workflowService.ProcessApprovalAsync(approvalId, input, approverId);
            if (updatedRequest == null)
            {
                return FailResponse<RequestResponse>("Approval step or request not found.", StatusCodes.Status404NotFound);
            }

            return OkResponse(updatedRequest, $"Approval step recorded as '{input.Status}'.");
        }
    }
}
