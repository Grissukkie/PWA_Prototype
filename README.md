# BiHunters — App Shell PWA

> A multiplayer survival-horror lobby browser built as a PWA using the App Shell architecture, integrated with real third-party APIs.

---

## 📁 Project Structure

```
PWA_PR/
│
├── css/
│   └── styles.css                ← Shell styles — renders instantly before content
│
├── icons/
│   ├── favicon-16.png            ← Small browser tab icon
│   ├── favicon-32.png            ← High-res browser tab icon
│   ├── favicon.ico               ← Classic browser icon (16, 32, 48px)
│   ├── icon-192.png              ← PWA icon — Android home screen / install
│   ├── icon-512.png              ← PWA icon — splash screen / high-DPI
│   ├── screenshot-wide.png       ← Desktop install screenshot (1280×800)
│   └── screenshot-mobile.png     ← Mobile install screenshot (390×844)
│
├── js/
│   ├── app.js                    ← Service Worker registration + install prompt
│   ├── api.config.example.js     ← API config template — safe to commit
│   └── api.config.js             ← API keys — GITIGNORED, never committed ⚠️
│
├── sw.js                         ← Service Worker (must be in root for full scope)
│
├── index.html                    ← App Shell entry point + all screens
├── manifest.json                 ← PWA metadata, icons, theme colors
├── .gitignore                    ← Excludes api.config.js from version control
└── README.md                     ← This file
```

---

## 🧠 1. Research & Planning

### What is the App Shell Architecture?

The **App Shell** is a design pattern for Progressive Web Apps that separates the application's **skeleton UI** (shell) from its **dynamic content**. The shell — header, navigation, layout containers — is cached on the first visit and served instantly on every subsequent load, even offline. Content is then loaded dynamically into the shell.

```
┌──────────────────────────────────────┐
│            APP SHELL (cached)        │
│  ┌──────────────────────────────┐    │
│  │  Header / Nav / Topbar       │    │
│  ├──────────────────────────────┤    │
│  │                              │    │
│  │   Dynamic Content Area       │    │  ← Party cards / API data injected by JS
│  │   (party grid, news, map)    │    │
│  │                              │    │
│  ├──────────────────────────────┤    │
│  │  Footer / Filter Bar         │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### Static vs Dynamic Elements

| Element | Type | Reason |
|---|---|---|
| Topbar (logo, nav buttons) | **Static / Shell** | Always visible, never changes |
| Filter bar & search input | **Static / Shell** | UI controls, no data needed |
| Background, treeline, fog | **Static / Shell** | Pure CSS, no data dependency |
| Party cards grid | **Dynamic / Content** | Loaded from server/API at runtime |
| Player count & status | **Dynamic / Content** | Changes in real time |
| Modal detail panel | **Dynamic / Content** | Populated on user click |
| Server Regions grid | **Dynamic / API** | Fetched live from RestCountries API |
| Intel Feed articles | **Dynamic / API** | Fetched live from NewsAPI |

### Task Distribution

| Role | Responsibility | Files |
|---|---|---|
| HTML/CSS | Shell structure, responsive layout, API screens | `index.html`, `css/styles.css` |
| Service Worker | Caching strategies, offline fallback | `sw.js` |
| Manifest / Metadata | PWA installability, icons, branding | `manifest.json`, `icons/` |
| API Integration | RestCountries + NewsAPI consumption | `index.html`, `js/api.config.js` |

---

## 🏗️ 2. Core Architecture & Setup

### index.html — The App Shell

`index.html` is the **entry point** and defines the complete App Shell. It contains:

- **Header** (`<header class="topbar">`) — logo, navigation buttons, live online counter
- **Filter Bar** — search input and status filter pills (WAITING / IN-GAME / FULL)
- **Main Content Area** (`<main class="party-grid-wrapper">`) — where party cards are injected dynamically
- **Server Regions Screen** — live data from RestCountries API with region filters and country detail panels
- **Intel Feed Screen** — live gaming news from NewsAPI with search and topic pills
- **Modal Overlay** — pre-rendered in HTML, populated dynamically on card click

The shell renders **immediately** because all layout CSS is loaded in `<head>` — no API call is needed to paint the UI skeleton.

### css/styles.css — Shell Styles

Styles are written with CSS variables for consistent theming across all components:

```css
:root {
  --bg-deep:    #060709;   /* Main background  */
  --gold:       #c8a84b;   /* Primary accent   */
  --red:        #c03838;   /* Hunter / danger  */
  --green:      #4caf6e;   /* Waiting / online */
  --font-title: 'Bebas Neue', sans-serif;
  --font-mono:  'Share Tech Mono', monospace;
}
```

---

## ⚙️ 3. Service Worker & Caching

### Registration — js/app.js

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('./sw.js');
    console.log('[PWA] Service Worker registered:', reg.scope);
  });
}
```

