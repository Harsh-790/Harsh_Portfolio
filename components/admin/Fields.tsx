'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { CircleAlert, CircleCheck, Eraser, LoaderCircle, Plus, Search, Upload, X } from 'lucide-react';
import { cn, formatBytes, videoEmbedUrl } from '@/lib/types';

export type MediaEntry = {
  name: string;
  url: string;
  size: number;
  modified: number;
  kind: 'image' | 'video' | 'file';
  protected: boolean;
};

/* ── basic inputs ──────────────────────────────────────────── */

export function Field({
  label,
  name,
  defaultValue,
  hint,
  type = 'text',
  placeholder,
  required,
  autoComplete,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  hint?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label} {required && <span aria-hidden>·</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="field"
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  hint,
  rows = 4,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="field resize-y leading-relaxed"
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Toggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-current" />
      <span>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-fg uppercase">{label}</span>
        {hint && <span className="mt-1 block text-[11.5px] leading-snug text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  hint,
  className,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string | null;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} className="field">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/* ── submit + status ───────────────────────────────────────── */

export function SubmitButton({
  children,
  className = 'btn btn-solid',
  pendingLabel = 'Saving',
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ConfirmButton({
  children,
  message,
  className = 'btn btn-sm',
  title,
}: {
  children: ReactNode;
  message: string;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="submit"
      title={title}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function StatusBanner({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 font-mono text-[10.5px] tracking-[0.12em] uppercase',
        state.ok ? 'border-line text-fg' : 'border-fg text-fg',
      )}
    >
      {state.ok ? (
        <CircleCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      ) : (
        <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {state.message}
    </p>
  );
}

/* ── media library data ────────────────────────────────────── */

export function useMediaLibrary() {
  const [files, setFiles] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/media');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not load media.');
      setFiles(data.files as MediaEntry[]);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load media.');
    } finally {
      setLoading(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/media', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Upload failed.');
      setFiles((current) => [data.file as MediaEntry, ...current]);
      return data.file as MediaEntry;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (name: string) => {
    setError('');
    const response = await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || 'Could not delete that file.');
      return false;
    }
    setFiles((current) => current.filter((file) => file.name !== name));
    return true;
  };

  return { files, loading, error, uploading, load, upload, remove, setError };
}

export function MediaThumb({ entry, className }: { entry: MediaEntry; className?: string }) {
  if (entry.kind === 'video') {
    return (
      <div className={cn('media flex items-center justify-center bg-bg2', className)}>
        <span className="label">VIDEO</span>
      </div>
    );
  }
  if (entry.kind === 'file') {
    return (
      <div className={cn('media flex items-center justify-center bg-bg2', className)}>
        <span className="label">FILE</span>
      </div>
    );
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={entry.url} alt="" loading="lazy" className={cn('media object-cover', className)} />;
}

/**
 * What a media URL will render as. Only URLs with a known non-image extension
 * (a PDF résumé, for instance) are treated as files — extension-less URLs keep
 * the old behaviour and are attempted as images.
 */
function previewKind(url: string): 'image' | 'video' | 'file' {
  const ext = (url.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
  if (/^(mp4|webm|ogg|mov|m4v)$/.test(ext) || videoEmbedUrl(url)) return 'video';
  if (/^(jpe?g|png|webp|gif|avif|svg|bmp|ico)$/.test(ext)) return 'image';
  if (/^[a-z0-9]{1,5}$/.test(ext)) return 'file';
  return 'image';
}

/** Label shown on the placeholder tile when a value is not an image. */
function previewLabel(url: string): string {
  const kind = previewKind(url);
  if (kind === 'video') return 'VIDEO';
  const ext = (url.split(/[?#]/)[0].split('.').pop() || '').toUpperCase();
  return kind === 'file' && /^[A-Z0-9]{1,5}$/.test(ext) ? ext : 'FILE';
}

/* ── picker used inside every content form ─────────────────── */

export function MediaPicker({
  name,
  label,
  defaultValue = '',
  hint,
  accept = 'image/*',
  allowVideo = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  accept?: string;
  allowVideo?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { files, loading, error, uploading, load, upload, remove } = useMediaLibrary();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) void load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = files.filter((file) =>
    (allowVideo ? true : file.kind === 'image') &&
    file.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <span className="field-label">{label}</span>
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-[86px] w-[118px] shrink-0 overflow-hidden rounded-xl border border-line bg-bg2">
          {value ? (
            previewKind(value) === 'image' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="label">{previewLabel(value)}</span>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="label-sm">Empty</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              Upload
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
              Library
            </button>
            {value && (
              <button type="button" className="btn btn-sm" onClick={() => setValue('')}>
                <Eraser className="h-3.5 w-3.5" aria-hidden />
                Clear
              </button>
            )}
          </div>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="/uploads/file.jpg or https://…"
            className="field mt-2.5"
            aria-label={`${label} URL`}
          />
          <input
            ref={inputRef}
            type="file"
            accept={allowVideo ? `${accept},video/mp4,video/webm` : accept}
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const uploaded = await upload(file);
              if (uploaded) setValue(uploaded.url);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      {hint && <p className="field-hint">{hint}</p>}
      {error && !open && <p className="field-hint text-fg">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-fg/25 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p className="label label-fg">Media library</p>
              <div className="flex items-center gap-2">
                <label className="btn btn-sm cursor-pointer">
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    accept={allowVideo ? `${accept},video/mp4,video/webm` : accept}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const uploaded = await upload(file);
                      if (uploaded) setValue(uploaded.url);
                      event.target.value = '';
                    }}
                  />
                </label>
                <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Search className="h-3.5 w-3.5 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files…"
                className="w-full bg-transparent text-[13px] outline-none"
              />
              <span className="label shrink-0 num">{visible.length}</span>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
              {loading && <p className="body col-span-full py-8 text-center text-[13px]">Loading…</p>}
              {!loading && visible.length === 0 && (
                <p className="body col-span-full py-8 text-center text-[13px]">No files yet — upload one.</p>
              )}
              {visible.map((file) => (
                <div key={file.name} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      setValue(file.url);
                      setOpen(false);
                    }}
                    className="w-full overflow-hidden rounded-xl border border-line text-left transition-colors hover:border-line2"
                  >
                    <MediaThumb entry={file} className="h-24 w-full rounded-none border-0" />
                    <span className="block truncate px-2.5 py-2 font-mono text-[9px] tracking-wide text-muted">
                      {file.name}
                    </span>
                  </button>
                  {!file.protected && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Delete ${file.name}? Files already used on the site will break.`)) {
                          await remove(file.name);
                        }
                      }}
                      aria-label={`Delete ${file.name}`}
                      className="absolute top-2 right-2 hidden h-7 w-7 items-center justify-center rounded-full bg-bg/90 text-fg backdrop-blur-sm group-hover:flex hover:bg-bg"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="label">
                {error ? <span className="text-fg">{error}</span> : 'Sample assets are read-only'}
              </p>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaSummary({ entry }: { entry: MediaEntry }) {
  return (
    <span className="label">
      {formatBytes(entry.size)} · {new Date(entry.modified).toLocaleDateString('en-GB')}
    </span>
  );
}

/* ── repeatable list of media (project gallery) ────────────── */

export function MediaListField({
  name,
  label,
  defaultValues = [],
  hint,
}: {
  name: string;
  label: string;
  defaultValues?: string[];
  hint?: string;
}) {
  const [values, setValues] = useState<string[]>(defaultValues);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { files, loading, error, uploading, load, upload, remove } = useMediaLibrary();

  useEffect(() => {
    if (open) void load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = files.filter(
    (file) => file.kind === 'image' && file.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <span className="field-label">{label}</span>

      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="mb-2 flex items-center gap-2.5">
          <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-bg2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </span>
          <input
            name={name}
            value={value}
            onChange={(event) =>
              setValues((current) => current.map((item, i) => (i === index ? event.target.value : item)))
            }
            className="field flex-1"
            aria-label={`${label} ${index + 1}`}
          />
          <button
            type="button"
            className="btn btn-sm"
            aria-label="Remove image"
            onClick={() => setValues((current) => current.filter((_, i) => i !== index))}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add image
        </button>
        <label className="btn btn-sm cursor-pointer">
          {uploading ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          Upload
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (event) => {
              const chosen = Array.from(event.target.files ?? []);
              for (const file of chosen) {
                const uploaded = await upload(file);
                if (uploaded) setValues((current) => [...current, uploaded.url]);
              }
              event.target.value = '';
            }}
          />
        </label>
      </div>

      {hint && <p className="field-hint">{hint}</p>}
      {error && !open && <p className="field-hint text-fg">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-fg/25 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p className="label label-fg">Add images</p>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Search className="h-3.5 w-3.5 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files…"
                className="w-full bg-transparent text-[13px] outline-none"
              />
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
              {loading && <p className="body col-span-full py-8 text-center text-[13px]">Loading…</p>}
              {!loading && visible.length === 0 && (
                <p className="body col-span-full py-8 text-center text-[13px]">No images yet.</p>
              )}
              {visible.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => {
                    setValues((current) => [...current, file.url]);
                    setOpen(false);
                  }}
                  className="overflow-hidden rounded-xl border border-line text-left transition-colors hover:border-line2"
                >
                  <MediaThumb entry={file} className="h-24 w-full rounded-none border-0" />
                  <span className="block truncate px-2.5 py-2 font-mono text-[9px] text-muted">{file.name}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="label">{error ? <span className="text-fg">{error}</span> : `${values.length} selected`}</p>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
