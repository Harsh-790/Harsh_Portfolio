import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn, pad, paragraphs, splitPair, type Metric } from '@/lib/types';

/* ── section header ──────────────────────────────────────────
   The repeating editorial rhythm of the whole site:
   `01 / LABEL ———————————————————————————— ACTION`
   followed by a large display heading.                              */

export function SectionHead({
  label,
  title,
  accent,
  lead,
  action,
  actionHref,
  align = 'left',
  className,
}: {
  label?: string;
  title?: ReactNode;
  accent?: string;
  lead?: string;
  action?: string;
  actionHref?: string;
  align?: 'left' | 'between';
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {(label || action) && (
        <div className="flex items-baseline justify-between gap-6 pb-4">
          {label ? <span className="label">{label}</span> : <span />}
          {action && actionHref && (
            <Link href={actionHref} className="link-arrow shrink-0">
              {action}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      )}
      <div className="hairline" />
      <div
        className={cn(
          'flex flex-col gap-6 pt-7 md:flex-row md:items-end md:justify-between md:gap-12',
          align === 'left' && 'md:flex-col md:items-start md:gap-5',
        )}
      >
        {title && (
          <h2 className="display type-2 max-w-[16ch] text-balance">
            {title}
            {accent && (
              <>
                {' '}
                <span className="text-muted">{accent}</span>
              </>
            )}
          </h2>
        )}
        {lead && <p className="body max-w-[46ch] md:pb-2">{lead}</p>}
      </div>
    </div>
  );
}

/* ── small pieces ────────────────────────────────────────── */

export function ArrowLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const content = (
    <>
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={cn('link-arrow', className)}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cn('link-arrow', className)}>
      {content}
    </Link>
  );
}

export function TagList({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-line px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Numbered metric cards — the "model accuracy" style readouts. */
export function MetricGrid({
  metrics,
  columns = 4,
  className,
}: {
  metrics: Metric[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  if (!metrics.length) return null;
  const cols =
    columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  return (
    <dl className={cn('grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line', cols, className)}>
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface p-5">
          <dt className="label">{m.label}</dt>
          <dd className="mt-3 font-display text-[26px] leading-none tracking-tight num md:text-[30px]">{m.value}</dd>
          {m.note && <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">{m.note}</p>}
        </div>
      ))}
    </dl>
  );
}

/** Long text from the database → paragraphs. */
export function Prose({ value, className }: { value: string; className?: string }) {
  const parts = paragraphs(value);
  if (!parts.length) return null;
  return (
    <div className={cn('prose-editorial body-lg', className)}>
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** "2020 — 2024 | B.Tech ..." rows, rendered as an editorial table. */
export function SplitRows({ value, className }: { value: string; className?: string }) {
  const rows = value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitPair);
  if (!rows.length) return null;
  return (
    <ul className={cn('rows', className)}>
      {rows.map((row, i) => (
        <li key={i} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-8">
          {row.left && (
            <span className="label w-[9.5rem] shrink-0 pt-1 num sm:pt-0">{row.left}</span>
          )}
          <span className="max-w-[52ch] text-[14.5px] leading-relaxed text-fg">{row.right}</span>
        </li>
      ))}
    </ul>
  );
}

/** Corner ticks — a small decorative frame detail used on figures. */
export function Ticks({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <span className="plus-mark -top-px -left-px" />
      <span className="plus-mark -top-px -right-px" />
      <span className="plus-mark -bottom-px -left-px" />
      <span className="plus-mark -bottom-px -right-px" />
    </span>
  );
}

export function StatusPill({ children, tone = 'idle' }: { children: ReactNode; tone?: 'idle' | 'live' }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
      <span
        className={cn('h-1.5 w-1.5 rounded-full bg-fg', tone === 'live' && 'live-dot')}
        aria-hidden
      />
      <span className="label label-fg">{children}</span>
    </span>
  );
}

/** Slow, single-line ticker. Static content, so it stays readable and cheap. */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div className={cn('relative overflow-hidden py-3.5', className)} aria-hidden>
      <div className="marquee gap-10">
        {doubled.map((item, i) => (
          <span key={i} className="label whitespace-nowrap">
            {item}
            <span className="ml-10 text-line2">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A minimal bar figure built from real data (project counts per category).
 * Deliberately sparse — it is an editorial figure, not a dashboard.
 */
export function BarFigure({
  data,
  className,
  height = 168,
}: {
  data: { label: string; count: number }[];
  className?: string;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <figure className={cn('w-full', className)}>
      {/* Wide screens: one column per category. */}
      <div className="hidden items-end gap-3 sm:flex" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col justify-end gap-2">
            <span className="font-mono text-[10px] tracking-wider text-inksoft num">{d.count}</span>
            <div
              className="w-full rounded-[3px] bg-inkfg/20 transition-opacity duration-500 group-hover:opacity-100"
              style={{ height: `${Math.max(6, (d.count / max) * 100)}%`, opacity: 0.35 + 0.65 * (d.count / max) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 hidden h-px w-full bg-inkfg/25 sm:block" />
      <div className="mt-3 hidden gap-3 sm:flex">
        {data.map((d) => (
          <span key={d.label} className="label min-w-0 flex-1 text-inksoft">
            {d.label}
          </span>
        ))}
      </div>

      {/* Narrow screens: the same data as a stacked bar list — no clipping. */}
      <ul className="space-y-3.5 sm:hidden">
        {data.map((d) => (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="label text-inksoft">{d.label}</span>
              <span className="label num">{pad(d.count)}</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-[3px] bg-inkfg/15">
              <div
                className="h-full rounded-[3px] bg-inkfg/50"
                style={{ width: `${(d.count / max) * 100}%`, opacity: 0.35 + 0.65 * (d.count / max) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Label / value pair used in project metadata tables. */
export function Spec({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  return (
    <div className="flex flex-col gap-1.5 py-3.5">
      <dt className="label">{label}</dt>
      <dd className="text-[14.5px] leading-snug text-fg">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" className="link-underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
