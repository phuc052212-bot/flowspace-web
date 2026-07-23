/**
 * FlowSpace — Reports Module
 */
(function (FS) {
  'use strict';

  FS.pages.reports = {
    _charts: [],
    _period: 'month',

    _tasks: [],
    _projects: [],
    _logs: [],

    async init() {
      // 1. Instant 0ms SWR render with local seed data (NO SPINNER!)
      this._tasks = FS.db.get('tasks') || [];
      this._projects = FS.db.get('projects') || [];
      this._logs = FS.db.get('time_logs') || [];
      this._renderKPIs();
      this._renderCharts();

      // Event listeners
      document.getElementById('report-period')?.addEventListener('change', async (e) => {
        this._period = e.target.value;
        this._destroyCharts();
        await this._loadData();
        this._renderKPIs();
        this._renderCharts();
      });

      document.getElementById('report-export-excel')?.addEventListener('click', (e) => { e.preventDefault(); this._exportExcel(); });
      document.getElementById('report-export-csv')?.addEventListener('click', (e) => { e.preventDefault(); this._exportCSV(); });
      document.getElementById('report-export-pdf')?.addEventListener('click', (e) => { e.preventDefault(); this._exportPDF(); });

      // 2. Fetch live data from backend API in background & sync seamlessly
      await this._loadData();
    },

    async _loadData() {
      try {
        try {
          await FS.loadUsersCache();
        } catch (e) {
          console.warn('loadUsersCache failed in reports page:', e);
        }

        const [tasksRes, projsRes, logsRes] = await Promise.all([
          FS.apiCall({ url: FS.API_BASE + '/api/v1/tasks', type: 'GET' }),
          FS.apiCall({ url: FS.API_BASE + '/api/v1/projects', type: 'GET' }),
          FS.apiCall({ url: FS.API_BASE + '/api/v1/timetracking/logs', type: 'GET' })
        ]);

        if (tasksRes && tasksRes.success && Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
          const mergedMap = new Map();
          const seedData = FS.db.get('tasks') || [];
          for (const s of seedData) mergedMap.set(s.id, s);
          for (const a of tasksRes.data) mergedMap.set(a.id, a);
          this._tasks = Array.from(mergedMap.values());
        } else if (!this._tasks.length) {
          this._tasks = FS.db.get('tasks') || [];
        }

        if (projsRes && projsRes.success && Array.isArray(projsRes.data) && projsRes.data.length > 0) {
          this._projects = projsRes.data;
        } else if (!this._projects.length) {
          this._projects = FS.db.get('projects') || [];
        }

        if (logsRes && logsRes.success && Array.isArray(logsRes.data) && logsRes.data.length > 0) {
          this._logs = logsRes.data;
        } else if (!this._logs.length) {
          this._logs = FS.db.get('time_logs') || [];
        }

      } catch (e) {
        console.warn('Reports API request failed:', e);
        if (!this._tasks.length) this._tasks = FS.db.get('tasks') || [];
        if (!this._projects.length) this._projects = FS.db.get('projects') || [];
        if (!this._logs.length) this._logs = FS.db.get('time_logs') || [];
      } finally {
        this._destroyCharts();
        this._renderKPIs();
        this._renderCharts();
      }
    },

    _destroyCharts() {
      this._charts.forEach(c => { try { c.destroy(); } catch(e){} });
      this._charts = [];
    },

    _renderKPIs() {
      const tasks    = this._tasks || [];
      const projects = this._projects || [];
      const logs     = this._logs || [];
      const users    = FS.usersCache || [];

      const totalTasks    = tasks.length;
      const doneTasks     = tasks.filter(t => (t.status || '').toLowerCase() === 'done').length;
      const completion    = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const totalHours    = logs.reduce((s, l) => s + (l.hours || 0), 0);
      const activeProj    = projects.filter(p => (p.status || '').toLowerCase() !== 'done' && (p.status || '').toLowerCase() !== 'closed').length;
      const overdue       = tasks.filter(t => (t.status || '').toLowerCase() !== 'done' && FS.date.isOverdue(t.dueDate)).length;

      const kpis = [
        { icon: 'bi-folder2-open', label: 'Dự án đang chạy', value: activeProj, sub: `${projects.filter(p=>(p.status||'').toLowerCase()==='done'||p.isClosed).length} hoàn thành`, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)' },
        { icon: 'bi-check-circle-fill', label: 'Tỷ lệ hoàn thành', value: completion + '%', sub: `${doneTasks}/${totalTasks} công việc`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
        { icon: 'bi-clock-history', label: 'Tổng giờ làm', value: Math.round(totalHours * 10) / 10 + 'h', sub: `${users.length} nhân sự`, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
        { icon: 'bi-exclamation-triangle-fill', label: 'Cần xử lý quá hạn', value: overdue, sub: overdue > 0 ? 'Cần xử lý ngay' : 'Đúng tiến độ', color: overdue > 0 ? '#ef4444' : '#64748b', bg: overdue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)', border: overdue > 0 ? 'rgba(239, 68, 68, 0.3)' : 'transparent', isOverdue: overdue > 0 }
      ];

      document.getElementById('report-kpis').innerHTML = kpis.map(k => `
        <div class="col-6 col-xl-3">
          <div class="fs-card fs-stat-card h-100" style="padding:16px 18px;border-left:3px solid ${k.color};transition:transform 0.2s ease, box-shadow 0.2s ease">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="fs-stat-label" style="font-weight:600;font-size:12px;color:var(--fs-text-secondary);text-transform:uppercase;letter-spacing:0.4px">${k.label}</span>
              <div class="fs-stat-icon" style="background:${k.bg};color:${k.color};width:34px;height:34px;font-size:16px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="bi ${k.icon}"></i></div>
            </div>
            <div class="fs-stat-value" style="font-size:24px;font-weight:700;margin-bottom:4px;color:${k.isOverdue ? '#ef4444' : 'var(--fs-text)'}">${k.value}</div>
            <div class="fs-stat-change d-flex align-items-center gap-1" style="font-size:11px;color:var(--fs-text-muted)">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${k.color}"></span>
              <span>${k.sub}</span>
            </div>
          </div>
        </div>`).join('');
    },

    _renderCharts() {
      const tasks    = this._tasks || [];
      const projects = this._projects || [];
      const logs     = this._logs || [];
      const users    = FS.usersCache || [];

      const gridColor = 'rgba(148, 163, 184, 0.15)';
      const textColor = '#64748b';

      // 1. Project progress bar chart
      const ctx1 = document.getElementById('report-project-chart');
      if (ctx1) {
        const activeProj  = projects.filter(p => p.status !== 'done');
        const c1 = new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: activeProj.map(p => p.name.length > 18 ? p.name.slice(0,16)+'…' : p.name),
            datasets: [
              { label: 'Tiến độ (%)', data: activeProj.map(p => p.progress), backgroundColor: '#6366f1', borderRadius: 6, borderSkipped: false, barPercentage: 0.5 },
              { label: 'Mục tiêu (100%)', data: activeProj.map(() => 100), backgroundColor: 'rgba(99, 102, 241, 0.12)', borderRadius: 6, borderSkipped: false, barPercentage: 0.5 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 } } },
            scales: {
              x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
              y: { grid: { color: gridColor }, border: { display: false }, max: 100, ticks: { color: textColor, font: { size: 11 }, callback: v => v + '%' } }
            }
          }
        });
        this._charts.push(c1);
      }

      // 2. Task status donut (Dashboard Parity 100%)
      const ctx2 = document.getElementById('report-status-chart');
      if (ctx2) {
        const totalTasks = tasks.length;
        const totalEl = document.getElementById('report-status-total');
        if (totalEl) totalEl.textContent = totalTasks;

        const counts = {
          todo: tasks.filter(t => (t.status || '').toLowerCase() === 'todo').length,
          inProgress: tasks.filter(t => (t.status || '').toLowerCase() === 'in_progress').length,
          review: tasks.filter(t => (t.status || '').toLowerCase() === 'review').length,
          done: tasks.filter(t => (t.status || '').toLowerCase() === 'done').length
        };

        const statusData = [counts.todo, counts.inProgress, counts.review, counts.done];
        const colors = ["#cbd5e1", "#6366f1", "#f59e0b", "#10b981"];
        const labels = ["Chưa bắt đầu", "Đang làm", "Chờ duyệt", "Hoàn thành"];

        // Render Dashboard Parity Status Legend Items
        const detailsEl = document.getElementById('report-status-details');
        if (detailsEl) {
          detailsEl.innerHTML = labels.map((label, idx) => {
            const count = statusData[idx];
            const pct = totalTasks ? Math.round((count / totalTasks) * 100) : 0;
            return `
              <div class="dashboard-legend-item">
                <div class="dashboard-legend-label">
                  <span class="dashboard-legend-color" style="background:${colors[idx]}"></span>
                  <span>${label}</span>
                </div>
                <div class="d-flex align-items-center gap-1">
                  <span style="font-weight:700;color:var(--fs-text)">${count}</span>
                  <span style="font-size:11px;color:var(--fs-text-muted)">(${pct}%)</span>
                </div>
              </div>`;
          }).join('');
        }

        const c2 = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: statusData,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => ` ${context.label}: ${context.parsed} công việc`
                }
              }
            }
          }
        });
        this._charts.push(c2);
      }

      // 3. Hours per user bar chart
      const ctx3 = document.getElementById('report-user-chart');
      if (ctx3) {
        const userHours = users.map(u => ({
          name: u.name.split(' ').pop(),
          hours: logs.filter(l => l.userId === u.id).reduce((s,l) => s + (l.hours||0), 0)
        })).sort((a, b) => b.hours - a.hours).slice(0, 7);

        const c3 = new Chart(ctx3, {
          type: 'bar',
          data: {
            labels: userHours.map(u => u.name),
            datasets: [{ label: 'Giờ làm (giờ)', data: userHours.map(u => u.hours), backgroundColor: '#8b5cf6', borderRadius: 6, borderSkipped: false, barThickness: 16 }]
          },
          options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} giờ` } } },
            scales: {
              x: { grid: { color: gridColor }, border: { display: false }, ticks: { color: textColor, font: { size: 11 }, callback: v => v + 'h' } },
              y: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 11 } } }
            }
          }
        });
        this._charts.push(c3);
      }

      // 4. Trend line: tasks done per week (last 4 weeks)
      const ctx4 = document.getElementById('report-trend-chart');
      if (ctx4) {
        const weeks = ['3 tuần trước', '2 tuần trước', 'Tuần trước', 'Tuần này'];
        const now   = new Date();
        const weekData = weeks.map((w, i) => {
          const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - now.getDay() - (3 - i) * 7);
          const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
          return tasks.filter(t => (t.status || '').toLowerCase() === 'done' && t.completedAt && new Date(t.completedAt) >= weekStart && new Date(t.completedAt) < weekEnd).length;
        });

        // Compute trend growth badge
        const prevWeek = weekData[2] || 1;
        const currentWeek = weekData[3] || 0;
        const diff = currentWeek - prevWeek;
        const trendPct = Math.round((diff / prevWeek) * 100);
        const trendBadgeEl = document.getElementById('report-trend-badge');
        if (trendBadgeEl) {
          if (diff >= 0) {
            trendBadgeEl.className = 'fs-badge badge-success';
            trendBadgeEl.innerHTML = `<i class="bi bi-arrow-up-right me-1"></i>+${diff > 0 ? trendPct : 0}% tuần này`;
          } else {
            trendBadgeEl.className = 'fs-badge badge-warning';
            trendBadgeEl.innerHTML = `<i class="bi bi-arrow-down-right me-1"></i>${trendPct}% tuần này`;
          }
        }

        // Canvas Gradient
        const chartCtx = ctx4.getContext('2d');
        const gradient = chartCtx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

        const c4 = new Chart(ctx4, {
          type: 'line',
          data: {
            labels: weeks,
            datasets: [{
              label: 'Công việc hoàn thành',
              data: weekData,
              borderColor: '#10b981',
              borderWidth: 2.5,
              backgroundColor: gradient,
              fill: true,
              tension: 0.45,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointHoverRadius: 7,
              pointRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: c => ` ${c.raw} công việc hoàn thành`
                }
              }
            },
            scales: {
              x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 11, weight: '500' } } },
              y: { grid: { color: gridColor }, border: { display: false }, ticks: { color: textColor, font: { size: 11 }, stepSize: 1 } }
            }
          }
        });
        this._charts.push(c4);
      }
    },

    _getReportData() {
      const tasks    = FS.db.get('tasks');
      const projects = FS.db.get('projects');
      const logs     = FS.db.get('time_logs');
      const users    = FS.db.get('users');
      
      const totalTasks = tasks.length;
      const doneTasks  = tasks.filter(t => t.status === 'done').length;
      const completion = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0);
      const activeProj = projects.filter(p => p.status === 'active').length;
      
      const kpis = [
        { Muc: "Dự án đang chạy", Gia_Tri: activeProj },
        { Muc: "Tỷ lệ hoàn thành Task", Gia_Tri: completion + "%" },
        { Muc: "Tổng giờ làm", Gia_Tri: totalHours + "h" },
      ];
      
      const taskList = tasks.map(t => {
        const p = projects.find(x => x.id === t.projectId);
        const u = users.find(x => x.id === t.assigneeId);
        const statusMap = { 'todo': 'Chưa bắt đầu', 'in_progress': 'Đang làm', 'review': 'Chờ duyệt', 'done': 'Hoàn thành' };
        return {
          "Mã": t.code,
          "Tên Công Việc": t.title,
          "Dự Án": p ? p.name : '',
          "Người Phụ Trách": u ? u.name : '',
          "Trạng Thái": statusMap[t.status] || t.status,
          "Ước Tính (h)": t.estimatedHours || 0,
          "Đã Làm (h)": t.loggedHours || 0
        };
      });
      
      const userPerf = users.map(u => {
        const uTasks = tasks.filter(t => t.assigneeId === u.id);
        const uLogs = logs.filter(l => l.userId === u.id);
        return {
          "Nhân Viên": u.name,
          "Email": u.email,
          "Giờ Làm": uLogs.reduce((s,l) => s + (l.hours||0), 0),
          "Công Việc Đã Hoàn Thành": uTasks.filter(t => t.status === 'done').length,
          "Tổng Công Việc": uTasks.length
        };
      });
      
      return { kpis, taskList, userPerf };
    },

    _exportExcel() {
      if (typeof XLSX === 'undefined') { FS.toast('Thư viện Excel chưa được tải', 'error'); return; }
      const data = this._getReportData();
      const wb = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.kpis), "Tom Tat KPI");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.taskList), "Danh Sach Cong Viec");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.userPerf), "Hieu Suat Nhan Vien");
      
      XLSX.writeFile(wb, "FlowSpace_BaoCao.xlsx");
      FS.toast('Đã xuất báo cáo Excel', 'success');
    },

    _exportCSV() {
      const data = this._getReportData();
      const items = data.taskList;
      if (!items.length) { FS.toast('Không có dữ liệu', 'warning'); return; }
      
      const header = Object.keys(items[0]).join(',');
      const rows = items.map(item => Object.values(item).map(v => `"${(v+'').replace(/"/g, '""')}"`).join(','));
      const csvContent = "\uFEFF" + header + "\n" + rows.join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FlowSpace_Tasks.csv';
      a.click();
      URL.revokeObjectURL(url);
      FS.toast('Đã xuất báo cáo CSV', 'success');
    },

    _exportPDF() {
      if (!window.jspdf) { FS.toast('Thư viện PDF chưa được tải', 'error'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const removeAccents = (str) => {
        if (!str) return '';
        return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
      };
      
      const data = this._getReportData();
      
      doc.setFontSize(16);
      doc.text("BAO CAO TIEN DO DU AN", 14, 20);
      
      doc.setFontSize(12);
      doc.text("1. TONG QUAN KPI", 14, 30);
      doc.autoTable({
        startY: 35,
        head: [['Chi tieu', 'Gia tri']],
        body: data.kpis.map(k => [removeAccents(k.Muc), k.Gia_Tri]),
        theme: 'grid'
      });
      
      let finalY = doc.lastAutoTable.finalY || 40;
      doc.text("2. DANH SACH CONG VIEC", 14, finalY + 10);
      doc.autoTable({
        startY: finalY + 15,
        head: [Object.keys(data.taskList[0]).map(removeAccents)],
        body: data.taskList.map(item => Object.values(item).map(removeAccents)),
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      
      doc.save("FlowSpace_BaoCao.pdf");
      FS.toast('Đã xuất báo cáo PDF', 'success');
    }
  };

})(window.FS = window.FS || {});