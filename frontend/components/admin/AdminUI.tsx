import Link from 'next/link';
import type { ReactNode } from 'react';
import { CircleCheck, Eye, EyeOff, MoveDown, MoveUp, Pencil, Star, Trash } from 'lucide-react';
import { deleteRecordAction, moveRecordAction, toggleRecordAction } from '@/app/admin/actions';
import { ConfirmButton } from './Fields';
import { cn } from '@/lib/types';

/* Server-safe admin chrome: headings, panels, list row controls. */

export function PageHead({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="label">{label}</p>
          <h1 className="display mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)]">{title}</h1>
        </div>
        {action}
      </div>
      {description && <p className="body mt-4 max-w-[68ch] text-[14px]">{description}</p>}
      <div className="hairline mt-6" />
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || description) && (
        <header className="border-b border-line px-5 py-4 md:px-6">
          {title && <h2 className="display text-[15px]">{title}</h2>}
          {description && <p className="mt-2 max-w-[70ch] text-[12.5px] leading-relaxed text-muted">{description}</p>}
        </header>
      )}
      <div className="px-5 py-5 md:px-6">{children}</div>
      {footer && <footer className="border-t border-line px-5 py-4 md:px-6">{footer}</footer>}
    </section>
  );
}

export function StatTile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string | number;
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="label">{label}</p>
      <p className="mt-3.5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-none num">{value}</p>
      {note && <p className="label mt-3">{note}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card card-hover block p-5">
        {body}
      </Link>
    );
  }
  return <div className="card p-5">{body}</div>;
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'solid' | 'accent' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase',
        tone === 'solid' && 'border-fg bg-fg text-bg',
        tone === 'accent' && 'border-accent text-accent',
        tone === 'muted' && 'border-line text-muted',
      )}
    >
      {children}
    </span>
  );
}

/** Confirmation strip shown after a record is created. */
export function SavedNote({ message }: { message: string }) {
  return (
    <p className="mb-6 flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">
      <CircleCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <p className="display text-[18px]">{title}</p>
      {description && <p className="body max-w-[56ch] text-[13.5px]">{description}</p>}
      {action}
    </div>
  );
}

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line2 hover:text-fg';

/** Publish / feature / reorder / edit / delete controls for a list row. */
export function RowActions({
  resource,
  id,
  editHref,
  flags = {},
  first = false,
  last = false,
  labels = {},
  scope,
  extra,
}: {
  resource: string;
  id: string;
  editHref?: string;
  flags?: { published?: boolean; featured?: boolean; enabled?: boolean; highlight?: boolean };
  first?: boolean;
  last?: boolean;
  labels?: { published?: string; featured?: string; enabled?: string; highlight?: string };
  scope?: { field: string; value: string };
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {extra}

      {editHref && (
        <Link href={editHref} className={iconButton} title="Edit" aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}

      {Object.entries(flags).map(([field, value]) => (
        <form key={field} action={toggleRecordAction}>
          <input type="hidden" name="resource" value={resource} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="field" value={field} />
          <button
            type="submit"
            className={cn(iconButton, value && 'border-fg text-fg')}
            title={`${value ? 'Disable' : 'Enable'} ${labels[field as keyof typeof labels] ?? field}`}
            aria-label={`Toggle ${field}`}
            aria-pressed={value}
          >
            {field === 'published' || field === 'enabled' ? (
              value ? (
                <Eye className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
              )
            ) : (
              <Star className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </form>
      ))}

      <form action={moveRecordAction}>
        <input type="hidden" name="resource" value={resource} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        {scope && <input type="hidden" name="scopeField" value={scope.field} />}
        {scope && <input type="hidden" name="scopeValue" value={scope.value} />}
        <button type="submit" className={cn(iconButton, first && 'opacity-40')} title="Move up" aria-label="Move up">
          <MoveUp className="h-3.5 w-3.5" aria-hidden />
        </button>
      </form>

      <form action={moveRecordAction}>
        <input type="hidden" name="resource" value={resource} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        {scope && <input type="hidden" name="scopeField" value={scope.field} />}
        {scope && <input type="hidden" name="scopeValue" value={scope.value} />}
        <button type="submit" className={cn(iconButton, last && 'opacity-40')} title="Move down" aria-label="Move down">
          <MoveDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </form>

      <form action={deleteRecordAction}>
        <input type="hidden" name="resource" value={resource} />
        <input type="hidden" name="id" value={id} />
        <ConfirmButton
          message="Delete this permanently? This cannot be undone."
          className={cn(iconButton, 'hover:border-fg')}
          title="Delete"
        >
          <Trash className="h-3.5 w-3.5" aria-hidden />
        </ConfirmButton>
      </form>
    </div>
  );
}
