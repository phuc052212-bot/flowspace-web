/**
 * FlowSpace — Kanban Board Module
 * Module 3: SortableJS drag-and-drop connected to RESTful API (/api/v1/tasks/{id}/status)
 */
(function (FS, $) {
  'use strict';

  const COLUMNS = [
    { id: 'todo', label: 'Todo', color: '#64748b', bg: '#f1f5f9' },
    { id: 'inprogress', label: 'In Progress', color: '#6366f1', bg: '#eef2ff' },
    { id: 'review', label: 'Review', color: '#8b5cf6', bg: '#faf5ff' },
    { id: 'testing', label: 'Testing', color: '#ec4899', bg: '#fdf2f8' },
    { id: 'done', label: 'Done', color: '#10b981', bg: '#f0fdf4' }
  ];

  function normalizeStatus(s) {
    let st = (s || 'todo').toLowerCase();
    if (st === 'in_progress' || st === 'inprogress' || st === 'doing') return 'inprogress';
    if (st === 'in_review' || st === 'review' || st === 'on_hold' || st === 'onhold') return 'review';
    if (st === 'testing' || st === 'test' || st === 'qa') return 'testing';
    if (st === 'done' || st === 'completed' || st === 'finished') return 'done';
    return 'todo';
  }

  FS.pages.kanban = {
    _sortables: [],
    _filter: { project: '', employee: '', department: '' },
    _tasksData: [],
    _projectsData: [],

    async init() {
      // 1. Instant 0ms SWR render with local seed data (NO SPINNER!)
      this._tasksData = (FS.db.get('tasks') || []).map(t => ({
        ...t,
        status: normalizeStatus(t.status)
      }));
      this._projectsData = FS.db.get('projects') || [];
      this._populateFilters();
      this._renderBoard();
      this._bindEvents();

      // 2. Fetch live data from backend API in background & sync seamlessly
      await this._loadData();
    },

    async _loadData() {
      try {
        try {
          await FS.loadUsersCache();
        } catch (e) {
          console.warn('loadUsersCache failed in kanban page:', e);
        }

        const [tasksRes, projsRes] = await Promise.all([
          FS.apiCall({ url: FS.API_BASE + '/api/v1/tasks', type: 'GET' }),
          FS.apiCall({ url: FS.API_BASE + '/api/v1/projects', type: 'GET' })
        ]);

        if (tasksRes && tasksRes.success && Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
          const apiTasks = tasksRes.data.map(t => ({
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
            status: normalizeStatus(t.status),
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
          this._tasksData = FS.db.get('tasks') || [];
        }

        if (projsRes && projsRes.success && Array.isArray(projsRes.data) && projsRes.data.length > 0) {
          this._projectsData = projsRes.data;
        } else if (!this._projectsData.length) {
          this._projectsData = FS.db.get('projects') || [];
        }

      } catch (err) {
        console.warn('Kanban Tasks API request failed:', err);
        this._tasksData = FS.db.get('tasks') || [];
        if (!$('#kanban-offline-banner').length) {
          $('#page-content').prepend('<div id="kanban-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu tạm thời ngoại tuyến.</span></div>');
        }
      }
    },

    _populateFilters() {
      const projects = FS.db.get('projects') || [];
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

      const avatarHtml = (FS.user && FS.user.avatar)
        ? FS.user.avatar(task.assigneeId, 'sm', assigneeName || 'Thành viên')
        : `<div class="fs-avatar fs-avatar-sm ${assigneeColor || 'av-indigo'}" title="${FS.str.escape(assigneeName || 'Thành viên')}">${assigneeAvatar || 'TV'}</div>`;

      return `
        <div class="kanban-card" data-task-id="${task.id}">
          <div class="d-flex align-items-center justify-content-between mb-1">
            <span class="fs-small" style="color:var(--fs-accent);font-weight:600">${task.code || ''}</span>
            ${projName ? `<span class="fs-small text-muted truncate" style="max-width:140px">${FS.str.escape(projName)}</span>` : ''}
          </div>
          <div class="kanban-card-title">${FS.str.escape(task.title)}</div>
          <div class="kanban-card-meta">
            <div class="d-flex align-items-center gap-1 flex-wrap">
              ${FS.badge.priority(task.priority)}
              ${subtasksTotal > 0 ? `<span class="fs-badge badge-neutral"><i class="bi bi-check2-square me-1"></i>${subtasksDone}/${subtasksTotal}</span>` : ''}
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