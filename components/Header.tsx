'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { NAV_ITEMS, isActivePath } from '@/lib/nav';

export default function Header({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  /* reading-progress hairline + condensed header after the fold */
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* close the menu on navigation and lock the page behind it */
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:font-mono focus:text-[10px] focus:tracking-widest focus:text-bg focus:uppercase"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-50 border-b border-line transition-colors duration-300 ${
          scrolled ? 'bg-bg/88 backdrop-blur-md' : 'bg-bg'
        }`}
      >
        <div className="shell flex h-[60px] items-center justify-between gap-4 md:h-[68px] md:gap-8">
          {/* brand */}
          <Link href="/" className="flex shrink-0 items-baseline gap-2.5" aria-label={`${name} — home`}>
            <span className="display text-[15px] tracking-[0.01em] md:text-[17px]">
              {name}
              <span className="ml-0.5 align-super text-[7px] tracking-normal">®</span>
            </span>
            <span className="label hidden sm:inline">{role}</span>
          </Link>

          {/* desktop navigation */}
          <nav aria-label="Main" className="hidden lg:flex lg:items-center lg:gap-5 xl:gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-active={isActivePath(pathname, item.href)}
                aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* utilities */}
          <div className="flex shrink-0 items-center gap-2.5">
            <ThemeSwitcher className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-line2 lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* scroll progress */}
        <div
          aria-hidden
          className="absolute -bottom-px left-0 h-px w-full origin-left bg-fg"
          style={{ transform: `scaleX(${progress})`, opacity: progress > 0.005 ? 0.65 : 0 }}
        />
      </header>

      {/* mobile menu */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-default bg-bg"
            onClick={() => setOpen(false)}
          />
          <div className="page-in relative flex h-full flex-col">
            <div className="shell flex h-[60px] shrink-0 items-center justify-between border-b border-line">
              <span className="display text-[15px]">
                {name}
                <span className="ml-0.5 align-super text-[7px]">®</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <nav aria-label="Mobile" className="shell flex-1 overflow-y-auto py-6">
              <ul>
                {NAV_ITEMS.map((item, i) => (
                  <li key={item.href} className="border-b border-line last:border-b-0">
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-4 py-4"
                      aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="label w-6">{String(i + 1).padStart(2, '0')}</span>
                        <span
                          className={`display text-[26px] ${
                            isActivePath(pathname, item.href) ? 'text-fg' : 'text-muted'
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <p className="label mb-3">Theme</p>
                <ThemeSwitcher variant="full" />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
