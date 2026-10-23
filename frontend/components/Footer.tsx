import Link from 'next/link';
import { ArrowUp, Mail } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { PlatformIcon } from './BrandIcons';
import { socialCode } from './SocialLinks';
import { NAV_ITEMS } from '@/lib/nav';
import type { Profile, Settings, SocialLink } from '@/lib/types';

export default function Footer({
  profile,
  socials,
  settings,
}: {
  profile: Profile;
  socials: SocialLink[];
  settings: Settings;
}) {
  const year = new Date().getFullYear();
  const email = profile.email?.trim();

  return (
    <footer className="border-t border-line">
      <div className="shell py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="label">{settings['site.footerTagline'] || 'Data / Model / Insight'}</p>
            <p className="display mt-5 text-[32px] md:text-[40px]">
              {profile.name}
              <span className="ml-1 align-super text-[10px]">®</span>
            </p>
            <p className="body mt-4 max-w-[38ch]">{profile.tagline}</p>
            {email && (
              <a
                href={`mailto:${email}`}
                className="mt-6 inline-flex items-center gap-2 text-[15px] text-fg transition-opacity hover:opacity-70"
              >
                <Mail className="h-4 w-4" aria-hidden />
                {email}
              </a>
            )}
          </div>

          <nav className="md:col-span-3" aria-label="Footer">
            <p className="label mb-4">Explore</p>
            <ul className="rows">
              {NAV_ITEMS.map((item) => (
                <li key={item.href} className="border-line">
                  <Link
                    href={item.href}
                    className="block py-2.5 text-[14px] text-muted transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-2">
            <p className="label mb-4">Elsewhere</p>
            {socials.length ? (
              <ul className="rows">
                {socials.map((link) => (
                  <li key={link.id} className="border-line">
                    <a
                      href={link.platform === 'email' ? `mailto:${link.url}` : link.url}
                      target={link.platform === 'email' ? undefined : '_blank'}
                      rel="noreferrer noopener"
                      className="group flex items-center justify-between gap-2 py-2.5 text-[14px] text-muted transition-colors hover:text-fg"
                    >
                      {link.label || link.platform}
                      <span className="text-muted transition-colors group-hover:text-fg">
                        <PlatformIcon
                          platform={link.platform}
                          className="h-3.5 w-3.5"
                          fallback={<span className="label">{socialCode(link.platform)}</span>}
                        />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="body text-[13px]">Add social profiles from the admin panel.</p>
            )}
          </div>

          <div className="md:col-span-2">
            <p className="label mb-4">Studio</p>
            <dl className="space-y-3 text-[13px] text-muted">
              {profile.location && (
                <div>
                  <dt className="label-sm">Based in</dt>
                  <dd className="mt-1 text-fg">{profile.location}</dd>
                </div>
              )}
              {profile.status && (
                <div>
                  <dt className="label-sm">Status</dt>
                  <dd className="mt-1 text-fg">{profile.status}</dd>
                </div>
              )}
              <div>
                <dt className="label-sm">Updated</dt>
                <dd className="mt-1 text-fg num">{new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-line pt-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="label">
            © {year} {profile.name} — All rights reserved
          </p>
          <p className="label hidden lg:block">{settings['site.footerNote']}</p>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            <ThemeSwitcher />
            <Link href="/admin" className="label transition-colors hover:text-fg">
              Admin
            </Link>
            <a
              href="#main"
              aria-label="Back to top"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line2 hover:text-fg"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
