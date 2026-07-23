using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using FlowSpace.Domain.Entities;
using FlowSpace.Domain.Enums;
using FlowSpace.Persistence.Contexts;
using TaskStatus = FlowSpace.Domain.Enums.TaskStatus;

namespace FlowSpace.Persistence
{
    public static class DbInitializer
    {
        public static void Initialize(FlowSpaceDbContext context)
        {
            using (var transaction = context.Database.BeginTransaction())
            {
                try
                {
                    // Dọn dẹp dữ liệu cũ để cập nhật bộ dữ liệu chuẩn doanh nghiệp
                    context.TimeLogs.ExecuteDelete();
                    context.Subtasks.ExecuteDelete();
                    context.Comments.ExecuteDelete();
                    context.ChatMessages.ExecuteDelete();
                    context.ChatChannels.ExecuteDelete();
                    context.Approvals.ExecuteDelete();
                    context.Requests.ExecuteDelete();
                    context.Tasks.ExecuteDelete();
                    context.Projects.ExecuteDelete();
                    context.WorkflowRules.ExecuteDelete();
                    context.EmailVerificationTokens.ExecuteDelete();
                    context.PasswordResetTokens.ExecuteDelete();
                    context.UserRefreshTokens.ExecuteDelete();
                    context.AuditLogs.ExecuteDelete();
                    context.Documents.ExecuteDelete();
                    context.Users.ExecuteDelete();
                    context.SaveChanges();

                    // 1. Seed lookup tables (Departments, Roles) and then create Users

                    // Seed Departments
                    var departments = GetDepartments();
                    context.Departments.AddRange(departments);
                    context.SaveChanges();

                    // Seed Roles
                    var roles = GetRoles();
                    context.Roles.AddRange(roles);
                    context.SaveChanges();

                    // Now seed Users with navigation properties
                    var users = GetUsers(departments);
                    context.Users.AddRange(users);
                    context.SaveChanges();


                    var admin = users.First(u => u.Email == "admin@flowspace.demo");

                    // 2. Tạo các Workflow Rules duyệt phép/mua sắm thực tế
                    var rules = GetWorkflowRules();
                    context.WorkflowRules.AddRange(rules);
                    context.SaveChanges();

                    // 3. Tạo 5 dự án chuẩn doanh nghiệp
                    var projects = GetProjects(users);
                    context.Projects.AddRange(projects);
                    context.SaveChanges();

                    // 4. Sinh 60 Nhiệm vụ (Tasks) thực tế chi tiết
                    var (tasks, subtasks, timeLogs) = GenerateEnterpriseTasks(projects, users);
                    context.Tasks.AddRange(tasks);
                    context.SaveChanges();

                    context.Subtasks.AddRange(subtasks);
                    context.TimeLogs.AddRange(timeLogs);
                    context.SaveChanges();

                    // 5. Cập nhật thống kê giờ làm và tiến độ
                    foreach (var task in tasks)
                    {
                        task.LoggedHours = timeLogs.Where(tl => tl.TaskId == task.Id).Sum(tl => tl.Hours);
                    }
                    foreach (var proj in projects)
                    {
                        var projTasks = tasks.Where(t => t.ProjectId == proj.Id).ToList();
                        if (projTasks.Any())
                        {
                            var doneTasks = projTasks.Count(t => t.Status == TaskStatus.Done);
                            proj.Progress = (doneTasks * 100) / projTasks.Count;
                        }
                    }
                    context.SaveChanges();

                    // 6. Seed Comments trao đổi thực tế
                    var comments = GenerateComments(tasks, users);
                    context.Comments.AddRange(comments);
                    context.SaveChanges();

                    // 7. Seed Documents tài liệu đính kèm
                    var documents = GetDocuments(users);
                    context.Documents.AddRange(documents);
                    context.SaveChanges();

                    // 8. Seed Chat Channels & Chat Messages trao đổi công việc
                    var (channels, messages) = GetChatData(users);
                    context.ChatChannels.AddRange(channels);
                    context.SaveChanges();
                    context.ChatMessages.AddRange(messages);
                    context.SaveChanges();

                    // 9. Seed Requests & Approvals nghỉ phép/thiết bị
                    var (requests, approvals) = GetRequestsAndApprovals(users);
                    context.Requests.AddRange(requests);
                    context.SaveChanges();
                    context.Approvals.AddRange(approvals);
                    context.SaveChanges();

                    // 10. Seed Audit Logs bảo mật thực tế
                    var auditLogs = GetAuditLogs(users);
                    context.AuditLogs.AddRange(auditLogs);
                    context.SaveChanges();

                    transaction.Commit();
                    Console.WriteLine("=== SEED DATA CHUẨN DOANH NGHIỆP THÀNH CÔNG ===");
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    Console.Error.WriteLine($"Lỗi trong quá trình seed database: {ex.Message}");
                    throw;
                }
            }
        }

