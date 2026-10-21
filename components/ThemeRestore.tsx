'use client';

import { useEffect } from 'react';
import { THEME_MODES, type ThemeMode } from '@/lib/schemas';
import { THEME_STORAGE_KEY } from './ThemeSwitcher';

/**
 * Re-applies the visitor's stored theme after hydration.
 *
 * The inline script in the root layout already covers the first paint, but Next
 * renders a bare `<html>` shell when a page throws `notFound()`, so the
 * attribute has to be restored once React has taken over.
 */
export default function ThemeRestore() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const root = document.documentElement;
      if (stored && THEME_MODES.includes(stored as ThemeMode) && root.dataset.theme !== stored) {
        root.dataset.theme = stored;
      }
    } catch {
      /* private mode — keep whatever the server rendered */
    }
  }, []);

  return null;
}
