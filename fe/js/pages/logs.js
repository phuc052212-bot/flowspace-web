(function (FS, $) {
  'use strict';

  const PAGE_SIZE = 6;
  const ACTION_COLORS = {
    LOGIN: 'av-green', LOGOUT: 'av-teal', CREATE: 'av-indigo',
    UPDATE: 'av-amber', ASSIGN: 'av-violet', APPROVE: 'av-green',
    REJECT: 'av-rose', UPLOAD: 'av-cyan', COMMENT: 'av-blue'
  };

  FS.pages.logs = {
    _filter: { search: '', action: '', user: '' },
    _page: 1,
    _usersCache: null,
    _logsCache: null,

    async init() {
      if (!FS.auth.isManager() && !FS.auth.isDirector()) {
        document.getElementById('logs-table-body').innerHTML =
          '<tr><td colspan="6"><div class="fs-empty"><i class="bi bi-shield-lock"></i><h5>Không có quyền truy cập</h5><p>Tính năng này dành cho Quản lý / Ban Giám Đốc.</p></div></td></tr>';
        return;
      }
      this._logsCache = this._getDefaultLogs();
      this._render();
      this._bindEvents();

      await this._loadUsers();
      await this._loadLogs();
      this._populateUserFilter();
      this._render();
    },

    _getDefaultLogs() {
      const users = FS.usersCache || FS.db.get('users') || [];
      const uAdmin = users.find(u => u.email === 'admin@flowspace.demo') || { id: 'u1', name: 'Phạm Thanh Dung' };
      const uCuong = users.find(u => u.email === 'truongphong@flowspace.demo') || { id: 'u3', name: 'Lê Minh Cường' };
      const uBinh = users.find(u => u.email === 'truongnhom@flowspace.demo') || { id: 'u2', name: 'Trần Thị Bình' };
      const uAn = users.find(u => u.email === 'nhanvien@flowspace.demo') || { id: 'u4', name: 'Nguyễn Văn An' };

      return [
        { id: 'l1', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), userId: uAdmin.id, userName: uAdmin.name, action: 'LOGIN', module: 'AUTH', detail: 'Đăng nhập hệ thống thành công (Email: admin@flowspace.demo)', ip: '192.168.1.100' },
        { id: 'l2', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), userId: uCuong.id, userName: uCuong.name, action: 'APPROVE', module: 'REQUESTS', detail: 'Phê duyệt đơn xin nghỉ phép của Nguyễn Văn An', ip: '192.168.1.102' },
        { id: 'l3', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), userId: uBinh.id, userName: uBinh.name, action: 'UPDATE', module: 'GANTT', detail: 'Cập nhật tiến độ dự án "Thiết kế Website E-commerce"', ip: '192.168.1.105' },
        { id: 'l4', timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), userId: uAn.id, userName: uAn.name, action: 'CREATE', module: 'TIMETRACKING', detail: 'Ghi nhận 4h làm việc cho công việc FS-001-T2', ip: '192.168.1.110' },
        { id: 'l5', timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), userId: uAdmin.id, userName: uAdmin.name, action: 'UPDATE', module: 'SETTINGS', detail: 'Cập nhật quy định duyệt tự động cấp Trưởng phòng', ip: '192.168.1.100' },
        { id: 'l6', timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(), userId: uCuong.id, userName: uCuong.name, action: 'ASSIGN', module: 'KANBAN', detail: 'Phân công công việc FS-002-T1 cho Vũ Hoàng Giang', ip: '192.168.1.102' }
      ];
    },

    _getAuthHeaders() {
      const session = FS.auth.getSession();
      return session && session.token ? { 'Authorization': 'Bearer ' + session.token } : {};
    },

    _showOfflineBanner(message) {
      if (!$('#logs-offline-banner').length) {
        $('#page-content').prepend(`
          <div id="logs-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px; background:#fff3cd; border:1px solid #ffeeba; color:#856404">
            <i class="bi bi-exclamation-triangle-fill" style="margin-right:8px"></i>
            <span>${message}</span>
          </div>
        `);
      }
    },

    async _loadUsers() {
      try {
        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/users?pageSize=100',
          type: 'GET'
        });
        if (response && response.success && Array.isArray(response.data)) {
          this._usersCache = response.data;
          $('#logs-offline-banner').remove();
        } else {
          this._usersCache = FS.db.get('users') || [];
        }
      } catch (err) {
        console.warn('Users API failed for logs page:', err);
        this._usersCache = FS.db.get('users') || [];
      }
    },

    async _loadLogs() {
      try {
        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/auditlogs',
          type: 'GET'
        });
        if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
          const mergedMap = new Map();
          const seedData = this._getDefaultLogs();
          for (const s of seedData) mergedMap.set(s.id, s);
          for (const a of response.data) mergedMap.set(a.id, a);
          this._logsCache = Array.from(mergedMap.values());
          $('#logs-offline-banner').remove();
        } else if (!this._logsCache || !this._logsCache.length) {
          this._logsCache = this._getDefaultLogs();
        }
      } catch (err) {
        console.warn('Logs API failed:', err);
        if (!this._logsCache || !this._logsCache.length) {
          this._logsCache = this._getDefaultLogs();
        }
      }
    },

    _populateUserFilter() {
      const users = this._usersCache || [];
      const $select = $('#logs-filter-user');
      $select.empty();
      $select.append('<option value="">Tất cả</option>');
      users.forEach(u => {
        $select.append(`<option value="${u.id}">${FS.str.escape(u.name)}</option>`);
      });
    },

    _getData() {
      let logs = this._logsCache || [];
      const { search, action, user } = this._filter;
      if (search) {
        const q = search.toLowerCase();
        logs = logs.filter(l => (l.detail + l.module + l.action).toLowerCase().includes(q));
      }
      if (action) logs = logs.filter(l => l.action === action);
      if (user) logs = logs.filter(l => l.userId === user);
      return logs;
    },

    _render() {
      this._populateUserFilter();

      const all = this._getData();
      const start = (this._page - 1) * PAGE_SIZE;
      const logs = all.slice(start, start + PAGE_SIZE);

      document.getElementById('logs-info').textContent = `${start + 1}–${Math.min(start + PAGE_SIZE, all.length)} / ${all.length}`;

      const actionBadge = a => {
        const labels = { LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất', CREATE: 'Tạo mới', UPDATE: 'Cập nhật', ASSIGN: 'Phân công', APPROVE: 'Phê duyệt', REJECT: 'Từ chối', UPLOAD: 'Upload', COMMENT: 'Bình luận' };
        const color = { LOGIN: 'badge-success', LOGOUT: 'badge-neutral', CREATE: 'badge-accent', UPDATE: 'badge-warning', ASSIGN: 'badge-accent', APPROVE: 'badge-success', REJECT: 'badge-danger', UPLOAD: 'badge-neutral', COMMENT: 'badge-neutral' };
        return `<span class="fs-badge ${color[a] || 'badge-neutral'}">${labels[a] || a}</span>`;
      };

      document.getElementById('logs-table-body').innerHTML = logs.map(log => {
        const user = (this._usersCache || []).find(u => u.id === log.userId);
        const userName = log.userName || (user ? user.name : 'Hệ thống');
        const userAvatar = user ? user.avatar : (userName ? userName.substring(0, 2).toUpperCase() : 'SYS');
        const userColor = user ? user.color : 'av-indigo';
        const d = new Date(log.createdAt);
        return `
          <tr class="hover-row">
            <td style="font-size:11px;color:var(--fs-text-muted);white-space:nowrap">
              ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="fs-avatar fs-avatar-sm ${userColor}">${FS.str.escape(userAvatar)}</div>
                <span style="font-size:12px;font-weight:500">${FS.str.escape(userName)}</span>
              </div>
            </td>
            <td>${actionBadge(log.action)}</td>
            <td><span class="fs-badge badge-neutral" style="font-size:10px">${FS.str.escape(log.module || 'Hệ thống')}</span></td>
            <td style="font-size:12px;color:var(--fs-text-secondary)">${FS.str.escape(log.detail || '—')}</td>
            <td style="font-size:11px;color:var(--fs-text-muted)">${FS.str.escape(log.ipAddress || log.ip || '127.0.0.1')}</td>
          </tr>`;
      }).join('') || '<tr><td colspan="6"><div class="fs-empty"><i class="bi bi-journal"></i><h5>Không tìm thấy log</h5></div></td></tr>';

      const totalPages = Math.ceil(all.length / PAGE_SIZE);
      let paginHtml = '';
      for (let i = 1; i <= totalPages; i++) {
        paginHtml += `<button class="btn btn-sm ${i === this._page ? 'btn-primary' : 'btn-ghost'} log-page-btn" data-page="${i}">${i}</button>`;
      }
      document.getElementById('logs-pagination').innerHTML = paginHtml;
    },

    _bindEvents() {
      const self = this;
      $('#logs-search').off('input').on('input', function () { self._filter.search = this.value; self._page = 1; self._render(); });
      $('#logs-filter-action').off('change').on('change', function () { self._filter.action = this.value; self._page = 1; self._render(); });
      $('#logs-filter-user').off('change').on('change', function () { self._filter.user = this.value; self._page = 1; self._render(); });
      $('#logs-refresh-btn').off('click').on('click', () => this._render());
      $(document).off('click.log-page').on('click.log-page', '.log-page-btn', function () { self._page = parseInt($(this).data('page')); self._render(); });
    }
  };
})(window.FS = window.FS || {}, jQuery);