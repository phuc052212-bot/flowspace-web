/**
 * FlowSpace — Calendar Page Module
 * Module 3: Uses FullCalendar.js connected to RESTful API (/api/v1/tasks)
 */
(function (FS, $) {
  'use strict'; FS.pages.calendar = {
    _calendar: null,
    _projectFilter: '',
    _tasksData: [],

    async init() {
      // 1. Instant 0ms SWR render with local seed data (NO SPINNER!)
      this._tasksData = FS.db.get('tasks') || [];
      this._populateFilters();
      this._renderCalendar();
      this._bindEvents();

      // 2. Fetch live data from backend API in background & sync seamlessly
      await this._loadData();
    },

    async _loadData() {
      try {
        try {
          await FS.loadUsersCache();
        } catch (e) {
          console.warn('loadUsersCache failed in calendar page:', e);
        }

        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/tasks',
          type: 'GET'
        });

        if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
          const apiTasks = response.data.map(t => ({
            id: t.id,
            title: t.title,
            projectId: t.projectId,
            projectName: t.projectName || '',
            status: (t.status || 'todo').toLowerCase(),
            priority: (t.priority || 'medium').toLowerCase(),
            startDate: t.startDate,
            dueDate: t.dueDate
          }));

          const mergedMap = new Map();
          const seedData = FS.db.get('tasks') || [];
          for (const s of seedData) mergedMap.set(s.id, s);
          for (const a of apiTasks) mergedMap.set(a.id, a);

          this._tasksData = Array.from(mergedMap.values());
          $('#calendar-offline-banner').remove();
        } else {
          this._tasksData = FS.db.get('tasks') || [];
        }
      } catch (err) {
        console.warn('Calendar API request failed, falling back to LocalStorage:', err);
        this._tasksData = FS.db.get('tasks') || [];
        if (!$('#calendar-offline-banner').length) {
          $('#page-content').prepend('<div id="calendar-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu tạm thời ngoại tuyến.</span></div>');
        }
      } finally {
        this._populateFilters();
        this._renderCalendar();
      }
    },

    _populateFilters() {
      const projects = FS.db.get('projects') || [];
      const $sel = $('#cal-filter-project');
      if ($sel.length) {
        $sel.html('<option value="">Tất cả dự án</option>' +
          projects.map(p => `<option value="${p.id}">${FS.str.escape(p.name)}</option>`).join('')
        );
      }
    },

    _getEvents() {
      let tasks = [...this._tasksData];
      if (this._projectFilter) {
        tasks = tasks.filter(t => t.projectId === this._projectFilter);
      }

      const statusColors = {
        todo: '#94a3b8',
        in_progress: '#6366f1',
        review: '#f59e0b',
        done: '#10b981'
      };

      const events = tasks
        .filter(t => t.dueDate)
        .map(t => {
          const project = FS.db.find('projects', t.projectId);
          const projName = t.projectName || (project ? project.name : '');
          const overdue = t.status !== 'done' && new Date(t.dueDate) < new Date();
          return {
            id: t.id,
            title: t.title,
            start: t.startDate || t.dueDate,
            end: t.dueDate,
            allDay: true,
            backgroundColor: overdue ? '#ef4444' : statusColors[t.status] || '#6366f1',
            extendedProps: { task: t, projectName: projName }
          };
        });

      // Add meeting events for realism
      const now = new Date();
      const addMeeting = (title, dayOffset, hour = 10, color = '#8b5cf6') => {
        const d = new Date(now);
        d.setDate(d.getDate() + dayOffset);
        d.setHours(hour, 0, 0, 0);
        const end = new Date(d); end.setHours(hour + 1);
        events.push({ title, start: d.toISOString(), end: end.toISOString(), backgroundColor: color, extendedProps: { isMeeting: true } });
      };

      addMeeting('Sprint Review', 0, 15);
      addMeeting('Team Standup', 1, 9);
      addMeeting('Demo khách hàng', 3, 14, '#f59e0b');
      addMeeting('1-on-1 với TN', 5, 11, '#ec4899');
      addMeeting('Sprint Planning', 7, 10);

      return events;
    },

    _renderCalendar() {
      const el = document.getElementById('calendar-el');
      if (!el || typeof FullCalendar === 'undefined') return;

      if (this._calendar) { this._calendar.destroy(); }

      const self = this;
      this._calendar = new FullCalendar.Calendar(el, {
        locale: 'vi',
        initialView: window.innerWidth < 768 ? 'timeGridDay' : 'dayGridMonth',
        editable: true,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
          today: 'Hôm nay',
          month: 'Tháng',
          week: 'Tuần',
          day: 'Ngày'
        },
        events: this._getEvents(),
        eventClick(info) {
          const task = info.event.extendedProps.task;
          if (task) {
            FS.taskDetail.open(task.id);
          } else if (info.event.extendedProps.isMeeting) {
            FS.toast(`📅 ${info.event.title}`, 'info', 2000);
          }
        },
        eventDrop: async function (info) {
          await self._updateEventDates(info.event, info.revert);
        },
        eventResize: async function (info) {
          await self._updateEventDates(info.event, info.revert);
        },
        dayMaxEvents: 3,
        moreLinkText: n => `+${n} nữa`,
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        height: 'auto',
        firstDay: 1 // Monday
      });

      this._calendar.render();
    },

    async _updateEventDates(event, revertFunc) {
      const task = event.extendedProps.task;
      if (!task) return;

      const startDate = event.start ? event.start.toISOString() : null;
      const dueDate = event.end ? event.end.toISOString() : startDate;

      try {
        const fullTaskRes = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/tasks/' + task.id,
          type: 'GET'
        });

        if (fullTaskRes && fullTaskRes.success) {
          const fullTask = fullTaskRes.data;
          const updatePayload = {
            title: fullTask.title,
            description: fullTask.description || '',
            assigneeId: fullTask.assigneeId,
            status: fullTask.status,
            priority: fullTask.priority,
            startDate: startDate,
            dueDate: dueDate,
            estimatedHours: fullTask.estimatedHours || 0,
            loggedHours: fullTask.loggedHours || 0
          };

          const res = await FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks/' + task.id,
            type: 'PUT',
            data: updatePayload
          });

          if (res && res.success) {
            FS.toast('Đã cập nhật ngày công việc thành công!', 'success');
            await this._loadData();
            this._renderCalendar();
          } else {
            FS.toast('Lỗi cập nhật ngày từ máy chủ.', 'error');
            if (typeof revertFunc === 'function') revertFunc();
          }
        }
      } catch (err) {
        console.error('Update calendar event failed:', err);
        FS.toast('Không thể cập nhật ngày công việc lên máy chủ.', 'error');
        if (typeof revertFunc === 'function') revertFunc();
      }
    },

    _bindEvents() {
      const self = this;
      document.getElementById('cal-filter-project')?.addEventListener('change', function () {
        self._projectFilter = this.value;
        self._renderCalendar();
      });
    }
  };

})(window.FS = window.FS || {}, jQuery);