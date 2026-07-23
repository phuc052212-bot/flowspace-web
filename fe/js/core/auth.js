(function (FS) {
  "use strict";

  const SESSION_KEY = "flowspace_session";

  function loadSession() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored);
      if (!session.token || (session.expiresAt && new Date(session.expiresAt) <= new Date())) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function persistSession() {
    try {
      if (_session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(_session));
    } catch { /* Keep the current-page session if storage is unavailable. */ }
  }

  // Restore the authenticated session after navigation from login.html to app.html.
  let _session = loadSession();

  const ROLE_LEVELS = { employee: 1, team_lead: 2, manager: 3, director: 4 };
  const ROLE_LABELS = {
    employee: "Nhân viên",
    team_lead: "Trưởng nhóm",
    manager: "Trưởng phòng",
    director: "Ban giám đốc",
  };
  const PAGE_ACCESS = {
    dashboard: 1,
    projects: 1,
    tasks: 1,
    kanban: 1,
    gantt: 2,
    calendar: 1,
    documents: 1,
    chat: 1,
    requests: 1,
    approvals: 2,
    timetracking: 1,
    reports: 3,
    users: 4,
    logs: 4,
    settings: 1,
  };

  const API_BASE = "https://flowspace-backend-7ql5.onrender.com";
  FS.API_BASE = API_BASE;

  // Password helpers (simple encode — NOT cryptographic)
  function _encodePassword(plain) { return btoa(unescape(encodeURIComponent(plain))); }
  function _decodePassword(encoded) { try { return decodeURIComponent(escape(atob(encoded))); } catch { return ""; } }
  function _isEncoded(str) { try { atob(str); return str.length > 0 && !/\s/.test(str); } catch { return false; } }

  FS.auth = {
    /** Đăng nhập bằng email + password */
    async login(email, password) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const authData = await $.ajax({
            url: FS.API_BASE + "/api/v1/auth/login",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email, password }),
            timeout: 65000,
          });

          if (authData && authData.accessToken && authData.user) {
            _session = {
              userId: authData.user.id,
              name: authData.user.name,
              email: authData.user.email,
              role: authData.user.role,
              token: authData.accessToken,
              expiresAt: authData.expiresInMinutes
                ? new Date(Date.now() + authData.expiresInMinutes * 60 * 1000).toISOString()
                : null,
              avatar: authData.user.avatar || authData.user.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase(),
              color: authData.user.color || "#6366f1",
              loginAt: new Date().toISOString(),
            };
            persistSession();
            return _session;
          }
          return { error: "Phản hồi đăng nhập không hợp lệ từ máy chủ." };
        } catch (apiErr) {
          const errorResponse = apiErr.responseJSON || {};
          const errorCode = errorResponse.errorCode || null;
          const isNetworkError = !apiErr.status || apiErr.status === 0 || apiErr.statusText === "timeout";
          if (isNetworkError && attempt < 2) { await new Promise(r => setTimeout(r, 3000)); continue; }
          const message = errorResponse.message || (isNetworkError ? "Máy chủ đang khởi động, vui lòng thử đăng nhập lại sau 30 giây." : "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.");
          return { error: message, errorCode };
        }
      }
    },

    /** Đăng ký tài khoản mới */
    async register(data) {
      try {
        const response = await $.ajax({
          url: FS.API_BASE + "/api/v1/auth/register",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
          timeout: 8000,
        });
        return { success: true, message: response.message };
      } catch (apiErr) {
        const errorResponse = apiErr.responseJSON || {};
        return { error: errorResponse.message || "Đăng ký thất bại. Vui lòng thử lại." };
      }
    },

    /** Đăng xuất */
    logout() {
      if (_session) {
        $.ajax({
          url: FS.API_BASE + "/api/v1/auth/logout",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({}),
        }).fail(err => console.error("Backend logout failed.", err));
      }
      _session = null;
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "login.html";
    },

    async forgotPassword(email) {
      try {
        const response = await $.ajax({
          url: FS.API_BASE + "/api/v1/auth/forgot-password",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({ email }),
        });
        return { success: true, message: response.message };
      } catch (apiErr) {
        const errorResponse = apiErr.responseJSON || {};
        return { error: errorResponse.message || "Yêu cầu thất bại. Vui lòng thử lại." };
      }
    },

    async resetPassword(email, token, newPassword) {
      try {
        const response = await $.ajax({
          url: FS.API_BASE + "/api/v1/auth/reset-password",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({ email, token, newPassword }),
        });
        return { success: true, message: response.message };
      } catch (apiErr) {
        const errorResponse = apiErr.responseJSON || {};
        return { error: errorResponse.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại." };
      }
    },

    async verifyEmail(email, token) {
      try {
        const response = await $.ajax({
          url: FS.API_BASE + "/api/v1/auth/verify-email",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({ email, token }),
        });
        return { success: true, message: response.message };
      } catch (apiErr) {
        const errorResponse = apiErr.responseJSON || {};
        return { error: errorResponse.message || "Xác thực email thất bại. Vui lòng thử lại." };
      }
    },

    async resendVerification(email) {
      try {
        const response = await $.ajax({
          url: FS.API_BASE + "/api/v1/auth/resend-verification",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({ email }),
        });
        return { success: true, message: response.message };
      } catch (apiErr) {
        const errorResponse = apiErr.responseJSON || {};
        return { error: errorResponse.message || "Gửi lại email xác thực thất bại. Vui lòng thử lại." };
      }
    },

    /** Lấy session hiện tại */
    getSession() { return _session; },

    /** Kiểm tra đã đăng nhập chưa */
    isLoggedIn() { return !!_session; },

    /** Lấy role level của user hiện tại */
    getRoleLevel() {
      if (!_session || !_session.role) return 1;
      const r = String(_session.role).toLowerCase().replace(/[^a-z]/g, '');
      if (r.includes('admin') || r.includes('director') || r.includes('giamdoc')) return 4;
      if (r.includes('manager') || r.includes('truongphong')) return 3;
      if (r.includes('lead') || r.includes('truongnhom')) return 2;
      return ROLE_LEVELS[String(_session.role).toLowerCase()] || 1;
    },

    /** Kiểm tra có quyền truy cập trang không */
    canAccess(page) { const required = PAGE_ACCESS[page] || 99; return this.getRoleLevel() >= required; },

    /** Kiểm tra có tối thiểu role level không */
    hasLevel(minLevel) { return this.getRoleLevel() >= minLevel; },

    /** Tiện ích kiểm tra role */
    isEmployee() { return _session?.role === "employee"; },
    isTeamLead() { return this.getRoleLevel() >= ROLE_LEVELS.team_lead; },
    isManager() { return this.getRoleLevel() >= ROLE_LEVELS.manager; },
    isDirector() { return _session?.role === "director"; },

    /** Lấy role label */
    getRoleLabel(role) { return ROLE_LABELS[role] || role; },

    /** Bảo vệ trang — gọi ở đầu app.html */
    guard() { if (!this.isLoggedIn()) { window.location.href = "login.html"; return false; } return true; },

    /** Cập nhật thông tin user trong session */
    updateUser(updates) {
      if (!_session) return false;
      if (updates.name) _session.name = updates.name;
      if (updates.email) _session.email = updates.email;
      if (updates.avatar) _session.avatar = updates.avatar;
      if (updates.role) _session.role = updates.role;
      persistSession();
      return true;
    },

    /** Xác thực password hiện tại */
    verifyPassword(currentPassword) {
      // Not applicable in in-memory mode – assume always true for demo
      return true;
    },
  };

  // Export constants
  FS.ROLE_LEVELS = ROLE_LEVELS;
  FS.ROLE_LABELS = ROLE_LABELS;
  FS.PAGE_ACCESS = PAGE_ACCESS;
})(window.FS = window.FS || {});
