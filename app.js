/* Vision Software Solutions — site behaviour.
   Static site; release data is loaded live from the public GitHub API,
   with the values written into the HTML kept as the fallback. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(kind) {
    try { return window[kind]; } catch (e) { return null; }
  }
  function get(kind, key) { try { var s = store(kind); return s ? s.getItem(key) : null; } catch (e) { return null; } }
  function set(kind, key, val) { try { var s = store(kind); if (s) s.setItem(key, val); } catch (e) {} }

  /* ---------------- Theme ---------------- */
  $$('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      set('localStorage', 'theme', next);
    });
  });

  /* ---------------- Nav ---------------- */
  var nav = $('.site-nav');
  var onScroll = function () { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = $('.menu-toggle');
  var links = $('#site-links');
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Highlight the nav link for the section currently in view (home page).
  if ('IntersectionObserver' in window) {
    var navLinks = $$('#site-links a[href^="#"]');
    var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    if (sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ---------------- Reveal on scroll ---------------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- Count-up stats ---------------- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, end = +el.getAttribute('data-count'), t0 = null;
        co.unobserve(el);
        if (!end) return;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / 1100);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------------- Feature category tabs ---------------- */
  $$('.feature-set').forEach(function (set) {
    var tabs = $$('.tab', set), cards = $$('.feature-card', set);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var f = tab.getAttribute('data-filter');
        tabs.forEach(function (t) { t.setAttribute('aria-pressed', t === tab ? 'true' : 'false'); });
        cards.forEach(function (c) { c.hidden = !(f === 'all' || c.getAttribute('data-cat') === f); });
      });
    });
  });

  /* ---------------- Hero live-log demo ---------------- */
  var log = $('#log');
  if (log) {
    var hosts = ['core-sw-01', 'edge-fw-01', 'dist-sw-07', 'wan-rtr-02', 'esx-host-03', 'ap-lobby-2', 'vpn-gw-01', 'dc-srv-01'];
    var events = [
      ['info', 'INFO', '%LINK-3-UPDOWN: Interface Gi1/0/12, changed state to up'],
      ['warn', 'WARN', '%SEC-6-IPACCESSLOGP: list 101 denied tcp 203.0.113.7(51544)'],
      ['info', 'INFO', 'traffic: allow src=10.1.4.22 dst=10.0.0.53 dport=53 proto=udp'],
      ['err', 'ERR', 'sshd: Failed password for invalid user admin from 198.51.100.4'],
      ['note', 'NOTE', '%SYS-5-CONFIG_I: Configured from console by netops on vty0'],
      ['info', 'INFO', 'vmkernel: vMotion migration completed for vm-web-02'],
      ['warn', 'WARN', '%ASA-4-106023: Deny udp src outside:192.0.2.9/137'],
      ['info', 'INFO', 'dhcpd: DHCPACK on 10.1.8.143 to 3c:22:fb:9a:10:4e'],
      ['note', 'NOTE', 'EventID 4624: An account was successfully logged on (svc-backup)'],
      ['err', 'ERR', '%OSPF-5-ADJCHG: Nbr 10.255.0.2 on Gi0/1 from FULL to DOWN'],
      ['info', 'INFO', 'wlan: client 8a:14:0c:77:e1:02 associated, RSSI -58 dBm']
    ];
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var esc = function (s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
    var addLine = function () {
      var e = events[Math.floor(Math.random() * events.length)];
      var h = hosts[Math.floor(Math.random() * hosts.length)];
      var d = new Date();
      var row = document.createElement('div');
      row.className = 'log-line';
      row.innerHTML = '<span class="t">' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '</span>' +
        '<span class="sev sev-' + e[0] + '">' + e[1] + '</span><span class="h">' + h + '</span><span>' + esc(e[2]) + '</span>';
      log.insertBefore(row, log.firstChild);
      while (log.children.length > 16) log.removeChild(log.lastChild);
    };
    for (var i = 0; i < 12; i++) addLine();
    var rate = $('#c-rate');
    if (!reduceMotion) {
      setInterval(function () {
        if (document.hidden) return;
        addLine();
        if (rate) rate.textContent = (1150 + Math.floor(Math.random() * 260)).toLocaleString('en-US');
      }, 1100);
    }
  }

  /* ---------------- Dashboard bar chart demo ---------------- */
  var bars = $('#bars');
  if (bars) {
    var N = 30, vals = [];
    for (var b = 0; b < N; b++) {
      vals.push(35 + Math.random() * 45);
      bars.appendChild(document.createElement('i'));
    }
    var draw = function () {
      $$('i', bars).forEach(function (el, idx) {
        el.style.height = vals[idx] + '%';
        el.classList.toggle('hot', vals[idx] > 88);
      });
    };
    draw();
    var msgs = $('#k-msgs'), total = 4.82;
    if (!reduceMotion) {
      setInterval(function () {
        if (document.hidden) return;
        vals.shift();
        vals.push(Math.random() < 0.08 ? 90 + Math.random() * 10 : 35 + Math.random() * 45);
        draw();
        total += 0.01;
        if (msgs) msgs.textContent = total.toFixed(2) + 'M';
      }, 1800);
    }
  }

  /* ---------------- Year ---------------- */
  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------------- Copy buttons ---------------- */
  function copyText(text, btn) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = $('[data-rel="' + btn.getAttribute('data-copy') + '"]');
      if (src) copyText(src.textContent.trim(), btn);
    });
  });
  // Docs: a copy button on every code block.
  $$('.prose pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = 'Copy';
    btn.addEventListener('click', function () { copyText(($('code', pre) || pre).textContent.trim(), btn); });
    pre.appendChild(btn);
  });

  /* ---------------- Docs: highlight the current section in the TOC ---------------- */
  var tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var tocSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    tocLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) tocSpy.observe(s); });
  }

  /* ---------------- Updates page: product filter ---------------- */
  var filter = $('#product-filter');
  if (filter) {
    var ptabs = $$('.tab', filter);
    var applyFilter = function (p) {
      ptabs.forEach(function (t) { t.setAttribute('aria-pressed', t.getAttribute('data-product') === p ? 'true' : 'false'); });
      $$('.product-block').forEach(function (bl) { bl.hidden = !(p === 'all' || bl.getAttribute('data-product') === p); });
    };
    ptabs.forEach(function (t) { t.addEventListener('click', function () { applyFilter(t.getAttribute('data-product')); }); });
  }

  /* ---------------- Live release data from GitHub ---------------- */
  var PRODUCTS = {
    // "syslog" is the Update file (the MSI); "syslogInstall" is the new-installation bundle (.exe).
    syslog: { repo: 'saqibtechnn/vsoftsol-syslog-manager', asset: /\.msi$/i },
    syslogInstall: { repo: 'saqibtechnn/vsoftsol-syslog-manager', asset: /^VSoftSolSyslogManagerInstall-.*\.exe$/i },
    backup: { repo: 'saqibtechnn/vSoft-Baclup-Updates', asset: /^CiscoConfigBackup-Beta-Setup\.exe$/i }
  };
  var CACHE_MS = 10 * 60 * 1000;

  var inflight = {};
  function fetchReleases(repo) {
    // Two entries can share a repo (Update + New installation); make one API request for both.
    if (!inflight[repo]) inflight[repo] = fetchReleasesOnce(repo);
    return inflight[repo];
  }

  function fetchReleasesOnce(repo) {
    var key = 'rel:' + repo;
    var cached = get('sessionStorage', key);
    if (cached) {
      try {
        var c = JSON.parse(cached);
        if (Date.now() - c.t < CACHE_MS) return Promise.resolve(c.d);
      } catch (e) {}
    }
    return fetch('https://api.github.com/repos/' + repo + '/releases?per_page=15', {
      headers: { Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('GitHub API ' + r.status);
      return r.json();
    }).then(function (list) {
      // Keep only the fields we use, so the cache stays small.
      var slim = list.filter(function (x) { return !x.draft; }).map(function (x) {
        return {
          tag: x.tag_name, name: x.name, pre: x.prerelease, date: x.published_at, url: x.html_url, body: x.body || '',
          assets: (x.assets || []).map(function (a) {
            return { name: a.name, size: a.size, url: a.browser_download_url, digest: a.digest || '' };
          })
        };
      });
      set('sessionStorage', key, JSON.stringify({ t: Date.now(), d: slim }));
      return slim;
    });
  }

  function fmtVersion(tag) { return (tag || '').replace(/-Build-/i, ' Build ').replace(/-/g, ' '); }
  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function fmtSize(bytes) { return (bytes / 1048576).toFixed(1) + ' MB'; }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // Minimal, safe Markdown → HTML for release notes (input is escaped first).
  function md(src) {
    var inline = function (s) {
      return escHtml(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    };
    var lines = src.replace(/\r/g, '').split('\n'), out = [], para = [], list = null, table = null;
    var flushPara = function () { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
    var flushList = function () { if (list) { out.push('<ul>' + list.map(function (li) { return '<li>' + inline(li) + '</li>'; }).join('') + '</ul>'); list = null; } };
    var flushTable = function () {
      if (!table) return;
      var rows = table.filter(function (r) { return !/^\|?\s*:?-{2,}/.test(r); }).map(function (r) {
        return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      });
      out.push('<table>' + rows.map(function (r, i) {
        var tag = i === 0 ? 'th' : 'td';
        return '<tr>' + r.map(function (c) { return '<' + tag + '>' + inline(c) + '</' + tag + '>'; }).join('') + '</tr>';
      }).join('') + '</table>');
      table = null;
    };
    var flushAll = function () { flushPara(); flushList(); flushTable(); };
    lines.forEach(function (line) {
      var t = line.trim(), m;
      if (!t) { flushAll(); return; }
      if ((m = t.match(/^#{1,6}\s+(.*)$/))) { flushAll(); out.push('<h4>' + inline(m[1]) + '</h4>'); return; }
      if (/^\|.*\|$/.test(t)) { flushPara(); flushList(); (table = table || []).push(t); return; }
      if ((m = t.match(/^[-*]\s+(.*)$/))) { flushPara(); flushTable(); (list = list || []).push(m[1]); return; }
      if (list && /^\s{2,}\S/.test(line)) { list[list.length - 1] += ' ' + t; return; }
      flushList(); flushTable();
      para.push(t);
    });
    flushAll();
    return out.join('');
  }

  function bind(key, info) {
    var map = { version: info.version, date: info.date, size: info.size, sha: info.sha, file: info.file };
    Object.keys(map).forEach(function (field) {
      if (!map[field]) return;
      $$('[data-rel="' + key + '.' + field + '"]').forEach(function (el) { el.textContent = map[field]; });
    });
    if (info.url) $$('[data-rel-href="' + key + '.url"]').forEach(function (el) { el.href = info.url; });
  }

  function renderHistory(el, key, list, latestTag) {
    if (!el || !list.length) return;
    el.innerHTML = list.slice(0, 10).map(function (r, i) {
      var assets = r.assets.filter(function (a) { return !/\.sha256$/i.test(a.name); }).map(function (a) {
        return '<a href="' + escHtml(a.url) + '">⬇ ' + escHtml(a.name) + ' <span style="color:var(--text-3);font-weight:500">' + fmtSize(a.size) + '</span></a>';
      }).join('');
      var isLatest = r.tag === latestTag;
      return '<div class="tl-item' + (isLatest ? ' first' : '') + '"><details' + (i === 0 && key === 'backup' ? ' open' : '') + '>' +
        '<summary><b>' + escHtml(fmtVersion(r.tag)) + '</b>' +
        (isLatest ? '<span class="chip">Latest</span>' : '') +
        (r.pre ? '<span class="chip beta">Pre-release</span>' : '') +
        '<span class="date">' + fmtDate(r.date) + '</span><span class="expand">Show notes</span></summary>' +
        '<div class="md">' + (md(r.body) || '<p>No release notes.</p>') +
        (assets ? '<div class="assets">' + assets + '</div>' : '') +
        '<p><a href="' + escHtml(r.url) + '" target="_blank" rel="noopener">View on GitHub →</a></p></div>' +
        '</details></div>';
    }).join('');

    // Keep hand-written entries for versions that are no longer published on GitHub.
    var seen = list.map(function (r) { return fmtVersion(r.tag); });
    var tmp = document.createElement('div');
    tmp.innerHTML = el.getAttribute('data-fallback') || '';
    $$('.tl-item', tmp).forEach(function (item) {
      var b = $('summary b', item);
      if (!b || seen.indexOf(b.textContent.trim()) !== -1) return;
      item.classList.remove('first');
      el.appendChild(item);
    });
  }

  var status = $('#api-status');
  var needsHistory = !!$('#history-syslog');
  if (needsHistory) {
    $$('.timeline').forEach(function (tl) {
      tl.setAttribute('data-fallback', tl.innerHTML);
      tl.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    });
  }

  var jobs = Object.keys(PRODUCTS).map(function (key) {
    var p = PRODUCTS[key];
    return fetchReleases(p.repo).then(function (list) {
      var latest = list.filter(function (r) { return !r.pre; })[0] || list[0];
      if (!latest) throw new Error('no releases');
      var asset = latest.assets.filter(function (a) { return p.asset.test(a.name); })[0];
      bind(key, {
        version: fmtVersion(latest.tag),
        date: fmtDate(latest.date),
        size: asset ? fmtSize(asset.size) : '',
        sha: asset && asset.digest ? asset.digest.replace(/^sha256:/, '') : '',
        file: asset ? asset.name : '',
        url: asset ? asset.url : latest.url
      });
      // If a newer Syslog Manager is out than the hand-written notes cover, show GitHub's notes instead.
      var notes = $('#' + key + '-notes');
      if (notes && notes.getAttribute('data-curated-version') !== latest.tag) {
        notes.innerHTML = '<h3>What’s new</h3><div class="md">' + md(latest.body) + '</div>';
      }
      renderHistory($('#history-' + key), key, list, latest.tag);
      return true;
    }).catch(function () {
      var tl = $('#history-' + key);
      if (tl && tl.hasAttribute('data-fallback')) tl.innerHTML = tl.getAttribute('data-fallback');
      return false;
    });
  });

  Promise.all(jobs).then(function (res) {
    if (!status) return;
    var ok = res.every(Boolean);
    status.className = 'api-status ' + (ok ? 'ok' : 'warn');
    status.textContent = ok ? 'Live from GitHub · updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Showing saved release info — GitHub is unreachable right now';
  });
})();
