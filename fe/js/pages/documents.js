/**
 * FlowSpace — Documents Module
 * Module 6: Connected to REST API (/api/v1/documents/upload)
 */
(function (FS, $) {
  'use strict';

  const FILE_ICONS = {
    folder: { icon: 'bi-folder-fill', color: '#f59e0b' },
    doc:    { icon: 'bi-file-earmark-text-fill', color: '#3b82f6' },
    sheet:  { icon: 'bi-file-earmark-spreadsheet-fill', color: '#10b981' },
    slide:  { icon: 'bi-file-earmark-slides-fill', color: '#f97316' },
    pdf:    { icon: 'bi-file-earmark-pdf-fill', color: '#ef4444' },
    image:  { icon: 'bi-file-earmark-image-fill', color: '#8b5cf6' }
  };

  FS.pages.documents = {
    _currentFolder: null,
    _search: '',

    init() {
      this._renderTree();
      this._renderFiles();
      this._bindEvents();
    },

    _getAuthHeaders() {
      const session = FS.auth.getSession();
      return session && session.token ? { 'Authorization': 'Bearer ' + session.token } : {};
    },

    _renderTree() {
      const docs = FS.db.get('documents') || [];
      const folders = docs.filter(d => d.type === 'folder' && !d.parentId);

      document.getElementById('doc-tree').innerHTML =
        `<div class="doc-tree-item${!this._currentFolder ? ' active' : ''}" data-folder-id="">
          <i class="bi bi-house-door"></i> Tất cả
        </div>` +
        folders.map(f => `
          <div class="doc-tree-item${this._currentFolder === f.id ? ' active' : ''}" data-folder-id="${f.id}">
            <i class="bi bi-folder${this._currentFolder === f.id ? '-open' : ''}-fill"></i>
            <span class="truncate">${FS.str.escape(f.name)}</span>
          </div>`).join('');
    },

    _renderFiles() {
      const docs = FS.db.get('documents') || [];
      let files;

      if (this._search) {
        const q = this._search.toLowerCase();
        files = docs.filter(d => d.name.toLowerCase().includes(q) || (d.content || '').toLowerCase().includes(q));
      } else if (this._currentFolder) {
        files = docs.filter(d => d.parentId === this._currentFolder);
      } else {
        files = docs.filter(d => !d.parentId);
      }

      const session = FS.auth.getSession();
      const isManager = session?.role === 'manager' || session?.role === 'director';

      files = files.filter(d => {
        if (d.type === 'folder') return true;
        if (isManager) return true;
        if (d.createdBy === session?.userId) return true;
        if (d.sharedWith && d.sharedWith.includes(session?.userId)) return true;
        return false;
      });

      const $bc = document.getElementById('doc-breadcrumb');
      if (this._currentFolder) {
        const folder = FS.db.find('documents', this._currentFolder);
        $bc.innerHTML = `
          <i class="bi bi-house cursor-pointer" id="doc-bc-root"></i>
          <i class="bi bi-chevron-right" style="font-size:10px"></i>
          <span style="color:var(--fs-text);font-weight:500">${folder?.name}</span>`;
      } else {
        $bc.innerHTML = '<i class="bi bi-house"></i> Tất cả tài liệu';
      }

      if (!files.length) {
        document.getElementById('doc-files').innerHTML =
          '<div class="fs-empty"><i class="bi bi-folder2-open"></i><h5>Thư mục trống</h5><p>Tải lên hoặc tạo tài liệu mới</p></div>';
        return;
      }

      document.getElementById('doc-files').innerHTML = `
        <div class="row g-2">
          ${files.map(f => {
            const meta = FILE_ICONS[f.type] || FILE_ICONS.doc;
            const creator = FS.db.find('users', f.createdBy);
            const isFolder = f.type === 'folder';
            const subCount = isFolder ? docs.filter(d => d.parentId === f.id).length : 0;

            return `
              <div class="col-6 col-md-4 col-lg-3 col-xl-2">
                <div class="doc-file-card" data-doc-id="${f.id}" data-doc-type="${f.type}">
                  ${!isFolder ? `
                  <div class="doc-file-actions d-flex gap-1">
                    <div class="doc-action-btn doc-download-btn" data-id="${f.id}" title="Tải xuống"><i class="bi bi-download"></i></div>
                    <div class="doc-action-btn doc-versions-btn" data-id="${f.id}" title="Lịch sử phiên bản"><i class="bi bi-clock-history"></i></div>
                    <div class="doc-action-btn doc-share-btn" data-id="${f.id}" title="Chia sẻ"><i class="bi bi-share"></i></div>
                  </div>` : ''}
                  <div class="doc-file-icon" style="color:${meta.color}">
                    <i class="bi ${meta.icon}"></i>
                  </div>
                  <div class="doc-file-name">${FS.str.escape(f.name)}</div>
                  <div class="doc-file-meta">${isFolder ? subCount + ' mục' : (f.size ? FS.str.fileSize(f.size) : '')} · ${creator?.name?.split(' ').pop() || '—'}</div>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    },

    _bindEvents() {
      const self = this;

      // Tree click
      document.getElementById('doc-tree')?.addEventListener('click', function (e) {
        const item = e.target.closest('.doc-tree-item');
        if (!item) return;
        self._currentFolder = item.dataset.folderId || null;
        self._renderTree();
        self._renderFiles();
      });

      // File click
      document.addEventListener('click', function (e) {
        const card = e.target.closest('.doc-file-card');
        if (!card) return;
        if (e.target.closest('.doc-action-btn')) return;
        if (card.dataset.docType === 'folder') {
          self._currentFolder = card.dataset.docId;
          self._renderTree();
          self._renderFiles();
        } else {
          const doc = FS.db.find('documents', card.dataset.docId);
          if (doc) self._previewDoc(doc);
        }
      });

      // Breadcrumb root
      document.addEventListener('click', function (e) {
        if (e.target.id === 'doc-bc-root') {
          self._currentFolder = null;
          self._renderTree();
          self._renderFiles();
        }
      });

      // Search
      document.getElementById('doc-search')?.addEventListener('input', function () {
        self._search = this.value;
        self._renderFiles();
      });

      // Upload with API integration
      document.getElementById('doc-upload-btn')?.addEventListener('click', function () {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = function () {
          const files = Array.from(this.files);
          let uploadedCount = 0;

          files.forEach(file => {
            const formData = new FormData();
            formData.append('file', file);

            $.ajax({
              url: FS.API_BASE + '/api/v1/documents/upload',
              type: 'POST',
              data: formData,
              processData: false,
              contentType: false,
              headers: self._getAuthHeaders()
            }).done(function (res) {
              const ext = file.name.split('.').pop().toLowerCase();
              const type = ['pdf'].includes(ext) ? 'pdf' : ['png', 'jpg', 'gif', 'svg'].includes(ext) ? 'image' : 'doc';
              const fileUrl = res && res.success && res.data ? res.data.url : null;

              const doc = {
                id: res && res.success && res.data ? res.data.id : FS.db.newId(),
                name: file.name,
                type: type,
                url: fileUrl,
                parentId: self._currentFolder,
                content: 'Tệp đã tải lên server tại ' + (fileUrl || 'Local Storage'),
                size: file.size,
                createdBy: FS.auth.getSession()?.userId,
                createdAt: new Date().toISOString(),
                sharedWith: [],
                versions: [
                  { version: '1.0', uploadedBy: FS.auth.getSession()?.userId, uploadedAt: new Date().toISOString(), note: 'Tải lên server thành công' }
                ]
              };
              FS.db.save('documents', doc);
              uploadedCount++;

              if (uploadedCount === files.length) {
                self._renderFiles();
                FS.toast(`Đã tải lên ${uploadedCount} tệp thành công!`, 'success');
              }
            }).fail(function () {
              const ext = file.name.split('.').pop().toLowerCase();
              const type = ['pdf'].includes(ext) ? 'pdf' : ['png', 'jpg', 'gif', 'svg'].includes(ext) ? 'image' : 'doc';
              const doc = {
                id: FS.db.newId(),
                name: file.name,
                type: type,
                parentId: self._currentFolder,
                content: 'Nội dung tệp: ' + file.name,
                size: file.size,
                createdBy: FS.auth.getSession()?.userId,
                createdAt: new Date().toISOString(),
                sharedWith: [],
                versions: [
                  { version: '1.0', uploadedBy: FS.auth.getSession()?.userId, uploadedAt: new Date().toISOString(), note: 'Tải lên lần đầu' }
                ]
              };
              FS.db.save('documents', doc);
              uploadedCount++;
              if (uploadedCount === files.length) {
                self._renderFiles();
                FS.toast(`Đã tải lên ${uploadedCount} tệp (Local)`, 'success');
              }
            });
          });
        };
        input.click();
      });

      // New folder modal trigger
      document.getElementById('doc-new-folder-btn')?.addEventListener('click', function () {
        $('#doc-create-type').val('folder');
        $('#doc-create-modal-title').text('Tạo thư mục mới');
        $('#doc-create-label').text('Tên thư mục');
        $('#doc-create-name').val('');
        $('#doc-create-modal').show();
      });

      // New document modal trigger
      document.getElementById('doc-new-doc-btn')?.addEventListener('click', function () {
        $('#doc-create-type').val('doc');
        $('#doc-create-modal-title').text('Tạo tài liệu mới');
        $('#doc-create-label').text('Tên tài liệu');
        $('#doc-create-name').val('');
        $('#doc-create-modal').show();
      });

      // Modal submit handler
      $('#doc-create-save-btn').off('click').on('click', function () {
        const name = $('#doc-create-name').val().trim();
        if (!name) {
          FS.toast('Vui lòng nhập tên!', 'warning');
          return;
        }
        const type = $('#doc-create-type').val();
        const doc = {
          id: FS.db.newId(),
          name: name,
          type: type,
          parentId: self._currentFolder,
          content: type === 'folder' ? null : 'Bắt đầu soạn thảo...',
          createdBy: FS.auth.getSession()?.userId,
          createdAt: new Date().toISOString(),
          sharedWith: [],
          versions: type === 'folder' ? [] : [
            { version: '1.0', uploadedBy: FS.auth.getSession()?.userId, uploadedAt: new Date().toISOString(), note: 'Khởi tạo tài liệu' }
          ]
        };
        FS.db.save('documents', doc);
        $('#doc-create-modal').hide();
        self._renderTree();
        self._renderFiles();
        FS.toast(type === 'folder' ? 'Đã tạo thư mục mới' : 'Đã tạo tài liệu mới', 'success');
      });

      // Actions
      $(document).on('click', '.doc-download-btn', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const doc = FS.db.find('documents', id);
        if (!doc) return;
        if (doc.url) {
          window.open(FS.API_BASE + doc.url, '_blank');
          return;
        }
        const blob = new Blob([doc.content || 'Nội dung trống'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name + (doc.type === 'doc' ? '.txt' : doc.type === 'sheet' ? '.csv' : '');
        a.click();
        URL.revokeObjectURL(url);
        FS.toast('Đang tải xuống: ' + doc.name, 'success');
      });

      $(document).on('click', '.doc-share-btn', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const doc = FS.db.find('documents', id);
        if (!doc) return;

        $('#doc-share-id').val(id);
        const users = FS.db.get('users').filter(u => u.id !== doc.createdBy);
        const shared = doc.sharedWith || [];

        $('#doc-share-users').html(users.map(u =>
          `<option value="${u.id}" ${shared.includes(u.id) ? 'selected' : ''}>${FS.str.escape(u.name)} (${u.role})</option>`
        ).join(''));

        $('#doc-share-modal').show();
      });

      $('#doc-share-save-btn').on('click', function () {
        const id = $('#doc-share-id').val();
        const doc = FS.db.find('documents', id);
        if (!doc) return;
        doc.sharedWith = $('#doc-share-users').val() || [];
        FS.db.save('documents', doc);
        $('#doc-share-modal').hide();
        FS.toast('Đã cập nhật quyền chia sẻ', 'success');
        self._renderFiles();
      });

      $(document).on('click', '.doc-versions-btn', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const doc = FS.db.find('documents', id);
        if (!doc) return;

        $('#doc-versions-id').val(id);
        const versions = doc.versions || [];
        const sorted = [...versions].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        $('#doc-versions-list').html(sorted.map((v, idx) => {
          const u = FS.db.find('users', v.uploadedBy);
          const isLatest = idx === 0;
          return `
            <div class="doc-version-item">
              <div>
                <div style="font-weight:600;font-size:13px">Phiên bản ${v.version} ${isLatest ? '<span class="fs-badge badge-neutral">Hiện tại</span>' : ''}</div>
                <div style="font-size:11px;color:var(--fs-text-muted);margin-top:2px">${u?.name || '—'} · ${FS.date.formatTime(v.uploadedAt)}</div>
                <div style="font-size:12px;color:var(--fs-text-secondary);margin-top:4px">${v.note || ''}</div>
              </div>
              ${!isLatest ? `<button class="btn btn-outline btn-sm doc-restore-btn" data-doc-id="${id}" data-version="${v.version}">Khôi phục</button>` : ''}
            </div>
          `;
        }).join('') || '<div class="p-3 text-center text-muted fs-small">Không có lịch sử</div>');

        $('#doc-versions-modal').show();
      });
    },

    _previewDoc(doc) {
      const creator = FS.db.find('users', doc.createdBy);
      const meta = FILE_ICONS[doc.type] || FILE_ICONS.doc;
      const html = `
        <div class="fs-modal-overlay" id="doc-preview-overlay">
          <div class="fs-modal" style="max-width:680px;max-height:80vh">
            <div class="fs-modal-header">
              <div class="d-flex align-items-center gap-3">
                <i class="bi ${meta.icon}" style="font-size:24px;color:${meta.color}"></i>
                <div>
                  <h5 class="fs-h5 m-0">${FS.str.escape(doc.name)}</h5>
                  <div class="fs-small">${creator?.name || '—'} · ${FS.date.format(doc.createdAt)} ${doc.size ? '· ' + FS.str.fileSize(doc.size) : ''}</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('doc-preview-overlay').remove()"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="fs-modal-body" style="min-height:200px">
              <div style="background:var(--fs-bg-secondary);border-radius:var(--fs-radius);padding:20px;font-size:13px;line-height:1.8;color:var(--fs-text-secondary)">
                ${FS.str.escape(doc.content || 'Tài liệu trống.')}
              </div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      document.getElementById('doc-preview-overlay').addEventListener('click', function (e) {
        if (e.target === this) this.remove();
      });
    }
  };

})(window.FS = window.FS || {}, jQuery);