/**
 * FlowSpace — Tasks Page Module
 * Module 3: Connected to Backend .NET 8 Web API (/api/v1/tasks)
 */
(function (FS, $) {
  'use strict';

  const PAGE_SIZE = 6;

  FS.pages.tasks = {
    _view: 'list',
    _filter: { search: '', status: '', priority: '', project: '', assignee: '' },
    _page: 1,
    _tasksData: [],

    async init() {
      // 1. Instant 0ms SWR render with local seed data (NO SPINNER!)
      this._tasksData = (FS.db.get('tasks') || []).map(t => FS.data.normalizeTask(t));
      this._populateFilters();
      this._render();
      this._bindEvents();

      // 2. Fetch live data from backend API in background & sync seamlessly
      await this._loadData();

      // 3. Auto-open modal if navigated from project detail "Thêm task" button
      const openModalFlag = sessionStorage.getItem('fs_open_new_task_modal');
      if (openModalFlag === 'true') {
        sessionStorage.removeItem('fs_open_new_task_modal');
        const defaultProjId = sessionStorage.getItem('fs_new_task_project_id');
        sessionStorage.removeItem('fs_new_task_project_id');

        this._openModal();
        if (defaultProjId) {
          $('#task-modal-project').val(defaultProjId);
        }
      }
    },

    async _loadData() {
      try {
        try {
          await FS.loadUsersCache();
        } catch (e) {
          console.warn('loadUsersCache failed in tasks page:', e);
        }

        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/tasks',
          type: 'GET'
        });

        if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
          const apiTasks = response.data.map(t => FS.data.normalizeTask(t));

          const mergedMap = new Map();
          const seedData = (FS.db.get('tasks') || []).map(t => FS.data.normalizeTask(t));
          for (const s of seedData) mergedMap.set(s.id, s);
          for (const a of apiTasks) mergedMap.set(a.id, a);

          this._tasksData = Array.from(mergedMap.values());
          $('#tasks-offline-banner').remove();
        } else {
          this._tasksData = FS.db.get('tasks') || [];
        }
      } catch (err) {
        console.warn('Tasks API request failed:', err);
        this._tasksData = FS.db.get('tasks') || [];
        if (!$('#tasks-offline-banner').length) {
          $('#page-content').prepend('<div id="tasks-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu tạm thời ngoại tuyến.</span></div>');
        }
      } finally {
        this._populateFilters();
        this._render();
      }
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

      if (this._view === 'list') {
        $('#tasks-list-view').removeClass('d-none');
        $('#tasks-card-view').addClass('d-none');
        this._renderTable(tasks);
      } else {
        $('#tasks-list-view').addClass('d-none');
        $('#tasks-card-view').removeClass('d-none');
        this._renderCards(tasks);
      }

      // Pagination
      const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
      const $ul = $('#tasks-pagination-ul');
      const $info = $('#tasks-pagination-info');

      if (total === 0) {
        $info.text('Hiển thị 0 trong 0 công việc');
        $ul.html('');
        return;
      }

      $info.text(`Hiển thị ${start + 1}-${Math.min(start + PAGE_SIZE, total)} trong ${total} công việc`);

      let html = '';

      // Nút quay lại bị vô hiệu hóa khi ở trang 1
      if (this._page === 1) {
        html += `<li class="page-item disabled" aria-disabled="true"><span class="page-link">&laquo; Trước</span></li>`;
      } else {
        html += `<li class="page-item"><a class="page-link task-page-link" data-page="${this._page - 1}" href="#">&laquo; Trước</a></li>`;
      }

      // Danh sách trang (Hiển thị tối đa 3 trang quanh trang hiện tại)
      let startPage = Math.max(1, this._page - 1);
      let endPage = Math.min(totalPages, startPage + 2);
      if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
      }

      for (let p = startPage; p <= endPage; p++) {
        if (p === this._page) {
          html += `<li class="page-item active" aria-current="page"><span class="page-link">${p}</span></li>`;
        } else {
          html += `<li class="page-item"><a class="page-link task-page-link" data-page="${p}" href="#">${p}</a></li>`;
        }
      }

      // Nút trang tiếp theo
      if (this._page === totalPages) {
        html += `<li class="page-item disabled" aria-disabled="true"><span class="page-link">Sau &raquo;</span></li>`;
      } else {
        html += `<li class="page-item"><a class="page-link task-page-link" data-page="${this._page + 1}" href="#">Sau &raquo;</a></li>`;
      }

      $ul.html(html);
    },

    _renderTable(tasks) {
      if (!tasks.length) {
        $('#tasks-table-body').html('<tr><td colspan="8"><div class="fs-empty"><i class="bi bi-check-square"></i><h5>Không tìm thấy công việc</h5><p>Thử thay đổi bộ lọc hoặc tạo công việc mới</p></div></td></tr>');
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
              <button class="btn btn-ghost btn-icon btn-sm task-edit-btn" data-task-id="${t.id}" title="Chỉnh sửa">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm text-danger task-delete-btn" data-task-id="${t.id}" title="Xóa">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
      }).join(''));
    },

    _renderCards(tasks) {
      if (!tasks.length) {
        $('#tasks-card-grid').html('<div class="col-12"><div class="fs-empty"><i class="bi bi-check-square"></i><h5>Không tìm thấy công việc</h5><p>Thử thay đổi bộ lọc hoặc tạo công việc mới</p></div></div>');
        return;
      }

      $('#tasks-card-grid').html(tasks.map(t => {
        const overdue = FS.date.isOverdue(t.dueDate) && t.status !== 'done';
        const isDone = t.status === 'done';

        let assigneeName = t.assigneeName || '';
        let assigneeAvatar = t.assigneeAvatar || '';
        let assigneeColor = t.assigneeColor || '';

        if (!assigneeName && t.assigneeId) {
          const u = FS.user.get(t.assigneeId);
          if (u) {
            assigneeName = u.name;
            assigneeAvatar = u.avatar;
            assigneeColor = u.color;
          }
        }

        const avatarHtml = (FS.user && FS.user.avatar)
          ? FS.user.avatar(t.assigneeId, 'sm', assigneeName || 'Thành viên')
          : `<div class="fs-avatar fs-avatar-sm ${assigneeColor || 'av-indigo'}" title="${FS.str.escape(assigneeName || 'Thành viên')}">${assigneeAvatar || 'TV'}</div>`;

        const editBtn = `<button class="btn btn-ghost btn-icon btn-sm task-edit-btn" data-task-id="${t.id}" title="Chỉnh sửa" style="padding: 2px; width: 24px; height: 24px;">
          <i class="bi bi-pencil" style="font-size: 11px;"></i>
        </button>`;
        const deleteBtn = `<button class="btn btn-ghost btn-icon btn-sm text-danger task-delete-btn" data-task-id="${t.id}" title="Xóa" style="padding: 2px; width: 24px; height: 24px;">
          <i class="bi bi-trash" style="font-size: 11px;"></i>
        </button>`;

        return `
          <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="fs-card task-row" data-task-id="${t.id}" style="cursor:pointer;height:100%;display:flex;flex-direction:column;justify-content:space-between">
              <div>
                <div class="d-flex align-items-start justify-content-between mb-2">
                  <span class="fs-small" style="color:var(--fs-accent);font-weight:600">${t.code}</span>
                  <div class="d-flex align-items-center gap-1">
                    ${FS.badge.status(t.status)}
                    ${editBtn}
                    ${deleteBtn}
                  </div>
                </div>
                <h6 style="font-weight:600;font-size:14px;margin-bottom:6px;line-height:1.4;${isDone ? 'text-decoration:line-through;color:var(--fs-text-muted)' : ''}">
                  ${FS.str.escape(t.title)}
                </h6>
                <div class="fs-small text-muted mb-3" style="font-size:12px">
                  <i class="bi bi-folder2-open me-1"></i>${FS.str.escape(t.projectName || '—')}
                </div>
              </div>

              <div>
                <div class="d-flex align-items-center justify-content-between pt-2" style="border-top:1px solid var(--fs-border)">
                  <div class="d-flex align-items-center gap-2">
                    ${avatarHtml}
                    ${FS.badge.priority(t.priority)}
                  </div>
                  <div class="d-flex align-items-center gap-1">
                    <span style="font-size:11px;${overdue ? 'color:var(--fs-danger);font-weight:600' : 'color:var(--fs-text-muted)'}">
                      ${overdue ? '<i class="bi bi-exclamation-triangle-fill me-1"></i>' : ''}${FS.date.format(t.dueDate)}
                    </span>
                    <button class="btn btn-ghost btn-icon btn-sm task-done-toggle ms-1" data-task-id="${t.id}" title="${isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}" style="color:${isDone ? 'var(--fs-success)' : 'var(--fs-border)'}">
                      <i class="bi bi-${isDone ? 'check-circle-fill' : 'circle'}" style="font-size:16px"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
      }).join(''));
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
        $('#task-modal-difficulty').val(t.difficulty || '');
        $('#task-modal-score').val(t.completionScore || '');
      } else {
        $('#task-modal-title').text('Tạo công việc mới');
        $('#task-modal-id').val('');
        $('#task-modal-name, #task-modal-desc').val('');
        $('#task-modal-priority').val('medium');
        $('#task-modal-status').val('todo');
        $('#task-modal-start').val(FS.date.toInput(new Date().toISOString()));
        $('#task-modal-due, #task-modal-est').val('');
        $('#task-modal-difficulty').val('');
        $('#task-modal-score').val('');
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
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const isNew = !id || !isGuid;

      const payload = {
        title: title,
        description: $('#task-modal-desc').val() || '',
        projectId: projectId,
        assigneeId: $('#task-modal-assignee').val() || null,
        priority: $('#task-modal-priority').val() || 'medium',
        status: $('#task-modal-status').val() || 'todo',
        startDate: $('#task-modal-start').val() ? new Date($('#task-modal-start').val()).toISOString() : null,
        dueDate: $('#task-modal-due').val() ? new Date($('#task-modal-due').val()).toISOString() : null,
        estimatedHours: $('#task-modal-est').val() ? parseInt($('#task-modal-est').val()) : 0,
        difficulty: $('#task-modal-difficulty').val() || '',
        completionScore: $('#task-modal-score').val() ? parseInt($('#task-modal-score').val()) : null
      };

      const currentTask = id ? this._tasksData.find(t => t.id === id) : null;
      if (isNew) {
        payload.code = currentTask ? currentTask.code : ('T-' + String(this._tasksData.length + 1).padStart(3, '0'));
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
          payload.loggedHours = currentTask ? currentTask.loggedHours : 0;

          response = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks/' + id,
            type: 'PUT',
            data: payload
          });
        }

        if (response && response.success) {
          FS.toast(isNew ? 'Tạo công việc thành công!' : 'Cập nhật thành công!', 'success');
          
          // Cập nhật local storage dọn dẹp cache
          if (id && !isGuid) {
            FS.db.remove('tasks', id);
          }
          if (response.data) {
            FS.db.save('tasks', response.data);
          }
          
          $('#task-modal-overlay').hide();
          await this._loadData();
          return;
        } else {
          FS.toast('Máy chủ phản hồi lỗi khi lưu công việc.', 'error');
        }
      } catch (err) {
        console.error('API save task failed:', err);
        let errMsg = 'Không thể lưu công việc lên máy chủ.';
        if (err.xhr && err.xhr.responseJSON) {
          if (err.xhr.responseJSON.message) {
            errMsg = err.xhr.responseJSON.message;
          } else if (err.xhr.responseJSON.errors) {
            errMsg = 'Lỗi validation: ' + JSON.stringify(err.xhr.responseJSON.errors);
          }
        } else if (err.statusText) {
          errMsg += ' Chi tiết: ' + err.statusText;
        }
        FS.toast(errMsg, 'error');
      }
    },

    _bindEvents() {
      const self = this;

      // View toggle
      $(document).off('click.task-toggle').on('click.task-toggle', '#tasks-page .view-toggle', function (e) {
        e.preventDefault();
        const $btn = $(this).closest('.view-toggle');
        $('#tasks-page .view-toggle').removeClass('active');
        $btn.addClass('active');
        const viewType = $btn.data('view') || 'list';
        self._view = viewType;
        self._render();
      });

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
      $(document).off('click.task-page').on('click.task-page', '.task-page-link', function (e) {
        e.preventDefault();
        const p = parseInt($(this).data('page'), 10);
        if (p && p !== self._page) {
          self._page = p;
          self._render();
        }
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

        const newStatus = (t.status.toLowerCase() === 'done') ? 'inprogress' : 'done';

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

      // Delete button
      $(document).off('click.task-delete').on('click.task-delete', '.task-delete-btn', function (e) {
        e.stopPropagation();
        const taskId = $(this).data('task-id');
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

        FS.confirm('Bạn có chắc chắn muốn xóa công việc này không?', () => {
          if (!isGuid) {
            // Xóa offline task trong cache
            FS.db.remove('tasks', taskId);
            FS.toast('Đã xóa công việc tạm thời.', 'success');
            self._loadData();
            return;
          }

          // Gọi API xóa thật
          FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks/' + taskId,
            type: 'DELETE'
          }).then(function (res) {
            if (res && res.success) {
              FS.db.remove('tasks', taskId); // Cũng dọn dẹp trong offline cache
              FS.toast('Đã xóa công việc thành công! 🗑️', 'success');
              self._loadData();
            }
          }).catch(function (err) {
            console.error('API delete task failed:', err);
            FS.toast('Không thể xóa công việc trên máy chủ.', 'error');
          });
        }, { danger: true, confirmText: 'Xóa', title: 'Xóa công việc' });
      });

      // New task
      $(document).off('click.task-new').on('click.task-new', '#task-new-btn', function (e) {
        e.preventDefault();
        self._openModal();
      });

      // Modal controls
      $('#task-modal-close, #task-modal-cancel').off('click').on('click', () => $('#task-modal-overlay').hide());
      $('#task-modal-overlay').off('click').on('click', function (e) {
        if ($(e.target).is('#task-modal-overlay')) $('#task-modal-overlay').hide();
      });
      $('#task-modal-save').off('click').on('click', () => self._saveModal());
    }
  };

})(window.FS = window.FS || {}, jQuery);
// Trigger Vercel webhook sync v7.1