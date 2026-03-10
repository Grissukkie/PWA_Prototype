# BiHunters — App Shell PWA

> A multiplayer survival-horror lobby browser built as a PWA using the App Shell architecture, integrated with real third-party APIs.

**Weight:** 35% of Unit 2 &nbsp;|&nbsp; **Type:** Hetero-Evaluation &nbsp;|&nbsp; **Deployed:** [bihunters.vercel.app](https://bihunters.vercel.app)

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
├── sw.js                         ← Service Worker (root scope — required)
├── server.js                     ← Node.js SSR server (CSR vs SSR demo)
├── index.html                    ← App Shell entry point + all screens (CSR)
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
| **Splash screen** | **Static / Shell** | Rendered immediately from inline CSS/HTML |
| Party cards grid | **Dynamic / Content** | Loaded from server/API at runtime |
| Player count & status | **Dynamic / Content** | Changes in real time |
| Modal detail panel | **Dynamic / Content** | Populated on user click |
| Server Regions grid | **Dynamic / API** | Fetched live from RestCountries API |
| Intel Feed articles | **Dynamic / API** | Fetched live from NewsAPI |

### Task Distribution

| Role | Responsibility | Files |
|---|---|---|
| HTML/CSS | Shell structure, responsive layout, API screens, splash screen | `index.html`, `css/styles.css` |
| Service Worker | Caching strategies, offline fallback | `sw.js` |
| Manifest / Metadata | PWA installability, icons, branding | `manifest.json`, `icons/` |
| API Integration | RestCountries + NewsAPI consumption | `index.html`, `js/api.config.js` |
| SSR Demo | Node.js server-side rendering comparison | `server.js` |

---

## 🏗️ 2. Core Architecture & Setup

### index.html — The App Shell (CSR mode)

`index.html` is the **entry point** and defines the complete App Shell. It contains:

- **Splash screen** — animated launch screen with progress bar, shown before the app is ready
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

## 🌅 3. Splash Screen

BiHunters displays a **full-screen animated splash screen** on every app launch. It is built entirely with inline HTML and CSS — no external dependencies — so it renders even before fonts finish loading.

### What it shows

```
        ◈
   BIHUNTERS
SURVIVE · ESCAPE · HUNT
━━━━━━━━━━━━━━━━━ (loading bar)
      v1.0 · PWA
```

### Implementation

The splash screen is a `<div id="splash-screen">` placed at the very top of `<body>`, with `position: fixed; z-index: 9999` so it covers the entire viewport. It includes:

- **Animated icon** — the `◈` symbol pulses with a CSS keyframe animation
- **Logo text** — `BiHunters` rendered in Bebas Neue (or fallback sans-serif) at a large size
- **Progress bar** — a CSS animation fills the bar over 1.8 seconds to imply loading progress
- **Fog effect** — two drifting gradient layers match the main app's atmospheric background

### Dismissal logic

```javascript
function dismissSplash() {
  const splash = document.getElementById('splash-screen');
  splash.classList.add('hidden');           // triggers CSS opacity + visibility transition
  splash.addEventListener('transitionend',
    () => splash.remove(), { once: true }); // removes from DOM after fade
}

// Always show for at least 1 900 ms so the loading bar completes
const SPLASH_MIN_MS = 1900;
window.addEventListener('load', () => {
  const elapsed   = performance.now() - splashStart;
  const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(dismissSplash, remaining);
}, { once: true });
```

The splash waits for the `window load` event (fonts, scripts, images all ready) and enforces a minimum display time so the animation completes before the main content is revealed.

### Mobile icon (apple-touch-icon)

```html
<link rel="apple-touch-icon" href="./icons/icon-192.png" />
```

This tag specifies the icon used for the splash screen on iOS when the app is added to the home screen. The 192×192 PNG is used both here and in `manifest.json`.

---

## ⚙️ 4. Service Worker & Caching

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

### Fetch Interception — sw.js (`fetch` event)

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

## 🌐 5. Third-Party API Integration

This app integrates **two real third-party APIs**.

### API 1 — RestCountries

| Property | Value |
|---|---|
| **Base URL** | `https://restcountries.com/v3.1` |
| **Authentication** | None — completely free and open |
| **Rate Limit** | No documented limit (fair use applies) |
| **Cost** | $0.00 — free forever |

**Endpoint:** `GET /v3.1/all?fields=name,flags,region,subregion,population,capital,languages,timezones,cca2`

The **🌍 REGIONS** screen fetches all countries on first visit. Users see a filterable grid with flags, names, and simulated server counts. Clicking a card expands population, languages, timezone, and lobby detail.

### API 2 — NewsAPI

| Property | Value |
|---|---|
| **Base URL** | `https://newsapi.org/v2` |
| **Authentication** | API Key — sent in `X-Api-Key` request header |
| **Rate Limit** | 100 requests/day (Developer free tier) |
| **Cost** | $0.00 Developer · $449/month Business |

The **📰 NEWS** screen shows a gaming/horror news feed with search and topic pill filters. Demo mode works without a key.

### API Key Security

Keys are never committed to the repository. `js/api.config.js` is gitignored. Users can also enter their own NewsAPI key in **SETTINGS → API Settings** — it is stored in `sessionStorage` only.

---

## 🖥️ 6. CSR vs SSR

BiHunters implements **both** rendering approaches for comparison.

### Client-Side Rendering (CSR) — `index.html`

The browser receives a minimal HTML shell. All party cards are generated and injected by JavaScript after the page loads.

```
Browser ← empty HTML shell
Browser: download JS
Browser: run generateParties()
Browser: inject cards into DOM  ← user sees content here
```

**Characteristics:**
- Blank page until JavaScript executes
- After first load: instant navigation, Service Worker caching
- Best for PWA offline experience — shell is cached and served instantly on repeat visits
- Lower server load — no per-request rendering needed

### Server-Side Rendering (SSR) — `server.js`

Node.js generates the complete HTML page with all party cards already present before sending it to the browser.

```
Node.js: run generateParties()
Node.js: render cards to HTML strings
Browser ← complete HTML with cards  ← user sees content immediately
Browser: download JS (hydration only)
```

**Characteristics:**
- Content visible immediately, even before JS loads
- Better Time to First Contentful Paint (FCP)
- Search engines can index the full content
- Requires a running server — cannot be served as a static file
- Each page load triggers a new server render

### Performance comparison

| Metric | CSR (index.html) | SSR (server.js) |
|---|---|---|
| HTML received | Very fast (small shell) | Slightly slower (larger full page) |
| First paint | Fast (shell renders) | Fast (content in HTML) |
| **Content visible** | **After JS executes** | **Immediately** |
| Repeat visits | Instant (Service Worker) | Normal (server render each time) |
| SEO | Limited | Full |
| Offline support | Full (Service Worker) | None (requires server) |
| Server load | Low (static hosting) | High (renders per request) |

### Which is better?

Neither is universally better — the right choice depends on the use case:

- **Use CSR** when offline support is critical, on static hosts (Vercel, GitHub Pages), or for highly interactive apps with repeat users who benefit from caching.
- **Use SSR** when first-visit performance matters most, for content that needs to be indexed by search engines, or when serving users on slow connections who cannot wait for JavaScript.

BiHunters uses **CSR for the production PWA** (best offline and PWA behaviour) and **SSR as a demonstration** to compare the two approaches directly.

---

## 📋 7. Manifest & Installability

```json
{
  "name": "BiHunters",
  "short_name": "BiHunters",
  "description": "Survive. Escape. Hunt.",
  "start_url": "./index.html",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#060709",
  "theme_color": "#c8a84b"
}
```

| Field | Purpose |
|---|---|
| `name` / `short_name` | App name on install prompt and home screen |
| `display: fullscreen` | Hides browser chrome when launched from home screen |
| `background_color` | Shown on the splash screen while the app loads |
| `theme_color` | Colours the browser toolbar / Android status bar |
| `screenshots` | Enables rich install UI on Chrome desktop and Android |

---

## 🚀 8. How to Run Locally

### CSR mode (index.html — recommended for PWA testing)

```bash
# Option 1: Python
python -m http.server 8000
# Open http://localhost:8000

# Option 2: VS Code Live Server
# Right-click index.html → Open with Live Server
```

> ⚠️ **Must be served over `http://` — Service Workers do not work on `file://` protocol.**

### SSR mode (server.js — Node.js required)

```bash
node server.js
# Open http://localhost:3000
```

Available routes:
- `http://localhost:3000/` — SSR lobby page (party cards pre-rendered by Node.js)
- `http://localhost:3000/api/parties` — Raw JSON data
- `http://localhost:3000/csr-vs-ssr` — Interactive CSR vs SSR comparison page

### Verify the PWA is working

1. DevTools → **Application → Service Workers** → `sw.js` shows *activated and running* ✅
2. **Cache Storage** → `bihunters-v1` → all shell files listed ✅
3. **Manifest** → icons, theme color, installability confirmed ✅
4. Tick **Offline** → reload → app loads from cache + splash screen shows ✅
5. Navigate to **🌍 REGIONS** → RestCountries data loads live ✅
6. Navigate to **📰 NEWS** → demo articles or live results shown ✅

---

## ☁️ 9. Deployment to Vercel

The app is deployed at **[bihunters.vercel.app](https://bihunters.vercel.app)**.

### Deploy steps

```bash
git init
git add .
git commit -m "BiHunters PWA"
git remote add origin https://github.com/your-username/bihunters.git
git push -u origin main
```

Then on [vercel.com/new](https://vercel.com/new): import the repository → Vercel auto-detects it as a static site → Deploy.

> **Note:** Vercel serves the CSR `index.html` version. `server.js` can be run locally or deployed as a Vercel serverless function if SSR is needed in production.

### Updating the deployment

1. Bump `"version"` in `manifest.json`
2. Change `CACHE_NAME` in `sw.js` (e.g. `bihunters-v2`) so users receive fresh assets
3. `git push` → Vercel redeploys automatically in ~30 seconds

---

## 🔒 10. Security Implementation

| Measure | Implementation |
|---|---|
| API key storage | `api.config.js` is gitignored — key never enters version control |
| Key in requests | Sent in `X-Api-Key` header only — never in URL query string |
| User-entered keys | Stored in `sessionStorage` — cleared on tab close |
| Input validation | Queries sanitised: only safe chars, max 100 characters |
| Response validation | All API response fields trimmed and type-cast before rendering |
| XSS prevention | Strings truncated before `innerHTML`; links use `rel="noopener noreferrer"` |
| Request timeouts | `AbortSignal.timeout(8000/10000)` on every `fetch()` call |
| Error messages | Errors logged to `console.error` only — never exposed raw in UI |

---

## 🧩 11. Challenges & Solutions

| Challenge | Solution |
|---|---|
| Splash screen font loads asynchronously — text flashes unstyled briefly | Used font stack fallbacks (`'Arial Narrow', sans-serif`) so splash renders with a near-identical font even before Bebas Neue loads |
| Service Worker absolute paths broke on Vercel subdirectory deployments | Changed all SW paths to relative (`./index.html`) to work on any base URL |
| NewsAPI blocks CORS requests from non-localhost origins (free tier) | Implemented demo fallback mode + Settings key entry; proxy pattern documented for production |
| SSR party data and CSR hydration could produce different card orders | Used a seeded pseudo-random generator in `server.js` so card order is deterministic and consistent across server renders |
| Splash dismissed before animation completed on very fast connections | Enforced minimum display time (`SPLASH_MIN_MS = 1900`) using `performance.now()` to ensure loading bar always completes |

---

## 📦 Deliverables Summary

| File | Description |
|---|---|
| `index.html` | CSR App Shell — full PWA with splash screen and API integration |
| `server.js` | SSR Node.js server — pre-renders party cards server-side |
| `sw.js` | Service Worker — offline caching, push notifications, background sync |
| `manifest.json` | PWA manifest — icons, theme, installability |
| `js/app.js` | SW registration + install prompt |
| `js/api.config.js` | API config template (safe to commit) |
| `css/styles.css` | Shell styles |
| `README.md` | This document |
| **Live app** | [bihunters.vercel.app](https://bihunters.vercel.app) |
| **Repository** | https://github.com/Grissukkie/PWA_Prototype (public) |