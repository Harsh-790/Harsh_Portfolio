'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, Copy, Eraser, ExternalLink, LoaderCircle, Search, Trash, Upload } from 'lucide-react';
import { cn, formatBytes } from '@/lib/types';
import { MediaThumb, useMediaLibrary, type MediaEntry } from './Fields';

/* Full-page media browser used by /admin/media. */

const FILTERS = [
  { key: 'all', label: 'All files' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Video' },
  { key: 'file', label: 'Documents' },
] as const;

const ACCEPT = 'image/*,video/mp4,video/webm,video/ogg,video/quicktime,application/pdf';

export function MediaLibrary() {
  const { files, loading, error, uploading, load, upload, remove, setError } = useMediaLibrary();
  const [kind, setKind] = useState<(typeof FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(
    () =>
      files.filter(
        (file) =>
          (kind === 'all' || file.kind === kind) && file.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [files, kind, query],
  );

  const totals = useMemo(
    () => ({
      count: files.length,
      size: files.reduce((sum, file) => sum + file.size, 0),
      images: files.filter((file) => file.kind === 'image').length,
      videos: files.filter((file) => file.kind === 'video').length,
    }),
    [files],
  );

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setNotice('');
    const names: string[] = [];
    for (const file of Array.from(list)) {
      const result = await upload(file);
      if (result) names.push(result.name);
    }
    if (names.length) setNotice(`Uploaded ${names.length} file${names.length === 1 ? '' : 's'}.`);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function copyUrl(entry: MediaEntry) {
    try {
      await navigator.clipboard.writeText(entry.url);
      setCopied(entry.name);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setError('Your browser blocked clipboard access — copy the URL from the preview instead.');
    }
  }

  async function handleDelete(entry: MediaEntry) {
    if (!window.confirm(`Delete ${entry.name}? If it is still used, deletion is blocked.`)) return;
    setNotice('');
    setBusy(entry.name);
    const ok = await remove(entry);
    setBusy('');
    if (ok) setNotice(`Deleted ${entry.name}.`);
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="display text-[15px]">Upload</h2>
            <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
              JPG, PNG, WEBP, AVIF, GIF, SVG, MP4, WEBM, MOV or PDF · up to 24 MB each. Files are stored in the
              MongoDB GridFS bucket <span className="label-fg">portfolioMedia</span> and can be reused in every
              content form.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              id="media-upload"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <label htmlFor="media-upload" className={cn('btn btn-solid btn-sm', uploading && 'pointer-events-none opacity-60')}>
              {uploading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? 'Uploading…' : 'Choose files'}
            </label>
          </div>
        </div>

        <label
          htmlFor="media-upload"
          className="mt-5 flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 px-5 py-6 text-center transition-colors hover:border-fg"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <Upload className="h-4 w-4 text-muted" aria-hidden />
          <span className="text-[13px] text-fg">Drop files here or click to browse</span>
          <span className="label">Images · video · PDF</span>
        </label>

        {(error || notice) && (
          <p
            role="status"
            className={cn(
              'mt-4 flex items-center gap-2.5 rounded-xl border px-3.5 py-3 font-mono text-[10.5px] tracking-[0.12em] uppercase',
              error ? 'border-fg' : 'border-line text-muted',
            )}
          >
            {error ? (
              <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Upload className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            )}
            {error || notice}
          </p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="label">Files</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{totals.count}</p>
        </div>
        <div className="card p-4">
          <p className="label">Images / video</p>
          <p className="mt-3 font-display text-[22px] leading-none num">
            {totals.images} / {totals.videos}
          </p>
        </div>
        <div className="card p-4">
          <p className="label">Total size</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{formatBytes(totals.size)}</p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setKind(filter.key)}
                aria-pressed={kind === filter.key}
                className={cn('chip', kind === filter.key && 'chip-active')}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files"
                aria-label="Search files"
                className="field pl-9 sm:w-[220px]"
              />
            </span>
            <button type="button" onClick={() => void load()} className="btn btn-sm" disabled={loading}>
              {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Eraser className="h-3.5 w-3.5" aria-hidden />}
              Refresh
            </button>
          </div>
        </header>

        <div className="px-5 py-5 md:px-6">
          {loading && files.length === 0 ? (
            <p className="label">Loading library…</p>
          ) : visible.length === 0 ? (
            <p className="body py-6 text-[13.5px]">
              {files.length === 0 ? 'No files yet — upload the first one above.' : 'No files match this filter.'}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((entry) => (
                <li key={entry.id ?? entry.name} className="flex flex-col overflow-hidden rounded-xl border border-line">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-36 overflow-hidden border-b border-line bg-bg2"
                  >
                    <MediaThumb entry={entry} className="h-full w-full" />
                  </a>

                  <div className="flex flex-1 flex-col gap-2 p-3.5">
                    <p className="truncate text-[12.5px] text-fg" title={entry.name}>
                      {entry.name}
                    </p>
                    <p className="label num">
                      {formatBytes(entry.size)} · {entry.kind}
                      {entry.protected ? ' · sample' : ''}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                      <button
                        type="button"
                        onClick={() => void copyUrl(entry)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 font-mono text-[9px] tracking-[0.14em] text-muted uppercase transition-colors hover:border-line2 hover:text-fg"
                        title="Copy URL"
                      >
                        <Copy className="h-3 w-3" aria-hidden />
                        {copied === entry.name ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line2 hover:text-fg"
                        title="Open in a new tab"
                        aria-label="Open in a new tab"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                      {entry.protected ? (
                        <span className="label">read-only</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleDelete(entry)}
                          disabled={busy === entry.name}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-fg hover:text-fg disabled:opacity-50"
                          title="Delete file"
                          aria-label={`Delete ${entry.name}`}
                        >
                          {busy === entry.name ? (
                            <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                          ) : (
                            <Trash className="h-3 w-3" aria-hidden />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="label leading-relaxed">
        Sample assets under <span className="label-fg">/uploads/seed</span> are read-only — replace them with your own
        uploads when you are ready to publish.
      </p>
    </div>
  );
}
