/* ================================================================
   ViaDecide Agent — Standalone Embeddable Widget v2.0
   Usage: <script src="/js/viadecide-agent.js"></script>
   Safe to include multiple times — duplicate guard prevents double mount.
   © ViaDecide
================================================================ */
(function () {
  'use strict';

  /* ── Duplicate guard ─────────────────────────────────────────── */
  if (window.VDAgentLoaded) return;
  window.VDAgentLoaded = true;

  /* ── Constants ──────────────────────────────────────────────── */
  var STORAGE_KEY   = 'vd_agent_key';
  var STORAGE_MODEL = 'vd_agent_model';
  var STORAGE_TASKS = 'vd_tasks';
  var STORAGE_HIST  = 'vd_agent_history';   // Bug 1 fix
  var DEFAULT_MODEL = 'gemini-2.5-flash';
  var MODEL_OPTIONS = [
    { value: 'gemini-2.5-flash',         label: 'Gemini 2.5 Flash (recommended)' },
    { value: 'gemini-2.5-flash-8b',      label: 'Gemini 2.5 Flash 8B (fastest)'  }, // Bug 5: was 'gemini-2.5-flash-lite' (invalid)
    { value: 'gemini-2.5-pro',           label: 'Gemini 2.5 Pro (most capable)'   },
  ];

  var VD_ROUTES = {
    '/app-generator'               : 'App Generator',
    '/alchemist'                   : 'Alchemist',
    '/decision-brief'              : 'Decision Brief',
    '/brief'                       : 'Quick Decision Brief',
    '/student-research'            : 'Student Research Tool',
      '/sales-dashboard'             : 'MSME Sales Dashboard',
    '/studyos'                     : 'StudyOS',
    '/viaguide'                    : 'ViaGuide',
    '/ondc-demo'                   : 'ONDC Demo',
    '/hexwars'                     : 'HexWars',
    '/wings-of-fire-quiz'          : 'Wings of Fire Quiz',
    '/mars-rover-simulator-game'   : 'Mars Rover Simulator',
    '/hivaland'                    : 'HivaLand',
    '/interview-prep'              : 'Interview Simulator',
    '/prompt-alchemy'              : 'Prompt Alchemy',
    '/memory'                      : 'Memory Engine',
    '/swipeos'                     : 'SwipeOS',
    '/swipeos-gandhidham'          : 'SwipeOS \u00B7 Gandhidham',
    '/agent'                       : 'ViaDecide Agent',
    '/printbydd-store'             : 'PrintByDD Store',
    '/printbydd'                   : 'PrintByDD Store',
    '/engine-deals'                : 'Engine Deals',
    '/discounts'                   : 'Discounts Hub',
    '/cashback-rules'              : 'Cashback Rules',
    '/cashback-claim'              : 'Cashback Claim',
    '/decide-service'              : 'Decide.Service',
    '/decide-foodrajkot'           : 'Decide Food \u00B7 Rajkot',
    '/engine-license'              : 'Engine License',
    '/cohort-apply-here'           : 'Cohort Program',
    '/pricing'                     : 'Pricing',
    '/engine-activation-request'   : 'Engine Activation',
    '/founder'                     : 'Founder',
    '/dharamdaxini'                : 'Dharam Daxini \u2014 Sessions',
    '/contact'                     : 'Contact',
    '/privacy'                     : 'Privacy',
    '/terms'                       : 'Terms',
    '/viadecide-blogs'             : 'ViaDecide Blogs',
    '/decision-infrastructure-india': 'Decision Infrastructure India',
    '/ondc-for-bharat'             : 'ONDC for Bharat',
    '/indiaai-mission-2025'        : 'IndiaAI Mission 2025',
    '/viadecide-public-beta'       : 'ViaDecide Public Beta',
    '/jalaram-food-court-rajkot'   : 'Jalaram Food Court',
    '/payment-register'            : 'Payroll Register',
    '/laptops-under-50000'         : 'Laptops Under \u20B950k',
    '/finance-dashboard-msme'      : 'FinTrack \u2014 Finance Dashboard',
    // ── Audit-fix additions ──────────────────────────────────────
    '/skillhex-mission-control'    : 'SkillHex Mission Control',
    '/skillhex-recruiter'          : 'SkillHex Recruiter Dashboard',
    '/hiring-dashboard'            : 'SkillHex Recruiter Dashboard',
    '/audio-log'                   : 'Audio.Log',
    '/dharam-daxini'               : 'Dharam Daxini',
    '/fintrack'                    : 'FinTrack Dashboard',
  };

  /* ── State ──────────────────────────────────────────────────── */
  var isOpen         = false;
  var currentTab     = 'chat';
  var isThinking     = false;
  var _sendGeneration = 0;          // Bug 2 fix — invalidates in-flight requests on clearChat
  var _docxPromise   = null;
  var apiKey         = localStorage.getItem(STORAGE_KEY)   || '';
  var selectedModel  = localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL;
  var tasks          = JSON.parse(localStorage.getItem(STORAGE_TASKS) || '[]');
  var history        = (function () {                       // Bug 1 fix — persist chat history
    try { return JSON.parse(localStorage.getItem(STORAGE_HIST) || '[]'); }
    catch (e) { return []; }
  }());

  /* ── DOM helper ─────────────────────────────────────────────── */
  function $id(id) { return document.getElementById(id); }

  /* ── Page context ───────────────────────────────────────────── */
  function getPageContext() {
    var descEl = document.querySelector('meta[name="description"]');
    return {
      site : 'ViaDecide',
      path : window.location.pathname,
      title: document.title || 'ViaDecide',
      desc : descEl ? (descEl.content || '') : '',
    };
  }

  /* ── HTML escape ─────────────────────────────────────────────── */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  /* ── Safe markup renderer ────────────────────────────────────── */
  function formatText(raw) {
    var s = esc(raw);
    /* Internal links only — data-vd-route lets the click handler open the modal */
    s = s.replace(
      /\[([^\]]{1,80})\]\((\/[A-Za-z0-9\-_./#]{1,120})\)/g,
      '<a href="$2" data-vd-route="$2" target="_self">$1 \u2197</a>'
    );
    /* Bold */
    s = s.replace(/\*\*([^*\n]{1,200}?)\*\*/g, '<strong>$1</strong>');
    /* Lists — Bug 3 fix: blank lines between bullets don't close the ul prematurely */
    var lines = s.split('\n'), out = [], inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line     = lines[i];
      var isBullet = /^[-\u2022*]\s+/.test(line);
      var isEmpty  = line.trim() === '';

      if (isBullet) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + line.replace(/^[-\u2022*]\s+/, '') + '</li>');
      } else if (isEmpty && inList) {
        /* Peek ahead: if the next non-empty line is also a bullet, stay in list */
        var nextIsBullet = false;
        for (var j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === '') continue;
          nextIsBullet = /^[-\u2022*]\s+/.test(lines[j]);
          break;
        }
        if (!nextIsBullet) { out.push('</ul>'); inList = false; }
        /* skip emitting the blank line inside a continuing list */
        if (!nextIsBullet) out.push(line);
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(line);
      }
    }
    if (inList) out.push('</ul>');
    return out.join('\n')
      .replace(/\n?(<ul>)/g,    '$1')
      .replace(/(<\/ul>)\n?/g,  '$1')
      .replace(/\n/g,           '<br>');
  }

  /* ── System prompt ───────────────────────────────────────────── */
  function buildSystemPrompt() {
    var ctx = getPageContext();
    var routeList = Object.keys(VD_ROUTES).map(function (p) {
      return '  [' + VD_ROUTES[p] + '](' + p + ')';
    }).join('\n');
    var activeTasks = tasks.filter(function (t) { return !t.done; });
    var taskList = activeTasks.length
      ? activeTasks.map(function (t) { return '  - ' + t.title; }).join('\n')
      : '  (none)';
    return [
      'You are the ViaDecide AI Agent \u2014 a decision assistant, planning companion, and site guide for ViaDecide (viadecide.com).',
      '',
      'Current page: ' + ctx.title + ' (' + ctx.path + ')',
      ctx.desc ? 'Page description: ' + ctx.desc : '',
      '',
      'ViaDecide tools \u2014 link to them when relevant:',
      routeList,
      '',
      "User's active tasks:",
      taskList,
      '',
      'Guidelines:',
      '- Be concise and actionable',
      '- Use **bold** for key terms',
      '- Use bullet lists (- item) for options or steps',
      '- When suggesting a ViaDecide tool, use its [Tool Name](/path) markdown link',
      '- Only use internal links (paths starting with /); no external URLs',
      '- Do not include the full URL \u2014 only the path',
    ].filter(function (l) { return l !== null; }).join('\n');
  }

  /* ── Lazy docx loader ────────────────────────────────────────── */
  function loadDocx() {
    if (_docxPromise) return _docxPromise;
    _docxPromise = new Promise(function (resolve, reject) {
      if (window.docx) { resolve(window.docx); return; }
      var s    = document.createElement('script');
      s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js';
      s.onload = function () {
        if (window.docx) resolve(window.docx);
        else { _docxPromise = null; reject(new Error('Document library did not initialize.')); }
      };
      s.onerror = function () {
        _docxPromise = null;
        reject(new Error('Failed to load document library. Check your internet connection.'));
      };
      document.head.appendChild(s);
    });
    return _docxPromise;
  }

  /* ── Inject CSS ──────────────────────────────────────────────── */
  function injectStyle() {
    if ($id('vd-agent-style')) return;
    var s = document.createElement('style');
    s.id  = 'vd-agent-style';
    s.textContent = [
      /* Root — single fixed anchor for both FAB and panel */
      '#vd-agent-root{position:fixed;right:18px;bottom:18px;z-index:1600;font-family:\'Outfit\',system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;color:#f4efe7}',
      '#vd-agent-root *,#vd-agent-root *::before,#vd-agent-root *::after{box-sizing:border-box}',
      /* FAB */
      '#vd-agent-root .vd-fab{width:60px;height:60px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,rgba(34,180,160,.96),rgba(200,147,42,.92));box-shadow:0 18px 48px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;cursor:pointer;transition:transform .22s,box-shadow .22s}',
      '#vd-agent-root .vd-fab:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 22px 56px rgba(0,0,0,.46)}',
      '#vd-agent-root.vd-open .vd-fab{transform:scale(.96)}',
      /* Panel */
      '#vd-agent-root .vd-panel{position:absolute;right:0;bottom:76px;width:min(420px,calc(100vw - 24px));height:min(720px,calc(100vh - 108px));display:flex;flex-direction:column;border-radius:24px;overflow:hidden;background:rgba(11,14,22,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.09);box-shadow:0 30px 90px rgba(0,0,0,.55);opacity:0;pointer-events:none;transform:translateY(10px) scale(.98);transition:opacity .22s,transform .22s}',
      '#vd-agent-root.vd-open .vd-panel{opacity:1;pointer-events:auto;transform:none}',
      /* Shell */
      '#vd-agent-root .vd-shell{display:flex;flex-direction:column;height:100%;min-height:0}',
      /* Header */
      '#vd-agent-root .vd-head{padding:14px 16px 0;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}',
      '#vd-agent-root .vd-topline{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px}',
      '#vd-agent-root .vd-brand{display:flex;align-items:center;gap:10px}',
      '#vd-agent-root .vd-brandmark{width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,rgba(34,180,160,.22),rgba(200,147,42,.24));border:1px solid rgba(255,255,255,.09);display:flex;align-items:center;justify-content:center;font-size:17px}',
      '#vd-agent-root .vd-title{font-size:15px;font-weight:700;letter-spacing:.01em}',
      '#vd-agent-root .vd-sub{font-size:12px;color:rgba(240,237,230,.55);margin-top:1px}',
      '#vd-agent-root .vd-head-actions{display:flex;align-items:center;gap:8px}',
      '#vd-agent-root .vd-head-btn{width:34px;height:34px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;color:#f4efe7;cursor:pointer;font-size:14px;transition:background .2s}',
      '#vd-agent-root .vd-head-btn:hover{background:rgba(255,255,255,.09)}',
      /* Tabs */
      '#vd-agent-root .vd-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding-bottom:12px}',
      '#vd-agent-root .vd-tab{border:none;border-radius:12px;padding:9px 0;background:rgba(255,255,255,.04);color:rgba(240,237,230,.6);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .18s}',
      '#vd-agent-root .vd-tab.vd-active{background:linear-gradient(135deg,rgba(34,180,160,.2),rgba(200,147,42,.15));color:#fff;border:1px solid rgba(255,255,255,.09)}',
      /* Body */
      '#vd-agent-root .vd-body{flex:1;min-height:0;padding:14px 16px 16px;overflow:hidden}',
      '#vd-agent-root .vd-pane{height:100%;display:none;flex-direction:column}',
      '#vd-agent-root .vd-pane.vd-active{display:flex}',
      /* Card */
      '#vd-agent-root .vd-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:16px;padding:12px}',
      /* Context bar */
      '#vd-agent-root .vd-ctx{margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0}',
      '#vd-agent-root .vd-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);font-size:11px;color:rgba(240,237,230,.65)}',
      /* Messages */
      '#vd-agent-root .vd-messages{flex:1;min-height:0;overflow-y:auto;padding-right:4px;display:flex;flex-direction:column;gap:8px}',
      '#vd-agent-root .vd-messages::-webkit-scrollbar{width:5px}',
      '#vd-agent-root .vd-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:999px}',
      '#vd-agent-root .vd-bubble{max-width:86%;padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.58;word-break:break-word;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);color:#f4efe7}',
      '#vd-agent-root .vd-bubble-user{align-self:flex-end;background:linear-gradient(135deg,rgba(34,180,160,.16),rgba(200,147,42,.12));border-color:rgba(255,255,255,.09)}',
      '#vd-agent-root .vd-bubble-model{align-self:flex-start}',
      '#vd-agent-root .vd-bubble a{color:#8be5d8;text-decoration:none;border-bottom:1px solid rgba(139,229,216,.28)}',
      '#vd-agent-root .vd-bubble a:hover{color:#c6f3eb}',
      '#vd-agent-root .vd-bubble strong{font-weight:700}',
      '#vd-agent-root .vd-bubble ul{margin:6px 0 0 16px;padding:0}',
      '#vd-agent-root .vd-bubble li{margin-bottom:2px}',
      /* Thinking dots */
      '#vd-agent-root .vd-thinking{display:flex;align-items:center;gap:5px;padding:12px 13px}',
      '#vd-agent-root .vd-thinking span{width:6px;height:6px;border-radius:50%;background:rgba(240,237,230,.5);display:inline-block;animation:vd-bounce .9s ease-in-out infinite}',
      '#vd-agent-root .vd-thinking span:nth-child(2){animation-delay:.15s}',
      '#vd-agent-root .vd-thinking span:nth-child(3){animation-delay:.3s}',
      '@keyframes vd-bounce{0%,80%,100%{transform:scale(.8);opacity:.4}40%{transform:scale(1.1);opacity:1}}',
      /* Quick chips */
      '#vd-agent-root .vd-quick{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;flex-shrink:0}',
      '#vd-agent-root .vd-quick button{border:none;border-radius:999px;padding:7px 11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#f4efe7;font-size:12px;cursor:pointer;font-family:inherit;transition:background .15s}',
      '#vd-agent-root .vd-quick button:hover{background:rgba(255,255,255,.09)}',
      /* Input */
      '#vd-agent-root .vd-input-wrap{flex-shrink:0;margin-top:10px}',
      '#vd-agent-root .vd-input{width:100%;min-height:80px;resize:none;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);padding:11px 12px;color:#f4efe7;font:inherit;font-size:13px;outline:none}',
      '#vd-agent-root .vd-input:focus{border-color:rgba(34,180,160,.4);box-shadow:0 0 0 3px rgba(34,180,160,.08)}',
      '#vd-agent-root .vd-row{display:flex;gap:8px;align-items:center}',
      '#vd-agent-root .vd-row-wrap{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:8px}',
      '#vd-agent-root .vd-status-line{font-size:12px;color:rgba(240,237,230,.52)}',
      /* Buttons */
      '#vd-agent-root .vd-btn{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:9px 13px;background:rgba(255,255,255,.06);color:#f4efe7;font-weight:600;cursor:pointer;font:inherit;font-size:13px;transition:background .18s}',
      '#vd-agent-root .vd-btn:hover{background:rgba(255,255,255,.1)}',
      '#vd-agent-root .vd-btn:disabled{opacity:.5;cursor:not-allowed}',
      '#vd-agent-root .vd-btn-primary{background:linear-gradient(135deg,rgba(34,180,160,.9),rgba(200,147,42,.88));color:#fff;border:none}',
      '#vd-agent-root .vd-btn-primary:hover{filter:brightness(1.08)}',
      '#vd-agent-root .vd-muted{font-size:12px;color:rgba(240,237,230,.52)}',
      /* Banner */
      '#vd-agent-root .vd-banner{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:12px;line-height:1.5;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:none}',
      '#vd-agent-root .vd-banner.vd-show{display:block}',
      '#vd-agent-root .vd-banner[data-tone="ok"]{border-color:rgba(34,180,160,.3);background:rgba(34,180,160,.1);color:#bff4eb}',
      '#vd-agent-root .vd-banner[data-tone="warn"]{border-color:rgba(200,147,42,.3);background:rgba(200,147,42,.1);color:#f3ddb1}',
      '#vd-agent-root .vd-banner[data-tone="error"]{border-color:rgba(255,99,99,.25);background:rgba(255,99,99,.1);color:#ffd1d1}',
      /* Tasks pane */
      '#vd-agent-root .vd-task-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0}',
      '#vd-agent-root .vd-task-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}',
      '#vd-agent-root .vd-task-list::-webkit-scrollbar{width:5px}',
      '#vd-agent-root .vd-task-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:999px}',
      '#vd-agent-root .vd-task-item{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}',
      '#vd-agent-root .vd-task-item input[type=checkbox]{cursor:pointer;accent-color:#22b4a0;flex-shrink:0;width:16px;height:16px}',
      '#vd-agent-root .vd-task-name{font-size:13px;font-weight:600}',
      '#vd-agent-root .vd-task-item.done .vd-task-name{text-decoration:line-through;color:rgba(240,237,230,.42)}',
      '#vd-agent-root .vd-task-del{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#f4efe7;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}',
      '#vd-agent-root .vd-task-del:hover{background:rgba(248,113,113,.15);color:#f87171;border-color:rgba(248,113,113,.2)}',
      '#vd-agent-root .vd-task-footer{display:flex;gap:8px;margin-top:10px;flex-shrink:0}',
      '#vd-agent-root .vd-add-form{display:none;gap:8px;margin-bottom:10px;flex-shrink:0}',
      '#vd-agent-root .vd-add-form.vd-open{display:flex}',
      '#vd-agent-root .vd-task-input{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;color:#f4efe7;font:inherit;font-size:13px;padding:9px 12px;outline:none}',
      '#vd-agent-root .vd-task-input:focus{border-color:rgba(34,180,160,.4);box-shadow:0 0 0 3px rgba(34,180,160,.08)}',
      /* Empty state */
      '#vd-agent-root .vd-empty{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:rgba(240,237,230,.45);font-size:13px;text-align:center;padding:24px}',
      '#vd-agent-root .vd-empty .icon{font-size:28px;margin-bottom:4px}',
      /* Setup pane */
      '#vd-agent-root .vd-setup-scroll{flex:1;min-height:0;overflow-y:auto;display:grid;gap:12px;padding-right:4px;align-content:start}',
      '#vd-agent-root .vd-setup-scroll::-webkit-scrollbar{width:5px}',
      '#vd-agent-root .vd-setup-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:999px}',
      '#vd-agent-root .vd-field{display:grid;gap:6px}',
      '#vd-agent-root .vd-label{font-size:12px;color:rgba(240,237,230,.68)}',
      '#vd-agent-root .vd-text,#vd-agent-root .vd-select{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);padding:10px 12px;color:#f4efe7;font:inherit;font-size:13px;outline:none}',
      '#vd-agent-root .vd-text:focus,#vd-agent-root .vd-select:focus{border-color:rgba(34,180,160,.4);box-shadow:0 0 0 3px rgba(34,180,160,.08)}',
      '#vd-agent-root .vd-kv{display:grid;grid-template-columns:1fr auto;gap:8px}',
      '#vd-agent-root .vd-card-title{font-size:14px;font-weight:700;margin-bottom:10px}',
      '#vd-agent-root .vd-card ul{margin:8px 0 0 18px;padding:0}',
      '#vd-agent-root .vd-card li{margin:5px 0;color:rgba(240,237,230,.78);font-size:13px;line-height:1.65}',
      '#vd-agent-root .vd-card a{color:#8be5d8;text-decoration:none}',
      '#vd-agent-root .vd-footnote{font-size:11px;color:rgba(240,237,230,.42);margin-top:8px}',
      /* Mobile */
      '@media(max-width:640px){#vd-agent-root{right:12px;bottom:12px}#vd-agent-root .vd-panel{width:calc(100vw - 12px);height:min(78vh,680px)}}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Inject widget DOM ───────────────────────────────────────── */
  function injectDOM() {
    if ($id('vd-agent-root')) return;
    var root = document.createElement('div');
    root.id  = 'vd-agent-root';
    root.innerHTML = [
      /* Panel */
      '<div class="vd-panel" role="dialog" aria-label="ViaDecide Agent" aria-modal="true">',
        '<div class="vd-shell">',
          /* Header */
          '<div class="vd-head">',
            '<div class="vd-topline">',
              '<div class="vd-brand">',
                '<div class="vd-brandmark">\u2726</div>',
                '<div>',
                  '<div class="vd-title">ViaDecide Agent</div>',
                  '<div class="vd-sub">Decision, planning &amp; site guidance</div>',
                '</div>',
              '</div>',
              '<div class="vd-head-actions">',
                '<button id="vd-export-btn" class="vd-head-btn" title="Export .docx">\u2B07</button>',
                '<button id="vd-close-btn"  class="vd-head-btn" title="Close">\u2715</button>',
              '</div>',
            '</div>',
            '<div class="vd-tabs">',
              '<button id="vd-tab-chat"  class="vd-tab">Chat</button>',
              '<button id="vd-tab-tasks" class="vd-tab">Tasks</button>',
              '<button id="vd-tab-guide" class="vd-tab">Setup</button>',
            '</div>',
          '</div>',

          /* Body */
          '<div class="vd-body">',

            /* ── Chat pane ── */
            '<div id="vd-pane-chat" class="vd-pane">',
              '<div id="vd-ctx-bar" class="vd-ctx"></div>',
              '<div id="vd-chat-messages" class="vd-messages" aria-live="polite"></div>',
              '<div class="vd-quick">',
                '<button data-quick="What tools does ViaDecide have?">Site tools</button>',
                '<button data-quick="Help me choose the right ViaDecide tool for my goal.">Find tool</button>',
                '<button data-quick="Summarize this page and tell me what I can do here.">Summarize</button>',
              '</div>',
              '<div class="vd-input-wrap">',
                '<textarea id="vd-chat-input" class="vd-input" rows="3" placeholder="Ask for decisions, plans, or the right ViaDecide tool\u2026"></textarea>',
                '<div class="vd-row-wrap">',
                  '<span id="vd-send-status" class="vd-status-line">Ready.</span>',
                  '<div class="vd-row">',
                    '<button id="vd-clear-btn" class="vd-btn">Clear</button>',
                    '<button id="vd-send-btn" class="vd-btn vd-btn-primary">Send</button>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',

            /* ── Tasks pane ── */
            '<div id="vd-pane-tasks" class="vd-pane">',
              '<div class="vd-task-toolbar">',
                '<div>',
                  '<div class="vd-title" style="font-size:14px">Tasks</div>',
                  '<div class="vd-muted">Lightweight action items stored locally.</div>',
                '</div>',
                '<button id="vd-add-task-btn" class="vd-btn vd-btn-primary">+ Add</button>',
              '</div>',
              '<div id="vd-add-form" class="vd-add-form">',
                '<input id="vd-task-input" class="vd-task-input" type="text" placeholder="Task title\u2026" />',
                '<button id="vd-save-task-btn" class="vd-btn vd-btn-primary">Save</button>',
              '</div>',
              '<div id="vd-task-list" class="vd-task-list"></div>',
              '<div class="vd-task-footer">',
                '<button id="vd-docx-btn" class="vd-btn" style="flex:1">\u2B07 Export .docx</button>',
              '</div>',
            '</div>',

            /* ── Setup pane ── */
            '<div id="vd-pane-guide" class="vd-pane">',
              '<div class="vd-setup-scroll">',
                '<div class="vd-card">',
                  '<div class="vd-field">',
                    '<label class="vd-label" for="vd-key-input">Gemini API key</label>',
                    '<div class="vd-kv">',
                      '<input id="vd-key-input" class="vd-text" type="password" autocomplete="off" placeholder="Paste your API key\u2026" />',
                      '<button id="vd-save-key-btn" class="vd-btn vd-btn-primary">Save</button>',
                    '</div>',
                  '</div>',
                  '<div class="vd-field" style="margin-top:10px">',
                    '<label class="vd-label" for="vd-model-select">Model</label>',
                    '<select id="vd-model-select" class="vd-select"></select>',
                  '</div>',
                  '<div class="vd-row" style="justify-content:flex-end;margin-top:8px;gap:8px">',
                    '<button id="vd-clear-key-btn" class="vd-btn">Clear key</button>',
                    '<button id="vd-test-key-btn"  class="vd-btn">Test key</button>',
                  '</div>',
                  '<div id="vd-key-status" class="vd-banner"></div>',
                '</div>',
                '<div class="vd-card">',
                  '<div class="vd-card-title">Setup guide</div>',
                  '<ul>',
                    '<li>Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio \u2197</a>.</li>',
                    '<li><strong>Gemini 2.5 Flash</strong> is a good default for fast, browser-based usage.</li>',
                    '<li>Your key, model, tasks, and chat history are all saved in <strong>localStorage</strong> on this device. History is trimmed to the last 60 messages.</li>',
                    '<li>Ask &ldquo;Which ViaDecide tool should I use?&rdquo; for clickable route suggestions.</li>',
                    '<li>Use Export \u2B07 to download your conversation and tasks as a .docx file.</li>',
                  '</ul>',
                  '<div class="vd-footnote">Keys are never sent to ViaDecide servers \u2014 only to Google Gemini directly from your browser.</div>',
                '</div>',
              '</div>',
            '</div>',

          '</div>', /* /vd-body */
        '</div>', /* /vd-shell */
      '</div>', /* /vd-panel */

      /* FAB */
      '<button id="vd-agent-fab" class="vd-fab" aria-label="Open ViaDecide Agent" aria-expanded="false">\u2726</button>',
    ].join('');
    document.body.appendChild(root);
  }

  /* ── Render ──────────────────────────────────────────────────── */
  function renderMessages() {
    var box = $id('vd-chat-messages');
    if (!box) return;
    if (!history.length) {
      box.innerHTML =
        '<div class="vd-empty">' +
          '<div class="icon">\uD83E\uDD14</div>' +
          '<div>Ask me anything about ViaDecide,<br>decisions, or your tasks.</div>' +
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
        '<div class="vd-empty">' +
          '<div class="icon">\u2705</div>' +
          '<div>No tasks yet.<br>Click <strong>+ Add</strong> to create one.</div>' +
        '</div>';
      return;
    }
    list.innerHTML = tasks.map(function (t, i) {
      return (
        '<div class="vd-task-item' + (t.done ? ' done' : '') + '">' +
          '<input type="checkbox"' + (t.done ? ' checked' : '') + ' data-idx="' + i + '" />' +
          '<span class="vd-task-name">' + esc(t.title) + '</span>' +
          '<button class="vd-task-del" data-del="' + i + '">\u2715</button>' +
        '</div>'
      );
    }).join('');
  }

  function syncCtxBar() {
    var bar = $id('vd-ctx-bar');
    if (!bar) return;
    var ctx = getPageContext();
    bar.innerHTML =
      '<span class="vd-chip">Site: <strong>' + esc(ctx.site) + '</strong></span>' +
      '<span class="vd-chip">Page: <strong>' + esc(ctx.path) + '</strong></span>';
  }

  /* ── Status / banner ─────────────────────────────────────────── */
  function setStatus(msg) {
    var el = $id('vd-send-status');
    if (el) el.textContent = msg;
  }

  function setBanner(text, tone) {
    var el = $id('vd-key-status');
    if (!el) return;
    if (!text) { el.classList.remove('vd-show'); el.textContent = ''; return; }
    el.textContent = text;
    el.setAttribute('data-tone', tone || 'warn');
    el.classList.add('vd-show');
  }

  /* ── Route link handler — opens subpage in modal, not full nav ── */
  function openRoute(path) {
    // Normalise: strip leading slash for slug lookup
    var slug = path.replace(/^\/+/, '').replace(/\/.*$/, '').toLowerCase();

    // Look up name+icon from VD_ROUTES (keys are /slug format)
    var routeKey = '/' + slug;
    var name = VD_ROUTES[routeKey] || slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    // Try VDRouter first (preferred — handles history + URL sync)
    if (window.VDRouter && typeof window.VDRouter.go === 'function') {
      window.VDRouter.go(slug, { overlay: true, title: name });
      return;
    }

    // Try index.html's openModal directly
    if (typeof window.openModal === 'function') {
      // Use slug+'.html' for root-level tools; sub-paths (containing '/') need '/index.html'
      var filePath = path.endsWith('.html')
        ? path
        : (slug.indexOf('/') === -1 ? slug + '.html' : path + '/index.html');
      window.openModal(filePath, '🔗', name);
      return;
    }

    // Last resort: navigate (user leaves page — acceptable fallback)
    window.location.href = path;
  }

  /* ── Bug 1 fix: persist history ─────────────────────────────── */
  function saveHistory() {
    try {
      // Keep last 60 messages to stay within localStorage limits
      localStorage.setItem(STORAGE_HIST, JSON.stringify(history.slice(-60)));
    } catch (e) { /* localStorage full — fail silently */ }
  }

  /* ── Bug 4 fix: Gemini requires strictly alternating roles ───── */
  function sanitizeHistory(hist) {
    var out = [], lastRole = null;
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].role !== lastRole) {
        out.push(hist[i]);
        lastRole = hist[i].role;
      }
    }
    return out;
  }

  /* ── Gemini API (multi-turn) ─────────────────────────────────── */
  function callGemini(userText, histArr) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              encodeURIComponent(selectedModel) + ':generateContent?key=' + apiKey;
    // Bug 4 fix: sanitize to guarantee alternating user/model roles
    var contents = sanitizeHistory(histArr).map(function (m) {
      return { role: m.role, parts: [{ text: m.text }] };
    }).concat([{ role: 'user', parts: [{ text: userText }] }]);

    return fetch(url, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents          : contents,
        generationConfig  : { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }).then(function (resp) {
      if (!resp.ok) {
        return resp.json().catch(function () { return {}; }).then(function (err) {
          throw new Error((err && err.error && err.error.message) || ('HTTP ' + resp.status));
        });
      }
      return resp.json();
    }).then(function (data) {
      return (
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text
      ) || '';
    });
  }

  /* ── Widget functions ────────────────────────────────────────── */
  function toggle() {
    isOpen = !isOpen;
    var root = $id('vd-agent-root');
    var fab  = $id('vd-agent-fab');
    if (root) root.classList.toggle('vd-open', isOpen);
    if (fab)  fab.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) { syncCtxBar(); renderMessages(); renderTasks(); }
  }

  function switchTab(tab) {
    currentTab = tab;
    ['chat', 'tasks', 'guide'].forEach(function (t) {
      var btn  = $id('vd-tab-' + t);
      var pane = $id('vd-pane-' + t);
      if (btn)  btn.classList.toggle('vd-active',  t === tab);
      if (pane) pane.classList.toggle('vd-active', t === tab);
    });
    if (tab === 'tasks') renderTasks();
    if (tab === 'chat')  { renderMessages(); syncCtxBar(); }
  }

  function saveKey() {
    var input = $id('vd-key-input');
    if (!input) return;
    apiKey = input.value.trim();
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey);
      setBanner('\u2713 API key saved in this browser.', 'ok');
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setBanner('Key cleared.', 'warn');
    }
    setStatus(apiKey ? 'API key saved.' : 'API key cleared.');
  }

  function clearKey() {
    apiKey = '';
    localStorage.removeItem(STORAGE_KEY);
    var input = $id('vd-key-input');
    if (input) input.value = '';
    setBanner('API key removed.', 'warn');
    setStatus('API key cleared.');
  }

  function testKey() {
    if (!apiKey) { setBanner('\u26A0 Enter and save a key first.', 'error'); return; }
    setBanner('\u23F3 Testing\u2026', 'warn');
    callGemini('Reply with the single word OK.', []).then(function (reply) {
      setBanner(
        reply ? '\u2713 Connected \u00B7 ' + selectedModel : '\u2717 No response',
        reply ? 'ok' : 'error'
      );
    }).catch(function (e) {
      setBanner('\u2717 ' + e.message.slice(0, 90), 'error');
    });
  }

  function send() {
    var input = $id('vd-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || isThinking) return;
    if (!apiKey) {
      switchTab('guide');
      setBanner('\u26A0 Add your Gemini API key before chatting.', 'warn');
      setStatus('API key required.');
      return;
    }
    input.value = '';
    history.push({ role: 'user', text: text });
    saveHistory();                                // Bug 1 fix
    renderMessages();
    isThinking = true;
    var gen = ++_sendGeneration;                  // Bug 2 fix — snapshot generation
    var btn = $id('vd-send-btn');
    if (btn) btn.disabled = true;
    setStatus('Thinking\u2026');
    /* Thinking animation */
    var box  = $id('vd-chat-messages');
    var dots = document.createElement('div');
    dots.id        = 'vd-thinking-dots';
    dots.className = 'vd-bubble vd-bubble-model vd-thinking';
    dots.innerHTML = '<span></span><span></span><span></span>';
    if (box) { box.appendChild(dots); box.scrollTop = box.scrollHeight; }

    callGemini(text, history.slice(0, -1)).then(function (reply) {
      if (gen !== _sendGeneration) return;        // Bug 2 fix — discard stale response
      history.push({ role: 'model', text: reply || '(no response)' });
      saveHistory();                              // Bug 1 fix
    }).catch(function (e) {
      if (gen !== _sendGeneration) return;        // Bug 2 fix
      history.push({ role: 'model', text: '**Error:** ' + e.message });
      saveHistory();                              // Bug 1 fix
    }).finally(function () {
      if (gen !== _sendGeneration) return;        // Bug 2 fix — skip stale UI update
      isThinking = false;
      if (btn) btn.disabled = false;
      var d = $id('vd-thinking-dots');
      if (d) d.remove();
      renderMessages();
      setStatus('Ready.');
    });
  }

  function quickSend(text) {
    var input = $id('vd-chat-input');
    if (input) input.value = text;
    switchTab('chat');
    send();
  }

  function clearChat() {
    _sendGeneration++;                              // Bug 2 fix — invalidate any in-flight request
    isThinking = false;
    var btn = $id('vd-send-btn');
    if (btn) btn.disabled = false;
    var dots = $id('vd-thinking-dots');
    if (dots) dots.remove();
    history = [];
    localStorage.removeItem(STORAGE_HIST);          // Bug 1 fix — clear persisted history
    renderMessages();
    setStatus('Chat cleared.');
  }

  function toggleAddForm() {
    var form = $id('vd-add-form');
    if (!form) return;
    var open = !form.classList.contains('vd-open');
    form.classList.toggle('vd-open', open);
    if (open) { var inp = $id('vd-task-input'); if (inp) inp.focus(); }
  }

  function addTask() {
    var input = $id('vd-task-input');
    if (!input) return;
    var title = input.value.trim();
    if (!title) return;
    tasks.push({ title: title, done: false });
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
    input.value = '';
    toggleAddForm();
    renderTasks();
    setStatus('Task saved.');
  }

  function toggleTask(i) {
    if (tasks[i] !== undefined) {
      tasks[i].done = !tasks[i].done;
      localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
      renderTasks();
    }
  }

  function deleteTask(i) {
    tasks.splice(i, 1);
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
    renderTasks();
  }

  function saveDocx() {
    var btn = $id('vd-docx-btn');
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Loading\u2026'; }
    setStatus('Preparing export\u2026');

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
      var a   = document.createElement('a');
      a.href  = url;
      a.download = 'viadecide-agent-' + Date.now() + '.docx';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      setStatus('Export ready.');
    }).catch(function (e) {
      /* Alert is visible regardless of which tab is active */
      alert('Export failed: ' + (e && e.message || 'Unknown error'));
      setStatus('Export failed.');
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = '\u2B07 Export .docx'; }
    });
  }

  /* ── Init — all events via addEventListener ──────────────────── */
  function init() {
    /* FAB & close */
    var fab = $id('vd-agent-fab');
    if (fab) fab.addEventListener('click', toggle);

    var closeBtn = $id('vd-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', toggle);

    /* Header export */
    var exportBtn = $id('vd-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', saveDocx);

    /* Tabs */
    ['chat', 'tasks', 'guide'].forEach(function (t) {
      var btn = $id('vd-tab-' + t);
      if (btn) btn.addEventListener('click', function () { switchTab(t); });
    });

    /* Chat */
    var sendBtn = $id('vd-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', send);

    var chatInput = $id('vd-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
    }

    var clearBtn = $id('vd-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearChat);

    /* Internal route links in chat bubbles — open modal instead of navigating away */
    var msgBox = $id('vd-chat-messages');
    if (msgBox) {
      msgBox.addEventListener('click', function (e) {
        var link = e.target.closest('a[data-vd-route]');
        if (!link) return;
        e.preventDefault();
        openRoute(link.getAttribute('data-vd-route'));
      });
    }

    /* Quick chips — delegation */
    var quickRow = document.querySelector('#vd-agent-root .vd-quick');
    if (quickRow) {
      quickRow.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-quick]');
        if (btn) quickSend(btn.getAttribute('data-quick'));
      });
    }

    /* Tasks */
    var addTaskBtn = $id('vd-add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', toggleAddForm);

    var saveTaskBtn = $id('vd-save-task-btn');
    if (saveTaskBtn) saveTaskBtn.addEventListener('click', addTask);

    var taskInput = $id('vd-task-input');
    if (taskInput) taskInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });

    /* Task list — event delegation for checkbox + delete */
    var taskList = $id('vd-task-list');
    if (taskList) {
      taskList.addEventListener('change', function (e) {
        if (e.target.type === 'checkbox') {
          var idx = parseInt(e.target.getAttribute('data-idx'), 10);
          if (!isNaN(idx)) toggleTask(idx);
        }
      });
      taskList.addEventListener('click', function (e) {
        var delBtn = e.target.closest('[data-del]');
        if (delBtn) {
          var idx = parseInt(delBtn.getAttribute('data-del'), 10);
          if (!isNaN(idx)) deleteTask(idx);
        }
      });
    }

    /* Export from tasks tab */
    var docxBtn = $id('vd-docx-btn');
    if (docxBtn) docxBtn.addEventListener('click', saveDocx);

    /* Setup */
    var saveKeyBtn = $id('vd-save-key-btn');
    if (saveKeyBtn) saveKeyBtn.addEventListener('click', saveKey);

    var clearKeyBtn = $id('vd-clear-key-btn');
    if (clearKeyBtn) clearKeyBtn.addEventListener('click', clearKey);

    var testKeyBtn = $id('vd-test-key-btn');
    if (testKeyBtn) testKeyBtn.addEventListener('click', testKey);

    var keyInput = $id('vd-key-input');
    if (keyInput) {
      keyInput.value = apiKey;
      keyInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveKey(); });
    }

    /* Model select */
    var modelSel = $id('vd-model-select');
    if (modelSel) {
      MODEL_OPTIONS.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.value; opt.textContent = m.label;
        modelSel.appendChild(opt);
      });
      modelSel.value = selectedModel;
      modelSel.addEventListener('change', function () {
        selectedModel = modelSel.value;
        localStorage.setItem(STORAGE_MODEL, selectedModel);
      });
    }

    switchTab('chat');
    renderMessages();
    syncCtxBar();
  }

  /* ── Boot ────────────────────────────────────────────────────── */
  function boot() {
    injectStyle();
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

  /* Minimal public API — kept for any external callers */
  window.VDAgent = {
    toggle    : toggle,
    switchTab : switchTab,
    saveDocx  : saveDocx,
  };

}());
