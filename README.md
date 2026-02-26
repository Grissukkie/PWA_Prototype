# BiHunters — App Shell Progressive Web Application

> A multiplayer survival-horror lobby browser built as a PWA using the App Shell architecture.

---

## 📁 Project Structure

```
PWA_PR/
│
├── css/
│   └── styles.css          ← Shell styles — renders instantly before content
│
├── icons/
│   ├── favicon-16.png      ← Small browser tab icon
│   ├── favicon-32.png      ← High-res browser tab icon
│   ├── favicon.ico         ← Classic browser icon (16, 32, 48px)
│   ├── icon-192.png        ← PWA icon — Android home screen / install
│   └── icon-512.png        ← PWA icon — splash screen / high-DPI
│
├── js/
│   └── app.js              ← Service Worker registration + install prompt
│
├── sw.js                   ← Service Worker (must be in root for full scope)
│
├── index.html              ← App Shell entry point (header, main, footer)
├── manifest.json           ← PWA metadata, icons, theme colors
└── README.md               ← This file
```

---

## 🧠 1. Research & Planning

### What is the App Shell Architecture?

The **App Shell** is a design pattern for Progressive Web Apps that separates the application's **skeleton UI** (shell) from its **dynamic content**. The shell — header, navigation, layout containers — is cached on the first visit and served instantly on every subsequent load, even offline. Content is then loaded dynamically into the shell.

```
┌─────────────────────────────────────┐
│           APP SHELL (cached)        │
│  ┌─────────────────────────────┐    │
│  │  Header / Nav / Topbar      │    │
│  ├─────────────────────────────┤    │
│  │                             │    │
│  │   Dynamic Content Area      │    │  ← Party cards injected by JS
│  │   (party grid, modals)      │    │
│  │                             │    │
│  ├─────────────────────────────┤    │
│  │  Footer / Filter Bar        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
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

### Task Distribution

| Role | Responsibility | Files |
|---|---|---|
| HTML/CSS | Shell structure, responsive layout | `index.html`, `css/styles.css` |
| Service Worker | Caching strategies, offline fallback | `sw.js` |
| Manifest / Metadata | PWA installability, icons, branding | `manifest.json`, `icons/` |

---

## 🏗️ 2. Core Architecture & Setup

### index.html — The App Shell

`index.html` is the **entry point** and defines the complete App Shell. It contains:

- **Header** (`<header class="topbar">`) — logo, navigation buttons, live online counter
- **Filter Bar** — search input and status filter pills (WAITING / IN-GAME / FULL)
- **Main Content Area** (`<main class="party-grid-wrapper">`) — where party cards are injected dynamically by JavaScript
- **Modal Overlay** — pre-rendered in HTML, populated dynamically on card click
- Correct links to `css/styles.css` and `js/app.js`

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

The CSS renders the **complete shell skeleton** before any JavaScript executes or any API data arrives, ensuring instant perceived load times on all devices.

---

## ⚙️ 3. Service Worker & Caching

### Registration — js/app.js

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('[PWA] Service Worker registered:', reg.scope);
  });
}
```

- Checks for **browser support** before attempting registration
- Registers on the `load` event to avoid blocking the initial page render
- Logs registration confirmation to the console

### Installation & Static Caching — js/sw.js (`install` event)

On first install, the Service Worker pre-caches all App Shell assets:

```javascript
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
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

### Fetch Interception — js/sw.js (`fetch` event)

Two caching strategies are applied depending on the resource type:

```
Request comes in
       │
       ├── Local asset or font?
       │        │
       │      YES ▼           NO ▼
       │   Cache-First     Network-First
       │        │                │
       │   Cache hit?      Try network first
       │    YES ▼ NO ▼      Cache on success
       │   Return  Fetch    Falls back to cache
       │   cached  + cache  if offline
