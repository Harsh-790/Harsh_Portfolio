'use client';

import { useEffect, useState } from 'react';
import { THEME_MODES, type ThemeMode } from '@/lib/schemas';

export const THEME_STORAGE_KEY = 'portfolio-theme';
const LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', color: 'Colour' };

function Dot({ mode }: { mode: ThemeMode }) {
  if (mode === 'dark') return <span className="h-3 w-3 rounded-full bg-current" />;
  if (mode === 'color') return <span className="h-3 w-3 rounded-full bg-accent ring-1 ring-line2" />;
  return <span className="h-3 w-3 rounded-full border border-current" />;
}

/**
 * Light / Dark / Colour switcher.
 * The choice is written to localStorage; the inline script in the root layout
 * applies it before paint so there is no flash on reload.
 */
export default function ThemeSwitcher({
  variant = 'dots',
  className = '',
}: {
  variant?: 'dots' | 'full';
  className?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemeMode | undefined;
    if (current && THEME_MODES.includes(current)) setMode(current);
  }, []);

  const apply = (next: ThemeMode) => {
    setMode(next);
    const root = document.documentElement;
    root.classList.add('theme-anim');
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode — the theme simply will not persist */
    }
    window.setTimeout(() => root.classList.remove('theme-anim'), 460);
  };

  if (variant === 'full') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="radiogroup" aria-label="Colour theme">
        {THEME_MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => apply(m)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] transition-colors ${
              mode === m ? 'border-fg text-fg' : 'border-line text-muted hover:border-line2 hover:text-fg'
            }`}
          >
            <Dot mode={m} />
            {LABELS[m]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-line p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {THEME_MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          aria-label={`${LABELS[m]} mode`}
          title={`${LABELS[m]} mode`}
          onClick={() => apply(m)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            mode === m ? 'bg-bg2 text-fg' : 'text-muted hover:text-fg'
          }`}
        >
          <Dot mode={m} />
        </button>
      ))}
    </div>
  );
}
