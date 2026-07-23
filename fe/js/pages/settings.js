/**
 * FlowSpace — Settings Module
 * Quản lý cài đặt cá nhân và cấu hình quản trị hệ thống
 */
(function (FS, $) {
  'use strict';

  FS.pages.settings = {
    _activeTab: 'personal',
    _categories: {},
    _workflowRules: [],
    _slaSettings: [],
    _notificationTemplates: [],

    async init() {
      // 1. Cài đặt cá nhân mặc định (Instant 0ms SWR render)
      this._renderProfile();
      this._renderNotifToggles();
      this._loadThemeState();
      
      // 2. Phân quyền hiển thị các Tab cấu hình Admin
      this._checkPermissions();

      // 3. Khởi tạo dữ liệu từ LocalStorage
      this._loadAdminData();

      // 4. Bind events
      this._bindEvents();
      this._bindAdminEvents();

      // Hiển thị tab mặc định
      this._switchTab(this._activeTab);

      // 5. Cập nhật cache người dùng từ Backend API trong background
      try {
        await FS.loadUsersCache();
        this._renderProfile();
      } catch (e) {
        console.warn('loadUsersCache failed in settings page:', e);
      }
    },

    _checkPermissions() {
      const level = FS.auth.getRoleLevel();
      // Manager/Director (level >= 3) xem được các tab Admin
      if (level >= 3) {
        $('.fs-admin-only').show();
      } else {
        $('.fs-admin-only').hide();
      }

      // Director (level >= 4) xem được tab System
      if (level >= 4) {
        $('.fs-director-only').show();
        this._renderSystemInfo();
      } else {
        $('.fs-director-only').hide();
      }
    },

    _loadAdminData() {
      this._categories = JSON.parse(localStorage.getItem('fs_categories') || '{}');
      this._workflowRules = JSON.parse(localStorage.getItem('fs_workflow_rules') || '[]');
      this._slaSettings = JSON.parse(localStorage.getItem('fs_sla_settings') || '[]');
      this._notificationTemplates = JSON.parse(localStorage.getItem('fs_notification_templates') || '[]');
    },

    _switchTab(tabName) {
      this._activeTab = tabName;
      
      // Toggle tabs UI
      $('#settings-tabs .fs-tab').removeClass('active');
      $(`#settings-tabs .fs-tab[data-tab="${tabName}"]`).addClass('active');

      // Toggle content UI
      $('.settings-tab-content').hide();
      $(`#tab-${tabName}`).show();

      // Render data cho tab tương ứng
      if (tabName === 'categories') {
        this._renderCategories();
      } else if (tabName === 'workflows') {
        this._renderWorkflows();
      } else if (tabName === 'sla') {
        this._renderSla();
      } else if (tabName === 'templates') {
        this._renderTemplates();
      }
    },

    /* ── 1. Cài đặt cá nhân (Profile, Theme, Notifs) ───────── */
    _renderProfile() {
      const session = FS.auth.getSession();
      if (!session) return;
      
      const $avatar = $('#settings-avatar');
      $avatar.text(session.avatar).removeClass().addClass('fs-avatar');
      if (session.color && session.color.startsWith('#')) {
        $avatar.css('background-color', session.color);
      } else {
        $avatar.addClass(session.color || 'av-indigo');
      }
      
      $('#settings-name').text(session.name);
      $('#settings-email').text(session.email);
      $('#settings-display-name').val(session.name);
      $('#settings-user-email').val(session.email);
      $('#settings-role-badge').html(`<span class="fs-badge badge-accent">${FS.auth.getRoleLabel(session.role)}</span>`);
    },

    _renderNotifToggles() {
      const toggles = [
        { key: 'notif_task_assign',    label: 'Khi được giao task' },
        { key: 'notif_task_due',       label: 'Task sắp đến hạn' },
        { key: 'notif_task_done',      label: 'Task hoàn thành' },
        { key: 'notif_request',        label: 'Yêu cầu cần duyệt' },
        { key: 'notif_mention',        label: 'Được nhắc tới trong chat' },
        { key: 'notif_project_update', label: 'Cập nhật dự án' }
      ];

      const prefs = JSON.parse(localStorage.getItem('fs_notif_prefs') || '{}');

      $('#settings-notif-toggles').html(toggles.map(t => {
        const checked = prefs[t.key] !== false;
        return `
          <div class="d-flex align-items-center justify-content-between py-2" style="border-bottom:1px solid var(--fs-border)">
            <span style="font-size:13px">${t.label}</span>
            <label class="fs-toggle">
              <input type="checkbox" class="notif-toggle" data-key="${t.key}" ${checked ? 'checked' : ''}>
              <span class="fs-toggle-slider"></span>
            </label>
          </div>`;
      }).join(''));
    },

    _loadThemeState() {
      const theme  = localStorage.getItem('fs_theme') || 'light';
      const accent = localStorage.getItem('fs_accent') || '#6366f1';
      const fontSize = localStorage.getItem('fs_font_size') || '14';

      if (theme === 'dark') {
        $('html').addClass('dark-mode');
        $('#theme-dark-btn').addClass('active');
        $('#theme-light-btn').removeClass('active');
      } else {
        $('html').removeClass('dark-mode');
        $('#theme-light-btn').addClass('active');
        $('#theme-dark-btn').removeClass('active');
      }

      $('.color-swatch').css('border-color', 'transparent');
      $(`.color-swatch[data-color="${accent}"]`).css('border-color', '#1e293b');

      $('#settings-font-size').val(fontSize);
      document.documentElement.style.setProperty('--fs-font-size', fontSize + 'px');
    },

    _renderSystemInfo() {
      $('#settings-system-row').show();
      const items = [
        { label: 'Người dùng',    value: FS.db.get('users').length,        icon: 'bi-people' },
        { label: 'Dự án',         value: FS.db.get('projects').length,      icon: 'bi-folder2' },
        { label: 'Tasks',          value: FS.db.get('tasks').length,         icon: 'bi-check-square' },
        { label: 'Nhật ký',       value: FS.db.get('system_logs').length,   icon: 'bi-journal' },
        { label: 'Tài liệu',      value: FS.db.get('documents').length,     icon: 'bi-file-earmark' },
        { label: 'Giờ được log',  value: FS.db.get('time_logs').reduce((s,l)=>s+(l.hours||0),0) + 'h', icon: 'bi-clock' }
      ];
      $('#settings-sys-stats').html(items.map(i => `
        <div class="col-6 col-md-4 col-lg-2">
          <div class="fs-stat-card" style="padding:12px">
            <div class="fs-stat-icon" style="width:32px;height:32px"><i class="bi ${i.icon}"></i></div>
            <div class="fs-stat-value" style="font-size:20px">${i.value}</div>
            <div class="fs-stat-label" style="font-size:11px">${i.label}</div>
          </div>
        </div>`).join(''));
    },

    /* ── 2. Cấu hình Admin: Categories CRUD ───────────────── */
    _renderCategories() {
      const type = $('#cat-select-type').val();
      const list = this._categories[type] || [];
      const titleMap = {
        project_types: 'Loại dự án',
        task_types: 'Loại công việc',
        request_types: 'Loại yêu cầu phê duyệt',
        priorities: 'Mức độ ưu tiên'
      };

      $('#cat-list-title').text('Danh sách ' + titleMap[type]);

      if (!list.length) {
        $('#cat-list-body').html('<tr><td colspan="3"><div class="fs-empty"><i class="bi bi-tag"></i><p>Chưa có mục nào trong danh mục này</p></div></td></tr>');
        return;
      }

      $('#cat-list-body').html(list.map(item => `
        <tr class="hover-row">
          <td><span class="fs-badge badge-neutral" style="font-family:monospace;font-size:11px;padding:2px 6px">${item.id}</span></td>
          <td style="font-weight:500;font-size:13px">${FS.str.escape(item.name)}</td>
          <td style="text-align:right">
            <button class="btn btn-ghost btn-icon btn-sm cat-edit-btn" data-id="${item.id}" title="Sửa">
              <i class="bi bi-pencil" style="color:var(--fs-primary);font-size:12px"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm cat-delete-btn" data-id="${item.id}" title="Xoá">
              <i class="bi bi-trash3" style="color:var(--fs-danger);font-size:12px"></i>
            </button>
          </td>
        </tr>`).join(''));
    },

    _saveCategory() {
      const type = $('#cat-select-type').val();
      const id = $('#cat-modal-id').val();
      const name = $('#cat-modal-name').val().trim();

      if (!name) {
        FS.toast('Vui lòng nhập tên mục!', 'warning');
        return;
      }

      this._categories[type] = this._categories[type] || [];

      if (id) {
        // Edit mode
        const item = this._categories[type].find(x => x.id === id);
        if (item) item.name = name;
      } else {
        // Add mode
        const newId = 'cat_' + type.slice(0, 2) + '_' + Math.random().toString(36).slice(2, 7);
        this._categories[type].push({ id: newId, name: name });
      }

      localStorage.setItem('fs_categories', JSON.stringify(this._categories));
      $('#cat-modal-overlay').hide();
      this._renderCategories();
      FS.toast('Cập nhật danh mục thành công!', 'success');
    },

    _deleteCategory(id) {
      const type = $('#cat-select-type').val();
      FS.confirm('Bạn có chắc chắn muốn xoá mục này khỏi danh mục?', () => {
        this._categories[type] = (this._categories[type] || []).filter(x => x.id !== id);
        localStorage.setItem('fs_categories', JSON.stringify(this._categories));
        this._renderCategories();
        FS.toast('Đã xoá mục danh mục!', 'success');
      }, { danger: true, confirmText: 'Xoá' });
    },

    /* ── 3. Cấu hình Admin: Workflow Engine CRUD ──────────── */
    _renderWorkflows() {
      const reqLabels = { leave: 'Nghỉ phép', overtime: 'Tăng ca', purchase: 'Mua sắm', remote: 'Làm remote' };
      
      if (!this._workflowRules.length) {
        $('#wf-rules-body').html('<tr><td colspan="5"><div class="fs-empty"><i class="bi bi-diagram-3"></i><p>Chưa có quy tắc phê duyệt nào</p></div></td></tr>');
        return;
      }

      $('#wf-rules-body').html(this._workflowRules.map(rule => {
        const valueNum = parseInt(rule.value) || 0;
        const conditionText = rule.operator === 'gt' 
          ? `Lớn hơn (>) ${valueNum.toLocaleString()}` 
          : `Bằng (=) ${valueNum.toLocaleString()}`;
        
        return `
          <tr class="hover-row">
            <td style="font-weight:600;font-size:13px">${FS.str.escape(rule.name)}</td>
            <td><span class="fs-badge badge-neutral">${reqLabels[rule.reqType] || rule.reqType}</span></td>
            <td style="font-family:monospace;font-size:12px">${conditionText}</td>
            <td><span class="fs-badge badge-accent">${FS.str.escape(rule.maxRole)}</span></td>
            <td style="text-align:right">
              <button class="btn btn-ghost btn-icon btn-sm wf-edit-btn" data-id="${rule.id}" title="Sửa">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm wf-delete-btn" data-id="${rule.id}" title="Xoá">
                <i class="bi bi-trash text-danger"></i>
              </button>
            </td>
          </tr>`;
      }).join(''));
    },

    async _saveWorkflowRule() {
      const id = $('#wf-modal-id').val();
      const name = $('#wf-modal-name').val().trim();
      const reqType = $('#wf-modal-req-type').val();
      const operator = $('#wf-modal-operator').val();
      const value = parseInt($('#wf-modal-value').val());
      const maxRole = $('#wf-modal-role').val(); // Chứa chuỗi vai trò ví dụ "team_lead,manager"

      if (!name) {
        FS.toast('Vui lòng nhập tên quy tắc!', 'warning');
        return;
      }
      if (isNaN(value) || value < 0) {
        FS.toast('Giá trị so sánh không hợp lệ!', 'warning');
        return;
      }

      const payload = {
        requestType: reqType,
        name: name,
        minAmount: operator === 'gt' ? value : null,
        maxAmount: null,
        sequenceSteps: maxRole,
        isActive: true
      };

      try {
        let response;
        if (id && !id.startsWith('wf_rule_')) {
          response = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/workflowrules/' + id,
            type: 'PUT',
            data: payload
          });
        } else {
          response = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/workflowrules',
            type: 'POST',
            data: payload
          });
        }

        if (response && response.success) {
          FS.toast('Cập nhật quy tắc phê duyệt thành công!', 'success');
          $('#wf-modal-overlay').hide();
          await this._loadAdminData();
          this._renderWorkflows();
        } else {
          FS.toast('Máy chủ báo lỗi khi cập nhật quy tắc.', 'error');
        }
      } catch (err) {
        console.error('Save workflow rule error:', err);
        FS.toast('Không thể cập nhật quy tắc lên máy chủ. Vui lòng thử lại!', 'error');
      }
    },

    async _deleteWorkflowRule(id) {
      FS.confirm('Xoá quy tắc phê duyệt này? Yêu cầu mới sẽ áp dụng quy trình mặc định.', async () => {
        if (id && !id.startsWith('wf_rule_')) {
          try {
            const response = await FS.apiCall({
              url: FS.API_BASE + '/api/v1/workflowrules/' + id,
              type: 'DELETE'
            });
            if (response && response.success) {
              FS.toast('Đã xoá quy tắc phê duyệt!', 'success');
              await this._loadAdminData();
              this._renderWorkflows();
              return;
            }
          } catch (err) {
            console.error('Delete workflow rule failed:', err);
          }
          FS.toast('Không thể xoá quy tắc trên máy chủ.', 'error');
        } else {
          this._workflowRules = this._workflowRules.filter(x => x.id !== id);
          localStorage.setItem('fs_workflow_rules', JSON.stringify(this._workflowRules));
          this._renderWorkflows();
          FS.toast('Đã xoá quy tắc phê duyệt!', 'success');
        }
      }, { danger: true, confirmText: 'Xoá' });
    },

    /* ── 4. Cấu hình Admin: SLA Settings ──────────────────── */
    _renderSla() {
      const reqLabels = { leave: '🏖️ Nghỉ phép (leave)', overtime: '⏰ Tăng ca (overtime)', purchase: '🛒 Mua sắm (purchase)', remote: '🏠 Làm remote (remote)' };
      
      $('#sla-settings-list').html(this._slaSettings.map(sla => `
        <div class="row g-2 align-items-center py-2" style="border-bottom:1px solid var(--fs-border)">
          <div class="col-12 col-md-6" style="font-weight:600;font-size:13px">
            ${reqLabels[sla.reqType] || sla.name}
          </div>
          <div class="col-12 col-md-6 d-flex align-items-center gap-2">
            <input type="number" class="fs-input sla-hours-input" data-type="${sla.reqType}" value="${sla.hours || 24}" min="1" style="max-width:120px">
            <span style="font-size:13px;color:var(--fs-text-secondary)">giờ để phê duyệt</span>
          </div>
        </div>`).join(''));
    },

    _saveSla() {
      const self = this;
      $('.sla-hours-input').each(function () {
        const type = $(this).data('type');
        const val = parseInt($(this).val());
        const item = self._slaSettings.find(x => x.reqType === type);
        if (item && !isNaN(val) && val > 0) {
          item.hours = val;
        }
      });

      localStorage.setItem('fs_sla_settings', JSON.stringify(this._slaSettings));
      FS.toast('Lưu thiết lập SLA thành công!', 'success');
    },

    /* ── 5. Cấu hình Admin: Notification Templates ────────── */
    _renderTemplates(selectKey = null) {
      const $select = $('#template-select');
      if (!this._notificationTemplates.length) {
        $select.html('<option value="">-- Chưa có mẫu nào --</option>');
        $('#template-edit-title').text('Nội dung mẫu');
        $('#template-subject').val('');
        $('#template-body').val('');
        $('#template-preview-subject').text('');
        $('#template-preview-body').text('');
        return;
      }

      $select.html(this._notificationTemplates.map(t => 
        `<option value="${t.key}">${FS.str.escape(t.name)}</option>`).join(''));

      // Chọn key được chỉ định hoặc mặc định chọn template đầu tiên
      const keyToSelect = selectKey || this._notificationTemplates[0].key;
      $select.val(keyToSelect);
      this._loadTemplate(keyToSelect);
    },

    _loadTemplate(key) {
      const template = this._notificationTemplates.find(t => t.key === key);
      if (!template) return;

      $('#template-edit-title').text('Nội dung mẫu: ' + template.name);
      $('#template-subject').val(template.subject || '');
      $('#template-body').val(template.body || '');
      this._updateTemplatePreview();
    },

    _saveTemplate() {
      const key = $('#template-select').val();
      if (!key) return;

      const subject = $('#template-subject').val().trim();
      const body = $('#template-body').val().trim();

      if (!subject || !body) {
        FS.toast('Tiêu đề và Nội dung không được để trống!', 'warning');
        return;
      }

      const template = this._notificationTemplates.find(t => t.key === key);
      if (template) {
        template.subject = subject;
        template.body = body;
        localStorage.setItem('fs_notification_templates', JSON.stringify(this._notificationTemplates));
        this._updateTemplatePreview();
        FS.toast('Đã cập nhật mẫu thông báo thành công!', 'success');
      }
    },

    _deleteTemplate() {
      const key = $('#template-select').val();
      if (!key) {
        FS.toast('Không có mẫu nào để xoá!', 'warning');
        return;
      }

      FS.confirm('Xoá mẫu thông báo này? Hệ thống sẽ mất mẫu gửi sự kiện tương ứng.', () => {
        this._notificationTemplates = this._notificationTemplates.filter(t => t.key !== key);
        localStorage.setItem('fs_notification_templates', JSON.stringify(this._notificationTemplates));
        this._renderTemplates();
        FS.toast('Đã xoá mẫu thông báo!', 'success');
      }, { danger: true, confirmText: 'Xoá' });
    },

    _saveNewTemplate() {
      const key = $('#template-modal-key').val().trim().toLowerCase();
      const name = $('#template-modal-name').val().trim();
      const subject = $('#template-modal-subject').val().trim();
      const body = $('#template-modal-body').val().trim();

      if (!key || !name || !subject || !body) {
        FS.toast('Vui lòng điền đầy đủ tất cả các trường!', 'warning');
        return;
      }

      if (this._notificationTemplates.some(t => t.key === key)) {
        FS.toast('Mã key đã tồn tại! Vui lòng chọn key khác.', 'warning');
        return;
      }

      const newTemplate = { key, name, subject, body };
      this._notificationTemplates.push(newTemplate);
      localStorage.setItem('fs_notification_templates', JSON.stringify(this._notificationTemplates));
      $('#template-modal-overlay').hide();
      this._renderTemplates(key);
      FS.toast('Đã thêm mẫu thông báo mới thành công!', 'success');
    },

    _updateTemplatePreview() {
      const subject = $('#template-subject').val() || '';
      const body = $('#template-body').val() || '';
      
      const replaceMap = {
        '{user_name}': 'Phạm Thanh Dung',
        '{task_title}': 'Thiết kế UI Dashboard mới',
        '{project_name}': 'FlowSpace Platform v2',
        '{due_date}': '15/07/2026',
        '{request_title}': 'Xin nghỉ phép 2 ngày',
        '{approver_name}': 'Lê Minh Cường',
        '{note}': 'Đồng ý phê duyệt.'
      };

      let renderedSubject = subject;
      let renderedBody = body;

      Object.entries(replaceMap).forEach(([placeholder, val]) => {
        renderedSubject = renderedSubject.split(placeholder).join(val);
        renderedBody = renderedBody.split(placeholder).join(val);
      });

      $('#template-preview-subject').text(renderedSubject);
      $('#template-preview-body').text(renderedBody);
    },

    /* ── Bind Event Listeners ────────────────────────────── */
    _bindEvents() {
      const self = this;

      // Tab switcher event
      $(document).off('click.settings-tab').on('click.settings-tab', '#settings-tabs .fs-tab', function (e) {
        e.preventDefault();
        self._switchTab($(this).data('tab'));
      });

      // Profile save
      $('#settings-save-profile').off('click').on('click', function () {
        const name = $('#settings-display-name').val().trim();
        const email = $('#settings-user-email').val().trim();
        if (!name || !email) {
          FS.toast('Vui lòng điền đầy đủ tên và email.', 'error');
          return;
        }
        
        // Email validation regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          FS.toast('Email không hợp lệ.', 'error');
          return;
        }

        const session = FS.auth.getSession();
        if (session) {
          const avatar = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const updated = FS.auth.updateUser({ name, email, avatar });
          
          if (updated) {
            // Cập nhật UI sidebar và topbar
            $('#sidebar-user-name').text(name);
            $('#topbar-user-name').text(name.split(' ').pop());
            $('#topbar-user-avatar').text(avatar);
            
            // Ghi nhận log
            FS.auth._appendLog && FS.auth._appendLog(session.userId, 'UPDATE', 'Settings', 'Cập nhật thông tin hồ sơ cá nhân');
            FS.toast('Đã cập nhật hồ sơ thành công!', 'success');
            
            // Re-render
            self._renderProfile();
          } else {
            FS.toast('Cập nhật hồ sơ thất bại.', 'error');
          }
        }
      });

      // Change password
      $('#settings-change-password').off('click').on('click', function () {
        const oldPwd = $('#settings-old-password').val();
        const newPwd = $('#settings-new-password').val();
        const confirmPwd = $('#settings-confirm-password').val();

        if (!oldPwd || !newPwd || !confirmPwd) {
          FS.toast('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
          return;
        }

        if (newPwd.length < 8) {
          FS.toast('Mật khẩu mới phải có tối thiểu 8 ký tự.', 'error');
          return;
        }

        if (newPwd !== confirmPwd) {
          FS.toast('Mật khẩu mới và mật khẩu xác nhận không khớp.', 'error');
          return;
        }

        const verified = FS.auth.verifyPassword(oldPwd);
        if (!verified) {
          FS.toast('Mật khẩu hiện tại không chính xác.', 'error');
          return;
        }

        const updated = FS.auth.updateUser({ password: newPwd });
        if (updated) {
          FS.toast('Đổi mật khẩu thành công!', 'success');
          // Clear inputs
          $('#settings-old-password').val('');
          $('#settings-new-password').val('');
          $('#settings-confirm-password').val('');
        } else {
          FS.toast('Không thể đổi mật khẩu.', 'error');
        }
      });

      // Theme toggle
      $(document).off('click.theme').on('click.theme', '.theme-btn', function () {
        const theme = $(this).data('theme');
        $('.theme-btn').removeClass('active');
        $(this).addClass('active');
        if (theme === 'dark') {
          $('html').addClass('dark-mode');
        } else {
          $('html').removeClass('dark-mode');
        }
        localStorage.setItem('fs_theme', theme);
        FS.toast(`Đã chuyển sang chế độ ${theme === 'dark' ? 'tối 🌙' : 'sáng ☀️'}`, 'success');
      });

      // Accent color swatches
      $(document).off('click.accent').on('click.accent', '.color-swatch', function () {
        const color = $(this).data('color');
        $('.color-swatch').css('border-color', 'transparent');
        $(this).css('border-color', '#1e293b');
        document.documentElement.style.setProperty('--fs-accent', color);
        document.documentElement.style.setProperty('--fs-accent-light', color + '20');
        localStorage.setItem('fs_accent', color);
        FS.toast('Đã thay đổi màu accent', 'success');
      });

      // Font size select
      $('#settings-font-size').off('change').on('change', function () {
        const size = this.value;
        document.documentElement.style.setProperty('--fs-font-size', size + 'px');
        localStorage.setItem('fs_font_size', size);
        FS.toast(`Cỡ chữ: ${size}px`, 'success');
      });

      // Notifications preference toggles
      $(document).off('change.notif').on('change.notif', '.notif-toggle', function () {
        const prefs = JSON.parse(localStorage.getItem('fs_notif_prefs') || '{}');
        prefs[this.dataset.key] = this.checked;
        localStorage.setItem('fs_notif_prefs', JSON.stringify(prefs));
      });

      // Reset Demo Data
      $('#settings-reset-btn').off('click').on('click', function () {
        FS.confirm('Reset toàn bộ dữ liệu demo? Việc này sẽ xoá sạch các thay đổi hiện tại của bạn.', () => {
          Object.keys(localStorage).filter(k => k.startsWith('fs_')).forEach(k => localStorage.removeItem(k));
          FS.toast('Đã reset! Đang tải lại ứng dụng...', 'success');
          setTimeout(() => location.reload(), 1200);
        }, { danger: true, confirmText: 'Reset', title: 'Reset dữ liệu' });
      });

      // Clear Logs
      $('#settings-clear-logs-btn').off('click').on('click', function () {
        FS.confirm('Xoá toàn bộ nhật ký hệ thống?', () => {
          FS.db.set('system_logs', []);
          self._renderSystemInfo();
          FS.toast('Đã xoá nhật ký hệ thống', 'success');
        }, { danger: true, confirmText: 'Xoá' });
      });
    },

    _bindAdminEvents() {
      const self = this;

      // Categories select type change
      $('#cat-select-type').off('change').on('change', () => this._renderCategories());

      // Category Add
      $('#cat-add-btn').off('click').on('click', function () {
        $('#cat-modal-title').text('Thêm mục danh mục');
        $('#cat-modal-id').val('');
        $('#cat-modal-name').val('');
        $('#cat-modal-overlay').show();
      });

      // Category Edit click
      $(document).off('click.cat-edit').on('click.cat-edit', '.cat-edit-btn', function () {
        const type = $('#cat-select-type').val();
        const id = $(this).data('id');
        const item = self._categories[type].find(x => x.id === id);
        if (item) {
          $('#cat-modal-title').text('Sửa mục danh mục');
          $('#cat-modal-id').val(item.id);
          $('#cat-modal-name').val(item.name);
          $('#cat-modal-overlay').show();
        }
      });

      // Category Delete
      $(document).off('click.cat-delete').on('click.cat-delete', '.cat-delete-btn', function () {
        self._deleteCategory($(this).data('id'));
      });

      // Category Modal Close
      $('#cat-modal-close, #cat-modal-cancel').off('click').on('click', () => $('#cat-modal-overlay').hide());
      $('#cat-modal-overlay').off('click').on('click', function (e) {
        if (e.target === this) $(this).hide();
      });
      $('#cat-modal-save').off('click').on('click', () => this._saveCategory());

      // Workflow Rules Add
      $('#wf-add-btn').off('click').on('click', function () {
        $('#wf-modal-title').text('Thêm quy tắc phê duyệt');
        $('#wf-modal-id').val('');
        $('#wf-modal-name').val('');
        $('#wf-modal-req-type').val('leave');
        $('#wf-modal-operator').val('gt');
        $('#wf-modal-value').val('');
        $('#wf-modal-role').val('team_lead');
        $('#wf-modal-overlay').show();
      });

      // Workflow Rules Edit click
      $(document).off('click.wf-edit').on('click.wf-edit', '.wf-edit-btn', function () {
        const id = $(this).data('id');
        const rule = self._workflowRules.find(x => x.id === id);
        if (rule) {
          $('#wf-modal-title').text('Sửa quy tắc phê duyệt');
          $('#wf-modal-id').val(rule.id);
          $('#wf-modal-name').val(rule.name);
          $('#wf-modal-req-type').val(rule.reqType);
          $('#wf-modal-operator').val(rule.operator);
          $('#wf-modal-value').val(rule.value);
          $('#wf-modal-role').val(rule.maxRole);
          $('#wf-modal-overlay').show();
        }
      });

      // Workflow Rules Delete
      $(document).off('click.wf-delete').on('click.wf-delete', '.wf-delete-btn', function () {
        self._deleteWorkflowRule($(this).data('id'));
      });

      // Workflow Modal Close
      $('#wf-modal-close, #wf-modal-cancel').off('click').on('click', () => $('#wf-modal-overlay').hide());
      $('#wf-modal-overlay').off('click').on('click', function (e) {
        if (e.target === this) $(this).hide();
      });
      $('#wf-modal-save').off('click').on('click', () => this._saveWorkflowRule());

      // SLA Save Button
      $('#sla-save-btn').off('click').on('click', () => this._saveSla());

      // Template Select change
      $('#template-select').off('change').on('change', function () {
        self._loadTemplate(this.value);
      });
      // Template Save
      $('#template-save-btn').off('click').on('click', () => this._saveTemplate());

      // Live Preview Inputs
      $('#template-subject, #template-body').off('input').on('input', () => this._updateTemplatePreview());

      // Template Add Click
      $('#template-add-btn').off('click').on('click', function () {
        $('#template-modal-key').val('');
        $('#template-modal-name').val('');
        $('#template-modal-subject').val('');
        $('#template-modal-body').val('');
        $('#template-modal-overlay').show();
      });

      // Template Delete Click
      $('#template-delete-btn').off('click').on('click', () => this._deleteTemplate());

      // Template Modal Actions
      $('#template-modal-close, #template-modal-cancel').off('click').on('click', () => $('#template-modal-overlay').hide());
      $('#template-modal-overlay').off('click').on('click', function (e) {
        if (e.target === this) $(this).hide();
      });
      $('#template-modal-save').off('click').on('click', () => this._saveNewTemplate());

      // Integration Demo Toast Connection
      $(document).off('click.integration').on('click.integration', '.btn-integration-connect', function () {
        const platform = $(this).data('platform');
        FS.toast(`Đang kết nối tới ${platform}... Tính năng này chỉ ở dạng Demo!`, 'info');
      });
    }
  };

})(window.FS = window.FS || {}, jQuery);