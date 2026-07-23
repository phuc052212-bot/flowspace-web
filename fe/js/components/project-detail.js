/**
 * FlowSpace — Project Detail Component (Offcanvas)
 */
(function (FS, $) {
  'use strict';

  FS.projectDetail = {
    async open(projectId) {
      let project = null;
      let tasks = [];

      // 1. Instant local database lookup (0ms fallback)
      const localProjects = FS.db.get('projects') || [];
      const localProject = localProjects.find(p => p.id === projectId) || (FS.pages.projects && FS.pages.projects._projectsData ? FS.pages.projects._projectsData.find(p => p.id === projectId) : null);

      if (localProject) {
        project = localProject;
        tasks = (FS.db.get('tasks') || []).filter(t => t.projectId === projectId);
        this._render(project, tasks);
      }

      // 2. Fetch fresh data from API in background if available
      try {
        const projResponse = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/projects/' + projectId,
          type: 'GET'
        });

        if (projResponse && projResponse.success && projResponse.data) {
          project = projResponse.data;
          const tasksResponse = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks?projectId=' + projectId,
            type: 'GET'
          });

          if (tasksResponse && tasksResponse.success && Array.isArray(tasksResponse.data)) {
            tasks = tasksResponse.data;
          }
          this._render(project, tasks);
        }
      } catch (err) {
        console.warn('[ProjectDetail] Backend API lookup failed, using local project fallback:', err);
        if (!project && FS.toast) {
          FS.toast('Không tìm thấy dữ liệu chi tiết dự án', 'warning');
        }
      }
    },

    _render(project, tasks = []) {
      const ownerName = project.ownerName || 'Unknown';
      const members = project.members || [];

      const statusMap = { active: 'Đang chạy', on_hold: 'Tạm dừng', done: 'Hoàn thành' };
      const overdue = FS.date.isOverdue(project.endDate) && project.status !== 'done';

      const taskRows = tasks.slice(0, 6).map(t => {
        const isDone = t.status === 'done';
        const initials = t.assigneeName ? t.assigneeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';
        const color = t.assigneeColor || '#6366f1';
        return `
          <div class="d-flex align-items-center gap-2 py-2 hover-row cursor-pointer task-row" data-task-id="${t.id}" style="border-bottom:1px solid var(--fs-border);border-radius:var(--fs-radius)">
            <i class="bi bi-${isDone ? 'check-circle-fill text-success' : 'circle text-muted'}" style="font-size:14px;flex-shrink:0"></i>
            <span style="flex:1;font-size:13px" class="text-truncate">${FS.str.escape(t.title)}</span>
            ${FS.badge.priority(t.priority)}
            <div class="fs-avatar fs-avatar-xs" style="background-color:${color};color:#ffffff;font-size:9px" title="${FS.str.escape(t.assigneeName || 'Unknown')}">${initials}</div>
          </div>
        `;
      }).join('') || '<p class="fs-small text-muted">Chưa có task nào</p>';

      const membersHtml = members.map(m => {
        const userId = typeof m === 'object' ? (m.id || m.userId) : m;
        const u = FS.user.get(userId) || (typeof m === 'object' ? m : null);
        const name = u?.name || 'Thành viên';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const color = u?.color || '#6366f1';
        return `
          <div class="d-flex align-items-center gap-2" title="${FS.str.escape(name)}">
            <div class="fs-avatar fs-avatar-sm" style="background-color:${color};color:#ffffff;">${initials}</div>
            <span style="font-size:12px">${FS.str.escape(name.split(' ').pop())}</span>
          </div>
        `;
      }).join('');

      const doneCount = tasks.filter(t => t.status === 'done').length;
      const tagHtml = (project.tags || []).map(t => `<span class="fs-badge badge-neutral">#${t}</span>`).join('');

      const html = `
        <div class="fs-offcanvas open" id="project-detail-panel">
          <div class="fs-offcanvas-header">
            <div>
              <span class="fs-small" style="color:var(--fs-accent)">${project.code}</span>
              <h5 class="fs-h5 mt-1 mb-0">${FS.str.escape(project.name)}</h5>
            </div>
            <button class="btn btn-ghost btn-icon btn-sm" id="proj-detail-close"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="fs-offcanvas-body">

            <!-- Status + tags -->
            <div class="d-flex flex-wrap gap-2 mb-4">
              ${FS.badge.status(project.status)}
              ${FS.badge.priority(project.priority)}
              ${overdue ? '<span class="fs-badge badge-danger"><i class="bi bi-exclamation-triangle"></i>Quá hạn</span>' : ''}
            </div>

            <!-- Description -->
            <p style="font-size:13px;color:var(--fs-text-secondary);line-height:1.6;margin-bottom:20px">${FS.str.escape(project.description)}</p>

            <!-- Progress -->
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <span class="fs-label">Tiến độ dự án</span>
                <span style="font-size:12px;font-weight:700;color:var(--fs-accent)">${project.progress}%</span>
              </div>
              <div class="fs-progress fs-progress-lg">
                <div class="fs-progress-bar" style="width:${project.progress}%"></div>
              </div>
            </div>

            <!-- Meta -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
              <div>
                <div class="fs-label mb-1">Người phụ trách</div>
                <div class="d-flex align-items-center gap-2">
                  <div class="fs-avatar fs-avatar-sm" style="background-color: var(--fs-accent); color: #ffffff;">
                    ${FS.str.escape(ownerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}
                  </div>
                  <span style="font-size:13px">${FS.str.escape(ownerName)}</span>
                </div>
              </div>
              <div>
                <div class="fs-label mb-1">Khách hàng</div>
                <div style="font-size:13px; font-weight: 500;" class="text-dark">${FS.str.escape(project.client || '—')}</div>
              </div>
              <div>
                <div class="fs-label mb-1">Ngân sách</div>
                <div style="font-size:13px; font-weight: 600;" class="text-success">
                  ${project.budget ? Number(project.budget).toLocaleString('vi-VN') + ' đ' : '—'}
                </div>
              </div>
              <div>
                <div class="fs-label mb-1">Số task</div>
                <div style="font-size:13px">${doneCount}/${tasks.length} hoàn thành</div>
              </div>
              <div>
                <div class="fs-label mb-1">Bắt đầu</div>
                <div style="font-size:13px">${FS.date.format(project.startDate)}</div>
              </div>
              <div>
                <div class="fs-label mb-1">Kết thúc</div>
                <div style="font-size:13px;${overdue?'color:var(--fs-danger);font-weight:600':''}">${FS.date.format(project.endDate)}</div>
              </div>
            </div>

            <!-- Tags -->
            ${tagHtml ? `<div class="mb-4"><div class="fs-label mb-2">Tags</div><div class="d-flex flex-wrap gap-1">${tagHtml}</div></div>` : ''}

            <!-- Members -->
            <div class="mb-4">
              <div class="fs-label mb-2">Thành viên (${members.length})</div>
              <div class="d-flex flex-wrap gap-3">${membersHtml}</div>
            </div>

            <hr class="fs-divider">

            <!-- Tasks -->
            <div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="fs-label">Danh sách task</div>
                <button class="btn btn-ghost btn-xs" onclick="FS.router.go('tasks')">Xem tất cả <i class="bi bi-arrow-right"></i></button>
              </div>
              <div id="proj-task-list">${taskRows}</div>
            </div>
          </div>
          <div class="fs-offcanvas-footer">
            ${FS.auth.hasLevel(2) ? `<button class="btn btn-outline btn-sm" onclick="FS.router.go('tasks')"><i class="bi bi-plus"></i> Thêm task</button>` : ''}
            <button class="btn btn-ghost btn-sm ms-auto" id="proj-detail-close2">Đóng</button>
          </div>
        </div>
        <div class="fs-offcanvas-backdrop show" id="proj-detail-backdrop"></div>
      `;

      $('#project-detail-panel, #proj-detail-backdrop').remove();
      $('body').append(html);

      $('#proj-detail-close, #proj-detail-close2, #proj-detail-backdrop').on('click', function () {
        $('#project-detail-panel').css('right', '-520px');
        setTimeout(() => $('#project-detail-panel, #proj-detail-backdrop').remove(), 300);
      });

      // Open task from project panel
      $(document).on('click', '#proj-task-list .task-row', function () {
        const taskId = $(this).data('task-id');
        FS.taskDetail.open(taskId);
      });
    }
  };

})(window.FS = window.FS || {}, jQuery);
