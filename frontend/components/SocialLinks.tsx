import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PlatformIcon, hasPlatformIcon } from './BrandIcons';
import type { SocialLink } from '@/lib/types';

/** Fallback codes for platforms without a dedicated icon. */
const CODES: Record<string, string> = {
  github: 'GH',
  linkedin: 'IN',
  x: 'X',
  twitter: 'X',
  instagram: 'IG',
  youtube: 'YT',
  kaggle: 'KG',
  email: '@',
  website: 'WWW',
  medium: 'MD',
  dribbble: 'DR',
};

export function socialCode(platform: string): string {
  return CODES[platform?.toLowerCase()] ?? platform.slice(0, 2).toUpperCase();
}

export function socialHref(link: Pick<SocialLink, 'platform' | 'url'>): string {
  const url = link.url.trim();
  if (link.platform === 'email' && !url.startsWith('mailto:')) return `mailto:${url.replace(/^\/+/, '')}`;
  return url;
}

/** Compact square badges — used in the header and the mobile menu. */
export function SocialBadges({
  links,
  className = '',
  size = 'md',
}: {
  links: SocialLink[];
  className?: string;
  size?: 'sm' | 'md';
}) {
  if (!links.length) return null;
  const box = size === 'sm' ? 'h-7 min-w-7 px-1.5 text-[9px]' : 'h-8 min-w-8 px-2 text-[10px]';
  const iconBox = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {links.map((link) => {
        const hasIcon = hasPlatformIcon(link.platform);
        return (
          <a
            key={link.id}
            href={socialHref(link)}
            target={link.platform === 'email' ? undefined : '_blank'}
            rel="noreferrer noopener"
            aria-label={link.label || link.platform}
            title={link.label || link.platform}
            className={`inline-flex items-center justify-center rounded-lg border border-line font-mono tracking-wider text-muted transition-colors hover:border-line2 hover:text-fg ${
              hasIcon ? iconBox : box
            }`}
          >
            <PlatformIcon
              platform={link.platform}
              className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
              fallback={socialCode(link.platform)}
            />
          </a>
        );
      })}
    </div>
  );
}

/** Full-width editorial list used on /contact and in the footer. */
export function SocialList({ links, className = '' }: { links: SocialLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <ul className={`rows ${className}`}>
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={socialHref(link)}
            target={link.platform === 'email' ? undefined : '_blank'}
            rel="noreferrer noopener"
            className="group flex items-center justify-between gap-4 py-3.5"
          >
            <span className="flex items-center gap-3">
              <span className="flex w-5 shrink-0 items-center text-muted">
                <PlatformIcon
                  platform={link.platform}
                  className="h-4 w-4"
                  fallback={<span className="label">{socialCode(link.platform)}</span>}
                />
              </span>
              <span className="text-[14px] text-fg transition-colors group-hover:text-fg">
                {link.label || link.platform}
              </span>
            </span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
              aria-hidden
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** "GITHUB ↗  LINKEDIN ↗" inline row, for tight editorial footers. */
export function SocialInline({ links, className = '' }: { links: SocialLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {links.map((link) => (
        <a
          key={link.id}
          href={socialHref(link)}
          target={link.platform === 'email' ? undefined : '_blank'}
          rel="noreferrer noopener"
          className="label inline-flex items-center gap-1 transition-colors hover:text-fg"
        >
          {link.label || link.platform}
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </a>
      ))}
    </div>
  );
}
