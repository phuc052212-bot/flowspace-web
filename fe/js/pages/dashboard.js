(function (FS, $) {
  "use strict";

  const emptyState = (iconWithColor, message) =>
    `<div class="fs-empty py-4"><i class="bi ${iconWithColor}" aria-hidden="true"></i><p>${message}</p></div>`;

  const loadingState = () =>
    `<div class="fs-empty py-4"><div class="fs-spinner mx-auto"></div></div>`;

  FS.pages.dashboard = {
    _charts: [],
    _summaryData: null,
    _state: "loading", // "loading" | "ready" | "error"

    async init() {
      this._destroyCharts();
      this._renderGreeting();

      // 1. Instant 0ms SWR render with local database data (NO SPINNER OR FLASHING!)
      this._summaryData = this._buildLocalSummary();
      this._state = "ready";
      this._renderStatus();
      this._renderStats();
      this._renderMyTasks();
      this._renderProjects();
      this._renderActivityFeed();
      this._renderCharts();
      this._bindEvents();

      // 2. Fetch live data from backend API in background & sync seamlessly
      await this._loadSummary();
      if (this._state === "ready" && this._summaryData) {
        this._renderStatus();
        this._renderStats();
        this._renderMyTasks();
        this._renderProjects();
        this._renderActivityFeed();
        this._renderCharts();
      }
    },

    _buildLocalSummary() {
      const projects = FS.db.get('projects') || [];
      const tasks = FS.db.get('tasks') || [];
      const timeLogs = FS.db.get('time_logs') || [];
      const requests = FS.db.get('requests') || [];
      const logs = FS.db.get('auditlogs') || [];

      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length || projects.length;
      const totalProjects = projects.length;

      const pendingTasks = tasks.filter(t => (t.status || 'todo').toLowerCase() !== 'done').length;
      const completedTasks = tasks.filter(t => (t.status || 'todo').toLowerCase() === 'done').length;

      const overdueTasks = tasks.filter(t => t.dueDate && FS.date.isOverdue(t.dueDate) && (t.status || 'todo').toLowerCase() !== 'done').length;

      const totalLoggedHours = timeLogs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
      const pendingApprovalsCount = requests.filter(r => (r.status || 'pending').toLowerCase() === 'pending').length;

      const taskStatusCounts = {
        todo: tasks.filter(t => (t.status || 'todo').toLowerCase() === 'todo').length,
        inProgress: tasks.filter(t => (t.status || '').toLowerCase() === 'inprogress' || (t.status || '').toLowerCase() === 'in_progress').length,
        review: tasks.filter(t => (t.status || '').toLowerCase() === 'review' || (t.status || '').toLowerCase() === 'testing').length,
        done: tasks.filter(t => (t.status || '').toLowerCase() === 'done').length
      };

      return {
        activeProjects,
        totalProjects,
        pendingTasks,
        completedTasks,
        overdueTasks,
        totalLoggedHours,
        pendingApprovalsCount,
        tasks: tasks.slice(0, 6),
        projects: projects.slice(0, 6),
        recentActivities: logs.length > 0 ? logs.slice(0, 6) : [
          { id: 'l1', action: 'LOGIN', userName: 'Phạm Thanh Dung', detail: 'Đăng nhập hệ thống thành công', timestamp: new Date().toISOString() },
          { id: 'l2', action: 'CREATE', userName: 'Lê Minh Cường', detail: 'Tạo mới dự án FlowSpace Platform v2', timestamp: new Date().toISOString() }
        ],
        taskStatusCounts,
        weeklyHours: [28, 35, 42, 38, 45, 30, 15]
      };
    },

    _renderLoadingState() {
      // Kept for backward compatibility if needed
    },

    async _loadSummary() {
      try {
        const response = await FS.apiCall({
          url: `${FS.API_BASE}/api/v1/dashboard/summary`,
          type: "GET"
        });

        if (response && response.success && response.data) {
          const apiData = response.data;
          const localData = this._summaryData || this._buildLocalSummary();

          // Merge API data with local summary seamlessly
          this._summaryData = {
            ...localData,
            ...apiData,
            tasks: (apiData.tasks && apiData.tasks.length > 0) ? apiData.tasks : localData.tasks,
            projects: (apiData.projects && apiData.projects.length > 0) ? apiData.projects : localData.projects,
            recentActivities: (apiData.recentActivities && apiData.recentActivities.length > 0) ? apiData.recentActivities : localData.recentActivities
          };
          this._state = "ready";
          return;
        }
      } catch (error) {
        console.warn("Dashboard summary API load failed, using local seed fallback:", error);
        if (!this._summaryData) {
          this._summaryData = this._buildLocalSummary();
        }
        this._state = "ready";
      }
    },

    _renderStatus() {
      const status = document.getElementById("dashboard-status");
      if (!status) return;
      status.innerHTML =
        this._state === "error"
          ? '<div class="dashboard-alert" role="alert"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i><span>Không thể kết nối máy chủ để tải dữ liệu Dashboard. Vui lòng kiểm tra lại.</span><button class="btn btn-sm btn-outline-warning ms-auto" type="button" data-dashboard-retry>Thử lại</button></div>'
          : "";
    },

    _destroyCharts() {
      this._charts.forEach((chart) => {
        try {
          chart.destroy();
        } catch (_) {}
      });
      this._charts = [];
    },

    _renderGreeting() {
      const session = FS.auth ? FS.auth.getSession() : null;
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
      const name = session && session.name ? session.name.trim().split(" ").pop() : "bạn";
      const now = new Date();
      const days = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const months = [
        "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
        "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"
      ];
      this._setText("dash-greeting", `${greeting}, ${name}! 👋`);
      this._setText("dash-date", `Hôm nay là ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`);
    },

    _setText(id, value) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    },

    _renderStats() {
      if (this._state === "error" || !this._summaryData) {
        ["stat-projects", "stat-tasks", "stat-overdue", "stat-hours"].forEach((id) =>
          this._setText(id, "—")
        );
        ["stat-projects-sub", "stat-tasks-sub", "stat-overdue-sub", "stat-hours-sub"].forEach((id) => {
          const node = document.getElementById(id);
          if (node) {
            node.className = "fs-stat-change text-muted";
            node.innerHTML = "Lỗi kết nối";
          }
        });
        return;
      }

      const data = this._summaryData;

      // 1. Active Projects
      const activeProj = Number(data.activeProjects) || 0;
      const totalProj = Number(data.totalProjects) || 0;
      this._setText("stat-projects", activeProj);
      const projSub = document.getElementById("stat-projects-sub");
      if (projSub) {
        projSub.className = "fs-stat-change text-secondary";
        projSub.innerHTML = `<i class="bi bi-folder-symlink text-primary me-1"></i><span>${totalProj} tổng số dự án</span>`;
      }

      // 2. Pending Tasks
      const pendingTasks = Number(data.pendingTasks) || 0;
      const completedTasks = Number(data.completedTasks) || 0;
      this._setText("stat-tasks", pendingTasks);
      const tasksSub = document.getElementById("stat-tasks-sub");
      if (tasksSub) {
        tasksSub.className = "fs-stat-change text-secondary";
        tasksSub.innerHTML = `<i class="bi bi-check2-circle text-success me-1"></i><span>${completedTasks} đã hoàn thành</span>`;
      }

      // 3. Overdue Tasks
      const overdue = Number(data.overdueTasks) || 0;
      this._setText("stat-overdue", overdue);
      const overdueSub = document.getElementById("stat-overdue-sub");
      if (overdueSub) {
        if (overdue > 0) {
          overdueSub.className = "fs-stat-change down";
          overdueSub.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger me-1"></i><span class="text-danger fw-semibold">Cần xử lý ngay</span>`;
        } else {
          overdueSub.className = "fs-stat-change up";
          overdueSub.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i><span class="text-success">Không có task quá hạn</span>`;
        }
      }

      // 4. Logged Hours
      const loggedHours = Number(data.totalLoggedHours) || 0;
      const formattedHours = loggedHours.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "h";
      const pendingApprovals = Number(data.pendingApprovalsCount) || 0;
      this._setText("stat-hours", formattedHours);
      const hoursSub = document.getElementById("stat-hours-sub");
      if (hoursSub) {
        if (pendingApprovals > 0) {
          hoursSub.className = "fs-stat-change down";
          hoursSub.innerHTML = `<i class="bi bi-clock-history text-warning me-1"></i><span class="text-warning fw-semibold">${pendingApprovals} chờ duyệt</span>`;
        } else {
          hoursSub.className = "fs-stat-change up";
          hoursSub.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i><span class="text-success">Đã duyệt tất cả</span>`;
        }
      }
    },

    _renderMyTasks() {
      const container = document.getElementById("dash-my-tasks");
      if (!container) return;

      if (this._state === "error") {
        container.innerHTML = emptyState("bi-exclamation-triangle text-warning", "Không thể tải công việc");
        return;
      }

      const tasks = this._summaryData && Array.isArray(this._summaryData.tasks) ? this._summaryData.tasks : [];
      if (!tasks.length) {
        container.innerHTML = emptyState("bi-check2-circle text-muted", "Không có công việc nào đang thực hiện");
        return;
      }

      container.innerHTML = tasks
        .slice(0, 6)
        .map((task) => {
          const overdue = task.dueDate && FS.date.isOverdue(task.dueDate);
          const statusDone = task.status === "done";
          return `
            <button class="dashboard-list-item dashboard-task-item task-open-btn text-start border-0" type="button" data-task-id="${task.id}">
              <i class="bi bi-${statusDone ? "check-circle-fill text-success" : "circle text-muted"}" aria-hidden="true"></i>
              <span class="flex-grow-1 text-truncate">
                <strong class="d-block small text-dark">${FS.str.escape(task.title)}</strong>
                <small class="fs-small text-secondary">${FS.str.escape(task.projectName || "—")}</small>
              </span>
              <span class="d-flex align-items-center gap-2 flex-shrink-0">
                ${FS.badge.priority(task.priority)}
                <small class="${overdue ? "text-danger fw-semibold" : "text-secondary"}">${FS.date.short(task.dueDate)}</small>
              </span>
            </button>
          `;
        })
        .join("");
    },

    _renderProjects() {
      const container = document.getElementById("dash-active-projects");
      if (!container) return;

      if (this._state === "error") {
        container.innerHTML = emptyState("bi-exclamation-triangle text-warning", "Không thể tải danh sách dự án");
        return;
      }

      const projects = this._summaryData && Array.isArray(this._summaryData.projects) ? this._summaryData.projects : [];
      if (!projects.length) {
        container.innerHTML = emptyState("bi-folder2 text-muted", "Không có dự án nào đang chạy");
        return;
      }

      container.innerHTML = projects
        .slice(0, 5)
        .map((project) => {
          const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
          return `
            <button class="dashboard-list-item dashboard-proj-item proj-open-btn text-start border-0" type="button" data-proj-id="${project.id}">
              <span class="d-flex align-items-center gap-2 mb-2">
                <strong class="small text-dark text-truncate flex-grow-1">${FS.str.escape(project.name)}</strong>
                <span class="small fw-bold text-primary">${progress}%</span>
              </span>
              <span class="fs-progress fs-progress-sm d-block mb-2">
                <span class="fs-progress-bar" style="width:${progress}%"></span>
              </span>
              <span class="d-flex justify-content-between align-items-center mt-1">
                <small class="fs-small text-secondary"><i class="bi bi-person me-1"></i>${FS.str.escape(project.ownerName || "—")}</small>
                <small class="fs-small text-secondary"><i class="bi bi-calendar3 me-1"></i>${FS.date.format(project.endDate)}</small>
              </span>
            </button>
          `;
        })
        .join("");
    },

    _renderActivityFeed() {
      const container = document.getElementById("dash-activity-feed");
      if (!container) return;

      if (this._state === "error") {
        container.innerHTML = emptyState("bi-exclamation-triangle text-warning", "Không thể tải nhật ký hoạt động");
        return;
      }

      const logs = this._summaryData && (Array.isArray(this._summaryData.recentActivities) && this._summaryData.recentActivities.length > 0 ? this._summaryData.recentActivities : Array.isArray(this._summaryData.activities) ? this._summaryData.activities : []);
      if (!logs.length) {
        container.innerHTML = emptyState("bi-clock-history text-muted", "Chưa có hoạt động nào gần đây");
        return;
      }

      function formatActivityText(log) {
        let detail = log.detail || log.action || '';
        if (!detail) return 'đã thực hiện thao tác';

        if (detail.includes('User logged in successfully')) {
          return 'Đã đăng nhập hệ thống thành công';
        }
        if (detail.includes('Incorrect password')) {
          return 'Đăng nhập thất bại (sai mật khẩu)';
        }
        if (detail.includes('Created project')) {
          return detail.replace('Created project', 'Đã tạo dự án mới:');
        }
        if (detail.includes('Updated task')) {
          return detail.replace('Updated task', 'Đã cập nhật công việc:');
        }
        if (detail.includes('Logged hours')) {
          return detail.replace('Logged hours', 'Đã ghi nhận giờ làm việc:');
        }
        return detail;
      }

      function getActivityIcon(action, detail) {
        const act = (action || '').toUpperCase();
        const det = (detail || '').toLowerCase();
        if (act.includes('LOGIN') || det.includes('logged in')) return { icon: 'bi-person-check', color: '#10b981', bg: '#ecfdf5' };
        if (det.includes('incorrect') || det.includes('failed') || det.includes('thất bại')) return { icon: 'bi-shield-exclamation', color: '#ef4444', bg: '#fef2f2' };
        if (act.includes('CREATE') || det.includes('tạo')) return { icon: 'bi-plus-circle', color: '#6366f1', bg: '#eef2ff' };
        if (act.includes('UPDATE') || det.includes('cập nhật')) return { icon: 'bi-pencil-square', color: '#f59e0b', bg: '#fffbeb' };
        if (act.includes('DELETE') || det.includes('xóa')) return { icon: 'bi-trash', color: '#ef4444', bg: '#fef2f2' };
        return { icon: 'bi-activity', color: '#3b82f6', bg: '#eff6ff' };
      }

      container.innerHTML = `<div class="dashboard-activity-timeline" style="display:flex;flex-direction:column;gap:10px">
        ${logs.slice(0, 6).map((log) => {
          const name = log.userName || (log.userId ? FS.user.get(log.userId)?.name : '') || "Người dùng";
          const userId = log.userId || '';
          
          const avatarHtml = (FS.user && FS.user.avatar)
            ? FS.user.avatar(userId, 'sm', name)
            : `<div class="fs-avatar fs-avatar-sm av-indigo" style="flex-shrink:0">${FS.str.escape(name.substring(0, 2).toUpperCase())}</div>`;

          const text = formatActivityText(log);
          const iconMeta = getActivityIcon(log.action, log.detail);
          const timeStr = (log.createdAt || log.timestamp) ? FS.date.relative(log.createdAt || log.timestamp) : 'Hôm nay';

          return `
            <div class="dashboard-list-item d-flex align-items-center gap-3 p-2.5" style="padding:10px 14px;background:var(--fs-card-bg);border:1px solid var(--fs-border);border-radius:var(--fs-radius-md);transition:all 0.15s ease">
              ${avatarHtml}
              <div class="flex-grow-1" style="min-width:0">
                <div class="d-flex align-items-center gap-2 flex-wrap" style="line-height:1.4">
                  <strong style="font-weight:600;color:var(--fs-text);font-size:13px">${FS.str.escape(name)}</strong>
                  <span style="color:var(--fs-text-secondary);font-size:13px">${FS.str.escape(text)}</span>
                </div>
                <div class="d-flex align-items-center gap-2 mt-1" style="font-size:11px;color:var(--fs-text-muted)">
                  <span><i class="bi bi-clock me-1"></i>${timeStr}</span>
                  <span>•</span>
                  <span class="fs-badge" style="font-size:10px;padding:2px 8px;background:${iconMeta.bg};color:${iconMeta.color};font-weight:600;border-radius:12px">
                    <i class="bi ${iconMeta.icon} me-1"></i>${FS.str.escape(log.module || "Hệ thống")}
                  </span>
                </div>
              </div>
            </div>`;
        }).join("")}
      </div>`;
    },

    _renderCharts() {
      const $actCanvas = $("#dash-activity-chart");
      const $actEmpty = $("#dash-activity-empty");
      const $statCanvas = $("#dash-status-chart");
      const $statEmpty = $("#dash-status-empty");

      if (this._state === "error" || !this._summaryData || !window.Chart) {
        $actCanvas.addClass("d-none");
        $actEmpty.text(this._state === "error" ? "Không thể tải dữ liệu biểu đồ" : "Chưa có dữ liệu").removeClass("d-none");
        $statCanvas.addClass("d-none");
        $statEmpty.text(this._state === "error" ? "Không thể tải dữ liệu biểu đồ" : "Chưa có dữ liệu").removeClass("d-none");
        return;
      }

      // 1. Weekly Activity Bar Chart
      const weeklyLogs = this._summaryData.weeklyTimeLogs || [];
      const hoursByDay = [0, 0, 0, 0, 0, 0, 0]; // CN, T2, T3, T4, T5, T6, T7
      weeklyLogs.forEach((entry) => {
        const rawDate = entry.loggedDate || entry.date || entry.createdAt;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          hoursByDay[d.getDay()] += Number(entry.hours) || 0;
        }
      });

      const formattedHours = hoursByDay.map((h) => Math.round(h * 10) / 10);
      const todayDayIdx = new Date().getDay();

      if ($actCanvas.length) {
        $actEmpty.addClass("d-none");
        $actCanvas.removeClass("d-none");

        const actCtx = $actCanvas[0].getContext("2d");
        const existingActChart = Chart.getChart(actCtx);
        if (existingActChart) {
          existingActChart.destroy();
        }

        this._charts.push(
          new Chart(actCtx, {
            type: "bar",
            data: {
              labels: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
              datasets: [
                {
                  label: "Giờ làm",
                  data: formattedHours,
                  backgroundColor: formattedHours.map((_, idx) => (idx === todayDayIdx ? "#6366f1" : "#e0e7ff")),
                  hoverBackgroundColor: formattedHours.map((_, idx) => (idx === todayDayIdx ? "#4f46e5" : "#c7d2fe")),
                  borderRadius: 6,
                  borderSkipped: false,
                  barThickness: 28,
                  maxBarThickness: 32
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              layout: {
                padding: {
                  top: 15,
                  bottom: 5,
                  left: 10,
                  right: 10
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => `Giờ làm: ${context.parsed.y}h`
                  }
                }
              },
              scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: {
                  beginAtZero: true,
                  grid: { color: "#f1f5f9" },
                  border: { display: false },
                  ticks: { callback: (value) => `${value}h` }
                }
              }
            }
          })
        );
      }

      // 2. Task Status Doughnut Chart
      const counts = this._summaryData.taskStatuses || {};
      const statusData = [counts.todo || 0, counts.inProgress || 0, counts.review || 0, counts.done || 0];
      const totalStatusTasks = statusData.reduce((a, b) => a + b, 0);

      const legendContainer = document.getElementById("dash-status-legend");

      if ($statCanvas.length) {
        if (totalStatusTasks === 0) {
          $statCanvas.addClass("d-none");
          $statEmpty.text("Chưa có dữ liệu trạng thái công việc").removeClass("d-none");
          if (legendContainer) legendContainer.innerHTML = "";
        } else {
          $statEmpty.addClass("d-none");
          $statCanvas.removeClass("d-none");

          const statCtx = $statCanvas[0].getContext("2d");
          const existingStatChart = Chart.getChart(statCtx);
          if (existingStatChart) {
            existingStatChart.destroy();
          }

          this._charts.push(
            new Chart(statCtx, {
              type: "doughnut",
              data: {
                labels: ["Chưa bắt đầu", "Đang làm", "Chờ duyệt", "Hoàn thành"],
                datasets: [
                  {
                    data: statusData,
                    backgroundColor: ["#cbd5e1", "#6366f1", "#f59e0b", "#10b981"],
                    borderWidth: 2,
                    borderColor: "#ffffff",
                    hoverOffset: 4
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: "70%",
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.label}: ${context.parsed} công việc`
                    }
                  }
                }
              }
            })
          );

          // Render legend dynamically
          if (legendContainer) {
            const legendItems = [
              { label: "Chưa bắt đầu", count: counts.todo || 0, color: "#cbd5e1" },
              { label: "Đang làm", count: counts.inProgress || 0, color: "#6366f1" },
              { label: "Chờ duyệt", count: counts.review || 0, color: "#f59e0b" },
              { label: "Hoàn thành", count: counts.done || 0, color: "#10b981" }
            ];
            legendContainer.innerHTML = legendItems
              .map(item => `
                <div class="dashboard-legend-item">
                  <span class="dashboard-legend-label">
                    <span class="dashboard-legend-color" style="background-color: ${item.color};"></span>
                    <span>${item.label}</span>
                  </span>
                  <span class="dashboard-legend-count">${item.count}</span>
                </div>
              `).join("");
          }
        }
      }
    },

    _bindEvents() {
      $(document)
        .off("click.dashboard")
        .on("click.dashboard", ".task-open-btn", function () {
          const taskId = $(this).data("task-id");
          if (taskId && FS.taskDetail) FS.taskDetail.open(taskId);
        })
        .on("click.dashboard", ".proj-open-btn", function () {
          const projId = $(this).data("proj-id");
          if (projId && FS.projectDetail) FS.projectDetail.open(projId);
        })
        .on("click.dashboard", "[data-dashboard-route]", function () {
          const route = $(this).data("dashboard-route");
          if (route && FS.router) FS.router.go(route);
        })
        .on("click.dashboard", "[data-dashboard-retry]", () => {
          if (FS.router) FS.router.go("dashboard", { force: true, silent: true });
        });

      $("#dash-new-task-btn")
        .off("click.dashboard")
        .on("click.dashboard", () => {
          if (FS.router) FS.router.go("tasks");
        });

      $("#dash-seed-btn")
        .off("click.dashboard")
        .on("click.dashboard", async () => {
          const btn = $("#dash-seed-btn");
          btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span> Đang nạp...');
          try {
            const res = await FS.apiCall({
              url: `${FS.API_BASE}/api/v1/dashboard/seed-data`,
              type: "POST"
            });
            if (res && res.success) {
              if (FS.toast) FS.toast("Đã nạp bộ dữ liệu doanh nghiệp mẫu thành công!", "success");
              if (FS.router) FS.router.go("dashboard", { force: true, silent: true });
            } else {
              if (FS.toast) FS.toast(res?.message || "Không thể nạp dữ liệu mẫu.", "error");
            }
          } catch (e) {
            console.error("Seed data failed:", e);
            if (FS.toast) FS.toast("Lỗi khi nạp dữ liệu mẫu từ máy chủ.", "error");
          } finally {
            btn.prop("disabled", false).html('<i class="bi bi-database-add me-1"></i> Seed dữ liệu');
          }
        });
    }
  };
})(window.FS = window.FS || {}, jQuery);

