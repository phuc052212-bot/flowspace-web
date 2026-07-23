/**
 * FlowSpace — Global Utilities & Toast
 * Tiện ích dùng chung toàn app
 */
(function (FS) {
  'use strict';

  /* ── Toast notifications ────────────────────────────────── */
  let _toastContainer = null;

  function getToastContainer() {
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.className = 'fs-toast-container';
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  }

  /**
   * Hiển thị toast
   * @param {string} message
   * @param {string} type — 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration — ms
   */
  FS.toast = function (message, type = 'info', duration = 3500) {
    const icons = {
      success: 'bi-check-circle-fill',
      error:   'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info:    'bi-info-circle-fill'
    };
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `fs-toast toast-${type}`;
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'none';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  /* ── Date / Time helpers ─────────────────────────────────── */
  FS.date = {
    /**
     * Format ISO date → "12/07/2026"
     */
    format(iso, opts = {}) {
      if (!iso) return '—';
      const d = new Date(iso);
      if (isNaN(d)) return '—';
      if (opts.time) {
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
               ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    /** Format ISO → "12 thg 7" */
    short(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
    },

    /** Relative time — "3 ngày trước", "trong 2 ngày" */
    relative(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const diff = Math.round((d - Date.now()) / 86400000);
      if (diff === 0) return 'Hôm nay';
      if (diff === 1) return 'Ngày mai';
      if (diff === -1) return 'Hôm qua';
      if (diff > 1)  return `Còn ${diff} ngày`;
      return `${Math.abs(diff)} ngày trước`;
    },

    /** Kiểm tra quá hạn */
    isOverdue(iso) {
      if (!iso) return false;
      return new Date(iso) < new Date();
    },

    /** Format cho input[type=date] → YYYY-MM-DD */
    toInput(iso) {
      if (!iso) return '';
      return new Date(iso).toISOString().slice(0, 10);
    },

    /** Relative chat time */
    chatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const now = new Date();
      const diff = now - d;
      if (diff < 60000) return 'Vừa xong';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
      if (diff < 86400000) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
  };

  /* ── String helpers ──────────────────────────────────────── */
  FS.str = {
    /** Truncate string */
    truncate: (s, n = 50) => s && s.length > n ? s.slice(0, n) + '…' : s,

    /** Escape HTML */
    escape: (s) => {
      if (!s) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    /** Viết hoa chữ cái đầu */
    capitalize: (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '',

    /** Hash string to integer */
    hashCode(str) {
      if (!str) return 0;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    },

    /** Format số bytes → "2.3 MB" */
    fileSize(bytes) {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  };

  FS.usersCache = [];
  FS.loadUsersCache = async function () {
    if (FS.usersCache && FS.usersCache.length > 0) return FS.usersCache;
    try {
      const response = await FS.apiCall({
        url: FS.API_BASE + '/api/v1/chat/users',
        type: 'GET'
      });
      if (response && response.success && Array.isArray(response.data)) {
        FS.usersCache = response.data;
      } else {
        FS.usersCache = FS.db.get('users') || [];
      }
    } catch (e) {
      console.warn('Failed to load users cache:', e);
      FS.usersCache = FS.db.get('users') || [];
    }
    return FS.usersCache;
  };

  /* ── User helpers ────────────────────────────────────────── */
  FS.user = {
    /** Lấy user object theo id */
    get(id) {
      if (!id) return null;
      const list = (FS.usersCache && FS.usersCache.length) ? FS.usersCache : (FS.db.get('users') || []);
      const strId = String(id).toLowerCase();
      return list.find(u => {
        if (!u) return false;
        const uId = String(u.id).toLowerCase();
        return uId === strId || uId === strId.replace('u', '') || strId === 'u' + uId;
      });
    },

    /** Render avatar HTML */
    avatar(id, size = '', fallbackName = '') {
      const u = FS.user.get(id);
      const name = u?.name || fallbackName || 'FlowSpace User';
      const color = u?.color || (id ? `#${(Math.abs(FS.str.hashCode(String(id))) % 0xFFFFFF).toString(16).padStart(6, '0')}` : '#6366f1');
      const bgStyle = color.startsWith('#') ? `background-color:${color};color:#ffffff;` : '';
      const bgClass = !color.startsWith('#') ? color : '';
      const initials = (u?.avatar) ? u.avatar : (name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??');
      return `<div class="fs-avatar ${size} ${bgClass}" style="${bgStyle}" title="${FS.str.escape(name)}">${initials}</div>`;
    },

    /** Render Avatar Stack chuyên nghiệp với max limit & indicator +N */
    avatarStack(members = [], maxDisplay = 4) {
      if (!Array.isArray(members) || members.length === 0) {
        return '<span class="text-muted" style="font-size:12px">—</span>';
      }

      const total = members.length;
      const visibleMembers = members.slice(0, maxDisplay);
      const remaining = total - maxDisplay;

      let html = '<div class="fs-avatar-stack d-flex align-items-center" style="padding-left:4px">';
      visibleMembers.forEach((m, idx) => {
        let userId = typeof m === 'object' ? (m.id || m.userId) : m;
        let name = typeof m === 'object' ? m.name : '';
        const zIndex = 10 - idx;
        const marginStyle = idx > 0 ? 'margin-left:-8px;' : '';
        
        let avatarHtml = FS.user.avatar(userId, 'sm', name);
        avatarHtml = avatarHtml.replace('class="fs-avatar sm', `class="fs-avatar sm" style="z-index:${zIndex};${marginStyle}border:2px solid var(--fs-bg, #fff);box-shadow:0 2px 4px rgba(0,0,0,0.08);`);
        html += avatarHtml;
      });

      if (remaining > 0) {
        html += `<div class="fs-avatar sm fs-avatar-more" style="margin-left:-8px;z-index:5;border:2px solid var(--fs-bg, #fff);background-color:#475569;color:#ffffff;font-size:10px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,0.08)" title="Thêm ${remaining} thành viên">+${remaining}</div>`;
      }
      html += '</div>';
      return html;
    },

    /** Lấy tên user */
    name(id, fallback = '—') {
      const u = FS.user.get(id);
      return u ? u.name : fallback;
    }
  };

  /* ── Data Normalizers (Data Transformers BE <-> FE) ──────── */
  FS.data = {
    normalizeProject(p) {
      if (!p) return null;
      return {
        id: p.id,
        code: p.code || 'FS-' + (p.id || '00'),
        name: p.name || 'Dự án không tên',
        description: p.description || '',
        status: (p.status || 'active').toLowerCase(),
        priority: (p.priority || 'medium').toLowerCase(),
        startDate: p.startDate || null,
        endDate: p.endDate || null,
        progress: typeof p.progress === 'number' ? Math.min(100, Math.max(0, p.progress)) : 0,
        ownerId: p.ownerId || '',
        ownerName: p.ownerName || '',
        members: Array.isArray(p.members) ? p.members : [],
        createdAt: p.createdAt || new Date().toISOString(),
        client: p.client || '',
        budget: p.budget || null,
        taskCount: p.taskCount || 0,
        completedTaskCount: p.completedTaskCount || 0
      };
    },

    normalizeTask(t) {
      if (!t) return null;
      return {
        id: t.id,
        code: t.code || 'TSK-' + (t.id || '00'),
        title: t.title || 'Công việc không tên',
        description: t.description || '',
        projectId: t.projectId || '',
        projectName: t.projectName || '',
        assigneeId: t.assigneeId || '',
        assigneeName: t.assigneeName || '',
        assigneeAvatar: t.assigneeAvatar || '',
        assigneeColor: t.assigneeColor || '',
        status: (t.status || 'todo').toLowerCase(),
        priority: (t.priority || 'medium').toLowerCase(),
        startDate: t.startDate || null,
        dueDate: t.dueDate || null,
        completedAt: t.completedAt || null,
        estimatedHours: t.estimatedHours || 0,
        loggedHours: t.loggedHours || 0,
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        comments: Array.isArray(t.comments) ? t.comments : [],
        createdAt: t.createdAt || new Date().toISOString(),
        difficulty: t.difficulty || '',
        completionScore: t.completionScore || null
      };
    }
  };

  /* ── Status / Priority badge helpers ────────────────────── */
  FS.badge = {
    status(status) {
      const st = String(status || '').toLowerCase();
      const map = {
        'todo':        { cls: 'badge-neutral',  label: 'Chưa bắt đầu' },
        'in_progress': { cls: 'badge-accent',   label: 'Đang làm' },
        'inprogress':  { cls: 'badge-accent',   label: 'Đang thực hiện' },
        'running':     { cls: 'badge-accent',   label: 'Đang chạy' },
        'review':      { cls: 'badge-warning',  label: 'Chờ duyệt' },
        'done':        { cls: 'badge-success',  label: 'Hoàn thành' },
        'completed':   { cls: 'badge-success',  label: 'Hoàn thành' },
        'cancelled':   { cls: 'badge-neutral',  label: 'Đã huỷ' },
        'active':      { cls: 'badge-success',  label: 'Đang chạy' },
        'on_hold':     { cls: 'badge-warning',  label: 'Đang chờ' },
        'onhold':      { cls: 'badge-warning',  label: 'Đang chờ' },
        'approved':    { cls: 'badge-success',  label: 'Đã duyệt' },
        'pending':     { cls: 'badge-warning',  label: 'Chờ duyệt' },
        'rejected':    { cls: 'badge-danger',   label: 'Từ chối' }
      };
      const b = map[st] || { cls: 'badge-neutral', label: status };
      return `<span class="fs-badge ${b.cls}">${b.label}</span>`;
    },

    priority(priority) {
      const map = {
        'high':   { cls: 'badge-priority-high',   label: 'Cao', icon: 'bi-arrow-up' },
        'medium': { cls: 'badge-priority-medium', label: 'TB',  icon: 'bi-dash' },
        'low':    { cls: 'badge-priority-low',    label: 'Thấp',icon: 'bi-arrow-down' }
      };
      const b = map[priority] || { cls: 'badge-priority-none', label: '—', icon: '' };
      return `<span class="fs-badge ${b.cls}"><i class="bi ${b.icon}"></i>${b.label}</span>`;
    },

    reqType(type) {
      const map = {
        'leave':            { cls: 'badge-info',    label: '🏖️ Nghỉ phép' },
        'purchase':         { cls: 'badge-accent',  label: '🛒 Mua hàng' },
        'payment':          { cls: 'badge-success', label: '💳 Thanh toán' },
        'advance':          { cls: 'badge-warning', label: '💵 Tạm ứng' },
        'device':           { cls: 'badge-info',    label: '💻 Cấp thiết bị' },
        'it_support':       { cls: 'badge-neutral', label: '🛠️ Hỗ trợ IT' },
        'tech_support':     { cls: 'badge-neutral', label: '🔧 Hỗ trợ KT' },
        'repair':           { cls: 'badge-danger',  label: '⚡ Sửa chữa' },
        'recruitment':      { cls: 'badge-accent',  label: '👥 Tuyển dụng' },
        'budget_increase': { cls: 'badge-warning', label: '📈 Tăng ngân sách' },
        'overtime':         { cls: 'badge-warning', label: '⏰ Tăng ca' },
        'remote':           { cls: 'badge-neutral', label: '🏠 Làm remote' }
      };
      const b = map[type] || { cls: 'badge-neutral', label: type };
      return `<span class="fs-badge ${b.cls}">${b.label}</span>`;
    }
  };

  /* ── Confirm dialog ──────────────────────────────────────── */
  FS.confirm = function (message, onConfirm, opts = {}) {
    const title = opts.title || 'Xác nhận';
    const confirmText = opts.confirmText || 'Xác nhận';
    const danger = opts.danger !== false;

    const id = 'fs-confirm-' + Date.now();
    const html = `
      <div class="fs-modal-overlay" id="${id}-overlay">
        <div class="fs-modal" style="max-width:400px">
          <div class="fs-modal-header">
            <h5 class="fs-h5 m-0">${title}</h5>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('${id}-overlay').remove()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="fs-modal-body">
            <p style="color:var(--fs-text-secondary)">${message}</p>
          </div>
          <div class="fs-modal-footer">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('${id}-overlay').remove()">Hủy</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="${id}-confirm">${confirmText}</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById(id + '-confirm').addEventListener('click', function () {
      document.getElementById(id + '-overlay').remove();
      onConfirm();
    });
  };

  /* ── Sidebar Project Sync ──────────────────────────────── */
  FS.syncSidebarProjects = async function () {
    const $container = $('#sidebar-project-items');
    if (!$container.length) return;

    let projects = [];
    let isOffline = false;
    try {
      const response = await FS.apiCall({
        url: FS.API_BASE + '/api/v1/projects',
        type: 'GET'
      });
      if (response && response.success && Array.isArray(response.data)) {
        projects = response.data;
        $('#sidebar-proj-header-status').remove();
      } else {
        projects = FS.db.get('projects') || [];
        isOffline = true;
      }
    } catch {
      projects = FS.db.get('projects') || [];
      isOffline = true;
    }

    if (isOffline) {
      if (!$('#sidebar-proj-header-status').length) {
        $container.parent().find('.fs-sidebar-section-title').append('<span id="sidebar-proj-header-status" style="font-size:9px;color:var(--fs-danger);font-weight:600;margin-left:5px">(Ngoại tuyến)</span>');
      }
    } else {
      $('#sidebar-proj-header-status').remove();
    }

    if (!projects.length) {
      $container.html('');
      return;
    }

    $container.html(projects.slice(0, 5).map(p => {
      const code = p.code || 'FS';
      return `
        <a href="#" class="d-flex align-items-center gap-2 py-1 px-2 text-decoration-none rounded text-truncate proj-sub-item" data-proj-id="${p.id}" style="font-size:12px;color:var(--fs-text-muted);line-height:1.4">
          <span class="fs-avatar fs-avatar-xs" style="width:18px;height:18px;font-size:9px;background:var(--fs-accent-light);color:var(--fs-accent);flex-shrink:0">${FS.str.escape(code.slice(-3))}</span>
          <span class="truncate" style="flex:1">${FS.str.escape(p.name)}</span>
        </a>`;
    }).join(''));

    $container.show();
  };

  /* ── API CALL WITH RETRY & COLD START DETECTOR ─────────── */
  let _coldStartTimer = null;
  let _coldStartHud = null;
  let _isFirstRequest = true;

  function showColdStartHud() {
    if (_coldStartHud) return;
    _coldStartHud = document.createElement('div');
    _coldStartHud.className = 'fs-cold-start-hud';
    _coldStartHud.style.cssText = 'position:fixed;bottom:20px;left:20px;background:#1e293b;color:#fff;padding:12px 18px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.25);z-index:9999;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;animation:slideUp 0.3s ease;border:1px solid rgba(255,255,255,0.1)';
    _coldStartHud.innerHTML = '<span class="fs-spinner" style="width:14px;height:14px;border-width:2px;border-top-color:#fff"></span> Đang đánh thức máy chủ (Render Free Tier có thể mất 30s-60s)...';
    document.body.appendChild(_coldStartHud);
  }

  function hideColdStartHud() {
    if (_coldStartHud) {
      _coldStartHud.remove();
      _coldStartHud = null;
    }
  }

  FS.apiCall = function (options) {
    const session = FS.auth ? FS.auth.getSession() : null;
    const authHeaders = session && session.token ? { 'Authorization': 'Bearer ' + session.token } : {};
    
    const ajaxOptions = $.extend(true, {
      timeout: 20000, // 20s
      headers: authHeaders,
      contentType: 'application/json',
      xhrFields: { withCredentials: true },
      crossDomain: true
    }, options);

    if (ajaxOptions.data && typeof ajaxOptions.data === 'object' && !(ajaxOptions.data instanceof FormData)) {
      ajaxOptions.data = JSON.stringify(ajaxOptions.data);
    }

    let isRequestFinished = false;

    // Start timer for cold-start warning on first request
    if (_isFirstRequest) {
      _coldStartTimer = setTimeout(() => {
        if (!isRequestFinished) {
          showColdStartHud();
        }
      }, 3000);
      _isFirstRequest = false;
    }

    const executeRequest = (attempt) => {
      return new Promise((resolve, reject) => {
        $.ajax(ajaxOptions)
          .done(res => {
            isRequestFinished = true;
            clearTimeout(_coldStartTimer);
            hideColdStartHud();
            resolve(res);
          })
          .fail((xhr, status, err) => {
            // Check for retry if status is network failure / timeout and it's the first attempt
            if (attempt === 1 && (status === 'timeout' || xhr.status === 0)) {
              console.warn('API call failed/timeout, retrying in 1s...');
              setTimeout(() => {
                executeRequest(2).then(resolve).catch(reject);
              }, 1000);
            } else {
              isRequestFinished = true;
              clearTimeout(_coldStartTimer);
              hideColdStartHud();
              reject({ xhr, status, err });
            }
          });
      });
    };

    return executeRequest(1);
  };

  /* ── Dropdown close on outside click ────────────────────── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.fs-dropdown')) {
      document.querySelectorAll('.fs-dropdown-menu.show').forEach(el => el.classList.remove('show'));
    }
  });

  /**
   * Hiển thị dialog xác nhận đẹp mắt, chuẩn Senior UI/UX
   */
  FS.confirm = function (options = {}) {
    const title = options.title || "Xác nhận";
    const message = options.message || "Bạn có chắc chắn muốn thực hiện hành động này?";
    const confirmText = options.confirmText || "Đồng ý";
    const cancelText = options.cancelText || "Hủy";
    const type = options.type || "info";

    const modalHtml = `
      <div class="fs-modal-overlay" id="fs-confirm-overlay" role="dialog" aria-modal="true" style="display: none;">
        <div class="fs-modal fs-confirm-dialog" style="max-width: 400px; padding: 24px;">
          <div class="fs-modal-header" style="border-bottom: none; padding: 0 0 12px 0;">
            <h5 class="m-0 d-flex align-items-center gap-2" style="font-size: var(--fs-text-lg); font-weight: 600;">
              <i class="bi ${type === 'danger' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-question-circle-fill text-primary'}" style="font-size: 20px;"></i>
              ${title}
            </h5>
          </div>
          <div class="fs-modal-body" style="padding: 0 0 20px 0;">
            <p class="m-0 text-secondary" style="font-size: var(--fs-text-sm); line-height: 1.5; color: var(--fs-text-secondary);">${message}</p>
          </div>
          <div class="fs-modal-footer" style="border-top: none; padding: 0; display: flex; justify-content: flex-end; gap: 12px; background: transparent;">
            <button class="btn btn-outline-secondary btn-sm" id="fs-confirm-cancel-btn" type="button" style="padding: 6px 16px; border-radius: var(--fs-radius-md); font-weight: 500;">${cancelText}</button>
            <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} btn-sm" id="fs-confirm-ok-btn" type="button" style="padding: 6px 16px; border-radius: var(--fs-radius-md); font-weight: 500;">${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    const $overlay = $(modalHtml).appendTo('body');
    $overlay.fadeIn(150);
    $('#fs-confirm-ok-btn').trigger('focus');

    return new Promise((resolve) => {
      $('#fs-confirm-ok-btn').on('click', () => {
        $overlay.fadeOut(150, () => $overlay.remove());
        if (typeof options.onConfirm === 'function') options.onConfirm();
        resolve(true);
      });

      $('#fs-confirm-cancel-btn, #fs-confirm-overlay').on('click', function (e) {
        if (e.target === this || e.target.id === 'fs-confirm-cancel-btn') {
          $overlay.fadeOut(150, () => $overlay.remove());
          resolve(false);
        }
      });

      $(document).one('keydown.fs-confirm-esc', (e) => {
        if (e.key === 'Escape') {
          $overlay.fadeOut(150, () => $overlay.remove());
          resolve(false);
        }
      });
    });
  };

})(window.FS = window.FS || {});
