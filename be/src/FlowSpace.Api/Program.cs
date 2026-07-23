using System;
using System.Text;
using FlowSpace.Api.Middlewares;
using FlowSpace.Application;
using FlowSpace.Infrastructure;
using FlowSpace.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using FlowSpace.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Serilog;

var options = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
};

var builder = WebApplication.CreateBuilder(options);

// Khởi tạo các nguồn cấu hình và cho phép file appsettings là tùy chọn (optional: true)
builder.Configuration
    .SetBasePath(AppContext.BaseDirectory)
    // Containers do not need live config reload. Enabling it creates FileSystemWatcher
    // instances, which exceeds Render's low inotify limit during startup.
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

// Configure Serilog
var loggerConfig = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console();

if (builder.Environment.IsDevelopment())
{
    loggerConfig.WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day);
}

Log.Logger = loggerConfig.CreateLogger();

builder.Host.UseSerilog();

// Add Clean Architecture Layers
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Add Controllers
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<FlowSpace.Application.Interfaces.ICurrentUserService, FlowSpace.Api.Services.CurrentUserService>();

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>();
        if (allowedOrigins != null && allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            // Fallback to localhost dev origin
            policy.WithOrigins("http://localhost:5500")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Add Rate Limiter for Auth routes
builder.Services.AddRateLimiter(rateOptions =>
{
    rateOptions.AddFixedWindowLimiter(policyName: "auth-api", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 2;
    });
    rateOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings.GetValue<string>("Secret");

if (string.IsNullOrWhiteSpace(secretKey) || secretKey.Length < 32)
{
    throw new InvalidOperationException("Security Error: JWT Secret key is missing or too short (must be at least 32 characters). Please configure 'JwtSettings:Secret' in appsettings or environment variable 'JwtSettings__Secret'.");
}

var issuer = jwtSettings.GetValue<string>("Issuer") ?? throw new InvalidOperationException("Security Error: JWT Issuer is not configured in 'JwtSettings:Issuer'.");
var audience = jwtSettings.GetValue<string>("Audience") ?? throw new InvalidOperationException("Security Error: JWT Audience is not configured in 'JwtSettings:Audience'.");

var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(authOptions =>
{
    authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(jwtOptions =>
{
    jwtOptions.RequireHttpsMetadata = false;
    jwtOptions.SaveToken = true;
    jwtOptions.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    jwtOptions.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && (path.StartsWithSegments("/hubs/chat") || path.StartsWithSegments("/hubs/notifications")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Configure Authorization Policies
builder.Services.AddAuthorization(authPolicies =>
{
    authPolicies.AddPolicy("DirectorOnly", policy => policy.RequireRole("Director"));
    authPolicies.AddPolicy("ManagerOrAbove", policy => policy.RequireRole("Director", "Manager"));
    authPolicies.AddPolicy("TeamLeadOrAbove", policy => policy.RequireRole("Director", "Manager", "TeamLead"));
});

// Swagger Setup
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FlowSpace API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Keep the PostgreSQL schema in sync with the EF Core model on managed hosts.
// Without this, a newly deployed model can query columns that do not yet exist
// in Render's persistent database and authentication fails with HTTP 500.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<FlowSpace.Persistence.Contexts.FlowSpaceDbContext>();
    dbContext.Database.Migrate();
}

// Tự động chạy Seed dữ liệu mẫu khi startup (PostgreSQL) - Tạm thời tắt để tránh quá tải RAM Render lúc khởi động
/*
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<FlowSpace.Persistence.Contexts.FlowSpaceDbContext>();
        // Seed dữ liệu mẫu an toàn
        FlowSpace.Persistence.DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Đã xảy ra lỗi trong tiến trình tự động Seed Database PostgreSQL.");
    }
}
*/

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "FlowSpace API v1"));
}

app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseRateLimiter();

app.UseCors();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR Hubs
app.MapHub<FlowSpace.Api.Hubs.ChatHub>("/hubs/chat");
app.MapHub<FlowSpace.Api.Hubs.NotificationHub>("/hubs/notifications");

app.Run();
