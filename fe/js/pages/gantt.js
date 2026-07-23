/**
 * FlowSpace — Gantt Chart Module
 * Module 3: Custom HTML/CSS Gantt connected to REST API (/api/v1/tasks)
 */
(function (FS, $) {
  'use strict';

  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316'];
  const STATUS_COLORS = {
    active: '#6366f1', on_hold: '#f59e0b', done: '#10b981'
  };

  FS.pages.gantt = {
    _zoom: 'week', // 'week' | 'month'
    _projectFilter: '',
    _tasksData: [],

    async init() {
      await this._loadData();
      this._populateFilters();
      this._render();
      this._bindEvents();
    },

    _getAuthHeaders() {
      const session = FS.auth.getSession();
      return session && session.token ? { 'Authorization': 'Bearer ' + session.token } : {};
    },

    async _loadData() {
      try {
        await FS.loadUsersCache();

        const response = await FS.apiCall({
          url: FS.API_BASE + '/api/v1/tasks',
          type: 'GET'
        });

        if (response && response.success && Array.isArray(response.data)) {
          this._tasksData = response.data.map(t => ({
            id: t.id,
            code: t.code,
            title: t.title,
            description: t.description || '',
            projectId: t.projectId,
            assigneeId: t.assigneeId,
            assigneeName: t.assigneeName || '',
            status: (t.status || 'todo').toLowerCase(),
            priority: (t.priority || 'medium').toLowerCase(),
            startDate: t.startDate,
            dueDate: t.dueDate,
            estimatedHours: t.estimatedHours || 0,
            loggedHours: t.loggedHours || 0
          }));
          $('#gantt-offline-banner').remove();
        } else {
          try {
            this._tasksData = FS.db.get('tasks') || [];
          } catch (dbErr) {
            console.error('Failed to read tasks from local storage:', dbErr);
            this._tasksData = [];
          }
        }
      } catch (err) {
        console.warn('Gantt API request failed, falling back to LocalStorage:', err);
        try {
          this._tasksData = FS.db.get('tasks') || [];
        } catch (dbErr) {
          console.error('Failed to read tasks from local storage:', dbErr);
          this._tasksData = [];
        }
        if (!$('#gantt-offline-banner').length) {
          $('#page-content').prepend('<div id="gantt-offline-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px"><i class="bi bi-exclamation-triangle-fill"></i><span>Không thể kết nối máy chủ. Hiện đang hiển thị dữ liệu tạm thời ngoại tuyến.</span></div>');
        }
      }
    },

    _calculateCriticalPath(tasks) {
      const adj = {};
      const duration = {};
      const inDegree = {};
      
      tasks.forEach(t => {
        adj[t.id] = [];
        inDegree[t.id] = 0;
        let d = 0;
        if (t.startDate && t.dueDate) {
          d = Math.max(1, Math.ceil((new Date(t.dueDate) - new Date(t.startDate)) / (1000*60*60*24)));
        }
        duration[t.id] = d;
      });
      
      tasks.forEach(t => {
        if (t.dependsOn && t.dependsOn.length > 0) {
          t.dependsOn.forEach(dep => {
            if (adj[dep]) {
              adj[dep].push(t.id);
              inDegree[t.id] = (inDegree[t.id] || 0) + 1;
            }
          });
        }
      });
      
      const earlyFinish = {};
      const earlyStart = {};
      tasks.forEach(t => { earlyFinish[t.id] = 0; earlyStart[t.id] = 0; });
      
      const q = [];
      tasks.forEach(t => { if (inDegree[t.id] === 0) q.push(t.id); });
      
      const topoOrder = [];
      while(q.length > 0) {
        const u = q.shift();
        topoOrder.push(u);
        earlyFinish[u] = earlyStart[u] + duration[u];
        
        adj[u].forEach(v => {
          earlyStart[v] = Math.max(earlyStart[v], earlyFinish[u]);
          inDegree[v]--;
          if (inDegree[v] === 0) q.push(v);
        });
      }
      
      let maxEF = 0;
      tasks.forEach(t => { if (earlyFinish[t.id] > maxEF) maxEF = earlyFinish[t.id]; });
      
      const lateFinish = {};
      const lateStart = {};
      tasks.forEach(t => { lateFinish[t.id] = maxEF; lateStart[t.id] = maxEF; });
      
      for (let i = topoOrder.length - 1; i >= 0; i--) {
        const u = topoOrder[i];
        if (adj[u].length === 0) {
          lateFinish[u] = maxEF;
        } else {
          let minLS = maxEF;
          adj[u].forEach(v => { if (lateStart[v] < minLS) minLS = lateStart[v]; });
          lateFinish[u] = minLS;
        }
        lateStart[u] = lateFinish[u] - duration[u];
      }
      
      const criticalSet = new Set();
      tasks.forEach(t => {
        if (earlyStart[t.id] === lateStart[t.id] && duration[t.id] > 0) {
          criticalSet.add(t.id);
        }
      });
      
      return criticalSet;
    },

    _drawDependencyLines() {
      const svg = document.getElementById('gantt-svg-layer');
      if (!svg) return;
      svg.innerHTML = '';
      
      const container = document.getElementById('gantt-container');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      
      const tasks = this._tasksData;
      const criticalSet = this._calculateCriticalPath(tasks);
      
      tasks.forEach(task => {
        if (task.dependsOn && task.dependsOn.length > 0) {
          const targetEls = document.querySelectorAll(`.gantt-bar[data-task-id="${task.id}"]`);
          if (!targetEls.length) return;
          const targetEl = targetEls[0];
          const targetRect = targetEl.getBoundingClientRect();
          const targetX = targetRect.left - containerRect.left + scrollLeft;
          const targetY = targetRect.top - containerRect.top + (targetRect.height / 2);
          
          task.dependsOn.forEach(depId => {
            const sourceEls = document.querySelectorAll(`.gantt-bar[data-task-id="${depId}"]`);
            if (!sourceEls.length) return;
            const sourceEl = sourceEls[sourceEls.length - 1];
            const sourceRect = sourceEl.getBoundingClientRect();
            const sourceX = sourceRect.right - containerRect.left + scrollLeft;
            const sourceY = sourceRect.top - containerRect.top + (sourceRect.height / 2);
            
            const isCritical = criticalSet.has(task.id) && criticalSet.has(depId);
            const color = isCritical ? '#ef4444' : '#94a3b8';
            const strokeWidth = isCritical ? 2 : 1.5;
            
            let pathD = `M ${sourceX} ${sourceY}`;
            if (targetX > sourceX + 15) {
              pathD += ` L ${sourceX + 10} ${sourceY} L ${sourceX + 10} ${targetY} L ${targetX} ${targetY}`;
            } else {
              pathD += ` L ${sourceX + 10} ${sourceY} L ${sourceX + 10} ${sourceY + 15} L ${targetX - 10} ${sourceY + 15} L ${targetX - 10} ${targetY} L ${targetX} ${targetY}`;
            }
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathD);
            path.setAttribute("fill", "transparent");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", strokeWidth);
            if (!isCritical) path.setAttribute("stroke-dasharray", "4 4");
            
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            arrow.setAttribute("points", `${targetX-5},${targetY-4} ${targetX},${targetY} ${targetX-5},${targetY+4}`);
            arrow.setAttribute("fill", color);
            
            svg.appendChild(path);
            svg.appendChild(arrow);
          });
        }
      });
    },

    _populateFilters() {
      const projects = FS.db.get('projects') || [];
      $('#gantt-filter-project').html('<option value="">Tất cả dự án</option>' +
        projects.map(p => `<option value="${p.id}">${FS.str.escape(p.name)}</option>`).join('')
      );
    },

    _render() {
      const now = new Date();
      const tasks = this._tasksData;
      let projects = FS.db.get('projects') || [];

      if (this._projectFilter) {
        projects = projects.filter(p => p.id === this._projectFilter);
      }
      
      this._criticalPath = this._calculateCriticalPath(tasks);

      const days = this._zoom === 'week' ? 28 : 60;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);

      const dates = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dates.push(d);
      }

      const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];
      const monthNames = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

      let headerHtml = '<tr class="gantt-header-row"><th class="gantt-task-header">Công việc / Dự án</th>';
      if (this._zoom === 'week') {
        headerHtml += dates.map(d => {
          const isToday = d.toDateString() === now.toDateString();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return `<th class="gantt-header-cell${isToday?' text-accent':''}${isWeekend?' text-muted':''}" style="min-width:36px">
            <div>${dayNames[d.getDay()]}</div>
            <div style="font-size:14px;font-weight:${isToday?700:400}">${d.getDate()}</div>
          </th>`;
        }).join('');
      } else {
        headerHtml += dates.map(d => {
          const isToday = d.toDateString() === now.toDateString();
          return `<th class="gantt-header-cell${isToday?' text-accent':''}" style="min-width:24px;padding:8px 4px">
            <div style="font-size:10px">${d.getDate() === 1 ? monthNames[d.getMonth()] : (d.getDate() % 5 === 0 ? d.getDate() : '')}</div>
          </th>`;
        }).join('');
      }
      headerHtml += '</tr>';

      let rowsHtml = '';
      let colorIdx = 0;

      projects.forEach(project => {
        const color = STATUS_COLORS[project.status] || COLORS[colorIdx++ % COLORS.length];
        const projTasks = tasks.filter(t => t.projectId === project.id);

        rowsHtml += `<tr class="gantt-row gantt-project-row">
          <td class="gantt-task-cell">
            <div class="d-flex align-items-center gap-2">
              <div style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></div>
              <div>
                <div class="gantt-task-name">${FS.str.escape(project.name)}</div>
                <div class="gantt-task-meta">${project.code} · ${projTasks.length} tasks</div>
              </div>
            </div>
          </td>`;

        dates.forEach(d => {
          const isToday = d.toDateString() === now.toDateString();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const projStart = project.startDate ? new Date(project.startDate) : null;
          const projEnd   = project.endDate   ? new Date(project.endDate)   : null;

          let barHtml = '';
          if (projStart && projEnd) {
            const dayStart = new Date(projStart); dayStart.setHours(0,0,0,0);
            const dayEnd   = new Date(projEnd);   dayEnd.setHours(23,59,59);
            const cellDay  = new Date(d);         cellDay.setHours(12,0,0,0);
            if (cellDay >= dayStart && cellDay <= dayEnd) {
              const isFirst = cellDay.toDateString() === dayStart.toDateString();
              const isLast  = cellDay.toDateString() === dayEnd.toDateString();
              barHtml = `<div style="position:absolute;top:50%;transform:translateY(-50%);height:8px;
                left:${isFirst?'8px':'0'};right:${isLast?'8px':'0'};
                background:${color}30;
                border-radius:${isFirst?'4px 0 0 4px':'0'}${isLast?' 0 4px 4px 0':''}"></div>`;
            }
          }
          rowsHtml += `<td class="gantt-day-cell${isToday?' today':''}" style="${isWeekend?'background:#fafafa':''}">
            ${isToday ? '<div class="gantt-today-line"></div>' : ''}
            ${barHtml}
          </td>`;
        });
        rowsHtml += '</tr>';

        projTasks.slice(0, 5).forEach(task => {
          const assigneeName = task.assigneeName || (FS.user.get(task.assigneeId)?.name || '—');
          rowsHtml += `<tr class="gantt-row" data-task-id="${task.id}" style="cursor:pointer">
            <td class="gantt-task-cell" style="padding-left:28px">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-${task.status==='done'?'check-circle-fill text-success':'circle'}" style="font-size:12px;flex-shrink:0"></i>
                <div style="min-width:0">
                  <div class="gantt-task-name truncate" style="max-width:200px;${task.status==='done'?'text-decoration:line-through;color:var(--fs-text-muted)':''}">${FS.str.escape(task.title)}</div>
                  <div class="gantt-task-meta">${FS.str.escape(assigneeName.split(' ').pop())}</div>
                </div>
              </div>
            </td>`;

          dates.forEach(d => {
            const isToday   = d.toDateString() === now.toDateString();
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const taskStart = task.startDate ? new Date(task.startDate) : null;
            const taskEnd   = task.dueDate   ? new Date(task.dueDate)   : null;

            let barHtml = '';
            if (taskStart && taskEnd) {
              const dayStart = new Date(taskStart); dayStart.setHours(0,0,0,0);
              const dayEnd   = new Date(taskEnd);   dayEnd.setHours(23,59,59);
              const cellDay  = new Date(d);         cellDay.setHours(12,0,0,0);

              if (cellDay >= dayStart && cellDay <= dayEnd) {
                const isFirst = cellDay.toDateString() === dayStart.toDateString();
                const isLast  = cellDay.toDateString() === dayEnd.toDateString();
                const barColor = task.status === 'done' ? '#10b981' :
                                 (FS.date.isOverdue(task.dueDate) ? '#ef4444' : color);
                const progress = task.estimatedHours
                  ? Math.min(100, Math.round(((task.loggedHours||0) / task.estimatedHours) * 100))
                  : (task.status === 'done' ? 100 : 0);

                const isCritical = this._criticalPath.has(task.id);
                const criticalClass = isCritical ? ' critical' : '';

                barHtml = `
                  <div class="gantt-bar-wrapper" style="left:${isFirst?'4px':'0'};right:${isLast?'4px':'0'}">
                    <div class="gantt-bar${criticalClass}" data-task-id="${task.id}" style="background:${barColor};border-radius:${isFirst?'4px':0} ${isLast?'4px':0} ${isLast?'4px':0} ${isFirst?'4px':0}">
                      ${isFirst ? `<span style="max-width:80px;overflow:hidden;pointer-events:none">${progress}%</span>` : ''}
                    </div>
                  </div>`;
              }
            }

            rowsHtml += `<td class="gantt-day-cell${isToday?' today':''}" style="${isWeekend?'background:#fafafa':''}">
              ${isToday ? '<div class="gantt-today-line"></div>' : ''}
              ${barHtml}
            </td>`;
          });
          rowsHtml += '</tr>';
        });
      });

      const tableHtml = `
        <table class="gantt-table">
          <thead>${headerHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>`;

      const $container = document.getElementById('gantt-container');
      if ($container) {
        $container.innerHTML = tableHtml;
        const todayIdx = dates.findIndex(d => d.toDateString() === now.toDateString());
        if (todayIdx > 0) {
          const cellWidth = this._zoom === 'week' ? 36 : 24;
          $container.scrollLeft = Math.max(0, (todayIdx - 3) * cellWidth);
        }
      }

      setTimeout(() => this._drawDependencyLines(), 50);
    },

    _bindEvents() {
      const self = this;

      $('#gantt-filter-project').off('change').on('change', function () {
        self._projectFilter = this.value; self._render();
      });

      $(document).off('click.gantt-zoom').on('click.gantt-zoom', '.gantt-zoom', function () {
        $('.gantt-zoom').removeClass('active');
        $(this).addClass('active');
        self._zoom = $(this).data('zoom');
        self._render();
      });

      $(document).off('click.gantt-task').on('click.gantt-task', '#gantt-container tr[data-task-id] .gantt-task-name', function () {
        const row = $(this).closest('tr');
        FS.taskDetail.open(row.data('task-id'));
      });
      
      let isDragging = false;
      let startX = 0;
      let currentTask = null;
      let initialStart = null;
      let initialEnd = null;
      
      $(document).off('mousedown.gantt-bar').on('mousedown.gantt-bar', '.gantt-bar', function(e) {
        e.stopPropagation();
        isDragging = true;
        startX = e.clientX;
        const taskId = $(this).data('task-id');
        currentTask = self._tasksData.find(t => t.id === taskId);
        if (currentTask && currentTask.startDate && currentTask.dueDate) {
          initialStart = new Date(currentTask.startDate);
          initialEnd = new Date(currentTask.dueDate);
        }
      });
      
      $(document).off('mousemove.gantt').on('mousemove.gantt', function(e) {
        if (!isDragging || !currentTask || !initialStart || !initialEnd) return;
        const deltaX = e.clientX - startX;
        const cellWidth = self._zoom === 'week' ? 36 : 24;
        const shiftDays = Math.round(deltaX / cellWidth);
        
        if (shiftDays !== 0) {
          const newStart = new Date(initialStart);
          newStart.setDate(initialStart.getDate() + shiftDays);
          const newEnd = new Date(initialEnd);
          newEnd.setDate(initialEnd.getDate() + shiftDays);
          
          currentTask.startDate = newStart.toISOString();
          currentTask.dueDate = newEnd.toISOString();
          
          // Send API update bằng FS.apiCall
          FS.apiCall({
            url: FS.API_BASE + '/api/v1/tasks/' + currentTask.id,
            type: 'PUT',
            data: {
              title: currentTask.title,
              description: currentTask.description,
              assigneeId: currentTask.assigneeId,
              status: currentTask.status,
              priority: currentTask.priority,
              startDate: currentTask.startDate,
              dueDate: currentTask.dueDate,
              estimatedHours: currentTask.estimatedHours,
              loggedHours: currentTask.loggedHours || 0
            }
          }).catch(err => {
            console.error('Drag Gantt update failed:', err);
          });

          self._render();
          startX = e.clientX;
          initialStart = new Date(currentTask.startDate);
          initialEnd = new Date(currentTask.dueDate);
        }
      });
      
      $(document).off('mouseup.gantt').on('mouseup.gantt', function() {
        if (isDragging) {
          isDragging = false;
          currentTask = null;
        }
      });
      
      $('#gantt-container').off('scroll.gantt').on('scroll.gantt', () => self._drawDependencyLines());
      $(window).off('resize.gantt').on('resize.gantt', () => self._drawDependencyLines());
    }
  };

})(window.FS = window.FS || {}, jQuery);