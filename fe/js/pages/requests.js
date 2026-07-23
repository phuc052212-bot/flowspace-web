(function (FS, $) {
  'use strict';

  FS.pages.requests = {
    _tab: 'all',
    _requestsData: [],
    _editMode: false, // true when editing an existing request
    _editRequestId: null,

    async init() {
      await this._loadData();
      this._bindEvents();
    },

    _getAuthHeaders() {
      const session = FS.auth.getSession();
      return session && session.token ? { 'Authorization': 'Bearer ' + session.token } : {};
    },

    /**
     * Load the current user's requests from the backend.
     * Falls back to local storage if the API call fails.
     */
    async _loadData() {
      const session = FS.auth.getSession();
      const userId = session?.userId;
      try {
        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/requests',
          type: 'GET',
          data: userId ? { requesterId: userId } : {}
        });

        if (response && response.success && Array.isArray(response.data)) {
          // Normalise data shape for the UI
          this._requestsData = response.data.map(r => ({
            id: r.id,
            type: (r.type || 'leave').toLowerCase(),
            title: r.title,
            description: r.description || '',
            requesterId: r.requesterId,
            requesterName: r.requesterName || '',
            status: (r.status || 'pending').toLowerCase(),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            approvals: (r.approvals || []).map(a => ({
              id: a.id,
              level: a.level,
              role: a.role,
              approverId: a.approverId,
              approverName: a.approverName || '',
              status: (a.status || 'pending').toLowerCase(),
              note: a.note || '',
              updatedAt: a.updatedAt
            }))
          }));
          $('#requests-offline-banner').remove();
        } else {
          // Unexpected payload – fall back to local storage
          try {
            this._requestsData = FS.db.get('requests') || [];
          } catch (dbErr) {
            console.error('Failed to read requests from local storage:', dbErr);
            this._requestsData = [];
          }
        }
      } catch (err) {
        console.warn('Requests API failed:', err);
        try {
          this._requestsData = FS.db.get('requests') || [];
        } catch (dbErr) {
          console.error('Failed to read requests from local storage:', dbErr);
          this._requestsData = [];
        }
        if (!$('#requests-offline-banner').length) {
          $('#page-content').prepend('<div id="requests-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu yêu cầu tạm thời ngoại tuyến.</span></div>');
        }
      }
      this._render();
    },

    /**
     * Helper to decide whether the current user can edit / delete a request.
     * Only pending requests created by the current user are editable.
     */
    _canEdit(req) {
      const session = FS.auth.getSession();
      return req.status === 'pending' && req.requesterId === session?.userId;
    },

    _getFilteredData() {
      const session = FS.auth.getSession();
      let requests = [...this._requestsData];

      if (!FS.auth.isManager()) {
        requests = requests.filter(r => r.requesterId === session?.userId);
      }

      if (this._tab !== 'all') {
        requests = requests.filter(r => r.status.toLowerCase() === this._tab.toLowerCase());
      }
      return requests;
    },

    _render() {
      const requests = this._getFilteredData();
      $('#req-count-label').text(`${requests.length} yêu cầu`);

      if (!requests.length) {
        $('#req-list').html('<div class="fs-empty"><i class="bi bi-inbox"></i><h5>Không có yêu cầu nào</h5><p>Nhấn "Tạo yêu cầu" để gửi yêu cầu mới</p></div>');
        return;
      }

      const html = requests.map(r => {
        const requesterName = r.requesterName || (FS.db.find('users', r.requesterId)?.name || '—');
        const approvals = r.approvals || [];
        const currentStep = approvals.find(a => a.status === 'pending');
        const canEdit = this._canEdit(r);
        return `
          <div class="fs-card fs-card-sm mb-2 hover-row cursor-pointer req-item" data-req-id="${r.id}" style="border-radius:var(--fs-radius-md)">
            <div class="d-flex align-items-start gap-3">
              <div>
                ${FS.user.avatar(r.requesterId)}
              </div>
              <div style="flex:1;min-width:0">
                <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <span style="font-size:13px;font-weight:600">${FS.str.escape(r.title)}</span>
                  ${FS.badge.reqType(r.type)}
                  ${FS.badge.status(r.status)}
                </div>
                <p style="font-size:12px;color:var(--fs-text-secondary);margin-bottom:8px" class="truncate">${FS.str.escape(r.description)}</p>
                <div class="d-flex align-items-center gap-3">
                  <span class="fs-small"><i class="bi bi-person me-1"></i>${FS.str.escape(requesterName)}</span>
                  <span class="fs-small"><i class="bi bi-calendar3 me-1"></i>${FS.date.format(r.createdAt)}</span>
                  ${currentStep ? `<span class="fs-small text-warning"><i class="bi bi-hourglass-split me-1"></i>Đang chờ ${FS.auth.getRoleLabel(currentStep.role)}</span>` : ''}
                </div>
                ${canEdit ? `
                  <div class="mt-2 d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary req-edit-btn" data-req-id="${r.id}"><i class="bi bi-pencil"></i> Sửa</button>
                    <button class="btn btn-sm btn-outline-danger req-delete-btn" data-req-id="${r.id}"><i class="bi bi-trash"></i> Xóa</button>
                  </div>
                ` : ''}
              </div>
              <!-- Approval steps indicator -->
              <div class="d-flex gap-1 align-items-center flex-shrink-0">
                ${(r.approvals || []).map(a => `
                  <div title="${FS.auth.getRoleLabel(a.role)}: ${a.status === 'approved' ? 'Đã duyệt' : a.status === 'rejected' ? 'Từ chối' : 'Chờ'}"
                       style="width:10px;height:10px;border-radius:50%;background:${a.status === 'approved' ? 'var(--fs-success)' : a.status === 'rejected' ? 'var(--fs-danger)' : 'var(--fs-border)'}"></div>
                `).join('<div style="width:16px;height:2px;background:var(--fs-border)"></div>')}
              </div>
            </div>
          </div>`;
      }).join('');

      $('#req-list').html(html);
    },

    _openDetail(reqId) {
      const r = this._requestsData.find(x => x.id === reqId) || FS.db.find('requests', reqId);
      if (!r) return;
      const requesterName = r.requesterName || (FS.db.find('users', r.requesterId)?.name || '—');

      const approvalSteps = (r.approvals || []).map(a => {
        const approverName = a.approverName || (a.approverId ? FS.db.find('users', a.approverId)?.name : null);
        const icon = a.status === 'approved' ? 'bi-check-circle-fill text-success' :
          a.status === 'rejected' ? 'bi-x-circle-fill text-danger' :
            'bi-clock text-warning';
        return `
          <div class="d-flex align-items-start gap-3 mb-3">
            <i class="bi ${icon}" style="font-size:18px;flex-shrink:0;margin-top:2px"></i>
            <div>
              <div style="font-size:13px;font-weight:500">${FS.auth.getRoleLabel(a.role)}</div>
              <div class="fs-small">${approverName ? FS.str.escape(approverName) : 'Chưa xử lý'} ${a.updatedAt ? '· ' + FS.date.format(a.updatedAt) : ''}</div>
              ${a.note ? `<div style="font-size:12px;background:var(--fs-bg-secondary);padding:6px 10px;border-radius:var(--fs-radius);margin-top:4px">${FS.str.escape(a.note)}</div>` : ''}
            </div>
          </div>`;
      }).join('');

      const pendingStep = (r.approvals || []).find(a => a.status === 'pending');
      const sessionRole = FS.auth.getSession()?.role || 'employee';
      const canThisLevel = pendingStep && (
        pendingStep.role.toLowerCase() === sessionRole.toLowerCase() ||
        sessionRole.toLowerCase() === 'director' ||
        (sessionRole.toLowerCase() === 'manager' && pendingStep.role.toLowerCase() === 'team_lead')
      );

      const html = `
        <div class="fs-modal-overlay" id="req-detail-overlay">
          <div class="fs-modal" style="max-width:520px">
            <div class="fs-modal-header">
              <div>
                ${FS.badge.reqType(r.type)}
                <h5 class="fs-h5 mt-1 mb-0">${FS.str.escape(r.title)}</h5>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('req-detail-overlay').remove()"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="fs-modal-body">
              <div class="d-flex align-items-center gap-2 mb-3">
                ${FS.user.avatar(r.requesterId)}
                <div>
                  <div style="font-size:13px;font-weight:500">${FS.str.escape(requesterName)}</div>
                  <div class="fs-small">${FS.date.format(r.createdAt, { time: true })}</div>
                </div>
                <div class="ms-auto">${FS.badge.status(r.status)}</div>
              </div>
              <div style="font-size:13px;line-height:1.7;color:var(--fs-text-secondary);margin-bottom:20px;padding:12px;background:var(--fs-bg-secondary);border-radius:var(--fs-radius)">${FS.str.escape(r.description)}</div>
              <div class="fs-label mb-3">Quy trình phê duyệt</div>
              ${approvalSteps}
              ${canThisLevel ? `
                <hr class="fs-divider">
                <div class="fs-form-group">
                  <label class="fs-label-text">Ghi chú (tuỳ chọn)</label>
                  <textarea class="fs-textarea" id="req-approve-note" rows="2" placeholder="Ghi chú phê duyệt..."></textarea>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-success btn-sm flex-1" id="req-approve-btn" data-req-id="${r.id}" data-approval-id="${pendingStep.id}"><i class="bi bi-check2"></i> Phê duyệt</button>
                  <button class="btn btn-danger btn-sm flex-1" id="req-reject-btn" data-req-id="${r.id}" data-approval-id="${pendingStep.id}"><i class="bi bi-x-lg"></i> Từ chối</button>
                </div>` : ''}
            </div>
          </div>`;

      $('#req-detail-overlay').remove();
      document.body.insertAdjacentHTML('beforeend', html);
      document.getElementById('req-detail-overlay')?.addEventListener('click', function (e) { if (e.target === this) this.remove(); });

      const self = this;
      document.getElementById('req-approve-btn')?.addEventListener('click', function () {
        const approvalId = $(this).data('approval-id');
        self._processApproval(r.id, approvalId, 'approved');
        document.getElementById('req-detail-overlay')?.remove();
      });
      document.getElementById('req-reject-btn')?.addEventListener('click', function () {
        const approvalId = $(this).data('approval-id');
        self._processApproval(r.id, approvalId, 'rejected');
        document.getElementById('req-detail-overlay')?.remove();
      });
    },

    async _processApproval(reqId, approvalId, decision) {
      const note = document.getElementById('req-approve-note')?.value || '';

      if (approvalId) {
        try {
          const response = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/approvals/' + approvalId + '/action',
            type: 'POST',
            data: { status: decision, note: note }
          });

          if (response && response.success) {
            FS.toast(decision === 'approved' ? '✅ Đã phê duyệt!' : '❌ Đã từ chối', decision === 'approved' ? 'success' : 'error');
            await this._loadData();
            return;
          } else {
            FS.toast('Lỗi phản hồi từ máy chủ khi duyệt yêu cầu.', 'error');
          }
        } catch (err) {
          console.error('Process approval API failed:', err);
          FS.toast('Không thể gửi quyết định phê duyệt lên máy chủ. Vui lòng thử lại!', 'error');
        }
      } else {
        FS.toast('Thiếu thông tin phê duyệt trên máy chủ.', 'error');
      }
    },

    /**
     * Send a PUT request to update an existing request.
     */
    async _updateRequest(reqId, data) {
      try {
        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/requests/' + reqId,
          type: 'PUT',
          data: data
        });
        if (response && response.success) {
          FS.toast('⚙️ Cập nhật yêu cầu thành công!', 'success');
          await this._loadData();
        } else {
          FS.toast('Cập nhật yêu cầu thất bại.', 'error');
        }
      } catch (err) {
        console.error('Update request API failed:', err);
        FS.toast('Không thể cập nhật yêu cầu. Vui lòng thử lại!', 'error');
      }
    },

    /**
     * Send a DELETE request to remove a request.
     */
    async _deleteRequest(reqId) {
      try {
        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/requests/' + reqId,
          type: 'DELETE'
        });
        if (response && response.success) {
          FS.toast('🗑️ Xóa yêu cầu thành công!', 'success');
          await this._loadData();
        } else {
          FS.toast('Xóa yêu cầu thất bại.', 'error');
        }
      } catch (err) {
        console.error('Delete request API failed:', err);
        FS.toast('Không thể xóa yêu cầu. Vui lòng thử lại!', 'error');
      }
    },

    _bindEvents() {
      const self = this;

      // Tabs
      $(document).off('click.req-tab').on('click.req-tab', '#req-tabs .fs-tab', function () {
        $('#req-tabs .fs-tab').removeClass('active');
        $(this).addClass('active');
        self._tab = $(this).data('tab');
        self._render();
      });

      // Item click (detail view)
      $(document).off('click.req-item').on('click.req-item', '.req-item', function () {
        self._openDetail($(this).data('req-id'));
      });

      // Edit button click
      $(document).off('click.req-edit').on('click.req-edit', '.req-edit-btn', function (e) {
        e.stopPropagation();
        const reqId = $(this).data('req-id');
        const req = self._requestsData.find(r => r.id === reqId);
        if (!req) return;
        // Populate modal fields
        $('#req-modal-title').val(req.title);
        $('#req-modal-type').val(req.type);
        $('#req-modal-desc').val(req.description);
        $('#req-modal-save').text('Cập nhật');
        self._editMode = true;
        self._editRequestId = reqId;
        $('#req-modal-overlay').show();
      });

      // Delete button click
      $(document).off('click.req-delete').on('click.req-delete', '.req-delete-btn', function (e) {
        e.stopPropagation();
        const reqId = $(this).data('req-id');
        FS.confirm('Bạn có chắc muốn xóa yêu cầu này?', () => self._deleteRequest(reqId), { danger: true, confirmText: 'Xóa', cancelText: 'Hủy' });
      });

      // New request
      $('#req-new-btn').off('click').on('click', () => {
        // Reset modal to creation mode
        $('#req-modal-title').val('');
        $('#req-modal-type').val('leave');
        $('#req-modal-desc').val('');
        $('#req-modal-save').text('Tạo');
        self._editMode = false;
        self._editRequestId = null;
        $('#req-modal-overlay').show();
      });
      $('#req-modal-close, #req-modal-cancel').off('click').on('click', () => $('#req-modal-overlay').hide());
      $('#req-modal-overlay').off('click').on('click', function (e) {
        if ($(e.target).is('#req-modal-overlay')) $(this).hide();
      });

      // Save (create or update)
      $('#req-modal-save').off('click').on('click', async function () {
        const title = $('#req-modal-title').val().trim();
        if (!title) { FS.toast('Vui lòng nhập tiêu đề!', 'warning'); return; }
        const type = $('#req-modal-type').val() || 'leave';
        const description = $('#req-modal-desc').val() || '';

        if (self._editMode && self._editRequestId) {
          // Update existing request
          await self._updateRequest(self._editRequestId, { type, title, description });
          $('#req-modal-overlay').hide();
        } else {
          // Create new request
          try {
            const response = await FS.apiCall({
              url: FS.API_BASE + '/api/v1/requests',
              type: 'POST',
              data: { type, title, description }
            });

            if (response && response.success) {
              FS.toast('Đã gửi yêu cầu thành công!', 'success');
              $('#req-modal-overlay').hide();
              await self._loadData();
            } else {
              FS.toast('Máy chủ báo lỗi khi tạo yêu cầu.', 'error');
            }
          } catch (err) {
            console.error('Create request API failed:', err);
            FS.toast('Không thể gửi yêu cầu lên máy chủ. Vui lòng thử lại!', 'error');
          }
        }
      });
    }
  };

})(window.FS = window.FS || {}, jQuery);