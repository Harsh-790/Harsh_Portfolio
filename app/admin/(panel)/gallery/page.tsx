import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Badge, EmptyState, PageHead, Panel, RowActions, SavedNote } from '@/components/admin/AdminUI';
import { GalleryForm } from '@/components/admin/ContentForms';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { isLocalVideo, pad, videoEmbedUrl, type GalleryItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; saved?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const rows = await db.galleryItem.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  const items = rows as GalleryItem[];

  const isNew = params.edit === 'new';
  const editing = params.edit && !isNew ? items.find((item) => item.id === params.edit) ?? null : null;

  const search = (params.q ?? '').toLowerCase();
  const list = search
    ? items.filter((item) =>
        [item.title, item.category, item.type, item.description].join(' ').toLowerCase().includes(search),
      )
    : items;

  const photos = items.filter((item) => item.type !== 'video').length;
  const videos = items.length - photos;
  const drafts = items.filter((item) => !item.published).length;

  return (
    <>
      <PageHead
        label="Content"
        title="Gallery"
        description="Photos and videos shown on /gallery and in the homepage strip. Videos can be uploads or YouTube / Vimeo links."
        action={
          <Link href="/admin/gallery?edit=new" className="btn btn-solid btn-sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add media
          </Link>
        }
      />

      {(isNew || editing) && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge tone="solid">{isNew ? 'New item' : 'Editing'}</Badge>
              {editing && <span className="label">{editing.type}</span>}
            </div>
            <Link href="/admin/gallery" className="btn btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden />
              Close editor
            </Link>
          </div>
          {params.saved && <SavedNote message="Gallery item added — you are editing it now." />}
          <GalleryForm item={editing} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="label">Items</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{items.length}</p>
        </div>
        <div className="card p-4">
          <p className="label">Photos / videos</p>
          <p className="mt-3 font-display text-[22px] leading-none num">
            {pad(photos)} / {pad(videos)}
          </p>
        </div>
        <div className="card p-4">
          <p className="label">Hidden</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{pad(drafts)}</p>
        </div>
      </div>

      <Panel
        title={`Library (${items.length})`}
        description="Hidden rows stay out of the public grid. Reordering only changes the order inside a filter."
      >
        <form action="/admin/gallery" className="mb-5 flex flex-wrap items-center gap-3">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search title, category…"
            className="field sm:max-w-[280px]"
            aria-label="Search gallery"
          />
          <button type="submit" className="btn btn-sm">
            Search
          </button>
          {params.q && (
            <Link href="/admin/gallery" className="label hover:text-fg">
              Clear
            </Link>
          )}
        </form>

        {list.length === 0 ? (
          <EmptyState
            title="Nothing in the gallery yet"
            description="Upload a photo or paste a video link — it appears on /gallery straight away."
            action={
              <Link href="/admin/gallery?edit=new" className="btn btn-sm btn-solid">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add media
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item, index) => (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-line">
                <span className="block h-40 overflow-hidden border-b border-line bg-bg2">
                  {item.type === 'video' ? (
                    <span className="flex h-full items-center justify-center">
                      <span className="label">{videoEmbedUrl(item.url) || isLocalVideo(item.url) ? 'VIDEO' : 'VIDEO LINK'}</span>
                    </span>
                  ) : item.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </span>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] text-fg">{item.title || 'Untitled'}</p>
                    <span className="label shrink-0 num">#{pad(item.order)}</span>
                  </div>
                  <p className="label">
                    {item.category} · {item.date || '—'} · {item.type}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="flex items-center gap-1.5">
                      {item.featured && <Badge tone="accent">feat</Badge>}
                      {item.published ? <Badge>live</Badge> : <Badge>hidden</Badge>}
                    </span>
                    <RowActions
                      resource="gallery"
                      id={item.id}
                      editHref={`/admin/gallery?edit=${item.id}`}
                      flags={{ featured: item.featured, published: item.published }}
                      first={index === 0}
                      last={index === list.length - 1}
                      labels={{ featured: 'featured', published: 'published' }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
