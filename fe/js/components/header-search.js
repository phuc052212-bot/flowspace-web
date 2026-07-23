/**
 * FlowSpace Header Search
 *
 * The backend does not expose a global-search endpoint yet. This component
 * deliberately returns an explicit unavailable state rather than searching
 * seed data or fabricating results. Replace HeaderSearchService.search when
 * the API is introduced.
 */
(function (FS, $) {
  'use strict';

  const HeaderSearchService = {
    async search(query) {
      try {
        const response = await FS.apiCall({
          url: `${FS.API_BASE}/api/v1/dashboard/search?q=${encodeURIComponent(query)}`,
          type: 'GET'
        });
        if (response && response.success && Array.isArray(response.data)) {
          return { state: 'ready', query, items: response.data };
        }
        return { state: 'empty', query, items: [] };
      } catch (err) {
        console.error('[HeaderSearchService] Failed:', err);
        return { state: 'error', query, items: [] };
      }
    }
  };

  const HeaderSearch = {
    _service: HeaderSearchService,
    _lastFocusedElement: null,
    _isOpen: false,
    _requestId: 0,

    init() {
      this._bindEvents();
    },

    setService(service) {
      if (service && typeof service.search === 'function') {
        this._service = service;
      }
    },

    open() {
      if (this._isOpen) return;

      this._isOpen = true;
      this._lastFocusedElement = document.activeElement;
      $('#fs-search-modal').addClass('show').attr('aria-hidden', 'false');
      $('#fs-search-input-main').val('');
      this._renderState('idle');
      window.setTimeout(() => $('#fs-search-input-main').trigger('focus'), 0);
    },

    close() {
      if (!this._isOpen) return;

      this._isOpen = false;
      this._requestId += 1;
      $('#fs-search-modal').removeClass('show').attr('aria-hidden', 'true');
      $('#fs-search-input-main').val('');
      if (this._lastFocusedElement && typeof this._lastFocusedElement.focus === 'function') {
        this._lastFocusedElement.focus();
      }
    },

    async search(query) {
      const normalizedQuery = (query || '').trim();
      if (normalizedQuery.length < 2) {
        this._renderState('idle');
        return;
      }

      const requestId = ++this._requestId;
      this._renderState('loading');

      try {
        const result = await this._service.search(normalizedQuery);
        if (requestId !== this._requestId || !this._isOpen) return;

        if (result.state === 'unavailable') {
          this._renderState('unavailable');
        } else if (!Array.isArray(result.items) || result.items.length === 0) {
          this._renderState('empty');
        } else {
          this._renderResults(result.items);
        }
      } catch (error) {
        if (requestId === this._requestId && this._isOpen) {
          this._renderState('error');
        }
        console.error('[HeaderSearch] Search failed.', error);
      }
    },

    _renderState(state) {
      const states = {
        idle: {
          icon: 'bi-search',
          title: 'Tìm kiếm toàn cục',
          description: 'Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm.'
        },
        loading: {
          icon: 'bi-arrow-repeat fs-state-spinner',
          title: 'Đang tìm kiếm',
          description: 'Đang kết nối dịch vụ tìm kiếm.'
        },
        empty: {
          icon: 'bi-search',
          title: 'Không tìm thấy kết quả',
          description: 'Hãy thử từ khóa khác.'
        },
        unavailable: {
          icon: 'bi-tools',
          title: 'Tìm kiếm chưa sẵn sàng',
          description: 'Dịch vụ tìm kiếm toàn cục chưa được Backend cung cấp.'
        },
        error: {
          icon: 'bi-exclamation-circle',
          title: 'Không thể tìm kiếm',
          description: 'Vui lòng thử lại sau.'
        }
      };
      const content = states[state];
      $('#fs-search-results').html(`
        <div class="fs-header-state fs-search-state" role="status">
          <i class="bi ${content.icon}" aria-hidden="true"></i>
          <strong>${content.title}</strong>
          <p>${content.description}</p>
        </div>
      `);
    },

    _renderResults(items) {
      const html = items.map(item => `
        <button class="fs-search-result-item" type="button" data-search-result-id="${FS.str.escape(String(item.id || ''))}" data-search-result-type="${FS.str.escape(item.type || '')}">
          <i class="bi ${FS.str.escape(item.icon || 'bi-search')}" aria-hidden="true"></i>
          <span class="fs-search-result-copy">
            <strong>${FS.str.escape(item.title || '')}</strong>
            <span>${FS.str.escape(item.description || '')}</span>
          </span>
        </button>
      `).join('');
      $('#fs-search-results').html(html);
    },

    _bindEvents() {
      $('#fs-search-trigger').on('click', () => this.open());
      $('#fs-search-close').on('click', () => this.close());

      $(document).on('keydown.header-search', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          this.open();
        }
        if (event.key === 'Escape' && this._isOpen) {
          event.preventDefault();
          this.close();
        }
      });

      $('#fs-search-modal').on('click', event => {
        if (event.target === event.currentTarget) this.close();
      });

      $(document).off('click.header-search-item').on('click.header-search-item', '.fs-search-result-item', function () {
        const id = $(this).data('search-result-id');
        const type = $(this).data('search-result-type');
        HeaderSearch.close();
        if (type === 'project' && FS.projectDetail) {
          FS.projectDetail.open(id);
        } else if (type === 'task' && FS.taskDetail) {
          FS.taskDetail.open(id);
        } else if (type === 'user' && FS.router) {
          FS.router.go('users');
        }
      });

      $('#fs-search-input-main').on('input', event => this.search(event.target.value));
      $('#fs-search-input-main').on('keydown', event => {
        if (event.key === 'Tab' && event.shiftKey === false) {
          const closeButton = document.getElementById('fs-search-close');
          if (closeButton) {
            event.preventDefault();
            closeButton.focus();
          }
        }
      });
      $('#fs-search-close').on('keydown', event => {
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          $('#fs-search-input-main').trigger('focus');
        }
      });
    }
  };

  FS.headerSearchService = HeaderSearchService;
  FS.headerSearch = HeaderSearch;
})(window.FS = window.FS || {}, jQuery);
