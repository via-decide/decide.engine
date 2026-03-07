/**
 * ViaDecide — Command Router v1.0
 * ════════════════════════════════════════════════════════════
 * Natural-language command parser for the ViaDecide platform.
 *
 * Works with VDRouter.go() + openModal() from index.html.
 * Zero dependencies. Drop-in after router.js.
 *
 * Public API:
 *   runCommand(input)         — parse + execute
 *   CommandRouter.parse(input)    — parse only, returns intent
 *   CommandRouter.suggest(partial, limit) — autocomplete array
 *   CommandRouter.history()       — recent command history
 *
 * Auto-enhances existing #orb-input on DOMContentLoaded.
 *
 * Example commands:
 *   "open alchemist"          → opens Alchemist tool
 *   "launch ondc"             → opens ONDC Demo
 *   "play hexwars"            → opens HexWars
 *   "research laptop"         → opens Student Research
 *   "find cheapest phone"     → opens Engine Deals
 *   "study machine learning"  → opens StudyOS
 *   "show discounts"          → opens Discounts Hub
 *   "book session"            → opens Dharam Daxini 1:1
 * ════════════════════════════════════════════════════════════
 */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════
   * INTENT REGISTRY
   * Each entry: slug, icon, name, keywords[], verbs[], aliases[]
   * slug must match a key in VDRouter.routes()
   * ══════════════════════════════════════════════════════════ */
  var INTENTS = [
    {
      slug:     'alchemist',
      icon:     '✨',
      name:     'Alchemist',
      keywords: ['alchemist', 'alchemy', 'decision quiz', 'analyse', 'analyze', 'compare', 'choose', 'weigh'],
      verbs:    ['open', 'launch', 'start', 'use', 'run', 'try'],
      aliases:  ['alch', 'quiz'],
    },
    {
      slug:     'memory',
      icon:     '🧠',
      name:     'Memory Engine',
      keywords: ['memory', 'remember', 'recall', 'context', 'brain', 'history'],
      verbs:    ['open', 'load', 'access', 'use', 'launch'],
      aliases:  ['mem', 'memengine'],
    },
    {
      slug:     'prompt-alchemy',
      icon:     '⚗️',
      name:     'Prompt Alchemy',
      keywords: ['prompt', 'prompting', 'prompt alchemy', 'engineering', 'ai prompt', 'gpt', 'llm', 'craft'],
      verbs:    ['open', 'use', 'write', 'craft', 'launch'],
      aliases:  ['pa', 'prompts', 'promptalchemy'],
    },
    {
      slug:     'viaguide',
      icon:     '📚',
      name:     'ViaGuide',
      keywords: ['viaguide', 'guide', 'buying guide', 'recommendation', 'framework'],
      verbs:    ['open', 'use', 'show', 'launch'],
      aliases:  ['via', 'guide'],
    },
    {
      slug:     'studyos',
      icon:     '📖',
      name:     'StudyOS',
      keywords: ['studyos', 'study', 'student', 'education', 'school', 'exam', 'learn'],
      verbs:    ['open', 'start', 'use', 'launch'],
      aliases:  ['study', 'studytool'],
    },
    {
      slug:     'student-research',
      icon:     '🔬',
      name:     'Student Research',
      keywords: ['research', 'student research', 'deep research', 'project', 'topic', 'investigate'],
      verbs:    ['open', 'start', 'use', 'research', 'explore'],
      aliases:  ['studentresearch', 'deepresearch'],
    },
    {
      slug:     'ondc-demo',
      icon:     '🛒',
      name:     'ONDC Demo',
      keywords: ['ondc', 'open network', 'marketplace', 'commerce', 'sellers', 'bharat'],
      verbs:    ['open', 'launch', 'demo', 'explore', 'try'],
      aliases:  ['ondcdemo'],
    },
    {
      slug:     'engine-deals',
      icon:     '🤝',
      name:     'Engine Deals',
      keywords: ['deals', 'engine deals', 'offer', 'sale', 'buy', 'product', 'price', 'amazon'],
      verbs:    ['open', 'find', 'show', 'browse', 'get'],
      aliases:  ['deals', 'deal'],
    },
    {
      slug:     'discounts',
      icon:     '🏷️',
      name:     'Discounts Hub',
      keywords: ['discounts', 'discount', 'cashback', 'savings', 'coupon', 'promo', 'voucher'],
      verbs:    ['open', 'find', 'show', 'get', 'browse'],
      aliases:  ['discount', 'hub'],
    },
    {
      slug:     'cashback-rules',
      icon:     '💸',
      name:     'Cashback Rules',
      keywords: ['cashback rules', 'bank cashback', 'credit card', 'debit card', 'offer rules'],
      verbs:    ['open', 'show', 'read', 'view'],
      aliases:  ['cashbackrules'],
    },
    {
      slug:     'wings-of-fire-quiz',
      icon:     '🔥',
      name:     'Wings of Fire Quiz',
      keywords: ['wings of fire', 'kalam', 'quiz', 'multiplayer quiz', 'knowledge battle', 'apj', 'missile quiz', 'book quiz', 'kalam quiz'],
      verbs:    ['play','launch','open','start','quiz'],
      aliases:  ['wof','kalamquiz','wofquiz','wingfire'],
    },
    {
      slug:     'hexwars',
      icon:     '⬡',
      name:     'HexWars',
      keywords: ['hexwars', 'hex', 'strategy', 'war', 'game', 'hexagonal', 'conquer', 'territory'],
      verbs:    ['play', 'open', 'launch', 'start', 'run'],
      aliases:  ['hex', 'hexgame'],
    },
    {
      slug:     'mars-rover-simulator-game',
      icon:     '🚀',
      name:     'Mars Rover',
      keywords: ['mars', 'rover', 'space', 'planet', 'simulate', 'exploration', 'nasa'],
      verbs:    ['open', 'launch', 'play', 'simulate', 'explore'],
      aliases:  ['marsrover', 'rover', 'mars-rover'],
    },
    {
      slug:     'hivaland',
      icon:     '🌍',
      name:     'HivaLand',
      keywords: ['hivaland', 'hiva', 'world', 'build', 'simulation', 'land'],
      verbs:    ['open', 'play', 'launch', 'explore'],
      aliases:  ['hiva'],
    },
    {
      slug:     'decide-service',
      icon:     '🎯',
      name:     'Decide.Service',
      keywords: ['service', 'decide service', 'white glove', 'hire', 'consult', 'research service'],
      verbs:    ['open', 'launch', 'hire', 'book', 'access'],
      aliases:  ['svc', 'decideservice'],
    },
    {
      slug:     'engine-license',
      icon:     '⚙️',
      name:     'Engine License',
      keywords: ['license', 'engine license', 'white label', 'activate', 'key', 'unlock', 'register'],
      verbs:    ['open', 'activate', 'get', 'view', 'buy'],
      aliases:  ['lic', 'enginelicense'],
    },
    {
      slug:     'cohort-apply-here',
      icon:     '🧪',
      name:     'Cohort Program',
      keywords: ['cohort', 'program', 'community', 'batch', 'apply', 'builders', 'program'],
      verbs:    ['open', 'join', 'apply', 'view', 'register'],
      aliases:  ['cohort', 'cohortprogram'],
    },
    {
      slug:     'printbydd-store',
      icon:     '🛍️',
      name:     'Store',
      keywords: ['store', 'shop', 'products', 'merch', 'merchandise', 'buy', 'printbydd', 'print'],
      verbs:    ['open', 'browse', 'visit', 'shop'],
      aliases:  ['printstore', 'shop'],
    },
    {
      slug:     'numberplate',
      icon:     '🚗',
      name:     'Numberplates',
      keywords: ['numberplate', 'number plate', 'vehicle', 'car', 'bike', '3d plate', 'custom plate'],
      verbs:    ['open', 'order', 'buy', 'get'],
      aliases:  ['plate', 'numplate'],
    },
    {
      slug:     'viadecide-blogs',
      icon:     '✍️',
      name:     'Blog',
      keywords: ['blog', 'blogs', 'articles', 'read', 'writing', 'post', 'content'],
      verbs:    ['open', 'read', 'browse', 'view'],
      aliases:  ['blogs', 'articles'],
    },
    {
      slug:     'finance-dashboard-msme',
      icon:     '💰',
      name:     'FinTrack Dashboard',
      keywords: ['fintrack', 'finance', 'pnl', 'profit', 'loss', 'cashflow', 'expenses', 'msme', 'dashboard', 'gst'],
      verbs:    ['open', 'launch', 'track', 'view'],
      aliases:  ['fintrack', 'financedashboard'],
    },
    {
      slug:     'sales-dashboard',
      icon:     '📊',
      name:     'MSME Sales Dashboard',
      keywords: ['sales', 'revenue', 'units', 'register', 'csv', 'upload', 'kpi', 'pivot'],
      verbs:    ['open', 'launch', 'track', 'upload', 'view'],
      aliases:  ['salesdashboard', 'salesregister'],
    },
    {
      slug:     'payment-register',
      icon:     '👥',
      name:     'Payroll Register',
      keywords: ['payroll', 'salary', 'employee', 'pf', 'esi', 'hr', 'payslip', 'tds'],
      verbs:    ['open', 'launch', 'manage', 'view'],
      aliases:  ['payroll', 'salarysheet'],
    },
    {
      slug:     'interview-prep',
      icon:     '🎤',
      name:     'Interview Simulator',
      keywords: ['interview', 'mock interview', 'job', 'practice', 'hr', 'career', 'prepare'],
      verbs:    ['open', 'start', 'practice', 'launch'],
      aliases:  ['mockinterview'],
    },
    {
      slug:     'dharamdaxini',
      icon:     '🧭',
      name:     'Dharam Daxini · 1:1',
      keywords: ['dharam', 'session', 'book', 'coaching', '1:1', 'one on one', 'consult', 'strategy'],
      verbs:    ['book', 'open', 'join', 'schedule'],
      aliases:  ['dharamdaxini', '1on1'],
    },
    {
      slug:     'laptops-under-50000',
      icon:     '💻',
      name:     'Laptops Under ₹50,000',
      keywords: ['laptop', 'laptops', 'under 50000', 'budget laptop', 'best laptop', 'notebook'],
      verbs:    ['find', 'show', 'open', 'view', 'compare'],
      aliases:  ['laptopguide'],
    },
    {
      slug:     'app-generator',
      icon:     '🔧',
      name:     'App Generator',
      keywords: ['app generator', 'build app', 'generate', 'create app', 'custom tool', 'no code'],
      verbs:    ['open', 'build', 'create', 'use', 'launch'],
      aliases:  ['appgenerator', 'builder'],
    },
    {
      slug:     'agent',
      icon:     '✦',
      name:     'ViaDecide Agent',
      keywords: ['agent', 'viadecide agent', 'ai assistant', 'chat', 'navigate', 'helper'],
      verbs:    ['open', 'chat', 'ask', 'use', 'launch'],
      aliases:  ['assistant', 'aiagent'],
    },
    {
      slug:     'pricing',
      icon:     '💰',
      name:     'Pricing',
      keywords: ['pricing', 'price', 'plans', 'cost', 'subscription', 'tiers'],
      verbs:    ['open', 'view', 'show', 'check'],
      aliases:  ['plans'],
    },
    {
      slug:     'contact',
      icon:     '✉️',
      name:     'Contact',
      keywords: ['contact', 'reach', 'email', 'message', 'support', 'help'],
      verbs:    ['open', 'contact', 'reach', 'view'],
      aliases:  ['contactus'],
    },
  ];

  /* ══════════════════════════════════════════════════════════
   * COMPOUND COMMAND RULES
   * These fire before intent scoring for complex queries.
   * ══════════════════════════════════════════════════════════ */
  var COMPOUND_RULES = [
    {
      pattern: /\b(research|study|learn about|explain|tell me about|what is|how does)\b/i,
      slug:    'student-research',
      extractQuery: function (input) {
        return input.replace(/^(research|study|learn about|explain|tell me about|what is|how does)\s*/i, '').trim();
      },
    },
    {
      pattern: /\b(find cheapest|best price|compare price|cheapest|budget|affordable|buy|purchase)\b/i,
      slug:    'engine-deals',
      extractQuery: null,
    },
    {
      pattern: /\b(discount|coupon|cashback|promo code|savings|voucher)\b/i,
      slug:    'discounts',
      extractQuery: null,
    },
    {
      pattern: /\b(decide|should i buy|help me choose|what should i|which is better|vs)\b/i,
      slug:    'alchemist',
      extractQuery: null,
    },
    {
      pattern: /\b(finance|pnl|profit|loss|cashflow|expenses|gst|invoice|revenue|msme dashboard)\b/i,
      slug:    'finance-dashboard-msme',
      extractQuery: null,
    },
    {
      pattern: /\b(track sales|upload sales|sales csv|sales register)\b/i,
      slug:    'sales-dashboard',
      extractQuery: null,
    },
    {
      pattern: /\b(play|game|sim|simulator)\b/i,
      // Will match hex/mars further below via intent scoring if compound alone not enough
      slug:    null, // deferred to intent scoring
      extractQuery: null,
    },
  ];

  /* ══════════════════════════════════════════════════════════
   * COMMAND HISTORY
   * ══════════════════════════════════════════════════════════ */
  var _history = [];
  var MAX_HISTORY = 30;

  /* ══════════════════════════════════════════════════════════
   * UTILS
   * ══════════════════════════════════════════════════════════ */
  function _norm(str) {
    return (str || '').trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  }

  /* ══════════════════════════════════════════════════════════
   * INTENT SCORING
   * Higher score = stronger match.
   * ══════════════════════════════════════════════════════════ */
  function _score(intent, normInput) {
    var score = 0;
    var words = normInput.split(' ');

    // Keywords — multi-word phrases score proportionally higher
    intent.keywords.forEach(function (kw) {
      if (normInput.includes(kw)) {
        score += kw.split(' ').length * 12;
      }
    });

    // Aliases — exact match
    intent.aliases.forEach(function (alias) {
      if (normInput.includes(alias)) score += 10;
    });

    // Name match
    if (normInput.includes(intent.name.toLowerCase())) score += 15;

    // Slug match
    if (normInput.includes(intent.slug)) score += 10;

    // Verb presence (weak signal — adds context only)
    intent.verbs.forEach(function (verb) {
      if (words.indexOf(verb) !== -1) score += 2;
    });

    return score;
  }

  /* ══════════════════════════════════════════════════════════
   * PARSE — core parsing function
   *
   * Returns:
   * {
   *   type:       "navigate" | "compound" | "unknown"
   *   slug:       "hexwars"
   *   icon:       "⬡"
   *   name:       "HexWars"
   *   query:      "laptop" | null
   *   confidence: 0–100
   *   raw:        "play hexwars"
   * }
   * ══════════════════════════════════════════════════════════ */
  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') {
      return { type: 'unknown', raw: rawInput, confidence: 0 };
    }

    var raw       = rawInput.trim();
    var normInput = _norm(raw);

    // 1. Check compound rules (highest priority)
    for (var i = 0; i < COMPOUND_RULES.length; i++) {
      var rule = COMPOUND_RULES[i];
      if (!rule.slug) continue; // deferred — skip
      if (rule.pattern.test(normInput)) {
        var matchedIntent = null;
        for (var j = 0; j < INTENTS.length; j++) {
          if (INTENTS[j].slug === rule.slug) { matchedIntent = INTENTS[j]; break; }
        }
        if (matchedIntent) {
          var query = rule.extractQuery ? rule.extractQuery(normInput) : null;
          return {
            type:       'compound',
            slug:       matchedIntent.slug,
            icon:       matchedIntent.icon,
            name:       matchedIntent.name,
            query:      query,
            confidence: 72,
            raw:        raw,
          };
        }
      }
    }

    // 2. Score all intents
    var best      = null;
    var bestScore = 0;

    INTENTS.forEach(function (intent) {
      var s = _score(intent, normInput);
      if (s > bestScore) { bestScore = s; best = intent; }
    });

    // Minimum threshold to avoid false positives
    if (best && bestScore >= 8) {
      return {
        type:       'navigate',
        slug:       best.slug,
        icon:       best.icon,
        name:       best.name,
        query:      null,
        confidence: Math.min(100, bestScore * 3),
        raw:        raw,
      };
    }

    // 3. Direct slug or path input: "/hexwars" or "hexwars"
    var directSlug = normInput.replace(/^\//, '').split(' ')[0];
    if (directSlug && _findIntent(directSlug)) {
      var di = _findIntent(directSlug);
      return {
        type:       'navigate',
        slug:       di.slug,
        icon:       di.icon,
        name:       di.name,
        query:      null,
        confidence: 95,
        raw:        raw,
      };
    }

    return { type: 'unknown', raw: raw, confidence: 0 };
  }

  function _findIntent(slug) {
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].slug === slug || INTENTS[i].aliases.indexOf(slug) !== -1) {
        return INTENTS[i];
      }
    }
    return null;
  }

  /* ══════════════════════════════════════════════════════════
   * runCommand() — parse + execute
   * Uses VDRouter.go() if available, falls back to openModal().
   * ══════════════════════════════════════════════════════════ */
  function runCommand(input) {
    var intent = parse(input);

    // Record history
    _history.unshift({ input: input, intent: intent, ts: Date.now() });
    if (_history.length > MAX_HISTORY) _history.pop();
    try {
      sessionStorage.setItem('vd_cmd_hist', JSON.stringify(_history.slice(0, 15)));
    } catch (e) {}

    if (intent.type === 'unknown' || !intent.slug) {
      // Emit event so the page can show "not understood"
      _dispatch('commandunknown', { input: input, intent: intent });
      return intent;
    }

    // Execute via VDRouter (preferred) or direct openModal fallback
    if (global.VDRouter && typeof global.VDRouter.go === 'function') {
      global.VDRouter.go(intent.slug, { overlay: true });
    } else if (typeof global.openModal === 'function') {
      var file = intent.slug.replace(/-/g, '/') + '/index.html';
      if (global.VDRouter && global.VDRouter.resolve) {
        file = global.VDRouter.resolve(intent.slug);
      }
      global.openModal(file, intent.icon, intent.name);
    }

    _dispatch('commandexecuted', intent);
    return intent;
  }

  /* ══════════════════════════════════════════════════════════
   * suggest() — autocomplete
   * Returns array of { slug, icon, name, hint } sorted by relevance.
   * ══════════════════════════════════════════════════════════ */
  function suggest(partial, limit) {
    limit = limit || 6;
    if (!partial || partial.length < 1) {
      // Default: most popular modules
      var defaults = ['alchemist', 'ondc-demo', 'hexwars', 'student-research', 'finance-dashboard-msme', 'mars-rover-simulator-game'];
      return defaults.slice(0, limit).map(function (slug) {
        var intent = _findIntent(slug);
        return intent ? { slug: intent.slug, icon: intent.icon, name: intent.name, hint: 'open ' + intent.name.toLowerCase() } : null;
      }).filter(Boolean);
    }

    var norm    = _norm(partial);
    var results = [];

    INTENTS.forEach(function (intent) {
      var matched = false;
      var hint    = 'open ' + intent.name.toLowerCase();

      if (intent.name.toLowerCase().indexOf(norm) !== -1) { matched = true; }
      if (intent.slug.indexOf(norm) !== -1) { matched = true; hint = intent.slug; }

      intent.keywords.forEach(function (kw) {
        if (kw.indexOf(norm) !== -1) { matched = true; hint = kw; }
      });
      intent.aliases.forEach(function (a) {
        if (a.indexOf(norm) !== -1) { matched = true; hint = 'open ' + a; }
      });

      if (matched) {
        results.push({ slug: intent.slug, icon: intent.icon, name: intent.name, hint: hint });
      }
    });

    return results.slice(0, limit);
  }

  /* ══════════════════════════════════════════════════════════
   * history()
   * ══════════════════════════════════════════════════════════ */
  function history() { return _history.slice(); }

  /* Restore history from session */
  (function () {
    try {
      var saved = sessionStorage.getItem('vd_cmd_hist');
      if (saved) _history = JSON.parse(saved);
    } catch (e) {}
  })();

  /* ══════════════════════════════════════════════════════════
   * _dispatch() — fire CustomEvent
   * ══════════════════════════════════════════════════════════ */
  function _dispatch(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════
   * ORB INPUT ENHANCEMENT
   * Augments the existing #orb-input to also understand
   * command-style input: "open alchemist", "play hexwars" etc.
   *
   * Only activates when the input starts with a known verb
   * (open, launch, play, find, use, book, study, research…)
   * so it doesn't interfere with the existing product search.
   * ══════════════════════════════════════════════════════════ */
  var COMMAND_VERBS = /^\s*(open|launch|play|find|use|book|study|research|browse|show|run|start|explore|access|read|go to|navigate|demo|try|activate|join|apply|hire|track|compare|decide|should i|help me)\b/i;

  function _enhanceOrbInput() {
    var orbInput = document.getElementById('orb-input');
    if (!orbInput || orbInput._commandRouterBound) return;
    orbInput._commandRouterBound = true;

    // We intercept the Enter key only when the input looks like a command
    orbInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;

      var val = orbInput.value.trim();
      if (!val) return;

      // Only intercept if it looks like a command verb
      if (!COMMAND_VERBS.test(val)) return;

      var intent = parse(val);
      if (intent.type === 'unknown' || !intent.slug) return;

      // It's a valid command — prevent the default orb search and run it
      e.stopImmediatePropagation();
      orbInput.value = '';

      // Hide any open suggest dropdown
      var suggest = document.getElementById('orb-suggest');
      if (suggest) { suggest.style.display = 'none'; suggest.innerHTML = ''; }

      runCommand(val);
    }, true); // capture phase to intercept before existing listener
  }

  /* ══════════════════════════════════════════════════════════
   * AUTO-INIT on DOMContentLoaded
   * ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    _enhanceOrbInput();
  });

  /* ══════════════════════════════════════════════════════════
   * EXPOSE
   * ══════════════════════════════════════════════════════════ */
  var CommandRouter = {
    parse:      parse,
    suggest:    suggest,
    history:    history,
    INTENTS:    INTENTS,
  };

  global.CommandRouter = CommandRouter;
  global.runCommand    = runCommand; // shorthand for inline use

})(window);
