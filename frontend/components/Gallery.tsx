'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Play, X } from 'lucide-react';
import { cn, isLocalVideo, videoEmbedUrl } from '@/lib/types';

export type MediaItem = {
  id: string;
  type: string;
  url: string;
  title?: string;
  description?: string;
  category?: string;
  date?: string;
};

const FILTERS = ['All', 'Photos', 'Videos', 'Projects', 'Certificates', 'Events'] as const;

/** A gallery card needs a real thumbnail: an embed URL is not an image. */
function videoSource(url: string): { label: string; local: boolean } {
  if (isLocalVideo(url)) return { label: 'Video file', local: true };
  const yt = /youtube\.com|youtu\.be/i.test(url);
  const vimeo = /vimeo\.com/i.test(url);
  return { label: yt ? 'YouTube' : vimeo ? 'Vimeo' : 'Video link', local: false };
}

function matches(item: MediaItem, filter: string): boolean {
  if (filter === 'All') return true;
  if (filter === 'Photos') return item.type !== 'video';
  if (filter === 'Videos') return item.type === 'video';
  return item.category === filter;
}

/**
 * Editorially spaced masonry gallery with a lightbox.
 * Used on /gallery, on the homepage preview and for project screenshots
 * (where `showFilters` is off).
 */
export default function Gallery({
  items,
  showFilters = false,
  className,
}: {
  items: MediaItem[];
  showFilters?: boolean;
  className?: string;
}) {
  const [filter, setFilter] = useState<string>('All');
  const [active, setActive] = useState<number | null>(null);

  const filters = useMemo(
    () => FILTERS.filter((f) => f === 'All' || items.some((item) => matches(item, f))),
    [items],
  );

  const visible = useMemo(() => items.filter((item) => matches(item, filter)), [items, filter]);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (delta: number) => setActive((i) => (i === null ? null : (i + delta + visible.length) % visible.length)),
    [visible.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [active, close, step]);

  const current = active === null ? null : visible[active];

  return (
    <div className={cn('w-full', className)}>
      {showFilters && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="no-bar flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Gallery filters">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => {
                  setFilter(f);
                  setActive(null);
                }}
                className={cn('chip shrink-0', filter === f && 'chip-active')}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="label num">
            {String(visible.length).padStart(2, '0')} items
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="body py-16 text-center">Nothing here yet — add media from the admin panel.</p>
      ) : (
        <div className="masonry">
          {visible.map((item, i) => {
            const isVideo = item.type === 'video';
            const video = isVideo ? videoSource(item.url) : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(i)}
                className="media media-zoom group relative block w-full cursor-zoom-in text-left"
                aria-label={`Open ${item.title || 'media'}`}
              >
                {video ? (
                  video.local ? (
                    /* eslint-disable-next-line jsx-a11y/media-has-caption */
                    <video
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                      tabIndex={-1}
                      aria-hidden
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-video w-full flex-col items-center justify-center gap-3.5 bg-ink text-inkfg">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current">
                        <Play className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="label" style={{ color: 'inherit' }}>
                        {video.label}
                      </span>
                    </span>
                  )
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.url}
                    alt={item.title || 'Gallery item'}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full object-cover"
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/55 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span>
                    {item.title && <span className="block text-[13.5px] font-medium text-white">{item.title}</span>}
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-white/75">
                      {[item.category, item.date].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/95 text-black">
                    {isVideo ? (
                      <Play className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </span>
                </span>
                {isVideo && (
                  <span className="absolute top-3.5 left-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-bg/85 text-fg backdrop-blur-sm">
                    <Play className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── lightbox ─────────────────────────────────────────── */}
      {current && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-bg/96 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={current.title || 'Media viewer'}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3 md:px-6">
            <div className="min-w-0">
              <p className="truncate text-[13.5px] text-fg">{current.title}</p>
              <p className="label mt-1">
                {[current.category, current.date].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="label hidden num sm:block">
                {String((active ?? 0) + 1).padStart(2, '0')} / {String(visible.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-line2"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-line2"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-fg bg-fg text-bg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-4 md:p-8">
            {current.type === 'video' ? (
              <VideoPlayer item={current} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={current.url}
                alt={current.title || 'Gallery item'}
                className="max-h-[72vh] w-auto max-w-full rounded-xl border border-line object-contain"
              />
            )}
          </div>

          {current.description && (
            <div className="shrink-0 border-t border-line px-4 py-4 md:px-6">
              <p className="body max-w-[80ch]">{current.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ item }: { item: MediaItem }) {
  const embed = videoEmbedUrl(item.url);
  if (embed) {
    return (
      <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-ink">
        <iframe
          src={embed}
          title={item.title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  if (isLocalVideo(item.url) || /^https?:/i.test(item.url)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={item.url}
        poster=""
        controls
        autoPlay
        playsInline
        className="max-h-[72vh] w-full max-w-5xl rounded-xl border border-line bg-ink"
      />
    );
  }
  return (
    <p className="body">
      This video could not be embedded.{' '}
      <a href={item.url} target="_blank" rel="noreferrer noopener" className="link-underline">
        Open it directly
      </a>
      .
    </p>
  );
}
