/**
 * FlowSpace — Tasks Page Module
 * Module 3: Connected to Backend .NET 8 Web API (/api/v1/tasks)
 */
(function (FS, $) {
  'use strict';

  const PAGE_SIZE = 10;

  FS.pages.tasks = {
    _filter: { search: '', status: '', priority: '', project: '', assignee: '' },
    _page: 1,
    _tasksData: [],

    async init() {
      await this._loadData();
      this._populateFilters();
      this._bindEvents();
    },

    async _loadData() {
      try {
        // Load users cache trước để hiển thị tên/avatar chính xác
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
            estimatedHours: t.estimatedHours || 0,
            loggedHours: t.loggedHours || 0,
            subtasks: t.subtasks || [],
            comments: t.comments || [],
            createdAt: t.createdAt
          }));
          $('#tasks-offline-banner').remove();
        } else {
          try {
            this._tasksData = FS.db.get('tasks') || [];
          } catch (dbErr) {
            console.error('Failed to read tasks from local storage:', dbErr);
            this._tasksData = [];
          }
        }
      } catch (err) {
        console.warn('Tasks API request failed:', err);
        try {
          this._tasksData = FS.db.get('tasks') || [];
        } catch (dbErr) {
          console.error('Failed to read tasks from local storage:', dbErr);
          this._tasksData = [];
        }
        if (!$('#tasks-offline-banner').length) {
          $('#page-content').prepend('<div id="tasks-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu tạm thời ngoại tuyến.</span></div>');
        }
      }
      this._render();
    },

    _populateFilters() {
      // Projects dropdown
      const projects = FS.db.get('projects') || [];
      const $projSel = $('#task-filter-project, #task-modal-project');
      const projOpts = projects.map(p => `<option value="${p.id}">${FS.str.escape(p.name)}</option>`).join('');
      $('#task-filter-project').html('<option value="">Tất cả dự án</option>').append(projOpts);
      $('#task-modal-project').html('<option value="">-- Chọn dự án --</option>' + projOpts);

      // Users dropdown
      const users = FS.usersCache || [];
      const userOpts = users.map(u => `<option value="${u.id}">${FS.str.escape(u.name)}</option>`).join('');
      $('#task-filter-assignee').html('<option value="">Tất cả người thực hiện</option>').append(userOpts);
      $('#task-modal-assignee').html('<option value="">-- Chọn người thực hiện --</option>' + userOpts);
    },

    _getFilteredData() {
      let tasks = [...this._tasksData];
      const { search, status, priority, project, assignee } = this._filter;

      if (search) {
        const q = search.toLowerCase();
        tasks = tasks.filter(t => (t.title + t.code + (t.description || '')).toLowerCase().includes(q));
      }
      if (status) tasks = tasks.filter(t => t.status.toLowerCase() === status.toLowerCase());
      if (priority) tasks = tasks.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
      if (project) tasks = tasks.filter(t => t.projectId === project);
      if (assignee) tasks = tasks.filter(t => t.assigneeId === assignee);

      return tasks;
    },

    _render() {
      const all = this._getFilteredData();
      const total = all.length;
      const start = (this._page - 1) * PAGE_SIZE;
      const tasks = all.slice(start, start + PAGE_SIZE);

      $('#tasks-count-label').text(`${total} công việc`);

      if (!tasks.length) {
        $('#tasks-table-body').html('<tr><td colspan="8"><div class="fs-empty"><i class="bi bi-check-square"></i><h5>Không tìm thấy công việc</h5><p>Thử thay đổi bộ lọc hoặc tạo công việc mới</p></div></td></tr>');
        $('#tasks-pagination-info').text('');
        $('#tasks-pagination-btns').html('');
        return;
      }

      $('#tasks-table-body').html(tasks.map(t => {
        const overdue = FS.date.isOverdue(t.dueDate) && t.status !== 'done';
        const isDone = t.status === 'done';

        let assigneeName = t.assigneeName;
        let assigneeAvatar = t.assigneeAvatar;
        let assigneeColor = t.assigneeColor;

        if (!assigneeName && t.assigneeId) {
          const u = FS.user.get(t.assigneeId);
          if (u) {
            assigneeName = u.name;
            assigneeAvatar = u.avatar;
            assigneeColor = u.color;
          }
        }

        const avatarHtml = assigneeAvatar
          ? `<div class="fs-avatar fs-avatar-sm ${assigneeColor || 'av-indigo'}" title="${FS.str.escape(assigneeName)}">${assigneeAvatar}</div>`
          : FS.user.avatar(t.assigneeId, 'fs-avatar-sm');

        const lastName = assigneeName ? assigneeName.split(' ').pop() : '—';

        return `
          <tr class="hover-row task-row" data-task-id="${t.id}">
            <td>
              <button class="btn btn-ghost btn-icon btn-sm task-done-toggle" data-task-id="${t.id}" title="${isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}" style="color:${isDone ? 'var(--fs-success)' : 'var(--fs-border)'}">
                <i class="bi bi-${isDone ? 'check-circle-fill' : 'circle'}" style="font-size:16px"></i>
              </button>
            </td>
            <td>
              <div style="font-size:13px;font-weight:500;${isDone ? 'text-decoration:line-through;color:var(--fs-text-muted)' : ''}">${FS.str.escape(t.title)}</div>
              <div class="fs-small">${t.code}</div>
            </td>
            <td style="font-size:12px;color:var(--fs-text-secondary)">${FS.str.escape(t.projectName || '—')}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                ${avatarHtml}
                <span style="font-size:12px">${FS.str.escape(lastName)}</span>
              </div>
            </td>
            <td>${FS.badge.priority(t.priority)}</td>
            <td>${FS.badge.status(t.status)}</td>
            <td style="font-size:12px;${overdue ? 'color:var(--fs-danger);font-weight:600' : 'color:var(--fs-text-muted)'}">
              ${overdue ? '<i class="bi bi-exclamation-triangle-fill me-1"></i>' : ''}${FS.date.format(t.dueDate)}
            </td>
            <td>
              <button class="btn btn-ghost btn-icon btn-sm task-edit-btn" data-task-id="${t.id}" title="Chỉnh sửa" onclick="event.stopPropagation()">
                <i class="bi bi-pencil"></i>
              </button>
            </td>
          </tr>`;
      }).join(''));

      // Pagination
      const totalPages = Math.ceil(total / PAGE_SIZE);
      $('#tasks-pagination-info').text(`Hiển thị ${start + 1}–${Math.min(start + PAGE_SIZE, total)} / ${total}`);

      if (totalPages <= 1) {
        $('#tasks-pagination-btns').html('');
        return;
      }
      const self = this;
      let paginHtml = '';
      for (let i = 1; i <= totalPages; i++) {
        paginHtml += `<button class="btn btn-sm ${i === self._page ? 'btn-primary' : 'btn-ghost'} page-btn" data-page="${i}">${i}</button>`;
      }
      $('#tasks-pagination-btns').html(paginHtml);
    },

    _openModal(taskId = null) {
      this._populateFilters();

      if (taskId) {
        const t = this._tasksData.find(x => x.id === taskId);
        if (!t) return;
        $('#task-modal-title').text('Chỉnh sửa công việc');
        $('#task-modal-id').val(t.id);
        $('#task-modal-name').val(t.title);
        $('#task-modal-desc').val(t.description || '');
        $('#task-modal-project').val(t.projectId);
        $('#task-modal-assignee').val(t.assigneeId || '');
        $('#task-modal-priority').val(t.priority.toLowerCase());
        $('#task-modal-status').val(t.status.toLowerCase());
        $('#task-modal-start').val(FS.date.toInput(t.startDate));
        $('#task-modal-due').val(FS.date.toInput(t.dueDate));
        $('#task-modal-est').val(t.estimatedHours || '');
      } else {
        $('#task-modal-title').text('Tạo công việc mới');
        $('#task-modal-id').val('');
        $('#task-modal-name, #task-modal-desc').val('');
        $('#task-modal-priority').val('medium');
        $('#task-modal-status').val('todo');
        $('#task-modal-start').val(FS.date.toInput(new Date().toISOString()));
        $('#task-modal-due, #task-modal-est').val('');
        const session = FS.auth.getSession();
        if (session) $('#task-modal-assignee').val(session.userId);
      }
      $('#task-modal-overlay').show();
    },

    async _saveModal() {
      const title = $('#task-modal-name').val().trim();
      if (!title) { FS.toast('Vui lòng nhập tiêu đề!', 'warning'); return; }

      const projectId = $('#task-modal-project').val();
      if (!projectId) { FS.toast('Vui lòng chọn dự án!', 'warning'); return; }

      const id = $('#task-modal-id').val();
      const isNew = !id;

      const payload = {
        title: title,
        description: $('#task-modal-desc').val() || '',
        projectId: projectId,
        assigneeId: $('#task-modal-assignee').val() || null,
        priority: $('#task-modal-priority').val() || 'medium',
        status: $('#task-modal-status').val() || 'todo',
        startDate: $('#task-modal-start').val() ? new Date($('#task-modal-start').val()).toISOString() : null,
        dueDate: $('#task-modal-due').val() ? new Date($('#task-modal-due').val()).toISOString() : null,
        estimatedHours: $('#task-modal-est').val() ? parseInt($('#task-modal-est').val()) : 0
      };

      if (isNew) {
        payload.code = 'T-' + String(this._tasksData.length + 1).padStart(3, '0');
      }

      try {
        let response;
        if (isNew) {
          response = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks',
            type: 'POST',
            data: payload
          });
        } else {
          // Bổ sung loggedHours khi update nếu backend yêu cầu (default 0)
          const currentTask = this._tasksData.find(t => t.id === id);
          payload.loggedHours = currentTask ? currentTask.loggedHours : 0;

          response = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks/' + id,
            type: 'PUT',
            data: payload
          });
        }

        if (response && response.success) {
          FS.toast(isNew ? 'Tạo công việc thành công!' : 'Cập nhật thành công!', 'success');
          $('#task-modal-overlay').hide();
          await this._loadData();
          return;
        } else {
          FS.toast('Máy chủ phản hồi lỗi khi lưu công việc.', 'error');
        }
      } catch (err) {
        console.error('API save task failed:', err);
        FS.toast('Không thể lưu công việc lên máy chủ. Vui lòng thử lại!', 'error');
      }
    },

    _bindEvents() {
      const self = this;

      // Search
      $('#task-search').off('input').on('input', function () {
        self._filter.search = this.value; self._page = 1; self._render();
      });

      // Filters
      $('#task-filter-status, #task-filter-priority, #task-filter-project, #task-filter-assignee').off('change').on('change', function () {
        const keyMap = {
          'task-filter-status': 'status',
          'task-filter-priority': 'priority',
          'task-filter-project': 'project',
          'task-filter-assignee': 'assignee'
        };
        const key = keyMap[this.id];
        if (key) self._filter[key] = this.value;
        self._page = 1;
        self._render();
      });

      // Reset
      $('#task-filter-reset').off('click').on('click', function () {
        self._filter = { search: '', status: '', priority: '', project: '', assignee: '' };
        $('#task-search').val('');
        $('#task-filter-status, #task-filter-priority, #task-filter-project, #task-filter-assignee').val('');
        self._page = 1; self._render();
      });

      // Pagination
      $(document).off('click.task-page').on('click.task-page', '.page-btn', function () {
        self._page = parseInt($(this).data('page')); self._render();
      });

      // Row click → open detail
      $(document).off('click.task-row').on('click.task-row', '.task-row', function () {
        FS.taskDetail.open($(this).data('task-id'));
      });

      // Done toggle
      $(document).off('click.task-done').on('click.task-done', '.task-done-toggle', function (e) {
        e.stopPropagation();
        const taskId = $(this).data('task-id');
        const t = self._tasksData.find(x => x.id === taskId);
        if (!t) return;

        const newStatus = (t.status.toLowerCase() === 'done') ? 'in_progress' : 'done';

        // Gọi API thật sử dụng FS.apiCall
        FS.apiCall({
          url: FS.API_BASE + '/api/v1/tasks/' + taskId + '/status',
          type: 'PATCH',
          data: { status: newStatus }
        }).then(function (res) {
          if (res && res.success) {
            self._loadData();
            FS.toast(newStatus === 'done' ? 'Đã đánh dấu hoàn thành! ✅' : 'Đã mở lại task', 'success');
          }
        }).catch(function (err) {
          console.error('API toggle status failed:', err);
          FS.toast('Không thể cập nhật trạng thái lên máy chủ.', 'error');
        });
      });

      // Edit button
      $(document).off('click.task-edit').on('click.task-edit', '.task-edit-btn', function (e) {
        e.stopPropagation();
        self._openModal($(this).data('task-id'));
      });

      // New task
      $('#task-new-btn').off('click').on('click', function () { self._openModal(); });

      // Modal controls
      $('#task-modal-close, #task-modal-cancel').off('click').on('click', () => $('#task-modal-overlay').hide());
      $('#task-modal-overlay').off('click').on('click', function (e) {
        if ($(e.target).is('#task-modal-overlay')) $('#task-modal-overlay').hide();
      });
      $('#task-modal-save').off('click').on('click', () => self._saveModal());
    }
  };

})(window.FS = window.FS || {}, jQuery);