/**
 * FlowSpace Notification Center
 * Uses the existing JWT-protected notification endpoints only.
 */
(function (FS, $) {
  'use strict';

  const PAGE_SIZE = 25;

  const NotificationService = {
    list() {
      return FS.apiCall({
        url: `${FS.API_BASE}/api/v1/notifications`,
        type: 'GET',
        xhrFields: { withCredentials: false }
      }).then(response => Array.isArray(response?.data) ? response.data : []);
    },

    markRead(id) {
      return FS.apiCall({
        url: `${FS.API_BASE}/api/v1/notifications/${encodeURIComponent(id)}/mark-read`,
        type: 'PUT',
        data: {},
        xhrFields: { withCredentials: false }
      });
    },

    markAllRead() {
      return FS.apiCall({
        url: `${FS.API_BASE}/api/v1/notifications/mark-all-read`,
        type: 'PUT',
        data: {},
        xhrFields: { withCredentials: false }
      });
    }
  };

  const NotificationCenter = {
    _items: [],
    _visibleCount: PAGE_SIZE,
    _isOpen: false,
    _isLoading: false,
    _lastFocusedElement: null,

    init() {
      this._bindEvents();
      this.refresh({ renderPanel: false });
    },

    async refresh({ renderPanel = true } = {}) {
      if (this._isLoading) return;

      this._isLoading = true;
      if (renderPanel && this._isOpen) this._renderState('loading');
      this._setControlsDisabled(true);

      try {
        const items = await NotificationService.list();
        this._items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        this._visibleCount = PAGE_SIZE;
        this._updateBadge();
        if (renderPanel && this._isOpen) this._renderList();
      } catch (error) {
        if (renderPanel && this._isOpen) this._renderState('error');
        console.error('[NotificationCenter] Failed to load notifications.', error);
      } finally {
        this._isLoading = false;
        this._setControlsDisabled(false);
      }
    },

    async open() {
      if (this._isOpen) return;

      this._isOpen = true;
      this._lastFocusedElement = document.activeElement;
      $('#fs-notif-dropdown').addClass('show').attr('aria-hidden', 'false');
      $('#fs-notif-btn').attr('aria-expanded', 'true');
      this._renderState('loading');
      await this.refresh();
      $('#fs-notif-mark-all').trigger('focus');
    },

    close({ restoreFocus = false } = {}) {
      if (!this._isOpen) return;

      this._isOpen = false;
      $('#fs-notif-dropdown').removeClass('show').attr('aria-hidden', 'true');
      $('#fs-notif-btn').attr('aria-expanded', 'false');
      if (restoreFocus && this._lastFocusedElement?.focus) this._lastFocusedElement.focus();
    },

    async markRead(id) {
      const notification = this._items.find(item => String(item.id) === String(id));
      if (!notification || notification.isRead) return;

      this._setControlsDisabled(true);
      try {
        await NotificationService.markRead(id);
        notification.isRead = true;
        this._updateBadge();
        this._renderList();
      } catch (error) {
        this._renderState('error');
        console.error('[NotificationCenter] Failed to mark notification as read.', error);
      } finally {
        this._setControlsDisabled(false);
      }
    },

    async markAllRead() {
      if (!this._items.some(item => !item.isRead)) return;

      this._setControlsDisabled(true);
      try {
        await NotificationService.markAllRead();
        this._items.forEach(item => { item.isRead = true; });
        this._updateBadge();
        this._renderList();
      } catch (error) {
        this._renderState('error');
        console.error('[NotificationCenter] Failed to mark notifications as read.', error);
      } finally {
        this._setControlsDisabled(false);
      }
    },

    _updateBadge() {
      const unreadCount = this._items.filter(item => !item.isRead).length;
      const label = unreadCount > 99 ? '99+' : String(unreadCount);
      $('#fs-notif-badge').text(label).toggle(unreadCount > 0);
      $('#fs-notif-indicator').toggle(unreadCount > 0);
      $('#notif-unread-count').text(`${unreadCount} chưa đọc`).toggle(unreadCount > 0);
      $('#fs-notif-btn').attr('aria-label', unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo');
    },

    _renderList() {
      if (!this._items.length) {
        this._renderState('empty');
        return;
      }

      const items = this._items.slice(0, this._visibleCount);
      const html = items.map(item => this._renderItem(item)).join('');
      const hasMore = this._visibleCount < this._items.length;
      $('#fs-notif-list').html(`${html}${hasMore ? '<div class="fs-notif-load-more" data-notif-load-more aria-live="polite">Cuộn để tải thêm</div>' : ''}`);
    },

    _renderItem(item) {
      const title = FS.str.escape(item.title || 'Thông báo');
      const message = FS.str.escape(item.message || '');
      const timestamp = this._formatTimestamp(item.createdAt);
      const icon = this._iconForType(item.type);
      const isUnread = !item.isRead;
      return `
        <button class="notif-item ${isUnread ? 'unread' : 'read'}" type="button" data-notif-id="${FS.str.escape(String(item.id))}" aria-label="${isUnread ? 'Đánh dấu đã đọc: ' : ''}${title}">
          <span class="notif-dot" aria-hidden="true"></span>
          <span class="notif-icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
          <span class="notif-content">
            <strong class="notif-title">${title}</strong>
            ${message ? `<span class="notif-text">${message}</span>` : ''}
            <time class="notif-time">${timestamp}</time>
          </span>
        </button>
      `;
    },

    _renderState(state) {
      const states = {
        loading: { icon: 'bi-arrow-repeat fs-state-spinner', title: 'Đang tải thông báo', description: 'Vui lòng chờ trong giây lát.' },
        empty: { icon: 'bi-bell-slash', title: 'Không có thông báo', description: 'Bạn đã cập nhật mọi thông tin mới nhất.' },
        error: { icon: 'bi-exclamation-circle', title: 'Không thể tải thông báo', description: 'Kiểm tra kết nối rồi thử lại.', retry: true }
      };
      const content = states[state];
      $('#fs-notif-list').html(`
        <div class="fs-header-state fs-notif-state" role="status">
          <i class="bi ${content.icon}" aria-hidden="true"></i>
          <strong>${content.title}</strong>
          <p>${content.description}</p>
          ${content.retry ? '<button class="btn btn-ghost btn-sm" type="button" data-notif-retry>Thử lại</button>' : ''}
        </div>
      `);
    },

    _setControlsDisabled(disabled) {
      $('#fs-notif-mark-all').prop('disabled', disabled || !this._items.some(item => !item.isRead));
      $('#fs-notif-btn').attr('aria-busy', String(disabled));
    },

    _formatTimestamp(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
    },

    _iconForType(type) {
      return {
        task: 'bi-check2-square',
        comment: 'bi-chat-square-text',
        approval: 'bi-shield-check',
        deadline: 'bi-clock-history',
        mention: 'bi-at',
        project: 'bi-folder2-open'
      }[String(type || '').toLowerCase()] || 'bi-bell';
    },

    _bindEvents() {
      $('#fs-notif-btn').on('click', () => (this._isOpen ? this.close({ restoreFocus: true }) : this.open()));
      $('#fs-notif-mark-all').on('click', () => this.markAllRead());

      $(document).on('click.header-notifications', '[data-notif-id]', event => this.markRead($(event.currentTarget).data('notif-id')));
      $(document).on('click.header-notifications', '[data-notif-retry]', () => this.refresh());

      $('#fs-notif-list').on('scroll', event => {
        const element = event.currentTarget;
        const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 24;
        if (isNearBottom && this._visibleCount < this._items.length) {
          this._visibleCount += PAGE_SIZE;
          this._renderList();
        }
      });

      $(document).on('click.header-notifications', event => {
        if (this._isOpen && !$(event.target).closest('#fs-notif-btn, #fs-notif-dropdown').length) this.close();
      });
      $(document).on('keydown.header-notifications', event => {
        if (event.key === 'Escape' && this._isOpen) {
          event.preventDefault();
          this.close({ restoreFocus: true });
        }
      });
    }
  };

  FS.notificationService = NotificationService;
  FS.notificationCenter = NotificationCenter;
})(window.FS = window.FS || {}, jQuery);