        private static List<User> GetUsers(List<Department> departments)
        {
            // BCrypt hash verified for the demo password "123456". Keep it static so
            // seeding does not spend CPU hashing passwords during application startup.
            string defaultPasswordHash = "$2a$11$BTygC/0c9j5z6T2FFU5B8.xse3ih59fkqVoSeE/U8hEvtimhSnv1K";

            return new List<User>
            {
                new User { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), Name = "Phạm Thanh Dung", FullName = "Phạm Thanh Dung", Email = "admin@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "director", Avatar = "PD", Color = "#e74c3c", DepartmentId = departments.First(d => d.Name == "Ban giám đốc").Id, Department = departments.First(d => d.Name == "Ban giám đốc"), Position = "Giám đốc điều hành", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddYears(-3), JoinDate = DateTime.UtcNow.AddYears(-3) },
                new User { Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), Name = "Lê Minh Cường", FullName = "Lê Minh Cường", Email = "truongphong@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "manager", Avatar = "LC", Color = "#e67e22", DepartmentId = departments.First(d => d.Name == "Kỹ thuật").Id, Department = departments.First(d => d.Name == "Kỹ thuật"), Position = "Trưởng phòng Kỹ thuật", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddYears(-2), JoinDate = DateTime.UtcNow.AddYears(-2) },
                new User { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), Name = "Trần Thị Bình", FullName = "Trần Thị Bình", Email = "truongnhom@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "team_lead", Avatar = "TB", Color = "#9b59b6", DepartmentId = departments.First(d => d.Name == "Kỹ thuật").Id, Department = departments.First(d => d.Name == "Kỹ thuật"), Position = "Trưởng nhóm Phát triển", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddYears(-1), JoinDate = DateTime.UtcNow.AddYears(-1) },
                new User { Id = Guid.Parse("44444444-4444-4444-4444-444444444444"), Name = "Nguyễn Văn An", FullName = "Nguyễn Văn An", Email = "nhanvien@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "employee", Avatar = "NV", Color = "#2ecc71", DepartmentId = departments.First(d => d.Name == "Kỹ thuật").Id, Department = departments.First(d => d.Name == "Kỹ thuật"), Position = "Lập trình viên Fullstack", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddMonths(-6), JoinDate = DateTime.UtcNow.AddMonths(-6) },
                new User { Id = Guid.Parse("55555555-5555-5555-5555-555555555555"), Name = "Vũ Hoàng Giang", FullName = "Vũ Hoàng Giang", Email = "giang.vu@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "team_lead", Avatar = "VG", Color = "#1abc9c", DepartmentId = departments.First(d => d.Name == "Kinh doanh").Id, Department = departments.First(d => d.Name == "Kinh doanh"), Position = "Trưởng nhóm Kinh doanh B2B", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddYears(-1), JoinDate = DateTime.UtcNow.AddYears(-1) },
                new User { Id = Guid.Parse("66666666-6666-6666-6666-666666666666"), Name = "Đỗ Thùy Trang", FullName = "Đỗ Thùy Trang", Email = "trang.do@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "employee", Avatar = "DT", Color = "#e84393", DepartmentId = departments.First(d => d.Name == "Kinh doanh").Id, Department = departments.First(d => d.Name == "Kinh doanh"), Position = "Chuyên viên Kinh doanh", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddMonths(-8), JoinDate = DateTime.UtcNow.AddMonths(-8) },
                new User { Id = Guid.Parse("77777777-7777-7777-7777-777777777777"), Name = "Bùi Anh Tuấn", FullName = "Bùi Anh Tuấn", Email = "tuan.bui@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "employee", Avatar = "BT", Color = "#0984e3", DepartmentId = departments.First(d => d.Name == "Kỹ thuật").Id, Department = departments.First(d => d.Name == "Kỹ thuật"), Position = "Kỹ sư Cầu nối (BrSE)", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddMonths(-5), JoinDate = DateTime.UtcNow.AddMonths(-5) },
                new User { Id = Guid.Parse("88888888-8888-8888-8888-888888888888"), Name = "Phan Minh Trí", FullName = "Phan Minh Trí", Email = "tri.phan@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "employee", Avatar = "PT", Color = "#2d3436", DepartmentId = departments.First(d => d.Name == "Kỹ thuật").Id, Department = departments.First(d => d.Name == "Kỹ thuật"), Position = "Lập trình viên Mobile", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddMonths(-3), JoinDate = DateTime.UtcNow.AddMonths(-3) },
                new User { Id = Guid.Parse("99999999-9999-9999-9999-999999999999"), Name = "Lâm Mỹ Lệ", FullName = "Lâm Mỹ Lệ", Email = "le.lam@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "manager", Avatar = "LL", Color = "#fdcb6e", DepartmentId = departments.First(d => d.Name == "Nhân sự").Id, Department = departments.First(d => d.Name == "Nhân sự"), Position = "Trưởng phòng Nhân sự", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddYears(-2), JoinDate = DateTime.UtcNow.AddYears(-2) },
                new User { Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), Name = "Hoàng Kim Yến", FullName = "Hoàng Kim Yến", Email = "yen.hoang@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "employee", Avatar = "HY", Color = "#fd79a8", DepartmentId = departments.First(d => d.Name == "Nhân sự").Id, Department = departments.First(d => d.Name == "Nhân sự"), Position = "Chuyên viên Tuyển dụng", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddMonths(-5), JoinDate = DateTime.UtcNow.AddMonths(-5) },
                new User { Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), Name = "Nguyễn Hữu Nam", FullName = "Nguyễn Hữu Nam", Email = "nam.nguyen@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "manager", Avatar = "HN", Color = "#6c5ce7", DepartmentId = departments.First(d => d.Name == "Marketing").Id, Department = departments.First(d => d.Name == "Marketing"), Position = "Trưởng phòng Marketing", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddYears(-1), JoinDate = DateTime.UtcNow.AddYears(-1) },
                new User { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"), Name = "Trần Quang Minh", FullName = "Trần Quang Minh", Email = "minh.tran@flowspace.demo", PasswordHash = defaultPasswordHash, Role = "employee", Avatar = "TM", Color = "#00cec9", DepartmentId = departments.First(d => d.Name == "Marketing").Id, Department = departments.First(d => d.Name == "Marketing"), Position = "Chuyên viên Sáng tạo nội dung", Active = true, IsEmailVerified = true, EmailVerifiedAt = DateTime.UtcNow.AddMonths(-4), JoinDate = DateTime.UtcNow.AddMonths(-4) }
            };
        }

        private static List<WorkflowRule> GetWorkflowRules()
        {
            return new List<WorkflowRule>
            {
                new WorkflowRule { Id = Guid.NewGuid(), Name = "Duyệt đơn nghỉ phép năm", RequestType = "leave", SequenceSteps = "team_lead,manager,director", IsActive = true },
                new WorkflowRule { Id = Guid.NewGuid(), Name = "Duyệt chi phí mua sắm thiết bị", RequestType = "purchase", SequenceSteps = "manager,director", IsActive = true },
                new WorkflowRule { Id = Guid.NewGuid(), Name = "Duyệt yêu cầu làm việc từ xa", RequestType = "remote", SequenceSteps = "team_lead,manager", IsActive = true }
            };
        }

        private static List<Project> GetProjects(List<User> users)
        {
            var p1 = new Project { Id = Guid.Parse("10101010-1010-1010-1010-101010101010"), Code = "FS-001", Name = "FlowSpace Platform v2", Description = "Nâng cấp toàn diện nền tảng FlowSpace lên phiên bản 2.0 với giao diện mới Notion-style, Kanban, Gantt chart, và Chat real-time.", Status = ProjectStatus.Active, Priority = ProjectPriority.High, StartDate = DateTime.UtcNow.AddMonths(-3), EndDate = DateTime.UtcNow.AddMonths(3), OwnerId = users[1].Id, CreatedAt = DateTime.UtcNow.AddMonths(-3), Client = "Tập đoàn công nghệ VinTech", Budget = 500000000 };
            var p2 = new Project { Id = Guid.Parse("20202020-2020-2020-2020-202020202020"), Code = "MKT-SEO", Name = "Chiến dịch tối ưu SEO & Content Q3", Description = "Mở rộng tiếp cận khách hàng tiềm năng qua kênh tìm kiếm tự nhiên và sản xuất nội dung blog chất lượng cao.", Status = ProjectStatus.Active, Priority = ProjectPriority.Medium, StartDate = DateTime.UtcNow.AddMonths(-1), EndDate = DateTime.UtcNow.AddMonths(2), OwnerId = users[10].Id, CreatedAt = DateTime.UtcNow.AddMonths(-1), Client = "Công ty TNHH Haravan", Budget = 80000000 };
            var p3 = new Project { Id = Guid.Parse("30303030-3030-3030-3030-303030303030"), Code = "SALE-B2B", Name = "Mở rộng kinh doanh B2B miền Nam", Description = "Tiếp cận các doanh nghiệp sản xuất và Logistics tại Bình Dương và Đồng Nai để cung cấp giải pháp FlowSpace SaaS.", Status = ProjectStatus.Active, Priority = ProjectPriority.High, StartDate = DateTime.UtcNow.AddMonths(-2), EndDate = DateTime.UtcNow.AddMonths(2), OwnerId = users[4].Id, CreatedAt = DateTime.UtcNow.AddMonths(-2), Client = "Nhà máy Kingfa Bình Dương", Budget = 150000000 };
            var p4 = new Project { Id = Guid.Parse("40404040-4040-4040-4040-404040404040"), Code = "HR-ONB", Name = "Hệ thống hóa tài liệu Onboarding", Description = "Xây dựng cổng thông tin tài liệu và video đào tạo nhập môn trực tuyến dành cho nhân sự mới.", Status = ProjectStatus.Done, Priority = ProjectPriority.Low, StartDate = DateTime.UtcNow.AddMonths(-4), EndDate = DateTime.UtcNow.AddMonths(-1), OwnerId = users[8].Id, CreatedAt = DateTime.UtcNow.AddMonths(-4), Progress = 100, Client = "FlowSpace Internal", Budget = 30000000 };
            var p5 = new Project { Id = Guid.Parse("50505050-5050-5050-5050-505050505050"), Code = "CLOUD-INF", Name = "Chuyển dịch Hạ tầng sang AWS Cloud", Description = "Thiết kế kiến trúc HA (High Availability) trên AWS, tích hợp CI/CD tự động và bảo mật đa lớp.", Status = ProjectStatus.OnHold, Priority = ProjectPriority.High, StartDate = DateTime.UtcNow.AddMonths(-1), EndDate = DateTime.UtcNow.AddMonths(5), OwnerId = users[1].Id, CreatedAt = DateTime.UtcNow.AddMonths(-1), Client = "Ngân hàng Techcombank", Budget = 1200000000 };

            p1.Members = new List<User> { users[1], users[2], users[3], users[6], users[7] };
            p2.Members = new List<User> { users[10], users[11] };
            p3.Members = new List<User> { users[4], users[5] };
            p4.Members = new List<User> { users[8], users[9] };
            p5.Members = new List<User> { users[1], users[2] };

            return new List<Project> { p1, p2, p3, p4, p5 };
        }

        private static Tuple<List<TaskItem>, List<Subtask>, List<TimeLog>> GenerateEnterpriseTasks(List<Project> projects, List<User> users)
        {
            var tasks = new List<TaskItem>();
            var subtasks = new List<Subtask>();
            var timeLogs = new List<TimeLog>();

            // Định nghĩa danh sách các đầu việc doanh nghiệp cực kỳ chi tiết
            var fs001TaskTitles = new[] {
                "Thiết kế Kiến trúc Cơ sở dữ liệu PostgreSQL", "Xây dựng Core API Authentication & Authorization",
                "Tích hợp real-time Chat sử dụng SignalR", "Tối ưu hóa UI/UX Layout Notion-style",
                "Xây dựng Dashboard thống kê tiến độ dự án", "Phát triển Gantt Chart kết nối API",
                "Tích hợp tính năng kéo thả Kanban Board", "Xây dựng Notification Hub báo động đỏ",
                "Tích hợp cổng thanh toán tích hợp VNPay/Stripe", "Viết Unit Test cho Auth và Project Service",
                "Cấu hình CI/CD Docker deploy Render", "Kiểm định bảo mật chống SQL Injection & XSS"
            };

            var mktSeoTaskTitles = new[] {
                "Phân tích từ khóa tiềm năng ngành SaaS", "Tối ưu hóa On-page SEO cho trang chủ và Blogs",
                "Thiết kế Layout và sản xuất 10 bài viết cốt lõi", "Xây dựng chiến dịch Email Marketing gửi tệp Leads",
                "Liên hệ các đối tác làm Guest Post xây dựng Backlinks", "Phân tích số liệu truy cập bằng Google Analytics Q2"
            };

            var saleB2bTaskTitles = new[] {
                "Thu thập thông tin 100 doanh nghiệp khu công nghiệp", "Thiết kế bộ Slide chào hàng và báo giá dịch vụ",
                "Tổ chức 5 buổi Demo trực tuyến sản phẩm", "Đàm phán và ký kết hợp đồng thử nghiệm dịch vụ",
                "Xử lý ý kiến phản hồi về giá của khách hàng", "Bàn giao danh sách khách hàng cho bộ phận CS"
            };

            var hrOnbTaskTitles = new[] {
                "Soạn thảo cẩm nang văn hóa doanh nghiệp", "Quay và biên tập video hướng dẫn công cụ nội bộ",
                "Thiết lập bài test đánh giá năng lực thử việc", "Tổ chức buổi định hướng trực tiếp cho nhân viên mới",
                "Thu thập đánh giá khảo sát trải nghiệm Onboarding"
            };

            var cloudInfTaskTitles = new[] {
                "Đánh giá chi phí hạ tầng cũ và lập dự toán AWS", "Cấu hình Virtual Private Cloud (VPC) & Subnets",
                "Thiết lập cụm ECS Fargate chạy container API", "Cấu hình CDN Amazon CloudFront cho Frontend",
                "Viết kịch bản Terraform tự động khởi tạo tài nguyên"
            };

            var admin = users.First(u => u.Email == "admin@flowspace.demo");

            // Tạo các tasks khớp ID Guid deterministic để đồng bộ với Frontend
            int globalTaskIndex = 1;
            foreach (var proj in projects)
            {
                string[] titles = proj.Code switch
                {
                    "FS-001" => fs001TaskTitles,
                    "MKT-SEO" => mktSeoTaskTitles,
                    "SALE-B2B" => saleB2bTaskTitles,
                    "HR-ONB" => hrOnbTaskTitles,
                    _ => cloudInfTaskTitles
                };

                var members = proj.Members?.ToList() ?? new List<User> { admin };

                for (int i = 0; i < titles.Length; i++)
                {
                    var status = (TaskStatus)(i % 4);
                    if (proj.Status == ProjectStatus.Done) status = TaskStatus.Done;

                    var priority = (TaskPriority)(i % 3);
                    var assignee = members[i % members.Count];

                    var taskId = Guid.Parse($"00000000-0000-0000-0000-0000000000{globalTaskIndex:D2}");

                    var task = new TaskItem
                    {
                        Id = taskId,
                        Code = $"{proj.Code}-T{i + 1}",
                        Title = titles[i],
                        Description = $"Thực hiện nhiệm vụ: {titles[i]} thuộc dự án {proj.Name}. Chi tiết công việc và tiến độ cập nhật định kỳ trên bảng Kanban.",
                        ProjectId = proj.Id,
                        AssigneeId = assignee.Id,
                        CreatedBy = assignee.Id,
                        Status = status,
                        Priority = priority,
                        StartDate = DateTime.UtcNow.AddDays(-15 + i),
                        DueDate = DateTime.UtcNow.AddDays(5 + i),
                        EstimatedHours = 12 + (i * 4),
                        CreatedAt = DateTime.UtcNow.AddDays(-16 + i)
                    };

                    if (status == TaskStatus.Done)
                    {
                        task.CompletedAt = DateTime.UtcNow.AddDays(i);
                    }

                    tasks.Add(task);

                    // Mỗi task tạo 1 subtask thực tế
                    subtasks.Add(new Subtask
                    {
                        Id = Guid.NewGuid(),
                        TaskId = task.Id,
                        Title = $"Kiểm tra kết quả chạy thử nghiệm: {task.Title}",
                        Done = status == TaskStatus.Done,
                        CreatedAt = task.CreatedAt
                    });

                    // Sinh TimeLog thực tế
                    if (status == TaskStatus.InProgress || status == TaskStatus.Done)
                    {
                        timeLogs.Add(new TimeLog
                        {
                            Id = Guid.NewGuid(),
                            TaskId = task.Id,
                            UserId = assignee.Id,
                            ProjectId = proj.Id,
                            Hours = 4 + (i % 5),
                            Date = DateTime.UtcNow.AddDays(-(i % 5)),
                            Note = $"Đã hoàn thành phân đoạn kỹ thuật của task: {task.Title}",
                            CreatedAt = DateTime.UtcNow.AddDays(-(i % 5))
                        });
                    }

                    globalTaskIndex++;
                }
            }

            return Tuple.Create(tasks, subtasks, timeLogs);
        }

        private static List<Comment> GenerateComments(List<TaskItem> tasks, List<User> users)
        {
            var comments = new List<Comment>();
            string[] commentTexts = new[] {
                "Phần API đã hoàn thành xong, nhờ lead review code giúp mình nhé.",
                "Mình vừa kiểm tra lại UI trên màn hình mobile, nút bấm hơi bị lệch một chút.",
                "Đã sửa xong lỗi rò rỉ bộ nhớ, mọi người kéo code mới nhất về test thử.",
                "Tài liệu kỹ thuật đã upload đầy đủ, sẵn sàng bàn giao cho đội QA."
            };

            for (int i = 0; i < Math.Min(tasks.Count, 25); i++)
            {
                var task = tasks[i];
                var user = users[i % users.Count];
                comments.Add(new Comment
                {
                    Id = Guid.NewGuid(),
                    TaskId = task.Id,
                    UserId = user.Id,
                    Text = commentTexts[i % commentTexts.Length],
                    CreatedAt = DateTime.UtcNow.AddHours(-i)
                });
            }
            return comments;
        }

        private static List<Document> GetDocuments(List<User> users)
        {
            return new List<Document>
            {
                new Document { Id = Guid.NewGuid(), Name = "Quy-dinh-lam-viec-tu-xa.pdf", Type = "pdf", Size = 154200, Url = "https://flowspace.demo/docs/ot.pdf", CreatedBy = users[0].Id, CreatedAt = DateTime.UtcNow.AddMonths(-3) },
                new Document { Id = Guid.NewGuid(), Name = "Kien-truc-he-thong-AWS-v2.docx", Type = "docx", Size = 1250000, Url = "https://flowspace.demo/docs/architecture.docx", CreatedBy = users[1].Id, CreatedAt = DateTime.UtcNow.AddMonths(-1) }
            };
        }

        private static Tuple<List<ChatChannel>, List<ChatMessage>> GetChatData(List<User> users)
        {
            var channels = new List<ChatChannel>
            {
                new ChatChannel { Id = Guid.Parse("11111111-2222-3333-4444-555555555555"), Name = "Thảo luận chung", Description = "Kênh thảo luận toàn công ty", IsDirectMessage = false, CreatedAt = DateTime.UtcNow.AddYears(-1) }
            };

            var messages = new List<ChatMessage>
            {
                new ChatMessage { Id = Guid.NewGuid(), ChannelId = channels[0].Id, SenderId = users[0].Id, Content = "Chào mọi người, chúc team tuần mới làm việc đầy năng lượng và hiệu quả nhé!", CreatedAt = DateTime.UtcNow.AddDays(-1) },
                new ChatMessage { Id = Guid.NewGuid(), ChannelId = channels[0].Id, SenderId = users[1].Id, Content = "Chào Giám đốc! Team phát triển đang tập trung đẩy nhanh sprint v2 để kịp tiến độ.", CreatedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(10) }
            };

            return Tuple.Create(channels, messages);
        }

        private static Tuple<List<Request>, List<Approval>> GetRequestsAndApprovals(List<User> users)
        {
            var requests = new List<Request>
            {
                new Request { Id = Guid.Parse("90909090-9090-9090-9090-909090909090"), Title = "Yêu cầu nghỉ phép năm - Nguyễn Văn An", Description = "Xin nghỉ phép 2 ngày giải quyết việc cá nhân.", Type = FlowSpace.Domain.Enums.RequestType.Leave, Status = RequestStatus.Pending, RequesterId = users[3].Id, CreatedAt = DateTime.UtcNow.AddDays(-1) }
            };

            var approvals = new List<Approval>
            {
                new Approval { Id = Guid.NewGuid(), RequestId = requests[0].Id, Level = 1, Role = "team_lead", ApproverId = users[2].Id, Status = ApprovalStatus.Approved, Note = "Đã đồng ý, chuyển tiếp lên Trưởng phòng phê duyệt.", UpdatedAt = DateTime.UtcNow.AddHours(-6) },
                new Approval { Id = Guid.NewGuid(), RequestId = requests[0].Id, Level = 2, Role = "manager", ApproverId = users[1].Id, Status = ApprovalStatus.Pending }
            };

            return Tuple.Create(requests, approvals);
        }

        private static List<AuditLog> GetAuditLogs(List<User> users)
        {
            return new List<AuditLog>
            {
                new AuditLog { Id = Guid.NewGuid(), UserId = users[0].Id, Action = "LOGIN", Detail = "Đăng nhập hệ thống thành công bằng IP 113.161.42.12", CreatedAt = DateTime.UtcNow.AddMinutes(-10) },
                new AuditLog { Id = Guid.NewGuid(), UserId = users[3].Id, Action = "UPDATE", Detail = "Cập nhật trạng thái Task FS-001-T3 sang In Progress", CreatedAt = DateTime.UtcNow.AddMinutes(-45) },
                new AuditLog { Id = Guid.NewGuid(), UserId = users[1].Id, Action = "CREATE", Detail = "Tạo dự án mới: Chuyển dịch Hạ tầng sang AWS Cloud", CreatedAt = DateTime.UtcNow.AddHours(-3) }
            };
        }
        private static List<Department> GetDepartments()
        {
            return new List<Department>
            {
                new Department { Id = Guid.NewGuid(), Name = "Ban giám đốc" },
                new Department { Id = Guid.NewGuid(), Name = "Kỹ thuật" },
                new Department { Id = Guid.NewGuid(), Name = "Kinh doanh" },
                new Department { Id = Guid.NewGuid(), Name = "Nhân sự" },
                new Department { Id = Guid.NewGuid(), Name = "Marketing" }
            };
        }

        private static List<Role> GetRoles()
        {
            return new List<Role>
            {
                new Role { Id = Guid.NewGuid(), Name = "director" },
                new Role { Id = Guid.NewGuid(), Name = "manager" },
                new Role { Id = Guid.NewGuid(), Name = "team_lead" },
                new Role { Id = Guid.NewGuid(), Name = "employee" }
            };
        }
    }

}

