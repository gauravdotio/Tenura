// Apply the saved theme before first paint to avoid a flash (kept out of index.html so the CSP can forbid inline scripts)
try {
  var t = localStorage.getItem('tenura:theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch {}
