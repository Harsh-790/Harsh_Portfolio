import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="shell flex h-[60px] items-center justify-between md:h-[68px]">
          <Link href="/" className="display text-[15px] md:text-[17px]">
            Portfolio<span className="ml-0.5 align-super text-[7px]">®</span>
          </Link>
          <Link href="/" className="link-arrow">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Home
          </Link>
        </div>
      </header>

      <main id="main" className="shell flex flex-1 flex-col justify-center py-20">
        <span className="label">Error / 404</span>
        <p className="display mt-8 text-[clamp(4rem,18vw,12rem)] leading-[0.85]">404</p>
        <h1 className="display type-3 mt-6 max-w-[24ch]">This page is not in the dataset</h1>
        <p className="body mt-5 max-w-[46ch]">
          The link may be outdated, or the page was unpublished from the admin panel. Everything below should still
          resolve.
        </p>

        <nav aria-label="Recovery" className="mt-10 flex flex-wrap gap-2.5">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="btn btn-sm">
              {item.label}
            </Link>
          ))}
        </nav>
      </main>

      <footer className="border-t border-line">
        <div className="shell py-5">
          <p className="label">End of the line — nothing here</p>
        </div>
      </footer>
    </div>
  );
}
