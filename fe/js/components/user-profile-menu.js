/**
 * FlowSpace Header User Profile
 * Renders the authenticated JWT session without hardcoded user information.
 */
(function (FS, $) {
  'use strict';

  const UserProfileMenu = {
    _isOpen: false,
    _lastFocusedElement: null,

    init() {
      this._bindEvents();
      this.render();
    },

    render() {
      this._renderLoading();
      try {
        const session = FS.auth?.getSession();
        if (!session?.name || !session?.email || !session?.role) {
          this._renderError();
          return;
        }
        this._renderSession(session);
      } catch (error) {
        this._renderError();
        console.error('[UserProfileMenu] Failed to render session.', error);
      }
    },

    open() {
      if (this._isOpen) return;
      this._isOpen = true;
      this._lastFocusedElement = document.activeElement;
      $('#fs-user-menu').addClass('show').attr('aria-hidden', 'false');
      $('#fs-topbar-user').attr('aria-expanded', 'true');
      $('#fs-user-menu [role="menuitem"]:not(:disabled)').first().trigger('focus');
    },

    close({ restoreFocus = false } = {}) {
      if (!this._isOpen) return;
      this._isOpen = false;
      $('#fs-user-menu').removeClass('show').attr('aria-hidden', 'true');
      $('#fs-topbar-user').attr('aria-expanded', 'false');
      if (restoreFocus && this._lastFocusedElement?.focus) this._lastFocusedElement.focus();
    },

    _renderLoading() {
      $('#topbar-user-avatar, #dropdown-user-avatar').text('');
      $('#topbar-user-name, #user-role-label, #dropdown-user-name, #user-menu-email, #dropdown-user-role').text('');
      $('#fs-topbar-user').addClass('is-loading').attr('aria-busy', 'true');
      $('#fs-user-menu [role="menuitem"]').prop('disabled', true);
    },

    _renderSession(session) {
      const initials = this._getInitials(session.name);
      const avatar = session.avatar || initials;
      const roleLabel = FS.auth.getRoleLabel(session.role);

      this._setAvatar($('#topbar-user-avatar'), avatar, session.color);
      this._setAvatar($('#dropdown-user-avatar'), avatar, session.color);
      $('#topbar-user-name').text(session.name);
      $('#user-role-label').text(roleLabel);
      $('#dropdown-user-name').text(session.name);
      $('#user-menu-email').text(session.email);
      $('#dropdown-user-role').text(roleLabel);
      $('#fs-topbar-user').removeClass('is-loading is-error').attr('aria-busy', 'false');
      $('#fs-user-menu [role="menuitem"]').prop('disabled', false);
    },

    _renderError() {
      this._setAvatar($('#topbar-user-avatar'), '?');
      this._setAvatar($('#dropdown-user-avatar'), '?');
      $('#topbar-user-name, #dropdown-user-name').text('Không thể tải hồ sơ');
      $('#user-role-label, #dropdown-user-role').text('');
      $('#user-menu-email').text('');
      $('#fs-topbar-user').removeClass('is-loading').addClass('is-error').attr('aria-busy', 'false');
      $('#fs-user-menu [role="menuitem"]').prop('disabled', true);
      $('#user-logout-btn').prop('disabled', false);
    },

    _setAvatar($element, label, color) {
      $element.removeClass((_, className) => (className.match(/\bav-\S+/g) || []).join(' '));
      $element.text(label);
      $element.css('background-color', '');
      if (color && color.startsWith('#')) {
        $element.css('background-color', color);
      } else if (color) {
        $element.addClass(color);
      } else {
        $element.addClass('av-indigo');
      }
    },

    _getInitials(name) {
      return String(name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
    },

    _bindEvents() {
      $(document).on('click.header-profile-toggle', '#fs-topbar-user', event => {
        event.preventDefault();
        event.stopPropagation();
        this._isOpen ? this.close({ restoreFocus: true }) : this.open();
      });
      $(document).on('keydown.header-profile-toggle', '#fs-topbar-user', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          this._isOpen ? this.close({ restoreFocus: true }) : this.open();
        }
      });
      $(document).on('click.header-profile', '#fs-user-menu [data-page]', event => {
        event.preventDefault();
        const page = $(event.currentTarget).data('page');
        this.close();
        if (page && FS.router) FS.router.go(page, { force: true });
      });
      $(document).on('click.header-profile', '#user-logout-btn', event => {
        event.preventDefault();
        this.close();

        if (FS.confirm) {
          FS.confirm({
            title: "Đăng xuất tài khoản",
            message: "Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại không?",
            confirmText: "Đăng xuất",
            cancelText: "Hủy bỏ",
            type: "danger",
            onConfirm: () => {
              if (FS.toast) {
                FS.toast("Đang đăng xuất khỏi hệ thống...", "info", 1500);
              }
              setTimeout(() => {
                if (FS.auth && typeof FS.auth.logout === 'function') {
                  FS.auth.logout();
                }
              }, 800);
            }
          });
        } else {
          if (FS.auth && typeof FS.auth.logout === 'function') {
            FS.auth.logout();
          }
        }
      });
      $(document).on('click.header-profile', event => {
        if (this._isOpen && !$(event.target).closest('#fs-topbar-user, #fs-user-menu').length) this.close();
      });
      $(document).on('keydown.header-profile', event => {
        if (event.key === 'Escape' && this._isOpen) {
          event.preventDefault();
          this.close({ restoreFocus: true });
        }
      });
    }
  };

  FS.userProfileMenu = UserProfileMenu;
})(window.FS = window.FS || {}, jQuery);
