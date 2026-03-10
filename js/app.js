/* ================================
   BiHunters — app.js
   PWA Registration & Install Prompt
   ================================ */

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // './sw.js' is relative to index.html — works on Live Server and Vercel
      const reg = await navigator.serviceWorker.register('./sw.js');
      console.log('[PWA] Service Worker registered:', reg.scope);

      // Notify when a new SW version is waiting
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available. Reload to update.');
            // Optionally show an in-game "UPDATE AVAILABLE" toast here
          }
        });
      });

    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  });
}

// --- Install Prompt (Add to Home Screen) ---
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;

  // Show a custom install button if you have one in the UI
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  console.log('[PWA] App installed successfully.');
});

// Call this function from a button click to trigger the install dialog
window.triggerInstall = async function () {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] Install outcome:', outcome);
  deferredPrompt = null;
};