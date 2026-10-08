// Admin theme controller.
//
// The resolved theme lives on <html data-theme>, so every rule in admin.css follows it with no
// re-render, and the vendored editor follows it too (its colours are token-driven, so switching
// never needs the editor to be re-created).
//
// The choice is persisted under 'sb-theme' in localStorage and re-applied before first paint by
// the inline script in index.html, which is what makes it survive a reload AND a new sign-in
// (the vault lock/unlock cycle does not touch localStorage).

const KEY = 'sb-theme';
const DEFAULT = 'light';

export function get() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' || stored === 'persian' ? stored : DEFAULT;
  } catch {
    return DEFAULT; // storage unavailable (private mode, blocked cookies)
  }
}

export function set(theme) {
  const next = theme === 'dark' ? 'dark' : theme === 'persian' ? 'persian' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent('sb:theme', { detail: next }));
  return next;
}

export function toggle() {
  return set(get() === 'dark' ? 'light' : 'dark');
}