/**
 * The light/dark choice lives in `localStorage.theme` and is applied to `<html class="dark">`
 * — first by the FOUC script in `app/layout.tsx`, then by the React tree. Exposed as an
 * external store so components read it with `useSyncExternalStore` instead of copying it into
 * state inside an effect (which renders twice and trips `react-hooks/set-state-in-effect`).
 */

export type Theme = 'dark' | 'light';

const KEY = 'theme';
const listeners = new Set<() => void>();

/** Dark is the default: anything other than an explicit 'light' means dark. */
export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Server render and first client render: the stored choice is only knowable in the browser,
 * so callers get `null` and decide what to draw until hydration finishes.
 */
export function getServerTheme(): null {
  return null;
}

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  // `storage` covers the *other* tabs; it never fires in the tab that wrote the key, which is
  // why setTheme() notifies this tab's listeners itself.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function setTheme(next: Theme) {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode / storage disabled: the class below still applies for this page view.
  }
  document.documentElement.classList.toggle('dark', next === 'dark');
  for (const notify of listeners) notify();
}
