import { useCallback, useEffect, useState } from 'react';

/*
 * Theme state.
 *
 * The FIRST application happens in the inline script in public/index.html, not
 * here — that runs before first paint and prevents the flash. This module owns
 * everything after boot: reading the current value and changing it.
 *
 * Three states:
 *   'dark'   -> data-theme="dark"    (explicit)
 *   'light'  -> data-theme="light"   (explicit)
 *   'system' -> attribute removed; tokens.css falls back to :root (dark) and
 *               its prefers-color-scheme:light query flips it when the OS asks
 */

const STORAGE_KEY = 'restock-theme';
export const THEMES = ['light', 'dark', 'system'];

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  // Keep the browser chrome (mobile address bar, PWA titlebar) in sync.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = resolveTheme(theme) === 'light' ? '#F7F7F8' : '#09090B';
  }
}

/** What the user actually sees, after resolving 'system'. */
export function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(readStored);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
    apply(next);
  }, []);

  // While on 'system', follow the OS if it changes mid-session.
  useEffect(() => {
    if (theme !== 'system') return undefined;
    let mq;
    try {
      mq = window.matchMedia('(prefers-color-scheme: light)');
    } catch {
      return undefined;
    }
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return { theme, resolvedTheme: resolveTheme(theme), setTheme };
}
