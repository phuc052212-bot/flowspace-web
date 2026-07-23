/**
 * FlowSpace — SPA Router
 * Điều hướng giữa các trang trong #page-content
 * Sử dụng history.pushState và jQuery.load
 * window.FS.router
 */
(function (FS, $) {
  'use strict';

  const PAGE_TITLES = {
    dashboard:    'Dashboard',
    projects:     'Quản lý Dự án',
    tasks:        'Quản lý Công việc',
    kanban:       'Kanban Board',
    gantt:        'Gantt Chart',
    calendar:     'Lịch',
    documents:    'Tài liệu',
    chat:         'Chat nội bộ',
    requests:     'Yêu cầu',
    approvals:    'Phê duyệt',
    timetracking: 'Time Tracking',
    reports:      'Báo cáo',
    users:        'Quản lý Người dùng',
    logs:         'Nhật ký hệ thống',
    settings:     'Cài đặt'
  };

  let _currentPage = null;

  FS.router = {
    /** Điều hướng tới trang */
    go(page, opts = {}) {
      if (!page) page = 'dashboard';

      // Kiểm tra quyền truy cập
      if (!FS.auth.canAccess(page)) {
        FS.toast('Bạn không có quyền truy cập trang này.', 'error');
        return;
      }

      if (_currentPage === page && !opts.force) return;

      _currentPage = page;

      // Cập nhật URL (không reload)
      if (!opts.silent) {
        history.pushState({ page }, '', `?page=${page}`);
      }

      // Cập nhật sidebar active state
      FS.router._updateNav(page);

      // Cập nhật breadcrumb
      FS.router._updateBreadcrumb(page);

      // Load nội dung trang
      const $content = $('#page-content');
      $content.addClass('loading').html(
        '<div class="page-loader"><div class="fs-spinner"></div><span>Đang tải...</span></div>'
      );

      $content.load(url, async function (response, status) {
        $content.removeClass('loading');
        if (status === 'error') {
          $content.html(`
            <div class="fs-empty" style="padding-top:80px">
              <i class="bi bi-exclamation-triangle"></i>
              <h5>Không tải được trang</h5>
              <p>Trang <strong>${page}</strong> đang được phát triển.</p>
            </div>
          `);
          return;
        }
        // Thêm animation
        $content.children().first().addClass('page-enter');

        // Gọi JS module tương ứng
        if (window.FS.pages && window.FS.pages[page]) {
          try {
            await window.FS.pages[page].init();
          } catch (e) {
            console.error(`[Router] Error initializing page ${page}:`, e);
          }
        }

        // Lưu tab cuối vào sessionStorage
        sessionStorage.setItem('fs_last_page', page);
      });
    },

    /** Lấy page hiện tại từ URL */
    getCurrentPage() {
      const params = new URLSearchParams(window.location.search);
      return params.get('page') || 'dashboard';
    },

    /** Khởi tạo router — gọi khi app shell ready */
    init() {
      // Điều hướng lần đầu
      const startPage = FS.router.getCurrentPage();
      FS.router.go(startPage, { silent: true });

      // Xử lý browser back/forward
      window.addEventListener('popstate', function (e) {
        const page = e.state?.page || FS.router.getCurrentPage();
        FS.router.go(page, { silent: true });
      });

      // Xử lý click sidebar nav items
      $(document).on('click', '[data-page]', function (e) {
        e.preventDefault();
        const page = $(this).data('page');
        FS.router.go(page);

        // Đóng sidebar mobile nếu đang mở
        if (window.innerWidth <= 768) {
          $('#fs-sidebar').removeClass('mobile-open');
          $('#fs-sidebar-overlay').removeClass('show');
        }
      });
    },

    /** Cập nhật trạng thái active trên sidebar */
    _updateNav(page) {
      $('.fs-nav-item').removeClass('active');
      $(`.fs-nav-item[data-page="${page}"]`).addClass('active');
    },

    /** Cập nhật breadcrumb topbar */
    _updateBreadcrumb(page) {
      const title = PAGE_TITLES[page] || page;
      $('#fs-page-title').text(title);
      document.title = `${title} — FlowSpace`;
    }
  };

  /* ── Register pages namespace ───────────────────────────── */
  FS.pages = FS.pages || {};

})(window.FS = window.FS || {}, jQuery);
