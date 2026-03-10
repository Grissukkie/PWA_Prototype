/**
 * BiHunters — server.js
 * ─────────────────────────────────────────────────────────
 * Server-Side Rendering (SSR) implementation using Node.js
 * built-in http module (no framework required).
 *
 * Contrast with Client-Side Rendering (CSR) in index.html:
 *
 *  CSR (index.html):
 *    1. Browser downloads empty HTML shell
 *    2. Browser downloads + executes JavaScript
 *    3. JS generates party cards and injects them into the DOM
 *    4. User sees content only after JS runs
 *
 *  SSR (this file):
 *    1. Server generates the complete HTML — party cards included
 *    2. Browser receives fully populated HTML
 *    3. User sees content immediately, before any JS executes
 *    4. Better for SEO and low-powered devices
 *
 * Usage:
 *   node server.js
 *   Open http://localhost:3000
 *
 * Routes:
 *   GET /          → SSR lobby browser page (HTML with pre-rendered cards)
 *   GET /api/parties → JSON data (same data, raw API response)
 *   GET /csr-vs-ssr  → Explanation page comparing both rendering approaches
 *   GET /static/*  → Static file serving (CSS, icons, JS)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

// ── Party data generation (same logic as client-side) ──────
const MAPS = [
  'ABANDONED FACILITY', 'INDUSTRIAL COMPLEX',
  'PINE FOREST OUTPOST', 'MILITARY BASE',
  'UNDERGROUND LAB', 'RIVERSIDE WAREHOUSE',
];
const STATUS_POOL = ['waiting', 'waiting', 'waiting', 'in-game', 'in-game', 'full'];
const PREFIXES    = ['Dark','Ghost','Night','Shadow','Steel','Iron','Void','Blood','Grim','Frost'];
const SUFFIXES    = ['Hawk','Wolf','Shade','Reaper','Hunter','Stalker','Phantom','Raven','Scar','Echo'];

/** Deterministic pseudo-random using a seed so SSR and hydration match */
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateParties(n = 20) {
  return Array.from({ length: n }, (_, i) => {
    const pSeed  = seededRand(i * 7);
    const sSeed  = seededRand(i * 13);
    const mSeed  = seededRand(i * 17);
    const stSeed = seededRand(i * 23);
    const pingSeed = seededRand(i * 31);

    const prefix = PREFIXES[Math.floor(pSeed * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(sSeed * SUFFIXES.length)];
    const host   = prefix + suffix;
    const map    = MAPS[Math.floor(mSeed * MAPS.length)];
    const status = STATUS_POOL[Math.floor(stSeed * STATUS_POOL.length)];
    const max    = 5;
    const current = status === 'full'    ? max
                  : status === 'in-game' ? max - (seededRand(i * 37) < .5 ? 0 : 1)
                  : 1 + Math.floor(seededRand(i * 41) * (max - 1));
    const ping   = 18 + Math.floor(pingSeed * 90);

    const slots = Array.from({ length: max }, (_, j) => {
      if (j >= current) return null;
      const sp = PREFIXES[Math.floor(seededRand(i * 43 + j * 7) * PREFIXES.length)];
      const ss = SUFFIXES[Math.floor(seededRand(i * 47 + j * 11) * SUFFIXES.length)];
      return sp + ss;
    });

    return {
      id: 'PTY' + String(1000 + i).padStart(4, '0'),
      host, map, status, current, max, ping, slots,
    };
  });
}

// ── HTML helpers ──────────────────────────────────────────
const STATUS_LABELS = { waiting: 'WAITING', 'in-game': 'IN-GAME', full: 'FULL' };

function renderPartyCard(p, i) {
  const pips = p.slots.map((s, j) =>
    `<div class="pip ${s ? 'filled' : ''} ${j === 0 && s ? 'pip-hunter' : ''}"></div>`
  ).join('');
  const pingClass = p.ping < 50 ? 'ping-good' : p.ping < 80 ? 'ping-ok' : 'ping-bad';

  return `
    <div class="party-card status-${p.status}" style="animation-delay:${i * 0.035}s"
         data-id="${p.id}">
      <div class="card-top">
        <div class="card-status-indicator">
          <span class="card-dot"></span>
          <span class="card-status-lbl">${STATUS_LABELS[p.status]}</span>
        </div>
        <span class="card-ping ${pingClass}">${p.ping}ms</span>
      </div>
      <div class="card-host">${p.host}</div>
      <div class="card-map">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${p.map}
      </div>
      <div class="card-footer">
        <div class="pips-row">${pips}</div>
        <span class="card-count">${p.current}<span class="count-max">/${p.max}</span></span>
      </div>
      <div class="card-shine"></div>
    </div>`;
}

/** Build the complete SSR HTML page with party cards already in the DOM */
function buildSSRPage(parties) {
  const cards  = parties.map((p, i) => renderPartyCard(p, i)).join('\n');
  const online = 38 + Math.floor(seededRand(Date.now() % 999) * 70);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0a0c0f" />
  <meta name="description" content="BiHunters — SSR mode. Survive. Escape. Hunt." />
  <link rel="manifest"         href="./manifest.json" />
  <link rel="apple-touch-icon" href="./icons/icon-192.png" />
  <link rel="preconnect"       href="https://fonts.googleapis.com" />
  <link rel="preconnect"       href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap"
        rel="stylesheet" />
  <link rel="stylesheet" href="./css/styles.css" />
  <title>BiHunters — Lobby Browser (SSR)</title>
  <style>
    .ssr-badge {
      display: inline-block;
      font-family: 'Share Tech Mono', monospace;
      font-size: .6rem;
      letter-spacing: .1em;
      padding: .15rem .5rem;
      background: rgba(88,166,255,.12);
      border: 1px solid rgba(88,166,255,.3);
      color: #58a6ff;
      border-radius: 3px;
      margin-left: .5rem;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="bg-sky"></div>
  <div class="bg-fog fog-1"></div>
  <div class="bg-fog fog-2"></div>
  <div class="bg-treeline"></div>
  <div class="bg-vignette"></div>

  <div class="screen active" id="screen-dashboard">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">BI<span>HUNTERS</span></span>
        <span class="topbar-divider">|</span>
        <span class="topbar-label">LOBBY BROWSER <span class="ssr-badge">SSR</span></span>
      </div>
      <div class="topbar-right">
        <div class="live-dot"></div>
        <span class="live-label" id="online-count">${online} ONLINE</span>
        <a href="/" class="nav-btn small" style="text-decoration:none">REFRESH</a>
        <a href="/csr-vs-ssr" class="nav-btn small" style="text-decoration:none">CSR vs SSR</a>
      </div>
    </header>

    <div class="filter-bar">
      <div class="search-wrap">
        <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="search-input" id="search-input"
               placeholder="SEARCH HOST OR MAP..." oninput="applyFilters()" />
      </div>
      <div class="filter-pills">
        <button class="pill active" onclick="setFilter(this,'all')">ALL</button>
        <button class="pill" onclick="setFilter(this,'waiting')">WAITING</button>
        <button class="pill" onclick="setFilter(this,'in-game')">IN-GAME</button>
        <button class="pill" onclick="setFilter(this,'full')">FULL</button>
      </div>
      <span class="party-count" id="party-count">${parties.length} LOBBIES</span>
    </div>

    <main class="party-grid-wrapper">
      <!--
        SERVER-SIDE RENDERED CONTENT
        These cards were generated by server.js before the HTML was sent to the browser.
        In CSR mode (index.html), this grid is empty on delivery and filled by JavaScript.
      -->
      <div class="party-grid" id="party-grid">
        ${cards}
      </div>
      <div class="empty-state" id="empty-state" style="display:none;">
        <span class="empty-icon">◈</span>
        <p>NO LOBBIES FOUND</p>
        <small>Try a different filter</small>
      </div>
    </main>
  </div>

  <script>
    /* ── Client-side hydration ────────────────────────────
       The cards are already in the DOM (rendered server-side).
       JavaScript only handles interactive behaviour:
       filtering, searching, and UI state.
       No card generation here — that happened on the server. */

    // Hydrate party data from SSR data island
    const ALL_PARTIES = ${JSON.stringify(parties)};
    let activeFilter  = 'all';

    const STATUS_LABELS = { waiting:'WAITING', 'in-game':'IN-GAME', full:'FULL' };

    function applyFilters() {
      const q  = document.getElementById('search-input').value.toLowerCase();
      const grid  = document.getElementById('party-grid');
      const empty = document.getElementById('empty-state');
      const count = document.getElementById('party-count');

      let filtered = ALL_PARTIES;
      if (activeFilter !== 'all')
        filtered = filtered.filter(p => p.status === activeFilter);
      if (q)
        filtered = filtered.filter(p =>
          p.host.toLowerCase().includes(q) || p.map.toLowerCase().includes(q));

      // Show/hide existing server-rendered cards
      grid.querySelectorAll('.party-card').forEach(card => {
        const id = card.dataset.id;
        const visible = filtered.some(p => p.id === id);
        card.style.display = visible ? '' : 'none';
      });

      count.textContent = filtered.length + ' LOBBIE' + (filtered.length !== 1 ? 'S' : '');
      empty.style.display = filtered.length === 0 ? 'flex' : 'none';
    }

    function setFilter(el, filter) {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      activeFilter = filter;
      applyFilters();
    }

    // Register Service Worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[SSR] SW registered:', reg.scope))
        .catch(err => console.warn('[SSR] SW registration failed:', err));
    }
  </script>
</body>
</html>`;
}

/** CSR vs SSR comparison page */
function buildComparisonPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="apple-touch-icon" href="./icons/icon-192.png" />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="./css/styles.css" />
  <title>BiHunters — CSR vs SSR</title>
  <style>
    body { padding: 0; }
    .comparison-layout { max-width: 900px; margin: 0 auto; padding: 5rem 1.5rem 3rem; }
    .page-title { font-family:'Bebas Neue',sans-serif; font-size:2.2rem; letter-spacing:.12em; color:#c8a84b; margin-bottom:.3rem; }
    .page-sub { font-family:'Share Tech Mono',monospace; font-size:.75rem; color:#556070; margin-bottom:2.5rem; }
    .comp-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-bottom:2rem; }
    @media(max-width:600px){ .comp-grid { grid-template-columns:1fr; } }
    .comp-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:1.4rem; }
    .comp-card.csr { border-top:3px solid #c8a84b; }
    .comp-card.ssr { border-top:3px solid #58a6ff; }
    .comp-title { font-family:'Bebas Neue',sans-serif; font-size:1.3rem; letter-spacing:.1em; margin-bottom:1rem; }
    .comp-card.csr .comp-title { color:#c8a84b; }
    .comp-card.ssr .comp-title { color:#58a6ff; }
    .comp-body { font-family:'Rajdhani',sans-serif; font-size:.88rem; color:#8a9aaa; line-height:1.7; }
    .comp-body strong { color:#c0c8d4; }
    .comp-body ul { padding-left:1.2rem; margin:.5rem 0; }
    .comp-body li { margin-bottom:.3rem; }
    .timeline { margin-top:2rem; }
    .tl-title { font-family:'Bebas Neue',sans-serif; font-size:1.1rem; letter-spacing:.1em; color:#c8a84b; margin-bottom:1rem; }
    .tl-row { display:grid; grid-template-columns:120px 1fr 1fr; gap:.5rem; margin-bottom:.4rem; font-family:'Share Tech Mono',monospace; font-size:.68rem; }
    .tl-label { color:#556070; display:flex; align-items:center; }
    .tl-bar { height:22px; border-radius:3px; display:flex; align-items:center; padding:0 .5rem; color:#0d1117; font-weight:700; font-size:.62rem; letter-spacing:.05em; }
    .tl-bar.csr { background:#c8a84b; }
    .tl-bar.ssr { background:#58a6ff; }
    .back-link { display:inline-block; margin-bottom:2rem; font-family:'Share Tech Mono',monospace; font-size:.72rem; color:#c8a84b; text-decoration:none; letter-spacing:.08em; }
    .back-link:hover { text-decoration:underline; }
    .used-badge { display:inline-block; padding:.15rem .5rem; border-radius:3px; font-family:'Share Tech Mono',monospace; font-size:.6rem; letter-spacing:.08em; margin-left:.4rem; }
    .used-badge.csr { background:rgba(200,168,75,.15); color:#c8a84b; border:1px solid rgba(200,168,75,.3); }
    .used-badge.ssr { background:rgba(88,166,255,.12); color:#58a6ff; border:1px solid rgba(88,166,255,.3); }
  </style>
</head>
<body>
  <div class="bg-sky"></div>
  <div class="bg-fog fog-1"></div>
  <div class="bg-treeline"></div>
  <div class="bg-vignette"></div>

  <div class="comparison-layout">
    <a href="/" class="back-link">← BACK TO LOBBY BROWSER</a>
    <div class="page-title">CSR vs SSR</div>
    <div class="page-sub">Client-Side Rendering vs Server-Side Rendering · BiHunters Implementation Analysis</div>

    <div class="comp-grid">
      <div class="comp-card csr">
        <div class="comp-title">Client-Side Rendering <span class="used-badge csr">index.html</span></div>
        <div class="comp-body">
          <p>The browser receives a <strong>minimal HTML shell</strong>. JavaScript generates and injects all party cards after the page loads.</p>
          <strong>How it works in BiHunters:</strong>
          <ul>
            <li>Server sends empty <code>&lt;div id="party-grid"&gt;&lt;/div&gt;</code></li>
            <li>Browser downloads + parses JS</li>
            <li><code>generateParties()</code> runs client-side</li>
            <li>Cards injected into DOM via <code>innerHTML</code></li>
          </ul>
          <strong>Advantages:</strong>
          <ul>
            <li>Rich interactivity after first load</li>
            <li>Instant navigation between screens</li>
            <li>Lower server load — no per-request rendering</li>
            <li>Works seamlessly with Service Worker caching</li>
          </ul>
          <strong>Disadvantages:</strong>
          <ul>
            <li>Blank page until JS executes</li>
            <li>Slower Time to First Meaningful Paint</li>
            <li>Poor SEO (search engines may not index JS-rendered content)</li>
            <li>Fails without JavaScript enabled</li>
          </ul>
        </div>
      </div>

      <div class="comp-card ssr">
        <div class="comp-title">Server-Side Rendering <span class="used-badge ssr">server.js</span></div>
        <div class="comp-body">
          <p>The server generates the <strong>complete HTML</strong> with all party cards already present before sending it to the browser.</p>
          <strong>How it works in BiHunters:</strong>
          <ul>
            <li>Node.js server calls <code>generateParties()</code></li>
            <li>Cards rendered to HTML strings server-side</li>
            <li>Complete page sent to browser</li>
            <li>JS only handles filtering (hydration)</li>
          </ul>
          <strong>Advantages:</strong>
          <ul>
            <li>Content visible immediately — no JS needed</li>
            <li>Better Time to First Contentful Paint (FCP)</li>
            <li>Search engines index the full content</li>
            <li>Works even with JavaScript disabled</li>
          </ul>
          <strong>Disadvantages:</strong>
          <ul>
            <li>Higher server load — renders on every request</li>
            <li>Slower subsequent navigation (full page reload)</li>
            <li>Requires a running server (not static hosting)</li>
            <li>More complex deployment than CSR</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="timeline">
      <div class="tl-title">Time to Interactive — Approximate Comparison</div>
      <div class="tl-row">
        <span class="tl-label">HTML received</span>
        <div class="tl-bar csr" style="width:15%">~0.1s</div>
        <div class="tl-bar ssr" style="width:30%">~0.2s</div>
      </div>
      <div class="tl-row">
        <span class="tl-label">First paint</span>
        <div class="tl-bar csr" style="width:20%">~0.2s</div>
        <div class="tl-bar ssr" style="width:30%">~0.2s</div>
      </div>
      <div class="tl-row">
        <span class="tl-label">Content visible</span>
        <div class="tl-bar csr" style="width:65%">~0.8s (after JS)</div>
        <div class="tl-bar ssr" style="width:35%">~0.2s (in HTML)</div>
      </div>
      <div class="tl-row">
        <span class="tl-label">Interactive</span>
        <div class="tl-bar csr" style="width:80%">~1.0s</div>
        <div class="tl-bar ssr" style="width:55%">~0.6s</div>
      </div>
      <p style="font-family:'Share Tech Mono',monospace;font-size:.62rem;color:#3a4550;margin-top:.8rem;">
        * Approximate values on a typical 4G connection. Actual times vary by device and network.
        SSR has faster initial content display; CSR recovers with caching on repeat visits.
      </p>
    </div>

    <div style="margin-top:2rem;padding:1rem 1.2rem;background:rgba(200,168,75,.06);border:1px solid rgba(200,168,75,.2);border-radius:6px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;color:#c8a84b;margin-bottom:.5rem;">
        BIHUNTERS USES BOTH
      </div>
      <div style="font-family:'Rajdhani',sans-serif;font-size:.85rem;color:#8a9aaa;line-height:1.7;">
        <strong style="color:#c0c8d4">index.html</strong> demonstrates CSR: the App Shell is cached by the Service Worker for instant repeat loads,
        and party data is generated entirely in the browser. This provides the best PWA offline experience.<br><br>
        <strong style="color:#c0c8d4">server.js</strong> demonstrates SSR: Node.js pre-renders the lobby grid on every request.
        This is ideal for first-time visitors and SEO but requires a running server and cannot be cached offline.
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── MIME types ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
};

// ── Request handler ────────────────────────────────────────
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  console.log(`[${new Date().toISOString()}] ${req.method} ${urlPath}`);

  // ── Route: SSR home page ─────────────────────────────────
  if (urlPath === '/' || urlPath === '/index-ssr.html') {
    const parties = generateParties(20);
    const html    = buildSSRPage(parties);
    res.writeHead(200, {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'no-store', // SSR pages are generated fresh each request
    });
    return res.end(html);
  }

  // ── Route: JSON API ──────────────────────────────────────
  if (urlPath === '/api/parties') {
    const parties = generateParties(20);
    res.writeHead(200, {
      'Content-Type':  'application/json',
      'Cache-Control': 'max-age=30',
    });
    return res.end(JSON.stringify({ count: parties.length, parties }, null, 2));
  }

  // ── Route: CSR vs SSR comparison page ───────────────────
  if (urlPath === '/csr-vs-ssr') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(buildComparisonPage());
  }

  // ── Route: Static files ──────────────────────────────────
  // Strip leading slash and resolve to current directory
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safePath);
  const ext      = path.extname(filePath).toLowerCase();
  const mime     = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end(`404 — Not found: ${urlPath}`);
    }
    res.writeHead(200, {
      'Content-Type':  mime,
      'Cache-Control': 'max-age=3600',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ◈  BiHunters SSR Server');
  console.log(`     http://localhost:${PORT}`);
  console.log('');
  console.log('  Routes:');
  console.log(`    GET /            → SSR lobby browser (party cards pre-rendered by Node.js)`);
  console.log(`    GET /api/parties → JSON data`);
  console.log(`    GET /csr-vs-ssr  → CSR vs SSR comparison page`);
  console.log('');
  console.log('  For CSR mode, open index.html in a local static server instead.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