```

| Strategy | Applied to | Behaviour |
|---|---|---|
| **Cache-First** | Local files, fonts | Serves from cache instantly; fetches & caches on miss |
| **Network-First** | API / dynamic data | Always tries fresh data; falls back to cached version offline |

### Dynamic Caching

Dynamic content (party listings) is cached automatically by the Network-First strategy. Any successful API response is stored in the Cache API, making it available offline:

1. User visits online → party data fetched and cached automatically
2. User goes offline → Service Worker returns last known party data from cache

### Offline Fallback

If the user is fully offline and no cache exists, the SW returns a branded fallback page:

```
        ◈
    BIHUNTERS
  YOU ARE OFFLINE
Reconnect to browse lobbies
```

---

## 📋 4. Manifest & Installability

### manifest.json

```json
{
  "name": "BiHunters",
  "short_name": "BiHunters",
  "description": "Survive. Escape. Hunt.",
  "start_url": "/index.html",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#060709",
  "theme_color": "#0a0c10",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

| Field | Purpose |
|---|---|
| `name` / `short_name` | App name shown on install prompt and home screen |
| `display: fullscreen` | Hides browser chrome when launched from home screen |
| `background_color` | Shown on the splash screen while the app loads |
| `theme_color` | Colors the browser toolbar and Android status bar |
| `icons` | Home screen icon, splash screen, and task switcher |

### Icon Suite

| File | Size | Usage |
|---|---|---|
| `icons/icon-192.png` | 192×192 | Android home screen, PWA install prompt |
| `icons/icon-512.png` | 512×512 | Splash screen, high-DPI displays |
| `icons/favicon.ico` | 16/32/48 | Browser tab (all browsers) |
| `icons/favicon-32.png` | 32×32 | Modern browser tab (PNG) |
| `icons/favicon-16.png` | 16×16 | Small tab icon fallback |

---

## 🎨 5. Styling & Performance

### Responsive Design

The party grid adapts to any screen size using CSS Grid with `auto-fill`:

```css
.party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
```

On mobile (`< 640px`), cards reduce to `minmax(160px, 1fr)` and secondary nav buttons are hidden to maximise usable space.

### Instant Shell Loading

The App Shell renders before any JavaScript or API data is needed:

1. Browser parses `index.html` → paints topbar, filter bar, and background **immediately**
2. CSS variables ensure consistent theming with **zero layout shift**
3. Google Fonts load asynchronously — system fonts are declared as fallbacks so text is always readable
4. Party cards are injected by JS **after** the shell is already visible to the user

---

## 🚀 How to Run Locally

```bash
# Option 1: Python (no install needed)
python -m http.server 8000
# → Open http://localhost:8000

# Option 2: VS Code Live Server extension
# Right-click index.html → Open with Live Server
# → Opens at http://127.0.0.1:5500
```

> ⚠️ **Must be served over `http://` — Service Workers do not work on `file://` protocol.**

### Verify the PWA is working

1. DevTools → **Application** → **Service Workers** → `sw.js` shows *activated and running* ✅
2. **Cache Storage** → `bihunters-v1` → all shell files listed ✅
3. **Manifest** → icons, theme color, and installability confirmed ✅
4. Tick **Offline** → reload → app still loads from cache ✅

---

## ✅ Assignment Checklist

| Requirement | Status |
|---|---|
| App Shell architecture (static shell + dynamic content) | ✅ |
| `index.html` with header, main content area, footer | ✅ |
| Service Worker registered with browser support check | ✅ |
| Install event — pre-caches App Shell assets | ✅ |
| Fetch event — Cache-First + Network-First strategies | ✅ |
| Dynamic content caching for offline use | ✅ |
| Offline fallback page | ✅ |
| `manifest.json` with name, short_name, theme_color, background_color | ✅ |
| Icons at 192×192 and 512×512 | ✅ |
| Favicon suite (16px, 32px, .ico) | ✅ |
| Responsive design (mobile + desktop) | ✅ |
| Instant shell render before content loads | ✅ |
| CSS and JS correctly linked in HTML | ✅ |
| Correct folder structure (css/, icons/, js/, sw.js in root) | ✅ |
| Push notification handler | ✅ |
| Background sync handler | ✅ |