- Checks for **browser support** before attempting registration
- Registers on the `load` event to avoid blocking initial page render
- Uses relative path (`./sw.js`) for compatibility with subdirectory deployments

### Installation & Static Caching — sw.js (`install` event)

On first install, the Service Worker pre-caches all App Shell assets:

```javascript
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});
```

Cross-origin Google Fonts are cached separately using `mode: 'no-cors'` inside `Promise.allSettled()` so a font failure never crashes the install event.

### Fetch Interception — sw.js (`fetch` event)

Two caching strategies are applied depending on the resource type:

```
Request comes in
       │
       ├── Local asset or font?
       │        │
       │      YES ▼              NO ▼
       │   Cache-First       Network-First
       │        │                 │
       │   Cache hit?        Try network first
       │    YES ▼ NO ▼       Cache on success
       │   Return  Fetch     Falls back to cache
       │   cached  + cache   if offline
```

| Strategy | Applied to | Behaviour |
|---|---|---|
| **Cache-First** | Local files, fonts | Serves from cache instantly; fetches & caches on miss |
| **Network-First** | API / dynamic data | Always tries fresh data; falls back to cached version offline |

### Offline Fallback

If the user is fully offline and no cache exists, the SW returns a branded fallback page:

```
        ◈
    BIHUNTERS
  YOU ARE OFFLINE
Reconnect to browse lobbies
```

---

## 🌐 4. Third-Party API Integration

This app integrates **two real third-party APIs** as required by Evidence 3.

### API 1 — RestCountries

| Property | Value |
|---|---|
| **Base URL** | `https://restcountries.com/v3.1` |
| **Authentication** | None — completely free and open |
| **Rate Limit** | No documented limit (fair use applies) |
| **Cost** | $0.00 — free forever |
| **CORS** | Fully enabled — safe for direct browser calls |

**Endpoint used:**
```
GET /v3.1/all?fields=name,flags,region,subregion,population,capital,languages,timezones,cca2
```

Only required fields are requested via the `fields` parameter to minimise payload size and respect data minimisation principles.

**How it works in BiHunters:**
The **🌍 REGIONS** screen fetches all countries once on first visit. Users see a filterable grid of country cards with flag, name, region, capital, and a simulated server count. Clicking a card expands a detail panel showing population, languages, timezone, and lobby count. Region buttons filter by continent.

**Error handling:**
```javascript
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`RestCountries API ${res.status}`);
  const data = await res.json();
  // Validate & sanitise every field before rendering
  allCountries = data
    .filter(c => c && c.name && c.cca2 && c.region)
    .map(c => ({
      name: String(c.name.common || '').slice(0, 80),
      cca2: String(c.cca2 || '').slice(0, 2).toUpperCase(),
      // ...
    }));
} catch (err) {
  errorEl.textContent = `⚠ Could not load regions: ${err.message}`;
}
```

---

### API 2 — NewsAPI

