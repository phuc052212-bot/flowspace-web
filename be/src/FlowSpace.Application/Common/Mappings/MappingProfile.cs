using AutoMapper;
using FlowSpace.Application.Common.Dtos;
using FlowSpace.Domain.Entities;

namespace FlowSpace.Application.Common.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mapping
            CreateMap<User, UserDto>();

            // Project mapping
            CreateMap<Project, ProjectResponse>()
                .ForMember(dest => dest.OwnerName, opt => opt.MapFrom(src => src.Owner != null ? src.Owner.Name : string.Empty))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority.ToString()))
                .ForMember(dest => dest.TaskCount, opt => opt.MapFrom(src => src.Tasks != null ? src.Tasks.Count : 0))
                .ForMember(dest => dest.CompletedTaskCount, opt => opt.MapFrom(src => src.Tasks != null ? src.Tasks.Count(t => t.Status == FlowSpace.Domain.Enums.TaskStatus.Done) : 0));

            CreateMap<CreateProjectRequest, Project>();

            // Subtask mapping
            CreateMap<Subtask, SubtaskDto>();

            // Comment mapping
            CreateMap<Comment, CommentDto>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User != null ? src.User.Name : string.Empty))
                .ForMember(dest => dest.UserAvatar, opt => opt.MapFrom(src => src.User != null ? src.User.Avatar : string.Empty))
                .ForMember(dest => dest.UserColor, opt => opt.MapFrom(src => src.User != null ? src.User.Color : string.Empty));

            // Task mapping
            CreateMap<TaskItem, TaskResponse>()
                .ForMember(dest => dest.ProjectName, opt => opt.MapFrom(src => src.Project != null ? src.Project.Name : string.Empty))
                .ForMember(dest => dest.AssigneeName, opt => opt.MapFrom(src => src.Assignee != null ? src.Assignee.Name : string.Empty))
                .ForMember(dest => dest.AssigneeAvatar, opt => opt.MapFrom(src => src.Assignee != null ? src.Assignee.Avatar : string.Empty))
                .ForMember(dest => dest.AssigneeColor, opt => opt.MapFrom(src => src.Assignee != null ? src.Assignee.Color : string.Empty))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority.ToString()));

            // Request & Approval mapping
            CreateMap<Request, RequestResponse>()
                .ForMember(dest => dest.RequesterName, opt => opt.MapFrom(src => src.Requester != null ? src.Requester.Name : string.Empty))
                .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Approval, ApprovalResponse>()
                .ForMember(dest => dest.ApproverName, opt => opt.MapFrom(src => src.Approver != null ? src.Approver.Name : string.Empty))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            // TimeLog mapping
            CreateMap<TimeLog, TimeLogDto>()
                .ForMember(dest => dest.TaskTitle, opt => opt.MapFrom(src => src.Task != null ? src.Task.Title : string.Empty))
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User != null ? src.User.Name : string.Empty))
                .ForMember(dest => dest.ProjectName, opt => opt.MapFrom(src => src.Project != null ? src.Project.Name : string.Empty))
                .ForMember(dest => dest.ProjectId, opt => opt.MapFrom(src => src.ProjectId))
                .ForMember(dest => dest.LoggedDate, opt => opt.MapFrom(src => src.Date));
        }
    }
}
