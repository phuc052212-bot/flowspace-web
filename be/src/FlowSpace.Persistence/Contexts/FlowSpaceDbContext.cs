using FlowSpace.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FlowSpace.Persistence.Contexts
{
    public class FlowSpaceDbContext : DbContext
    {
        public FlowSpaceDbContext(DbContextOptions<FlowSpaceDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();
        public DbSet<Project> Projects => Set<Project>();
        public DbSet<TaskItem> Tasks => Set<TaskItem>();
        public DbSet<Subtask> Subtasks => Set<Subtask>();
        public DbSet<Request> Requests => Set<Request>();
        public DbSet<Approval> Approvals => Set<Approval>();
        public DbSet<TimeLog> TimeLogs => Set<TimeLog>();
        public DbSet<Comment> Comments => Set<Comment>();
        public DbSet<Document> Documents => Set<Document>();
        public DbSet<WorkflowRule> WorkflowRules => Set<WorkflowRule>();
        public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();
        public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<ChatChannel> ChatChannels => Set<ChatChannel>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<Permission> Permissions => Set<Permission>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<UserRole> UserRoles => Set<UserRole>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<RequestType> RequestTypes => Set<RequestType>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Users Configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasIndex(u => u.Email).IsUnique();
            });

            // UserRefreshTokens Configuration
            modelBuilder.Entity<UserRefreshToken>(entity =>
            {
                entity.ToTable("UserRefreshTokens");
                entity.HasOne(rt => rt.User)
                      .WithMany()
                      .HasForeignKey(rt => rt.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Projects Configuration
            modelBuilder.Entity<Project>(entity =>
            {
                entity.ToTable("Projects");
                entity.HasIndex(p => p.Code).IsUnique();
                entity.Property(p => p.Status).HasConversion<string>();
                entity.Property(p => p.Priority).HasConversion<string>();

                entity.HasOne(p => p.Owner)
                      .WithMany()
                      .HasForeignKey(p => p.OwnerId)
                      .OnDelete(DeleteBehavior.NoAction);

                entity.HasMany(p => p.Members)
                      .WithMany()
                      .UsingEntity(j => j.ToTable("ProjectMembers"));
            });

            // Tasks Configuration
            modelBuilder.Entity<TaskItem>(entity =>
            {
                entity.ToTable("Tasks");
                entity.HasIndex(t => t.Code).IsUnique();
                entity.Property(t => t.Status).HasConversion<string>();
                entity.Property(t => t.Priority).HasConversion<string>();

                entity.HasOne(t => t.Project)
                      .WithMany(p => p.Tasks)
                      .HasForeignKey(t => t.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(t => t.Assignee)
                      .WithMany()
                      .HasForeignKey(t => t.AssigneeId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(t => t.Creator)
                      .WithMany()
                      .HasForeignKey(t => t.CreatedBy)
                      .OnDelete(DeleteBehavior.NoAction);
            });

            // Subtasks Configuration
            modelBuilder.Entity<Subtask>(entity =>
            {
                entity.ToTable("Subtasks");
                entity.HasOne(st => st.Task)
                      .WithMany(t => t.Subtasks)
                      .HasForeignKey(st => st.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Comments Configuration
            modelBuilder.Entity<Comment>(entity =>
            {
                entity.ToTable("Comments");
                entity.HasOne(c => c.Task)
                      .WithMany(t => t.Comments)
                      .HasForeignKey(c => c.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(c => c.User)
                      .WithMany()
                      .HasForeignKey(c => c.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // TimeLogs Configuration
            modelBuilder.Entity<TimeLog>(entity =>
            {
                entity.ToTable("TimeLogs");
                entity.HasOne(tl => tl.Task)
                      .WithMany()
                      .HasForeignKey(tl => tl.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(tl => tl.User)
                      .WithMany()
                      .HasForeignKey(tl => tl.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(tl => tl.Project)
                      .WithMany()
                      .HasForeignKey(tl => tl.ProjectId)
                      .OnDelete(DeleteBehavior.NoAction);
            });

            // Requests Configuration
            modelBuilder.Entity<Request>(entity =>
            {
                entity.ToTable("Requests");
                entity.Property(r => r.Type).HasConversion<string>();
                entity.Property(r => r.Status).HasConversion<string>();

                entity.HasOne(r => r.Requester)
                      .WithMany()
                      .HasForeignKey(r => r.RequesterId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Approvals Configuration
            modelBuilder.Entity<Approval>(entity =>
            {
                entity.ToTable("Approvals");
                entity.Property(a => a.Status).HasConversion<string>();

                entity.HasOne(a => a.Request)
                      .WithMany(r => r.Approvals)
                      .HasForeignKey(a => a.RequestId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(a => a.Approver)
                      .WithMany()
                      .HasForeignKey(a => a.ApproverId)
                      .OnDelete(DeleteBehavior.NoAction); // Fix for BUG-005 cascade loop
            });

            modelBuilder.Entity<Document>(entity =>
            {
                entity.ToTable("Documents");
            });

            modelBuilder.Entity<WorkflowRule>(entity =>
            {
                entity.ToTable("WorkflowRules");
            });

            modelBuilder.Entity<EmailVerificationToken>(entity =>
            {
                entity.ToTable("EmailVerificationTokens");
                entity.HasIndex(t => t.Token).IsUnique();
                entity.HasOne(t => t.User)
                      .WithMany()
                      .HasForeignKey(t => t.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<PasswordResetToken>(entity =>
            {
                entity.ToTable("PasswordResetTokens");
                entity.HasIndex(t => t.Token).IsUnique();
                entity.HasOne(t => t.User)
                      .WithMany()
                      .HasForeignKey(t => t.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.ToTable("AuditLogs");
                entity.HasOne(a => a.User)
                      .WithMany()
                      .HasForeignKey(a => a.UserId)
                      .OnDelete(DeleteBehavior.SetNull); // Audit log stays even if user is deleted
            });

            modelBuilder.Entity<ChatChannel>(entity =>
            {
                entity.ToTable("ChatChannels");
            });

            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.ToTable("ChatMessages");
                entity.HasOne(m => m.Channel)
                      .WithMany()
                      .HasForeignKey(m => m.ChannelId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(m => m.Sender)
                      .WithMany()
                      .HasForeignKey(m => m.SenderId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

                        // RolePermission many-to-many configuration
            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });
                entity.HasOne(rp => rp.Role)
                      .WithMany(role => role.RolePermissions)
                      .HasForeignKey(rp => rp.RoleId);
                entity.HasOne(rp => rp.Permission)
                      .WithMany(permission => permission.RolePermissions)
                      .HasForeignKey(rp => rp.PermissionId);
            });

            // UserRole many-to-many configuration
            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasKey(ur => ur.Id);
                entity.HasOne(ur => ur.User)
                      .WithMany(user => user.UserRoles)
                      .HasForeignKey(ur => ur.UserId);
                entity.HasOne(ur => ur.Role)
                      .WithMany(role => role.UserRoles)
                      .HasForeignKey(ur => ur.RoleId);
            });

            // Notification configuration
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasOne(n => n.User)
                      .WithMany()
                      .HasForeignKey(n => n.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // RequestType configuration (simple table)
            modelBuilder.Entity<RequestType>(entity =>
            {
                entity.ToTable("RequestTypes");
                entity.HasIndex(rt => rt.Name).IsUnique();
            });

            // Request configuration: add relationship to RequestType
            modelBuilder.Entity<Request>(entity =>
            {
                entity.HasOne(r => r.RequestType)
                      .WithMany()
                      .HasForeignKey(r => r.RequestTypeId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.ApplyConfigurationsFromAssembly(typeof(FlowSpaceDbContext).Assembly);
        }
    }
}
