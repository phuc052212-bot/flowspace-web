using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Application.Interfaces;
using FlowSpace.Domain.Entities;
using FlowSpace.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FlowSpace.Application.Services
{
    public class TimeLogService : ITimeLogService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TimeLogService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<TimeLogDto>> GetTimeLogsAsync(Guid? userId = null, Guid? taskId = null, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _unitOfWork.Repository<TimeLog>().GetQueryable()
                .Include(tl => tl.Task)
                .Include(tl => tl.User)
                .Include(tl => tl.Project)
                .AsNoTracking();

            if (userId.HasValue)
            {
                query = query.Where(tl => tl.UserId == userId.Value);
            }

            if (taskId.HasValue)
            {
                query = query.Where(tl => tl.TaskId == taskId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(tl => tl.Date >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(tl => tl.Date <= toDate.Value);
            }

            var logs = await query.OrderByDescending(tl => tl.Date).ToListAsync();
            return _mapper.Map<IEnumerable<TimeLogDto>>(logs);
        }

        public async Task<TimeLogDto?> CreateTimeLogAsync(CreateTimeLogRequest request, Guid userId)
        {
            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(request.TaskId);
            if (task == null) return null;

            var timeLog = new TimeLog
            {
                Id = Guid.NewGuid(),
                TaskId = request.TaskId,
                ProjectId = task.ProjectId,
                UserId = userId,
                Hours = request.Hours,
                Note = request.Description,
                Date = request.LoggedDate ?? DateTime.UtcNow.Date,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Repository<TimeLog>().AddAsync(timeLog);

            // Automatically accumulate logged hours on task
            task.LoggedHours += request.Hours;
            _unitOfWork.Repository<TaskItem>().Update(task);

            await _unitOfWork.SaveChangesAsync();

            var createdLog = await _unitOfWork.Repository<TimeLog>().GetQueryable()
                .Include(tl => tl.Task)
                .Include(tl => tl.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(tl => tl.Id == timeLog.Id);

            return _mapper.Map<TimeLogDto>(createdLog);
        }

        public async Task<bool> DeleteTimeLogAsync(Guid id)
        {
            var log = await _unitOfWork.Repository<TimeLog>().GetByIdAsync(id);
            if (log == null) return false;

            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(log.TaskId);
            if (task != null)
            {
                task.LoggedHours = Math.Max(0, task.LoggedHours - log.Hours);
                _unitOfWork.Repository<TaskItem>().Update(task);
            }

            _unitOfWork.Repository<TimeLog>().Delete(log);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<TimeLogDto?> UpdateTimeLogAsync(Guid id, CreateTimeLogRequest request, Guid userId)
        {
            var log = await _unitOfWork.Repository<TimeLog>().GetByIdAsync(id);
            if (log == null) return null;
            if (log.UserId != userId) return null; // Chỉ người log mới được sửa

            var task = await _unitOfWork.Repository<TaskItem>().GetByIdAsync(log.TaskId);
            if (task != null)
            {
                // Trừ đi số giờ cũ và cộng thêm số giờ mới vào Task tương ứng
                task.LoggedHours = Math.Max(0, task.LoggedHours - log.Hours + request.Hours);
                _unitOfWork.Repository<TaskItem>().Update(task);
            }

            log.Hours = request.Hours;
            log.Note = request.Description;
            log.Date = request.LoggedDate ?? DateTime.UtcNow.Date;

            _unitOfWork.Repository<TimeLog>().Update(log);
            await _unitOfWork.SaveChangesAsync();

            var updatedLog = await _unitOfWork.Repository<TimeLog>().GetQueryable()
                .Include(tl => tl.Task)
                .Include(tl => tl.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(tl => tl.Id == log.Id);

            return _mapper.Map<TimeLogDto>(updatedLog);
        }
    }
}
