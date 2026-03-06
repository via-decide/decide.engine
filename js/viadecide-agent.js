/* ================================================================
   ViaDecide Agent — Standalone Embeddable Widget v1.0
   Usage: <script src="/js/viadecide-agent.js"></script>
   Safe to include multiple times — duplicate guard prevents double mount.
   © ViaDecide
================================================================ */
(function () {
  'use strict';

  /* A) Duplicate guard */
  if (window.VDAgentLoaded) return;
  window.VDAgentLoaded = true;

  /* D) ViaDecide internal route map */
  var VD_ROUTES = {
    '/app-generator'          : 'App Generator',
    '/alchemist'              : 'Prompt Alchemist',
    '/decision-brief'         : 'Decision Brief',
    '/brief'                  : 'Quick Decision Brief',
    '/student-research'       : 'Student Research Tool',
    '/finance-dashboard-msme' : 'MSME Finance Dashboard',
    '/sales-dashboard'        : 'MSME Sales Dashboard',
    '/StudyOS'                : 'StudyOS',
    '/ViaGuide'               : 'ViaGuide',
    '/ONDC-demo'              : 'ONDC Demo',
    '/HexWars'                : 'HexWars',
    '/printbydd-store'        : 'PrintByDD Store',
    '/founder'                : 'Founder Page',
    '/DharamDaxini'           : 'Dharam Daxini — Sessions',
    '/cohort-apply-here'      : 'Cohort Application',
    '/pricing'                : 'Pricing',
    '/contact'                : 'Contact',
  };

  /* State */
  var isOpen        = false;
  var currentTab    = 'chat';
  var isThinking    = false;
  var _docxPromise  = null;
  var apiKey        = localStorage.getItem('vd_agent_key') || '';
  var selectedModel = localStorage.getItem('vd_agent_model') || 'gemini-2.0-flash';
  var tasks         = JSON.parse(localStorage.getItem('vd_tasks') || '[]');
  var history       = [];

  /* DOM helper */
  function $id(id) { return document.getElementById(id); }

  /* C) Page context */
  function getPageContext() {
    var descEl = document.querySelector('meta[name="description"]');
    return {
      site : 'ViaDecide',
      path : window.location.pathname,
      title: document.title || 'ViaDecide',
      desc : descEl ? (descEl.content || '') : '',
    };
  }

  /* G) HTML escape */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* E) XSS-safe markup renderer */
  function formatText(raw) {
    /* 1. Escape first */
    var s = esc(raw);
    /* 2. Internal links only */
    s = s.replace(
      /\[([^\]]{1,80})\]\((\/[A-Za-z0-9\-_./#]{1,120})\)/g,
      '<a href="$2" target="_self">$1 ↗</a>'
    );
    /* 3. Bold */
    s = s.replace(/\*\*([^*\n]{1,200}?)\*\*/g, '<strong>$1</strong>');
    /* 4. Lists */
    var lines = s.split('\n');
    var out = [];
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var isBullet = /^[-•*]\s+/.test(line);
      if (isBullet) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + line.replace(/^[-•*]\s+/, '') + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(line);
      }
    }
    if (inList) out.push('</ul>');
    /* 5. Line breaks */
    return out.join('\n')
      .replace(/\n?(<ul>)/g, '$1')
      .replace(/(<\/ul>)\n?/g, '$1')
      .replace(/\n/g, '<br>');
  }

  /* H) System prompt */
  function buildSystemPrompt() {
    var ctx = getPageContext();
    var routeList = Object.keys(VD_ROUTES).map(function (path) {
      return '  [' + VD_ROUTES[path] + '](' + path + ')';
    }).join('\n');
    var activeTasks = tasks.filter(function (t) { return !t.done; });
    var taskList = activeTasks.length
      ? activeTasks.map(function (t) { return '  - ' + t.title; }).join('\n')
      : '  (none)';
    return 'You are the ViaDecide AI Agent — a decision assistant, planning companion, and site guide for ViaDecide (viadecide.com).\n\n' +
      'Current page: ' + ctx.title + ' (' + ctx.path + ')\n' +
      (ctx.desc ? 'Page description: ' + ctx.desc + '\n' : '') +
      '\nViaDecide tools — link to them when relevant:\n' + routeList + '\n' +
      '\nUser\'s active tasks:\n' + taskList + '\n' +
      '\nGuidelines:\n' +
      '- Be concise and actionable\n' +
      '- Use **bold** for key terms\n' +
      '- Use bullet lists (- item) for options or steps\n' +
      '- When suggesting a ViaDecide tool, use its [Tool Name](/path) markdown link\n' +
      '- Only use internal links (paths starting with /); no external URLs\n' +
      '- Do not include the full URL — only the path';
  }

  /* B) Lazy docx */
  function loadDocx() {
    if (_docxPromise) return _docxPromise;
    _docxPromise = new Promise(function (resolve, reject) {
      if (window.docx) { resolve(window.docx); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js';
      s.onload  = function () { resolve(window.docx); };
      s.onerror = function () {
        _docxPromise = null;
        reject(new Error('Failed to load document library. Check your internet connection.'));
      };
      document.head.appendChild(s);
    });
    return _docxPromise;
  }

  /* ── I) Self-inject widget CSS + DOM ──────────────────────────── */
  function injectStyles() {
    if ($id('vd-agent-styles')) return;
    var style = document.createElement('style');
    style.id = 'vd-agent-styles';
    style.textContent = [
      '#vd-agent-root{--vd-accent:#818cf8;--vd-accent2:#c084fc;--vd-bg:#111217;--vd-surface:#16181d;--vd-border:#1e2530;--vd-text:#e2e8f0;--vd-muted:#64748b;--vd-radius:16px;font-family:"Inter",system-ui,sans-serif}',
      '#vd-agent-fab{position:fixed;bottom:24px;right:24px;z-index:9998;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#c084fc);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(129,140,248,.45);transition:transform .2s,box-shadow .2s}',
      '#vd-agent-fab:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(129,140,248,.6)}',
      '#vd-agent-fab svg{width:24px;height:24px;color:#fff}',
      '#vd-agent-panel{position:fixed;bottom:92px;right:24px;z-index:9999;width:380px;height:560px;background:var(--vd-bg);border:1px solid var(--vd-border);border-radius:var(--vd-radius);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.7);opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;transition:opacity .22s ease,transform .22s ease}',
      '#vd-agent-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}',
      '@media(max-width:480px){#vd-agent-panel{width:calc(100vw - 16px);right:8px;bottom:84px;height:calc(100vh - 100px)}}',
      '.vd-header{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--vd-border);background:var(--vd-surface);flex-shrink:0}',
      '.vd-logo-mark{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#818cf8,#c084fc);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}',
      '.vd-logo-text{font-size:13px;font-weight:600;color:var(--vd-text)}.vd-logo-sub{font-size:10px;color:var(--vd-muted)}',
      '.vd-tabs{display:flex;gap:2px;margin-left:auto;background:rgba(255,255,255,.04);border-radius:8px;padding:3px}',
      '.vd-tabs button{background:none;border:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--vd-muted);padding:5px 10px;border-radius:6px;transition:background .15s,color .15s}',
      '.vd-tabs button.active{background:var(--vd-accent);color:#fff}',
      '.vd-close-btn{background:none;border:none;cursor:pointer;color:var(--vd-muted);font-size:16px;padding:4px 6px;border-radius:6px;line-height:1;transition:color .15s,background .15s}',
      '.vd-close-btn:hover{color:var(--vd-text);background:rgba(255,255,255,.06)}',
      '.vd-pane{display:flex;flex-direction:column;flex:1;overflow:hidden}',
      '.vd-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth}',
      '.vd-messages::-webkit-scrollbar{width:4px}.vd-messages::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}',
      '.vd-bubble{max-width:88%;padding:10px 13px;border-radius:12px;font-size:13px;line-height:1.55;word-break:break-word}',
      '.vd-bubble-user{align-self:flex-end;background:var(--vd-accent);color:#fff;border-bottom-right-radius:4px}',
      '.vd-bubble-model{align-self:flex-start;background:var(--vd-surface);color:var(--vd-text);border:1px solid var(--vd-border);border-bottom-left-radius:4px}',
      '.vd-bubble a{color:#a5b4fc;text-decoration:underline}.vd-bubble strong{font-weight:600;color:#f1f5f9}',
      '.vd-bubble ul{padding-left:16px;margin:4px 0}.vd-bubble li{margin-bottom:2px}',
      '.vd-thinking{display:flex;align-items:center;gap:5px;padding:12px 14px}',
      '.vd-thinking span{width:6px;height:6px;border-radius:50%;background:var(--vd-muted);display:inline-block;animation:vd-bounce .9s ease-in-out infinite}',
      '.vd-thinking span:nth-child(2){animation-delay:.15s}.vd-thinking span:nth-child(3){animation-delay:.3s}',
      '@keyframes vd-bounce{0%,80%,100%{transform:scale(.8);opacity:.4}40%{transform:scale(1.1);opacity:1}}',
      '.vd-empty-state{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--vd-muted);font-size:13px;text-align:center;padding:24px}',
      '.vd-empty-state .icon{font-size:28px;margin-bottom:4px}',
      '.vd-quick-row{display:flex;gap:6px;padding:8px 12px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid var(--vd-border)}',
      '.vd-chip{background:rgba(129,140,248,.1);border:1px solid rgba(129,140,248,.2);color:#a5b4fc;font-size:11px;font-weight:500;border-radius:20px;padding:4px 10px;cursor:pointer;white-space:nowrap;transition:background .15s;font-family:inherit}',
      '.vd-chip:hover{background:rgba(129,140,248,.22)}',
      '.vd-input-row{display:flex;gap:8px;align-items:flex-end;padding:10px 12px;border-top:1px solid var(--vd-border);flex-shrink:0}',
      '#vd-chat-input{flex:1;background:var(--vd-surface);border:1px solid var(--vd-border);border-radius:10px;color:var(--vd-text);font-size:13px;font-family:inherit;padding:9px 12px;resize:none;max-height:96px;outline:none;line-height:1.5;transition:border-color .15s}',
      '#vd-chat-input:focus{border-color:var(--vd-accent)}',
      '#vd-chat-input::placeholder{color:var(--vd-muted)}',
      '#vd-send-btn{width:36px;height:36px;border-radius:10px;border:none;background:var(--vd-accent);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s,opacity .15s;flex-shrink:0}',
      '#vd-send-btn:hover{background:#6d7ff5}#vd-send-btn:disabled{opacity:.5;cursor:not-allowed}',
      '.vd-status{font-size:11px;transition:opacity .4s;opacity:0;padding:0 12px 6px;flex-shrink:0}',
      '.vd-task-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:4px}',
      '.vd-task-item{display:flex;align-items:center;gap:10px;background:var(--vd-surface);border:1px solid var(--vd-border);border-radius:8px;padding:10px 12px;transition:opacity .15s}',
      '.vd-task-item.done{opacity:.5}',
      '.vd-task-item input[type=checkbox]{cursor:pointer;accent-color:var(--vd-accent);flex-shrink:0}',
      '.vd-task-title{flex:1;font-size:13px;color:var(--vd-text)}',
      '.vd-task-item.done .vd-task-title{text-decoration:line-through;color:var(--vd-muted)}',
      '.vd-task-del{background:none;border:none;cursor:pointer;color:var(--vd-muted);font-size:12px;padding:2px 5px;border-radius:4px;flex-shrink:0;transition:color .15s,background .15s;font-family:inherit}',
      '.vd-task-del:hover{color:#f87171;background:rgba(248,113,113,.1)}',
      '.vd-add-form{display:none;gap:8px;padding:10px 12px;border-top:1px solid var(--vd-border);flex-shrink:0}',
      '#vd-task-input{flex:1;background:var(--vd-surface);border:1px solid var(--vd-border);border-radius:8px;color:var(--vd-text);font-size:13px;font-family:inherit;padding:8px 12px;outline:none;transition:border-color .15s}',
      '#vd-task-input:focus{border-color:var(--vd-accent)}',
      '#vd-task-input::placeholder{color:var(--vd-muted)}',
      '.vd-task-footer{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--vd-border);flex-shrink:0}',
      '.vd-btn{background:rgba(255,255,255,.06);border:1px solid var(--vd-border);color:var(--vd-text);font-size:12px;font-weight:500;font-family:inherit;border-radius:8px;padding:8px 14px;cursor:pointer;transition:background .15s,border-color .15s}',
      '.vd-btn:hover{background:rgba(255,255,255,.1)}',
      '.vd-btn-primary{background:var(--vd-accent);border-color:var(--vd-accent);color:#fff}',
      '.vd-btn-primary:hover{background:#6d7ff5}',
      '.vd-btn-sm{padding:6px 10px;font-size:11px}',
      '.vd-guide-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}',
      '.vd-guide-body::-webkit-scrollbar{width:4px}.vd-guide-body::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}',
      '.vd-guide-body label{font-size:11px;font-weight:600;color:var(--vd-muted);letter-spacing:.04em;text-transform:uppercase;margin-bottom:-8px}',
      '.vd-input-field{background:var(--vd-surface);border:1px solid var(--vd-border);border-radius:8px;color:var(--vd-text);font-size:13px;font-family:inherit;padding:9px 12px;outline:none;width:100%;transition:border-color .15s}',
      '.vd-input-field:focus{border-color:var(--vd-accent)}',
      '.vd-input-field::placeholder{color:var(--vd-muted)}',
      '.vd-row{display:flex;gap:6px;align-items:stretch}.vd-row .vd-input-field{flex:1}',
      '.vd-guide-section-title{font-size:11px;font-weight:700;color:var(--vd-accent);letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid var(--vd-border);padding-bottom:6px;margin-top:4px}',
      '.vd-info-card{background:var(--vd-surface);border:1px solid var(--vd-border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--vd-muted);line-height:1.55}',
      '.vd-info-card b{color:var(--vd-text)}.vd-info-card a{color:#a5b4fc}',
      '.vd-model-select{background:var(--vd-surface);border:1px solid var(--vd-border);border-radius:8px;color:var(--vd-text);font-size:13px;font-family:inherit;padding:9px 12px;outline:none;width:100%;cursor:pointer}',
      '.vd-model-select:focus{border-color:var(--vd-accent)}',
    ].join('');
    document.head.appendChild(style);
  }

  function injectDOM() {
    if ($id('vd-agent-root')) return; /* already present */
    var root = document.createElement('div');
    root.id = 'vd-agent-root';
    root.innerHTML = [
      /* FAB */
      '<button id="vd-agent-fab" onclick="window.VDAgent.toggle()" aria-label="Open ViaDecide Agent" aria-expanded="false">',
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">',
          '<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>',
          '<path stroke-linecap="round" stroke-linejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>',
        '</svg>',
      '</button>',
      /* Panel */
      '<div id="vd-agent-panel" role="dialog" aria-label="ViaDecide Agent" aria-modal="true">',
        /* Header */
        '<div class="vd-header">',
          '<div class="vd-logo-mark">V</div>',
          '<div><div class="vd-logo-text">VD Agent</div><div class="vd-logo-sub">Powered by Gemini</div></div>',
          '<div class="vd-tabs">',
            '<button id="vd-tab-chat"  onclick="window.VDAgent.switchTab(\'chat\')"  class="active">Chat</button>',
            '<button id="vd-tab-tasks" onclick="window.VDAgent.switchTab(\'tasks\')">Tasks</button>',
            '<button id="vd-tab-guide" onclick="window.VDAgent.switchTab(\'guide\')">Guide</button>',
          '</div>',
          '<button class="vd-close-btn" onclick="window.VDAgent.toggle()" aria-label="Close widget">\u2715</button>',
        '</div>',
        /* Chat pane */
        '<div id="vd-pane-chat" class="vd-pane">',
          '<div id="vd-chat-messages" class="vd-messages"></div>',
          '<div class="vd-quick-row">',
            '<button class="vd-chip" onclick="window.VDAgent.quickSend(\'What tools does ViaDecide have?\')">Tools</button>',
            '<button class="vd-chip" onclick="window.VDAgent.quickSend(\'Help me make a decision\')">Decisions</button>',
            '<button class="vd-chip" onclick="window.VDAgent.quickSend(\'Summarize my active tasks\')">My tasks</button>',
          '</div>',
          '<div class="vd-input-row">',
            '<textarea id="vd-chat-input" placeholder="Ask anything\u2026" rows="1"></textarea>',
            '<button id="vd-send-btn" onclick="window.VDAgent.send()" aria-label="Send">',
              '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"/></svg>',
            '</button>',
          '</div>',
          '<span id="vd-send-status" class="vd-status" aria-live="polite"></span>',
        '</div>',
        /* Tasks pane */
        '<div id="vd-pane-tasks" class="vd-pane" style="display:none">',
          '<div id="vd-task-list" class="vd-task-list"></div>',
          '<div id="vd-add-form" class="vd-add-form">',
            '<input id="vd-task-input" class="vd-input-field" placeholder="Task title\u2026" type="text"/>',
            '<button class="vd-btn vd-btn-primary vd-btn-sm" onclick="window.VDAgent.addTask()">Add</button>',
          '</div>',
          '<div class="vd-task-footer">',
            '<button class="vd-btn" style="flex:1" onclick="window.VDAgent.toggleAddForm()">+ New task</button>',
            '<button id="vd-docx-btn" class="vd-btn" onclick="window.VDAgent.saveDocx()">\u2B07 Save .docx</button>',
          '</div>',
        '</div>',
        /* Guide pane */
        '<div id="vd-pane-guide" class="vd-pane" style="display:none">',
          '<div class="vd-guide-body">',
            '<div class="vd-guide-section-title">API Key</div>',
            '<label for="vd-key-input">Gemini API Key</label>',
            '<div class="vd-row"><input id="vd-key-input" class="vd-input-field" type="password" placeholder="AIzaSy\u2026" autocomplete="off"/></div>',
            '<div class="vd-row">',
              '<button class="vd-btn vd-btn-primary" style="flex:1" onclick="window.VDAgent.saveKey()">Save key</button>',
              '<button class="vd-btn" onclick="window.VDAgent.clearKey()">Clear</button>',
              '<button class="vd-btn" onclick="window.VDAgent.testKey()">Test</button>',
            '</div>',
            '<span id="vd-key-status" class="vd-status" style="padding:0" aria-live="polite"></span>',
            '<div class="vd-guide-section-title">Model</div>',
            '<select id="vd-model-select" class="vd-model-select">',
              '<option value="gemini-2.0-flash">Gemini 2.0 Flash (recommended)</option>',
              '<option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (fastest)</option>',
              '<option value="gemini-2.0-pro-exp">Gemini 2.0 Pro (most capable)</option>',
              '<option value="gemini-2.5-pro-exp-03-25">Gemini 2.5 Pro (latest)</option>',
            '</select>',
            '<div class="vd-guide-section-title">About</div>',
            '<div class="vd-info-card"><b>ViaDecide Agent</b> knows all ViaDecide tools and links to them in responses. Your API key is stored in your browser only \u2014 never sent to ViaDecide servers.</div>',
            '<div class="vd-info-card">Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio \u2197</a>.</div>',
          '</div>',
        '</div>',
      '</div>', /* /panel */
    ].join('');
    document.body.appendChild(root);
  }

  /* ── Render helpers ────────────────────────────────────────────── */
  function renderMessages() {
    var box = $id('vd-chat-messages');
    if (!box) return;
    if (!history.length) {
      box.innerHTML =
        '<div class="vd-empty-state">' +
          '<div class="icon">\uD83E\uDD14</div>' +
          '<div>Ask me anything about ViaDecide,<br>your decisions, or your tasks.</div>' +
        '</div>';
      return;
    }
    box.innerHTML = history.map(function (m) {
      var content = m.role === 'model' ? formatText(m.text) : esc(m.text);
      return '<div class="vd-bubble vd-bubble-' + m.role + '">' + content + '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function renderTasks() {
    var list = $id('vd-task-list');
    if (!list) return;
    if (!tasks.length) {
      list.innerHTML =
        '<div class="vd-empty-state">' +
          '<div class="icon">\u2705</div>' +
          '<div>No tasks yet. Add one below.</div>' +
        '</div>';
      return;
    }
    list.innerHTML = tasks.map(function (t, i) {
      return '<div class="vd-task-item' + (t.done ? ' done' : '') + '">' +
        '<input type="checkbox"' + (t.done ? ' checked' : '') +
          ' onchange="window.VDAgent.toggleTask(' + i + ')"/>' +
        '<span class="vd-task-title">' + esc(t.title) + '</span>' +
        '<button class="vd-task-del" onclick="window.VDAgent.deleteTask(' + i + ')">\u2715</button>' +
      '</div>';
    }).join('');
  }

  /* ── Status helper ─────────────────────────────────────────────── */
  function showStatus(elId, msg, color) {
    var el = $id(elId);
    if (!el) return;
    el.textContent = msg;
    el.style.color = color || '#94a3b8';
    el.style.opacity = '1';
    setTimeout(function () { el.style.opacity = '0'; }, 3500);
  }

  /* ── Gemini API ─────────────────────────────────────────────────── */
  function callGemini(userText, histArr) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              selectedModel + ':generateContent?key=' + apiKey;
    var contents = histArr.map(function (m) {
      return { role: m.role, parts: [{ text: m.text }] };
    }).concat([{ role: 'user', parts: [{ text: userText }] }]);
    return fetch(url, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }).then(function (resp) {
      if (!resp.ok) {
        return resp.json().catch(function () { return {}; }).then(function (err) {
          throw new Error((err && err.error && err.error.message) || ('HTTP ' + resp.status));
        });
      }
      return resp.json();
    }).then(function (data) {
      return (data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text) || '';
    });
  }

  /* ── Public widget functions ──────────────────────────────────── */
  function toggle() {
    isOpen = !isOpen;
    var panel = $id('vd-agent-panel');
    var fab   = $id('vd-agent-fab');
    if (panel) panel.classList.toggle('open', isOpen);
    if (fab)   fab.setAttribute('aria-expanded', String(isOpen));
  }

  function switchTab(tab) {
    currentTab = tab;
    ['chat', 'tasks', 'guide'].forEach(function (t) {
      var btn  = $id('vd-tab-' + t);
      var pane = $id('vd-pane-' + t);
      if (btn)  btn.classList.toggle('active', t === tab);
      if (pane) pane.style.display = t === tab ? 'flex' : 'none';
    });
    if (tab === 'tasks') renderTasks();
  }

  function saveKey() {
    var input = $id('vd-key-input');
    if (!input) return;
    apiKey = input.value.trim();
    if (apiKey) {
      localStorage.setItem('vd_agent_key', apiKey);
      showStatus('vd-key-status', '\u2713 Key saved', '#4ade80');
    } else {
      localStorage.removeItem('vd_agent_key');
      showStatus('vd-key-status', 'Key cleared', '#f87171');
    }
  }

  function clearKey() {
    apiKey = '';
    localStorage.removeItem('vd_agent_key');
    var input = $id('vd-key-input');
    if (input) input.value = '';
    showStatus('vd-key-status', 'Key cleared', '#f87171');
  }

  function testKey() {
    if (!apiKey) {
      showStatus('vd-key-status', '\u26A0 Enter a key first', '#f87171');
      return;
    }
    showStatus('vd-key-status', '\u23F3 Testing\u2026', '#94a3b8');
    callGemini('Reply with the single word OK.', []).then(function (reply) {
      showStatus('vd-key-status',
        reply ? '\u2713 Connected \u00B7 ' + selectedModel : '\u2717 No response',
        reply ? '#4ade80' : '#f87171');
    }).catch(function (e) {
      showStatus('vd-key-status', '\u2717 ' + e.message.slice(0, 50), '#f87171');
    });
  }

  function send() {
    var input = $id('vd-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || isThinking) return;
    if (!apiKey) {
      showStatus('vd-send-status', '\u26A0 Add your API key in the Guide tab', '#f87171');
      return;
    }
    input.value = '';
    input.style.height = 'auto';
    history.push({ role: 'user', text: text });
    renderMessages();
    isThinking = true;
    var btn = $id('vd-send-btn');
    if (btn) btn.disabled = true;
    var box = $id('vd-chat-messages');
    var thinking = document.createElement('div');
    thinking.id = 'vd-thinking';
    thinking.className = 'vd-bubble vd-bubble-model vd-thinking';
    thinking.innerHTML = '<span></span><span></span><span></span>';
    if (box) { box.appendChild(thinking); box.scrollTop = box.scrollHeight; }
    callGemini(text, history.slice(0, -1)).then(function (reply) {
      history.push({ role: 'model', text: reply || '(no response)' });
    }).catch(function (e) {
      history.push({ role: 'model', text: '**Error:** ' + e.message });
    }).finally(function () {
      isThinking = false;
      if (btn) btn.disabled = false;
      var t = $id('vd-thinking');
      if (t) t.remove();
      renderMessages();
    });
  }

  function quickSend(text) {
    var input = $id('vd-chat-input');
    if (input) input.value = text;
    send();
  }

  function toggleAddForm() {
    var form = $id('vd-add-form');
    if (!form) return;
    var visible = form.style.display !== 'none';
    form.style.display = visible ? 'none' : 'flex';
    if (!visible) { var inp = $id('vd-task-input'); if (inp) inp.focus(); }
  }

  function addTask() {
    var input = $id('vd-task-input');
    if (!input) return;
    var title = input.value.trim();
    if (!title) return;
    tasks.push({ title: title, done: false });
    localStorage.setItem('vd_tasks', JSON.stringify(tasks));
    input.value = '';
    toggleAddForm();
    renderTasks();
  }

  function toggleTask(i) {
    if (tasks[i] !== undefined) {
      tasks[i].done = !tasks[i].done;
      localStorage.setItem('vd_tasks', JSON.stringify(tasks));
      renderTasks();
    }
  }

  function deleteTask(i) {
    tasks.splice(i, 1);
    localStorage.setItem('vd_tasks', JSON.stringify(tasks));
    renderTasks();
  }

  function saveDocx() {
    var btn = $id('vd-docx-btn');
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Loading\u2026'; }
    loadDocx().then(function (lib) {
      var children = [
        new lib.Paragraph({ text: 'ViaDecide Agent \u2014 Export', heading: lib.HeadingLevel.HEADING_1 }),
        new lib.Paragraph({ text: 'Exported: ' + new Date().toLocaleString() }),
        new lib.Paragraph({ text: '' }),
      ];
      if (history.length) {
        children.push(new lib.Paragraph({ text: 'Chat', heading: lib.HeadingLevel.HEADING_2 }));
        history.forEach(function (m) {
          children.push(new lib.Paragraph({
            children: [new lib.TextRun({ text: (m.role === 'user' ? 'You' : 'Agent') + ': ', bold: true })],
          }));
          children.push(new lib.Paragraph({ text: m.text.replace(/\*\*(.*?)\*\*/g, '$1') }));
          children.push(new lib.Paragraph({ text: '' }));
        });
      }
      if (tasks.length) {
        children.push(new lib.Paragraph({ text: 'Tasks', heading: lib.HeadingLevel.HEADING_2 }));
        tasks.forEach(function (t) {
          children.push(new lib.Paragraph({ text: (t.done ? '\u2713 ' : '\u25CB ') + t.title }));
        });
      }
      var doc = new lib.Document({ sections: [{ children: children }] });
      return lib.Packer.toBlob(doc);
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'viadecide-agent-' + Date.now() + '.docx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }).catch(function (e) {
      alert('Export failed: ' + e.message);
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = '\u2B07 Save .docx'; }
    });
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  function init() {
    var modelSel = $id('vd-model-select');
    if (modelSel) {
      modelSel.value = selectedModel;
      modelSel.addEventListener('change', function () {
        selectedModel = modelSel.value;
        localStorage.setItem('vd_agent_model', selectedModel);
      });
    }
    var keyInput = $id('vd-key-input');
    if (keyInput) {
      keyInput.value = apiKey;
      keyInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveKey(); });
    }
    var chatInput = $id('vd-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
      chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 96) + 'px';
      });
    }
    var taskInput = $id('vd-task-input');
    if (taskInput) {
      taskInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });
    }
    switchTab('chat');
    renderMessages();
  }

  /* F) Performance-safe boot */
  function boot() {
    /* Always inject styles + DOM first (safe to call before body exists only if
       called after DOMContentLoaded, which the readyState check ensures) */
    injectStyles();
    injectDOM();
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else if ('requestIdleCallback' in window) {
    requestIdleCallback(boot, { timeout: 2000 });
  } else {
    setTimeout(boot, 0);
  }

  /* H) Expose as window.VDAgent */
  window.VDAgent = {
    toggle        : toggle,
    switchTab     : switchTab,
    saveKey       : saveKey,
    clearKey      : clearKey,
    testKey       : testKey,
    send          : send,
    quickSend     : quickSend,
    toggleAddForm : toggleAddForm,
    addTask       : addTask,
    toggleTask    : toggleTask,
    deleteTask    : deleteTask,
    saveDocx      : saveDocx,
  };

}());
