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

namespace FlowSpace.Application.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public ProjectService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ProjectResponse>> GetAllProjectsAsync()
        {
            var projects = await _unitOfWork.Repository<Project>().GetQueryable()
                .Include(p => p.Owner)
                .Include(p => p.Members)
                .Include(p => p.Tasks)
                .AsNoTracking()
                .ToListAsync();

            return _mapper.Map<IEnumerable<ProjectResponse>>(projects);
        }

        public async Task<ProjectResponse?> GetProjectByIdAsync(Guid id)
        {
            var project = await _unitOfWork.Repository<Project>().GetQueryable()
                .Include(p => p.Owner)
                .Include(p => p.Members)
                .Include(p => p.Tasks)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null) return null;
            return _mapper.Map<ProjectResponse>(project);
        }

        public async Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, Guid ownerId)
        {
            var project = new Project
            {
                Id = Guid.NewGuid(),
                Code = string.IsNullOrWhiteSpace(request.Code) ? $"FS-{new Random().Next(100, 999)}" : request.Code,
                Name = request.Name,
                Description = request.Description,
                Status = Enum.TryParse<ProjectStatus>(request.Status, true, out var status) ? status : ProjectStatus.Active,
                Priority = Enum.TryParse<ProjectPriority>(request.Priority, true, out var priority) ? priority : ProjectPriority.Medium,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Progress = 0,
                OwnerId = ownerId,
                CreatedAt = DateTime.UtcNow,
                Client = request.Client,
                Budget = request.Budget
            };

            var ownerUser = await _unitOfWork.Repository<User>().GetByIdAsync(ownerId);
            if (ownerUser != null)
            {
                project.Members.Add(ownerUser);
            }

            await _unitOfWork.Repository<Project>().AddAsync(project);
            await _unitOfWork.SaveChangesAsync();

            return (await GetProjectByIdAsync(project.Id))!;
        }

        public async Task<ProjectResponse?> UpdateProjectAsync(Guid id, UpdateProjectRequest request)
        {
            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(id);
            if (project == null) return null;

            project.Name = request.Name;
            project.Description = request.Description;
            if (Enum.TryParse<ProjectStatus>(request.Status, true, out var status)) project.Status = status;
            if (Enum.TryParse<ProjectPriority>(request.Priority, true, out var priority)) project.Priority = priority;
            project.StartDate = request.StartDate;
            project.EndDate = request.EndDate;
            project.Progress = request.Progress;
            project.Client = request.Client;
            project.Budget = request.Budget;

            _unitOfWork.Repository<Project>().Update(project);
            await _unitOfWork.SaveChangesAsync();

            return await GetProjectByIdAsync(id);
        }

        public async Task<bool> DeleteProjectAsync(Guid id)
        {
            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(id);
            if (project == null) return false;

            _unitOfWork.Repository<Project>().Delete(project);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<ProjectResponse?> UpdateProjectMembersAsync(Guid projectId, IEnumerable<Guid> memberIds)
        {
            var project = await _unitOfWork.Repository<Project>().GetQueryable()
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return null;

            var users = await _unitOfWork.Repository<User>().GetQueryable()
                .Where(u => memberIds.Contains(u.Id))
                .ToListAsync();

            project.Members.Clear();
            foreach (var user in users)
            {
                project.Members.Add(user);
            }

            _unitOfWork.Repository<Project>().Update(project);
            await _unitOfWork.SaveChangesAsync();

            return await GetProjectByIdAsync(projectId);
        }

        public async Task<bool> RemoveProjectMemberAsync(Guid projectId, Guid userId)
        {
            var project = await _unitOfWork.Repository<Project>().GetQueryable()
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return false;

            var memberToRemove = project.Members.FirstOrDefault(m => m.Id == userId);
            if (memberToRemove == null) return false;

            project.Members.Remove(memberToRemove);
            _unitOfWork.Repository<Project>().Update(project);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }
    }
}
