/**
 * FlowSpace — Kanban Board Module
 * Module 3: SortableJS drag-and-drop connected to RESTful API (/api/v1/tasks/{id}/status)
 */
(function (FS, $) {
  'use strict';

  const COLUMNS = [
    { id: 'todo',        label: 'Chưa bắt đầu', color: '#64748b', bg: '#f1f5f9' },
    { id: 'in_progress', label: 'Đang làm',     color: '#6366f1', bg: '#eef2ff' },
    { id: 'review',      label: 'Chờ duyệt',    color: '#f59e0b', bg: '#fefce8' },
    { id: 'done',        label: 'Hoàn thành',   color: '#10b981', bg: '#f0fdf4' }
  ];

  FS.pages.kanban = {
    _sortables: [],
    _filter: { project: '', employee: '', department: '' },
    _tasksData: [],

    async init() {
      await this._loadData();
      this._populateFilters();
      this._renderBoard();
      this._bindEvents();
    },

    async _loadData() {
      try {
        await FS.loadUsersCache();

        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/tasks',
          type: 'GET'
        });

        if (response && response.success && Array.isArray(response.data)) {
          this._tasksData = response.data.map(t => ({
            id: t.id,
            code: t.code,
            title: t.title,
            description: t.description || '',
            projectId: t.projectId,
            projectName: t.projectName || '',
            assigneeId: t.assigneeId,
            assigneeName: t.assigneeName || '',
            assigneeAvatar: t.assigneeAvatar || '',
            assigneeColor: t.assigneeColor || '',
            status: (t.status || 'todo').toLowerCase(),
            priority: (t.priority || 'medium').toLowerCase(),
            startDate: t.startDate,
            dueDate: t.dueDate,
            completedAt: t.completedAt,
            subtasks: t.subtasks || [],
            comments: t.comments || [],
            createdAt: t.createdAt
          }));
          $('#kanban-offline-banner').remove();
        } else {
          try {
            this._tasksData = FS.db.get('tasks') || [];
          } catch (dbErr) {
            console.error('Failed to read tasks from local storage:', dbErr);
            this._tasksData = [];
          }
        }
      } catch (err) {
        console.warn('Kanban Tasks API request failed:', err);
        try {
          this._tasksData = FS.db.get('tasks') || [];
        } catch (dbErr) {
          console.error('Failed to read tasks from local storage:', dbErr);
          this._tasksData = [];
        }
        if (!$('#kanban-offline-banner').length) {
          $('#page-content').prepend('<div id="kanban-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu tạm thời ngoại tuyến.</span></div>');
        }
      }
    },

    _populateFilters() {
      let projects = [];
      try {
        projects = FS.db.get('projects') || [];
      } catch (dbErr) {
        console.error('Failed to read projects from local storage in Kanban filters:', dbErr);
      }
      $('#kanban-filter-project').html('<option value="">Tất cả dự án</option>' +
        projects.map(p => `<option value="${p.id}">${FS.str.escape(p.name)}</option>`).join('')
      );

      const users = FS.usersCache || [];
      $('#kanban-filter-employee').html('<option value="">Tất cả nhân viên</option>' +
        users.map(u => `<option value="${u.id}">${FS.str.escape(u.name)}</option>`).join('')
      );

      const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
      $('#kanban-filter-department').html('<option value="">Tất cả phòng ban</option>' +
        departments.map(d => `<option value="${d}">${FS.str.escape(d)}</option>`).join('')
      );
    },

    _getFilteredData() {
      let tasks = [...this._tasksData];
      const { project, employee, department } = this._filter;

      if (project) {
        tasks = tasks.filter(t => t.projectId === project);
      }

      if (employee) {
        tasks = tasks.filter(t => t.assigneeId === employee);
      }

      if (department) {
        tasks = tasks.filter(t => {
          const user = FS.user.get(t.assigneeId);
          return user && user.department === department;
        });
      }

      return tasks;
    },

    _renderBoard() {
      // Destroy old sortables
      this._sortables.forEach(s => { try { s.destroy(); } catch (e) { } });
      this._sortables = [];

      const tasks = this._getFilteredData();
      const $board = $('#kanban-board');

      $board.html(COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status.toLowerCase() === col.id.toLowerCase());
        const cards = colTasks.map(t => this._cardHtml(t)).join('');

        return `
          <div class="kanban-col">
            <div class="kanban-col-header" style="background:${col.bg};border:1.5px solid ${col.color}20;color:${col.color}">
              <div class="d-flex align-items-center gap-2">
                <span class="kanban-col-count" style="background:${col.color}20;color:${col.color}">${colTasks.length}</span>
                ${col.label}
              </div>
            </div>
            <div class="kanban-col-body" id="kanban-col-${col.id}" data-status="${col.id}">
              ${cards}
              <button class="kanban-add-btn" data-status="${col.id}">
                <i class="bi bi-plus"></i> Thêm task
              </button>
            </div>
          </div>`;
      }).join(''));

      // Init SortableJS on each column
      const self = this;
      COLUMNS.forEach(col => {
        const el = document.getElementById('kanban-col-' + col.id);
        if (!el) return;

        const sortable = Sortable.create(el, {
          group: 'kanban',
          animation: 200,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
          draggable: '.kanban-card',
          handle: '.kanban-card',
          onEnd(evt) {
            const taskId = evt.item.dataset.taskId;
            const newStatus = evt.to.dataset.status;
            const task = self._tasksData.find(t => t.id === taskId);

            if (task && task.status.toLowerCase() !== newStatus.toLowerCase()) {
              task.status = newStatus;

              // Send API update
              FS.apiCall({
                url: FS.API_BASE + '/api/v1/tasks/' + taskId + '/status',
                type: 'PATCH',
                data: { status: newStatus }
              }).then(function (res) {
                if (res && res.success) {
                  self._updateColCount(evt.from.dataset.status);
                  self._updateColCount(newStatus);
                  FS.toast(`Đã chuyển sang "${COLUMNS.find(c => c.id === newStatus)?.label}"`, 'success');
                } else {
                  FS.toast('Lỗi cập nhật trạng thái từ máy chủ.', 'error');
                  self._loadData().then(() => self._renderBoard());
                }
              }).catch(function (err) {
                console.error('Drag update failed:', err);
                FS.toast('Không thể cập nhật trạng thái lên máy chủ. Vui lòng tải lại trang và thử lại!', 'error');
                self._loadData().then(() => self._renderBoard());
              });
            }
          }
        });
        this._sortables.push(sortable);
      });
    },

    _cardHtml(task) {
      const project = FS.db.find('projects', task.projectId);
      const projName = task.projectName || (project ? project.name : '');
      const overdue = FS.date.isOverdue(task.dueDate) && task.status !== 'done';
      const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
      const subtasksTotal = (task.subtasks || []).length;

      let assigneeAvatar = task.assigneeAvatar;
      let assigneeColor = task.assigneeColor;
      let assigneeName = task.assigneeName;

      if (!assigneeAvatar && task.assigneeId) {
        const u = FS.user.get(task.assigneeId);
        if (u) {
          assigneeAvatar = u.avatar;
          assigneeColor = u.color;
          assigneeName = u.name;
        }
      }

      const avatarHtml = assigneeAvatar
        ? `<div class="fs-avatar fs-avatar-sm ${assigneeColor || 'av-indigo'}" title="${FS.str.escape(assigneeName)}">${assigneeAvatar}</div>`
        : FS.user.avatar(task.assigneeId, 'fs-avatar-sm');

      return `
        <div class="kanban-card" data-task-id="${task.id}">
          <div class="kanban-card-title">${FS.str.escape(task.title)}</div>
          ${projName ? `<div class="fs-small mb-2" style="color:var(--fs-accent)">${FS.str.escape(projName)}</div>` : ''}
          <div class="kanban-card-meta">
            <div class="d-flex align-items-center gap-1 flex-wrap">
              ${FS.badge.priority(task.priority)}
              ${subtasksTotal > 0 ? `<span class="fs-badge badge-neutral"><i class="bi bi-check2-square"></i>${subtasksDone}/${subtasksTotal}</span>` : ''}
            </div>
            <div class="d-flex align-items-center gap-2">
              ${overdue ? `<i class="bi bi-clock-history" style="color:var(--fs-danger);font-size:12px" title="Quá hạn"></i>` : ''}
              <span style="font-size:11px;color:${overdue ? 'var(--fs-danger)' : 'var(--fs-text-muted)'};font-weight:${overdue ? '600' : '400'}">${FS.date.short(task.dueDate)}</span>
              ${avatarHtml}
            </div>
          </div>
        </div>`;
    },

    _updateColCount(status) {
      const tasks = this._getFilteredData().filter(t => t.status.toLowerCase() === status.toLowerCase());
      const $header = $(`#kanban-col-${status}`).siblings('.kanban-col-header').find('.kanban-col-count');
      $header.text(tasks.length);
    },

    _bindEvents() {
      const self = this;

      // Filters
      $('#kanban-filter-project').off('change').on('change', function () {
        self._filter.project = this.value; self._renderBoard();
      });
      $('#kanban-filter-employee').off('change').on('change', function () {
        self._filter.employee = this.value; self._renderBoard();
      });
      $('#kanban-filter-department').off('change').on('change', function () {
        self._filter.department = this.value; self._renderBoard();
      });

      // Card click → open detail
      $(document).off('click.kanban-card').on('click.kanban-card', '.kanban-card', function () {
        FS.taskDetail.open($(this).data('task-id'));
      });

      // Add task button
      $(document).off('click.kanban-add').on('click.kanban-add', '.kanban-add-btn', function () {
        FS.router.go('tasks');
        setTimeout(() => $('#task-new-btn').click(), 500);
      });

      // Header new btn
      $('#kanban-new-btn').off('click').on('click', function () {
        FS.router.go('tasks');
        setTimeout(() => $('#task-new-btn').click(), 500);
      });
    }
  };

})(window.FS = window.FS || {}, jQuery);