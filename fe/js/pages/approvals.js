(function (FS, $) {
  'use strict';

  FS.pages.approvals = {
    _statusFilter: 'pending',
    _requestsData: [],

    async init() {
      if (!FS.auth.isTeamLead()) {
        const listEl = document.getElementById('approvals-list');
        if (listEl) {
          listEl.innerHTML = '<div class="fs-empty"><i class="bi bi-shield-lock"></i><h5>Không có quyền truy cập</h5><p>Tính năng này dành cho Trưởng nhóm trở lên.</p></div>';
        }
        return;
      }
      await this._loadData();
      this._bindEvents();
    },

    _getAuthHeaders() {
      const session = FS.auth.getSession();
      return session && session.token ? { 'Authorization': 'Bearer ' + session.token } : {};
    },

    async _loadData() {
      try {
        const response = await $.ajax({
          url: FS.API_BASE + '/api/v1/approvals/pending',
          type: 'GET',
          headers: this._getAuthHeaders()
        });

        if (response && response.success && Array.isArray(response.data)) {
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
          $('#approvals-offline-banner').remove();
        } else {
          try {
            if (window.FS && FS.db && typeof FS.db.get === 'function') {
              this._requestsData = FS.db.get('requests') || [];
            } else {
              this._requestsData = [];
            }
          } catch (dbErr) {
            console.error('Failed to read requests from local storage:', dbErr);
            this._requestsData = [];
          }
        }
      } catch (err) {
        console.warn('Pending approvals API request failed, falling back to LocalStorage:', err);
        try {
          if (window.FS && FS.db && typeof FS.db.get === 'function') {
            this._requestsData = FS.db.get('requests') || [];
          } else {
            this._requestsData = [];
          }
        } catch (dbErr) {
          console.error('Failed to read requests from local storage:', dbErr);
          this._requestsData = [];
        }
        if (!$('#approvals-offline-banner').length) {
          $('#page-content').prepend('<div id="approvals-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu phê duyệt ngoại tuyến.</span></div>');
        }
      }
      this._render();
    },

    _getFilteredData() {
      const session = FS.auth.getSession();
      const role = session?.role || 'employee';
      let requests = [...this._requestsData];

      if (this._statusFilter) {
        requests = requests.filter(r => {
          const myStep = (r.approvals || []).find(a => a.role && a.role.toLowerCase() === role.toLowerCase());
          return myStep && myStep.status.toLowerCase() === this._statusFilter.toLowerCase();
        });
      }
      return requests;
    },

    _render() {
      const requests = this._getFilteredData();
      const sessionRole = FS.auth.getSession()?.role || 'employee';
      const pendingCount = this._requestsData.filter(r => {
        const step = (r.approvals || []).find(a => a.role && a.role.toLowerCase() === sessionRole.toLowerCase());
        return step && step.status.toLowerCase() === 'pending';
      }).length;

      const badgeEl = $('#approvals-pending-badge');
      if (badgeEl.length) {
        badgeEl.text(`${pendingCount} chờ duyệt`);
      }
      const navBadgeEl = $('#nav-approval-badge');
      if (navBadgeEl.length) {
        if (pendingCount > 0) {
          navBadgeEl.text(pendingCount).show();
        } else {
          navBadgeEl.hide();
        }
      }

      const listEl = $('#approvals-list');
      if (!listEl.length) return;

      if (!requests.length) {
        listEl.html('<div class="fs-empty"><i class="bi bi-inbox-fill"></i><h5>Không có yêu cầu nào</h5></div>');
        return;
      }

      const typeLabels = { leave: '🏖️ Nghỉ phép', overtime: '⏰ Tăng ca', purchase: '🛒 Mua sắm', remote: '🏠 Làm remote' };

      listEl.html(requests.map(r => {
        const requesterName = r.requesterName || ((window.FS && FS.db && typeof FS.db.find === 'function') ? (FS.db.find('users', r.requesterId)?.name || '—') : '—');
        const myStep = (r.approvals || []).find(a => a.role && a.role.toLowerCase() === sessionRole.toLowerCase());
        const isPending = myStep && myStep.status === 'pending';
        return `
          <div class="fs-card mb-2" style="border-radius:var(--fs-radius-md);border-left:3px solid ${isPending ? 'var(--fs-warning)' : (myStep?.status === 'approved' ? 'var(--fs-success)' : 'var(--fs-danger)')}">
            <div class="d-flex align-items-start gap-3">
              ${(window.FS && FS.user && typeof FS.user.avatar === 'function') ? FS.user.avatar(r.requesterId) : '<div class="fs-avatar">?</div>'}
              <div style="flex:1;min-width:0">
                <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <span class="fs-badge badge-neutral">${typeLabels[r.type] || r.type}</span>
                  <span style="font-size:13px;font-weight:600">${(window.FS && FS.str && typeof FS.str.escape === 'function') ? FS.str.escape(r.title) : r.title}</span>
                </div>
                <p style="font-size:12px;color:var(--fs-text-secondary);margin-bottom:8px">${(window.FS && FS.str && typeof FS.str.escape === 'function') ? FS.str.escape(r.description) : r.description}</p>
                <div class="d-flex align-items-center gap-3">
                  <span class="fs-small"><i class="bi bi-person me-1"></i>${(window.FS && FS.str && typeof FS.str.escape === 'function') ? FS.str.escape(requesterName) : requesterName}</span>
                  <span class="fs-small"><i class="bi bi-calendar3 me-1"></i>${(window.FS && FS.date && typeof FS.date.format === 'function') ? FS.date.format(r.createdAt) : r.createdAt}</span>
                </div>
                ${isPending ? `
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-success btn-sm approvals-accept-btn" data-req-id="${r.id}" data-approval-id="${myStep.id}" title="Phê duyệt"><i class="bi bi-check2"></i> Phê duyệt</button>
                    <button class="btn btn-danger btn-sm approvals-reject-btn" data-req-id="${r.id}" data-approval-id="${myStep.id}" title="Từ chối"><i class="bi bi-x-lg"></i> Từ chối</button>
                  </div>
                ` : `
                  <span style="font-size:12px;font-weight:600;color:${myStep?.status === 'approved' ? 'var(--fs-success)' : 'var(--fs-danger)'}">
                    <i class="bi bi-${myStep?.status === 'approved' ? 'check-circle-fill' : 'x-circle-fill'}"></i>
                    ${myStep?.status === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối'}
                  </span>
                `}
              </div>
            </div>
          </div>`;
      }).join(''));
    },

    async _processApproval(reqId, approvalId, decision) {
      if (approvalId) {
        try {
          const response = await $.ajax({
            url: FS.API_BASE + '/api/v1/approvals/' + approvalId + '/action',
            type: 'POST',
            contentType: 'application/json',
            headers: this._getAuthHeaders(),
            data: JSON.stringify({ status: decision, note: decision === 'approved' ? 'Đã phê duyệt qua trang Approvals' : 'Từ chối qua trang Approvals' })
          });

          if (response && response.success) {
            FS.toast(decision === 'approved' ? '✅ Đã phê duyệt!' : '❌ Đã từ chối', decision === 'approved' ? 'success' : 'error');
            await this._loadData();
            return;
          }
        } catch (err) {
          console.warn('Process approval API failed, falling back to LocalStorage:', err);
        }
      }

      // LocalStorage fallback
      let r = null;
      try {
        if (window.FS && FS.db && typeof FS.db.find === 'function') {
          r = FS.db.find('requests', reqId);
        }
      } catch (dbErr) {
        console.error('Failed to find request in local storage:', dbErr);
      }

      const session = FS.auth.getSession();
      if (r) {
        const myStep = (r.approvals || []).find(a => a.role && a.role.toLowerCase() === (session?.role || '').toLowerCase());
        if (myStep) {
          myStep.status = decision;
          myStep.approverId = session?.userId;
          myStep.updatedAt = new Date().toISOString();
          const stillPending = (r.approvals || []).some(a => a.status === 'pending');
          if (!stillPending) {
            r.status = (r.approvals || []).every(a => a.status === 'approved') ? 'approved' : 'rejected';
          }
          try {
            if (window.FS && FS.db && typeof FS.db.save === 'function') {
              FS.db.save('requests', r);
            }
          } catch (dbErr) {
            console.error('Failed to save request to local storage:', dbErr);
          }
        }
      }
      await this._loadData();
      if (window.FS && typeof FS.toast === 'function') {
        FS.toast(decision === 'approved' ? '✅ Đã phê duyệt!' : '❌ Đã từ chối', decision === 'approved' ? 'success' : 'error');
      }
    },

    _bindEvents() {
      const self = this;

      $('#approvals-filter').off('change').on('change', function () { self._statusFilter = this.value; self._render(); });

      $(document).off('click.approv-accept').on('click.approv-accept', '.approvals-accept-btn', function (e) {
        e.stopPropagation();
        const reqId = $(this).data('req-id');
        const approvalId = $(this).data('approval-id');
        self._processApproval(reqId, approvalId, 'approved');
      });

      $(document).off('click.approv-reject').on('click.approv-reject', '.approvals-reject-btn', function (e) {
        e.stopPropagation();
        const reqId = $(this).data('req-id');
        const approvalId = $(this).data('approval-id');
        if (window.FS && typeof FS.confirm === 'function') {
          FS.confirm('Từ chối yêu cầu này?', () => self._processApproval(reqId, approvalId, 'rejected'), { danger: true, confirmText: 'Từ chối', cancelText: 'Hủy' });
        }
      });
    }
  };
})(window.FS = window.FS || {}, jQuery);