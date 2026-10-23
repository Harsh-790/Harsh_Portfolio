import Link from 'next/link';
import { ExternalLink, Plus, X } from 'lucide-react';
import { Badge, EmptyState, PageHead, Panel, RowActions, SavedNote } from '@/components/admin/AdminUI';
import { PlatformIcon } from '@/components/BrandIcons';
import { SocialForm } from '@/components/admin/ContentForms';
import { requireAdmin } from '@/lib/auth';
import { getSocialLinks } from '@/lib/content';
import { SOCIAL_PLATFORMS } from '@/lib/options';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const links = await getSocialLinks(false);

  const isNew = params.edit === 'new';
  const editing = params.edit && !isNew ? links.find((link) => link.id === params.edit) ?? null : null;
  const live = links.filter((link) => link.enabled && link.url.trim()).length;
  const known = links.filter((link) => SOCIAL_PLATFORMS.includes(link.platform));

  return (
    <>
      <PageHead
        label="Site"
        title="Social links"
        description="Profiles rendered in the header, contact page and footer. A link with an empty URL is hidden everywhere."
        action={
          <Link href="/admin/social?edit=new" className="btn btn-solid btn-sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add link
          </Link>
        }
      />

      {(isNew || editing) && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Badge tone="solid">{isNew ? 'New link' : 'Editing'}</Badge>
            <Link href="/admin/social" className="btn btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden />
              Close editor
            </Link>
          </div>
          {params.saved && <SavedNote message="Link added — you are editing it now." />}
          <SocialForm link={editing} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="label">Links</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{links.length}</p>
        </div>
        <div className="card p-4">
          <p className="label">Visible on site</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{pad(live)}</p>
        </div>
        <div className="card p-4">
          <p className="label">Known platforms</p>
          <p className="mt-3 font-display text-[22px] leading-none num">
            {pad(known.length)}/{SOCIAL_PLATFORMS.length}
          </p>
        </div>
      </div>

      <Panel title={`Profiles (${links.length})`} description="The order here is the order used across the site.">
        {links.length === 0 ? (
          <EmptyState
            title="No social links"
            description="Add GitHub, LinkedIn, Instagram, X, YouTube, LeetCode, HackerRank or a plain email address."
            action={
              <Link href="/admin/social?edit=new" className="btn btn-sm btn-solid">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add link
              </Link>
            }
          />
        ) : (
          <ul>
            {links.map((link, index) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-3.5 first:border-t-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                    <PlatformIcon
                      platform={link.platform}
                      className="h-4 w-4"
                      fallback={
                        <span className="font-mono text-[10px] tracking-[0.1em] uppercase">
                          {link.platform.slice(0, 2)}
                        </span>
                      }
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-fg">
                      {link.label || link.platform}
                      {link.enabled && link.url.trim() ? (
                        <Badge>live</Badge>
                      ) : (
                        <Badge tone="accent">hidden</Badge>
                      )}
                    </p>
                    <p className="label mt-1.5 max-w-[46ch] truncate">
                      {link.url.trim() || 'no URL set — hidden everywhere'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {link.url.trim() && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="label inline-flex items-center gap-1.5 hover:text-fg"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                  <span className="label num">order {pad(link.order)}</span>
                  <RowActions
                    resource="social"
                    id={link.id}
                    editHref={`/admin/social?edit=${link.id}`}
                    flags={{ enabled: link.enabled }}
                    first={index === 0}
                    last={index === links.length - 1}
                    labels={{ enabled: 'visible' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
