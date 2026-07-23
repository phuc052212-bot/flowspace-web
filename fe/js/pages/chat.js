/**
 * FlowSpace — Chat Module
 */
(function (FS, $) {
  'use strict';

  FS.pages.chat = {
    _currentChannel: null,
    _pollTimer: null,
    _searchQuery: '',
    _replyingTo: null,
    _mentionUsers: [],
    _mentionIndex: -1,

    _connection: null,

    async init() {
      this._renderChannelList();
      this._bindEvents();
      
      // Open first channel
      const channels = FS.db.get('channels').filter(c => c.type === 'channel');
      if (channels.length) this._openChannel(channels[0].id);

      await this._initSignalR();
    },

    async _initSignalR() {
      const session = FS.auth.getSession();
      if (!session || !session.token) return;

      const connectionUrl = FS.API_BASE + '/hubs/chat?access_token=' + encodeURIComponent(session.token);

      this._connection = new signalR.HubConnectionBuilder()
        .withUrl(connectionUrl)
        .withAutomaticReconnect()
        .build();

      // Hiển thị banner khi đang kết nối lại
      this._connection.onreconnecting((error) => {
        console.warn('SignalR Reconnecting...', error);
        if (!$('#chat-reconnect-banner').length) {
          $('#page-content').prepend('<div id="chat-reconnect-banner" class="fs-login-alert show" style="display:flex; margin-bottom:16px; background:var(--fs-warning-light); border-color:var(--fs-warning)"><i class="bi bi-exclamation-triangle-fill" style="color:var(--fs-warning)"></i><span>Đang kết nối lại chat...</span></div>');
        }
      });

      this._connection.onreconnected((connectionId) => {
        console.log('SignalR Reconnected.', connectionId);
        $('#chat-reconnect-banner').remove();
        if (this._currentChannel) {
          this._connection.invoke("JoinChannel", this._currentChannel).catch(err => console.error(err));
        }
      });

      this._connection.onclose((error) => {
        console.error('SignalR connection closed.', error);
      });

      // Lắng nghe sự kiện từ Hub
      this._connection.on("ReceiveMessage", (channelId, userJson, messageJson, createdAt) => {
        const msg = typeof messageJson === 'string' ? JSON.parse(messageJson) : messageJson;
        
        const messagesMap = FS.db.getMap('messages');
        if (!messagesMap[channelId]) messagesMap[channelId] = [];
        
        // Tránh trùng lặp tin nhắn của chính mình
        if (!messagesMap[channelId].some(m => m.id === msg.id)) {
          messagesMap[channelId].push(msg);
          FS.db.set('messages', messagesMap);
        }

        if (this._currentChannel === channelId) {
          this._renderMessages(channelId);
        }
      });

      this._connection.on("MessageRecalled", (channelId, msgId) => {
        const messagesMap = FS.db.getMap('messages');
        const channelMsgs = messagesMap[channelId] || [];
        const msg = channelMsgs.find(m => m.id === msgId);
        if (msg) {
          msg.recalled = true;
          FS.db.set('messages', messagesMap);
          if (this._currentChannel === channelId) {
            this._renderMessages(channelId);
          }
        }
      });

      this._connection.on("MessagePinned", (channelId, msgId, isPinned) => {
        const messagesMap = FS.db.getMap('messages');
        const channelMsgs = messagesMap[channelId] || [];
        const msg = channelMsgs.find(m => m.id === msgId);
        if (msg) {
          msg.pinned = isPinned;
          FS.db.set('messages', messagesMap);
          if (this._currentChannel === channelId) {
            this._renderMessages(channelId);
          }
        }
      });

      try {
        await this._connection.start();
        console.log('SignalR Chat Connected.');
        if (this._currentChannel) {
          await this._connection.invoke("JoinChannel", this._currentChannel);
        }
      } catch (err) {
        console.error('SignalR start failed:', err);
      }
    },

    _renderChannelList() {
      const channels = FS.db.get('channels');
      const publicCh = channels.filter(c => c.type === 'channel');
      const dms      = channels.filter(c => c.type === 'dm');

      document.getElementById('chat-channels-list').innerHTML = publicCh.map(c => `
        <div class="chat-channel-item${this._currentChannel === c.id ? ' active' : ''}" data-channel-id="${c.id}">
          <span class="ch-hash">#</span>
          <span>${c.name}</span>
        </div>`).join('');

      document.getElementById('chat-dm-list').innerHTML = dms.map(c => {
        const session = FS.auth.getSession();
        const partnerId = c.partnerId || c.members.find(m => m !== session?.userId);
        const partner   = FS.user.get(partnerId);
        return `
          <div class="chat-channel-item${this._currentChannel === c.id ? ' active' : ''}" data-channel-id="${c.id}">
            <div class="fs-avatar fs-avatar-sm ${partner?.color || 'av-indigo'}" style="width:18px;height:18px;font-size:9px">${partner?.avatar || '?'}</div>
            <span>${partner?.name || '—'}</span>
          </div>`;
      }).join('');
    },

    _openChannel(channelId) {
      const oldChannel = this._currentChannel;
      this._currentChannel = channelId;
      const channel = FS.db.get('channels').find(c => c.id === channelId);
      if (!channel) return;

      $('#chat-page').addClass('chat-active');

      // Update header
      document.getElementById('chat-channel-name').textContent =
        channel.type === 'channel' ? '#' + channel.name : channel.name;
      document.getElementById('chat-channel-desc').textContent =
        channel.description || '';

      // Reset states
      this._searchQuery = '';
      const searchInput = document.getElementById('chat-search-input');
      if(searchInput) searchInput.value = '';
      this._cancelReply();
      this._hideMentionDropdown();

      // Show input
      document.getElementById('chat-input-area').style.display = '';
      document.getElementById('chat-input').focus();

      // Render messages
      this._renderMessages(channelId);

      // Update active state
      this._renderChannelList();

      // SignalR Group management
      if (this._connection && this._connection.state === signalR.HubConnectionState.Connected) {
        if (oldChannel) {
          this._connection.invoke("LeaveChannel", oldChannel).catch(err => console.error(err));
        }
        this._connection.invoke("JoinChannel", channelId).catch(err => console.error(err));
      }
    },

    _renderMessages(channelId) {
      const messagesMap = FS.db.getMap('messages');
      let msgs = messagesMap[channelId] || [];
      const $container = document.getElementById('chat-messages');

      // Filter logic
      if (this._searchQuery) {
        const q = this._searchQuery.toLowerCase();
        msgs = msgs.filter(m => m.text && m.text.toLowerCase().includes(q) && !m.recalled);
      }

      this._renderPinned(messagesMap[channelId] || []);

      if (!msgs.length) {
        $container.innerHTML = this._searchQuery ? '<div class="fs-empty"><p>Không tìm thấy tin nhắn nào khớp với từ khóa.</p></div>' 
            : '<div class="fs-empty" style="padding-top:48px"><i class="bi bi-chat-square-dots"></i><p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p></div>';
        return;
      }

      let html = '<div class="chat-msg-divider">Hôm nay</div>';
      let lastUserId = null;

      msgs.forEach(msg => {
        const user = FS.user.get(msg.userId);
        const session = FS.auth.getSession();
        const isMe = msg.userId === session?.userId || msg.userId === session?.id;

        let displayText = msg.recalled ? '<em style="opacity:0.75">Tin nhắn đã được thu hồi</em>' : FS.str.escape(msg.text);
        
        if (!msg.recalled) {
          const mentionRegex = /@([a-zA-ZÀ-ỹ\s_]+)/g;
          displayText = displayText.replace(mentionRegex, (match) => {
             return `<span class="chat-mention-highlight">${match}</span>`;
          });
          
          if (this._searchQuery) {
            const q = this._searchQuery;
            const searchRegex = new RegExp(`(${FS.str.escape(q).replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
            displayText = displayText.replace(searchRegex, '<span class="chat-search-highlight">$1</span>');
          }
        }

        // Quote
        let quoteHtml = '';
        if (msg.replyTo) {
           const origMsg = (messagesMap[channelId] || []).find(m => m.id === msg.replyTo);
           if (origMsg) {
             const origUser = FS.user.get(origMsg.userId);
             let origText = origMsg.recalled ? 'Tin nhắn đã được thu hồi' : origMsg.text;
             quoteHtml = `<div class="chat-quoted-msg">
                <strong>${FS.str.escape(origUser?.name || 'Thành viên')}</strong>: ${FS.str.escape(origText)}
             </div>`;
           }
        }

        // Actions
        let actionsHtml = '';
        if (!msg.recalled) {
            actionsHtml = `<div class="chat-msg-actions">
              <button class="chat-msg-action-btn action-reply" data-id="${msg.id}" title="Trả lời"><i class="bi bi-reply-fill"></i></button>
              <button class="chat-msg-action-btn action-pin" data-id="${msg.id}" title="${msg.pinned?'Bỏ ghim':'Ghim'}"><i class="bi ${msg.pinned?'bi-pin-fill':'bi-pin'}"></i></button>
              ${isMe ? `<button class="chat-msg-action-btn action-recall" data-id="${msg.id}" title="Thu hồi"><i class="bi bi-trash-fill"></i></button>` : ''}
            </div>`;
        }

        const avatarHtml = isMe ? '' : `<div class="fs-avatar fs-avatar-sm ${user?.color || 'av-indigo'}" style="flex-shrink:0">${user?.avatar || '?'}</div>`;
        const nameHtml = (!isMe) ? `<div class="chat-sender-name">${FS.str.escape(user?.name || 'Thành viên')}</div>` : '';

        html += `<div class="chat-msg-row ${isMe ? 'is-me' : 'is-other'}" data-msg-id="${msg.id}">
          ${actionsHtml}
          ${avatarHtml}
          <div style="display:flex;flex-direction:column;min-width:0;align-items:${isMe ? 'flex-end' : 'flex-start'}">
            ${nameHtml}
            <div class="chat-bubble">
              ${quoteHtml}
              <div>${displayText}</div>
              <div class="chat-bubble-time">${FS.date.chatTime(msg.createdAt)}</div>
            </div>
            ${msg.reactions && Object.keys(msg.reactions).length ? `
              <div class="d-flex gap-1 mt-1">
                ${Object.entries(msg.reactions).map(([emoji, count]) =>
                  `<span class="fs-badge badge-neutral" style="cursor:default;font-size:11px;padding:1px 5px">${emoji === 'heart'?'❤️':emoji==='clap'?'👏':emoji==='like'?'👍':emoji==='party'?'🎉':'⭐'} ${count}</span>`
                ).join('')}
              </div>` : ''}
          </div>
        </div>`;
      });

      $container.innerHTML = html;

      // Scroll to bottom only if not searching (otherwise keeps jumping)
      if(!this._searchQuery) {
        setTimeout(() => {
          $container.scrollTop = $container.scrollHeight;
        }, 50);
      }
    },

    _renderPinned(msgs) {
      const pinnedMsgs = msgs.filter(m => m.pinned && !m.recalled).slice(0, 3);
      const $panel = document.getElementById('chat-pinned-panel');
      const $list = document.getElementById('chat-pinned-list');
      
      if (!pinnedMsgs.length) {
        $panel.style.display = 'none';
        return;
      }

      $panel.style.display = 'block';
      $list.innerHTML = pinnedMsgs.map(m => {
        const user = FS.db.find('users', m.userId);
        return `<div class="chat-pinned-item">
          <div style="font-weight:600;width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0">${FS.str.escape(user?.name||'Unknown')}</div>
          <div style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fs-text-secondary)">${FS.str.escape(m.text)}</div>
        </div>`;
      }).join('');
    },

    _cancelReply() {
      this._replyingTo = null;
      const $panel = document.getElementById('chat-reply-panel');
      if($panel) $panel.style.display = 'none';
    },

    _sendMessage(text) {
      if (!text.trim() || !this._currentChannel) return;
      const session = FS.auth.getSession();
      const msg = {
        id: FS.db.newId(),
        channelId: this._currentChannel,
        userId: session?.userId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        reactions: {},
        replyTo: this._replyingTo,
        recalled: false,
        pinned: false
      };

      // Lưu local trước để phản hồi UI ngay lập tức
      const messagesMap = FS.db.getMap('messages');
      if (!messagesMap[this._currentChannel]) messagesMap[this._currentChannel] = [];
      messagesMap[this._currentChannel].push(msg);
      FS.db.set('messages', messagesMap);

      this._cancelReply();
      this._hideMentionDropdown();
      this._renderMessages(this._currentChannel);
      const $input = document.getElementById('chat-input');
      $input.value = '';
      $input.style.height = 'auto';

      // Phát tin nhắn qua SignalR Hub
      if (this._connection && this._connection.state === signalR.HubConnectionState.Connected) {
        this._connection.invoke("SendMessage", this._currentChannel, session.username || session.email || 'User', JSON.stringify(msg))
          .catch(err => console.error('Send SignalR message failed:', err));
      }
    },

    _showMentionDropdown(query) {
       const users = FS.db.get('users').filter(u => u.name.toLowerCase().includes(query.toLowerCase()));
       const $dd = document.getElementById('chat-mention-dropdown');
       if(!users.length) {
          $dd.style.display = 'none';
          return;
       }
       this._mentionUsers = users.slice(0, 5);
       this._mentionIndex = 0;
       this._renderMentionDropdown();
       $dd.style.display = 'block';
    },

    _renderMentionDropdown() {
       const $dd = document.getElementById('chat-mention-dropdown');
       $dd.innerHTML = this._mentionUsers.map((u, idx) => `
         <div class="chat-mention-item ${idx === this._mentionIndex ? 'active' : ''}" data-name="${u.name}">
            <div class="fs-avatar fs-avatar-sm ${u.color}" style="width:20px;height:20px;font-size:10px">${u.avatar}</div>
            <div>${FS.str.escape(u.name)}</div>
         </div>
       `).join('');
    },

    _hideMentionDropdown() {
       this._mentionUsers = [];
       const $dd = document.getElementById('chat-mention-dropdown');
       if($dd) $dd.style.display = 'none';
    },

    _insertMention(name) {
       const $input = document.getElementById('chat-input');
       const val = $input.value;
       const cursor = $input.selectionStart;
       const before = val.substring(0, cursor);
       const after = val.substring(cursor);
       const lastAt = before.lastIndexOf('@');
       
       if (lastAt >= 0) {
          const newVal = before.substring(0, lastAt) + '@' + name + ' ' + after;
          $input.value = newVal;
          $input.focus();
          // Update height
          $input.style.height = 'auto';
          $input.style.height = Math.min($input.scrollHeight, 120) + 'px';
          // Move cursor
          const newPos = lastAt + name.length + 2;
          $input.setSelectionRange(newPos, newPos);
       }
       this._hideMentionDropdown();
    },

    _bindEvents() {
      const self = this;

      // Mobile back button
      document.getElementById('chat-mobile-back')?.addEventListener('click', function () {
        $('#chat-page').removeClass('chat-active');
      });

      // Channel click
      $(document).off('click.channelItem').on('click.channelItem', '.chat-channel-item', function () {
        self._openChannel(this.dataset.channelId);
      });

      const $input = document.getElementById('chat-input');
      if ($input) {
         $input.addEventListener('keydown', function (e) {
            // Mentions navigation
            if (self._mentionUsers.length > 0) {
               if (e.key === 'ArrowDown') { e.preventDefault(); self._mentionIndex = (self._mentionIndex + 1) % self._mentionUsers.length; self._renderMentionDropdown(); return; }
               if (e.key === 'ArrowUp') { e.preventDefault(); self._mentionIndex = (self._mentionIndex - 1 + self._mentionUsers.length) % self._mentionUsers.length; self._renderMentionDropdown(); return; }
               if (e.key === 'Enter') { e.preventDefault(); self._insertMention(self._mentionUsers[self._mentionIndex].name); return; }
               if (e.key === 'Escape') { e.preventDefault(); self._hideMentionDropdown(); return; }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              self._sendMessage(this.value);
            }
         });

         $input.addEventListener('input', function (e) {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';

            const val = this.value;
            const cursor = this.selectionStart;
            const before = val.substring(0, cursor);
            const match = before.match(/@([a-zA-ZÀ-ỹ\\s_]*)$/);
            
            if (match) {
               self._showMentionDropdown(match[1]);
            } else {
               self._hideMentionDropdown();
            }
         });
      }

      // Mention click
      $(document).off('click.mentionItem').on('click.mentionItem', '.chat-mention-item', function() {
         self._insertMention($(this).data('name'));
      });

      // Send button
      $('#chat-send-btn').off('click').on('click', function () {
        self._sendMessage($('#chat-input').val());
      });

      // Actions
      $(document).off('click.chatReply').on('click.chatReply', '.action-reply', function() {
         const msgId = $(this).data('id');
         const messagesMap = FS.db.getMap('messages');
         const msg = (messagesMap[self._currentChannel] || []).find(m => m.id === msgId);
         if(msg) {
             self._replyingTo = msgId;
             const user = FS.db.find('users', msg.userId);
             $('#chat-reply-name').text('Đang trả lời ' + (user?.name || 'Unknown'));
             $('#chat-reply-text').text(msg.text);
             $('#chat-reply-panel').css('display', 'flex');
             $('#chat-input').focus();
         }
      });

      $('#chat-reply-cancel').off('click').on('click', () => self._cancelReply());

      $(document).off('click.chatRecall').on('click.chatRecall', '.action-recall', function() {
         if(!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;
         const msgId = $(this).data('id');
         const messagesMap = FS.db.getMap('messages');
         const channelMsgs = messagesMap[self._currentChannel] || [];
         const msg = channelMsgs.find(m => m.id === msgId);
         if(msg) {
             msg.recalled = true;
             FS.db.set('messages', messagesMap);
             self._renderMessages(self._currentChannel);

             if (self._connection && self._connection.state === signalR.HubConnectionState.Connected) {
                 self._connection.invoke("RecallMessage", self._currentChannel, msgId)
                     .catch(err => console.error(err));
             }
         }
      });

      $(document).off('click.chatPin').on('click.chatPin', '.action-pin', function() {
         const msgId = $(this).data('id');
         const messagesMap = FS.db.getMap('messages');
         const channelMsgs = messagesMap[self._currentChannel] || [];
         const msg = channelMsgs.find(m => m.id === msgId);
         if(msg) {
             msg.pinned = !msg.pinned;
             FS.db.set('messages', messagesMap);
             self._renderMessages(self._currentChannel);

             if (self._connection && self._connection.state === signalR.HubConnectionState.Connected) {
                 self._connection.invoke("PinMessage", self._currentChannel, msgId, msg.pinned)
                     .catch(err => console.error(err));
             }
         }
      });

      // Search
      const $search = document.getElementById('chat-search-input');
      if ($search) {
         $search.addEventListener('input', function() {
            self._searchQuery = this.value;
            self._renderMessages(self._currentChannel);
         });
      }

    }
  };

})(window.FS = window.FS || {}, jQuery);