| Property | Value |
|---|---|
| **Base URL** | `https://newsapi.org/v2` |
| **Authentication** | API Key — sent in `X-Api-Key` request header |
| **Rate Limit** | 100 requests/day (Developer free tier) |
| **Cost** | $0.00 Developer · $449/month Business (250k req/mo) |
| **CORS** | Localhost only on free tier; production requires proxy |
| **Register** | [newsapi.org/register](https://newsapi.org/register) |

**Endpoint used:**
```
GET /v2/everything?q={query}&language=en&sortBy=publishedAt&pageSize=20
```

**Authentication — key in header, never in URL:**
```javascript
const res = await fetch(url, {
  headers: { 'X-Api-Key': key },  // Header only — prevents exposure in server logs
  signal: AbortSignal.timeout(8000)
});
```

**How it works in BiHunters:**
The **📰 NEWS** screen shows a gaming/horror news feed. Users can type a search term or click topic pills (SURVIVAL HORROR, MULTIPLAYER, INDIE GAMES, UPDATES, ESPORTS). When no key is configured, the app shows curated demo articles with a setup prompt. The Settings screen lets users enter their own key.

**Error handling by HTTP status:**

| Status | Error | App Response |
|---|---|---|
| 401 | Invalid key | `"Invalid API key. Check your key at newsapi.org."` |
| 429 | Rate limit hit | `"Rate limit reached (100 req/day). Try again tomorrow."` |
| Timeout | Network slow | `"Request timed out. Check your connection."` |
| No key | Not configured | Demo mode with configuration instructions |
| 5xx | Server error | Falls back to demo articles |

---

### API Key Security

API keys are **never stored in source code or committed to the repository.**

```
js/
├── api.config.example.js   ← Placeholder values — committed to repo ✅
└── api.config.js           ← Real key — excluded by .gitignore ❌
```

```javascript
// js/api.config.js  (gitignored — never committed)
const API_CONFIG = {
  NEWS_API_KEY: 'your-real-key-here',
  RESTCOUNTRIES_BASE_URL: 'https://restcountries.com/v3.1',
  USE_NEWS_PROXY: false,
  NEWS_PROXY_URL: '',
};
```

The config file loads via a `<script>` tag with an `onerror` fallback so the app works even without it:

```html
<script src="./js/api.config.js"
  onerror="window.API_CONFIG={NEWS_API_KEY:'', ...}">
</script>
```

Keys entered by users in Settings are stored in `sessionStorage` only — cleared when the tab closes, never sent anywhere except the API itself.

---

### API Setup for Evaluators

**RestCountries — no setup needed.**
Open the live app and click **🌍 REGIONS**. Data loads automatically.

**NewsAPI — optional for live news results:**

1. Register free at [newsapi.org/register](https://newsapi.org/register)
2. Copy the config template:
   ```bash
   cp js/api.config.example.js js/api.config.js
   ```
3. Replace `YOUR_NEWSAPI_KEY_HERE` with your key in `api.config.js`
4. **Or** open the app → **SETTINGS → API Settings → NewsAPI Key** and paste your key

> The app fully works without a NewsAPI key — demo articles are shown with a yellow setup prompt.

---

## 📋 5. Manifest & Installability

### manifest.json

```json
{
  "id": "/index.html",
  "version": "1.0.0",
  "name": "BiHunters",
  "short_name": "BiHunters",
  "description": "Survive. Escape. Hunt.",
  "start_url": "./index.html",
  "display": "fullscreen",
  "display_override": ["window-controls-overlay", "fullscreen", "standalone"],
  "orientation": "landscape",
  "background_color": "#060709",
  "theme_color": "#c8a84b"
}
```

| Field | Purpose |
|---|---|
| `name` / `short_name` | App name shown on install prompt and home screen |
| `display: fullscreen` | Hides browser chrome when launched from home screen |
| `background_color` | Shown on the splash screen while the app loads |
| `theme_color` | Colors the browser toolbar and Android status bar |
| `icons` | Home screen icon, splash screen, and task switcher |
| `screenshots` | Enables rich install UI on Chrome desktop and Android |

### Icon Suite

| File | Size | Usage |
|---|---|---|
| `icons/icon-192.png` | 192×192 | Android home screen, PWA install prompt |
| `icons/icon-512.png` | 512×512 | Splash screen, high-DPI displays |
| `icons/favicon.ico` | 16/32/48 | Browser tab (all browsers) |
| `icons/favicon-32.png` | 32×32 | Modern browser tab (PNG) |
| `icons/favicon-16.png` | 16×16 | Small tab icon fallback |
| `icons/screenshot-wide.png` | 1280×800 | Desktop rich install screenshot |
| `icons/screenshot-mobile.png` | 390×844 | Mobile rich install screenshot |

---

## 🎨 6. Styling & Performance

### Responsive Design

The party grid adapts to any screen size using CSS Grid with `auto-fill`:

```css
.party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
```

On mobile (`< 640px`), cards reduce to `minmax(160px, 1fr)` and secondary nav buttons are hidden.

### Instant Shell Loading

1. Browser parses `index.html` → paints topbar, filter bar, and background **immediately**
2. CSS variables ensure consistent theming with **zero layout shift**
3. Google Fonts load asynchronously — system fonts declared as fallbacks
4. Party cards and API data injected by JS **after** the shell is already visible

---

## 🚀 7. How to Run Locally

```bash
# Option 1: Python (no install needed)
python -m http.server 8000
# → Open http://localhost:8000

# Option 2: VS Code Live Server
# Right-click index.html → Open with Live Server
# → Opens at http://127.0.0.1:5500
```

> ⚠️ **Must be served over `http://` — Service Workers do not work on `file://` protocol.**

### Verify the PWA is working

1. DevTools → **Application → Service Workers** → `sw.js` shows *activated and running* ✅
2. **Cache Storage** → `bihunters-v1` → all shell files listed ✅
3. **Manifest** → icons, theme color, and installability confirmed ✅
4. Tick **Offline** → reload → app still loads from cache ✅
5. Navigate to **🌍 REGIONS** → country cards load from RestCountries API ✅
6. Navigate to **📰 NEWS** → demo articles shown (live with key configured) ✅

---

## ☁️ 8. Deployment to Vercel

The app is deployed and publicly accessible at **[bihunters.vercel.app](https://bihunters.vercel.app)**.

### Step-by-step deployment

**Prerequisites:** A [Vercel account](https://vercel.com) (free) and the project in a public GitHub repo.

**1. Push your project to GitHub**
```bash
git init
git add .
git commit -m "BiHunters PWA — Evidence 3"
git remote add origin https://github.com/your-username/bihunters.git
git push -u origin main
```

**2. Import on Vercel**
- Go to [vercel.com/new](https://vercel.com/new)
- Click **"Import Git Repository"** and select your `bihunters` repo
- Vercel auto-detects it as a static site — no build settings needed
- Click **Deploy** → your app is live in ~30 seconds

**3. Verify**
- Open the Vercel URL in Chrome
- DevTools → Application → check Manifest and Service Worker load correctly
- Click **🌍 REGIONS** — RestCountries data loads live ✅

### NewsAPI on Vercel (production proxy)

NewsAPI free tier blocks browser requests from non-localhost origins. For a fully live deployment, create a Vercel serverless function to proxy requests server-side:

**Create `api/news.js` in your project:**
```javascript
// api/news.js — Vercel serverless function
export default async function handler(req, res) {
  const { q } = req.query;
  const safe = (q || '').replace(/[^a-zA-Z0-9 \-+'"]/g, '').slice(0, 100);
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(safe)}&language=en&pageSize=20`,
    { headers: { 'X-Api-Key': process.env.NEWS_API_KEY } }
  );
  const data = await response.json();
  res.status(200).json(data);
}
```

**Add environment variable in Vercel dashboard:**
- Project → **Settings → Environment Variables → Add New**
- Name: `NEWS_API_KEY` · Value: your NewsAPI key
- Scope: Production (+ Preview if needed)

**Update `js/api.config.js`:**
```javascript
USE_NEWS_PROXY: true,
NEWS_PROXY_URL: '/api/news',
```

### Updating the app after deployment

Every `git push` to `main` triggers an automatic redeploy. When making changes:

1. Bump `"version"` in `manifest.json`
2. Change `CACHE_NAME` in `sw.js` (e.g. `bihunters-v1` → `bihunters-v2`) so users receive fresh assets
3. Commit and push — Vercel redeploys automatically within ~30 seconds

---

## 🔒 9. Security Implementation

| Measure | Implementation |
|---|---|
| API key storage | `api.config.js` is gitignored — key never enters version control |
| Key in requests | Sent in `X-Api-Key` header only — never in URL query string |
| User-entered keys | Stored in `sessionStorage` — cleared on tab close, never persisted |
| Input validation | Search queries sanitised: only safe chars, max 100 characters |
| Response validation | All API string fields trimmed and type-cast before rendering |
| XSS prevention | Strings truncated before `innerHTML` insertion; links use `rel="noopener noreferrer"` |
| Request timeouts | `AbortSignal.timeout(8000/10000)` on every `fetch()` call |
| Error messages | Errors logged to `console.error` only — never exposed raw in the UI |
| Data minimisation | RestCountries: `?fields=` requests only needed fields |
| No PII to APIs | Queries contain only game-related terms — no user data transmitted |

---
