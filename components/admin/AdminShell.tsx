'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Award,
  Cpu,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Inbox,
  Layers,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Palette,
  Settings,
  User,
  X,
} from 'lucide-react';
import { logoutAction } from '@/app/admin/actions';
import { isActivePath } from '@/lib/nav';
import { cn } from '@/lib/types';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; badge?: number };

export default function AdminShell({
  user,
  unread,
  children,
}: {
  user: { name: string; email: string };
  unread: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const groups: { title: string; items: NavItem[] }[] = [
    { title: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }] },
    {
      title: 'Content',
      items: [
        { href: '/admin/projects', label: 'Projects', icon: FolderOpen },
        { href: '/admin/experience', label: 'Experience', icon: Award },
        { href: '/admin/skills', label: 'Skills', icon: Cpu },
        { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
        { href: '/admin/messages', label: 'Messages', icon: Inbox, badge: unread },
      ],
    },
    {
      title: 'Site',
      items: [
        { href: '/admin/homepage', label: 'Homepage text', icon: FileText },
        { href: '/admin/about', label: 'Profile & About', icon: User },
        { href: '/admin/social', label: 'Social links', icon: Link2 },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
        { href: '/admin/theme', label: 'Theme', icon: Palette },
        { href: '/admin/media', label: 'Media', icon: Layers },
      ],
    },
  ];

  const current = groups
    .flatMap((group) => group.items)
    .filter((item) => isActivePath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const nav = (
    <nav className="flex flex-col gap-7" aria-label="Admin">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="label mb-2.5 px-2">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] transition-colors',
                      active ? 'bg-fg text-bg' : 'text-muted hover:bg-bg2 hover:text-fg',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          'ml-auto rounded-full px-1.5 py-0.5 font-mono text-[9px] num',
                          active ? 'bg-bg text-fg' : 'bg-fg text-bg',
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="border-t border-line pt-5">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] text-muted transition-colors hover:text-fg">
          <ExternalLink className="h-4 w-4" aria-hidden />
          View site
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] text-muted transition-colors hover:text-fg"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg">
      {/* sidebar — desktop */}
      <aside className="fixed top-0 left-0 z-40 hidden h-dvh w-[248px] flex-col border-r border-line bg-bg px-4 py-6 lg:flex">
        <Link href="/admin" className="mb-8 flex items-baseline gap-2 px-2">
          <span className="display text-[15px]">Admin</span>
          <span className="label">/{user.name.split(' ')[0]}</span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-6 border-t border-line pt-4 px-2">
          <p className="label truncate">{user.email}</p>
        </div>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-fg/25 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="page-in absolute top-0 left-0 h-full w-[280px] overflow-y-auto border-r border-line bg-bg px-4 py-5">
            <div className="mb-6 flex items-center justify-between">
              <span className="display text-[15px]">Admin</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      {/* content */}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/92 backdrop-blur">
          <div className="flex h-[58px] items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line lg:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden />
              </button>
              <p className="label label-fg">{current?.label ?? 'Admin'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="label hidden transition-colors hover:text-fg sm:block">
                View site ↗
              </Link>
              <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
              <span className="label hidden md:block">{user.email}</span>
            </div>
          </div>
        </header>

        <main id="main" className="px-4 py-7 md:px-6 md:py-9">
          <div className="mx-auto w-full max-w-[1080px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
