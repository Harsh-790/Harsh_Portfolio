'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Wraps the page body: re-mounts on navigation so every route fades in,
 * resets scroll to the top, and turns in-page anchor clicks into smooth scrolls
 * (without making route changes scroll smoothly, which looks sluggish).
 */
export default function PageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute('href')?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <main id="main" key={pathname} className="page-in">
      {children}
    </main>
  );
}
