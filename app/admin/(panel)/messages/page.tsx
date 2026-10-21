import { ArrowUpRight, Inbox, Mail } from 'lucide-react';
import { Badge, EmptyState, PageHead, Panel } from '@/components/admin/AdminUI';
import { ConfirmButton } from '@/components/admin/Fields';
import { deleteMessageAction, setMessageReadAction } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { relativeTime } from '@/lib/types';

export const dynamic = 'force-dynamic';

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; open?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter = filterTabs.some((tab) => tab.key === params.filter) ? (params.filter as string) : 'all';

  const messages = await db.message.findMany({
    where: filter === 'unread' ? { read: false } : filter === 'read' ? { read: true } : {},
    orderBy: { createdAt: 'desc' },
  });

  const [total, unread] = await Promise.all([db.message.count(), db.message.count({ where: { read: false } })]);
  const opened = params.open ? messages.find((message) => message.id === params.open) ?? null : null;

  return (
    <>
      <PageHead
        label="Inbox"
        title="Messages"
        description="Everything submitted through the contact form. Messages are stored in the local database — connect your own mailer later if you need email delivery."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="label">Total</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{total}</p>
        </div>
        <div className="card p-4">
          <p className="label">Unread</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{unread}</p>
        </div>
        <div className="card p-4">
          <p className="label">Showing</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{messages.length}</p>
        </div>
      </div>

      {opened && (
        <div className="mb-8">
          <Panel
            title={opened.subject || 'No subject'}
            description={`${opened.name} · ${opened.email} · ${relativeTime(opened.createdAt)}`}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <form action={setMessageReadAction}>
                    <input type="hidden" name="id" value={opened.id} />
                    <input type="hidden" name="read" value={opened.read ? 'false' : 'true'} />
                    <button type="submit" className="btn btn-sm">
                      {opened.read ? 'Mark as unread' : 'Mark as read'}
                    </button>
                  </form>
                  <form action={deleteMessageAction}>
                    <input type="hidden" name="id" value={opened.id} />
                    <ConfirmButton message="Delete this message permanently?" className="btn btn-sm">
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
                <a href={`mailto:${opened.email}`} className="link-arrow">
                  Reply by email
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            }
          >
            <p className="body whitespace-pre-line text-[14px]">{opened.body}</p>
          </Panel>
        </div>
      )}

      <Panel
        title={`Inbox (${messages.length})`}
        description="Newest first. Click a message to read the full text."
      >
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <a
              key={tab.key}
              href={`/admin/messages?filter=${tab.key}`}
              className={`chip${filter === tab.key ? ' chip-active' : ''}`}
              aria-current={filter === tab.key ? 'true' : undefined}
            >
              {tab.label}
              {tab.key === 'unread' && unread > 0 ? ` (${unread})` : ''}
            </a>
          ))}
        </div>

        {messages.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'No messages yet' : `No ${filter} messages`}
            description="Submissions from the public contact form land here."
            action={
              filter !== 'all' ? (
                <a href="/admin/messages" className="btn btn-sm">
                  Show all
                </a>
              ) : undefined
            }
          />
        ) : (
          <ul>
            {messages.map((message) => (
              <li key={message.id} className="border-t border-line py-4 first:border-t-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <a href={`/admin/messages?filter=${filter}&open=${message.id}`} className="group min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] text-fg">
                      {!message.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                      {message.name}
                      <span className="text-muted">· {message.subject || 'No subject'}</span>
                    </p>
                    <p className="mt-1.5 line-clamp-2 max-w-[70ch] text-[12.5px] leading-relaxed text-muted">
                      {message.body}
                    </p>
                    <span className="label mt-2 inline-flex items-center gap-1.5 group-hover:text-fg">
                      <Mail className="h-3 w-3" aria-hidden />
                      {message.email}
                    </span>
                  </a>

                  <div className="flex items-center gap-3">
                    <span className="label shrink-0">{relativeTime(message.createdAt)}</span>
                    {message.read ? <Badge>read</Badge> : <Badge tone="accent">new</Badge>}
                    <div className="flex items-center gap-1.5">
                      <form action={setMessageReadAction}>
                        <input type="hidden" name="id" value={message.id} />
                        <input type="hidden" name="read" value={message.read ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-lg border border-line px-3 font-mono text-[9px] tracking-[0.14em] text-muted uppercase transition-colors hover:border-line2 hover:text-fg"
                        >
                          {message.read ? 'Unread' : 'Read'}
                        </button>
                      </form>
                      <form action={deleteMessageAction}>
                        <input type="hidden" name="id" value={message.id} />
                        <ConfirmButton
                          message="Delete this message permanently?"
                          className="inline-flex h-8 items-center rounded-lg border border-line px-3 font-mono text-[9px] tracking-[0.14em] text-muted uppercase transition-colors hover:border-line2 hover:text-fg"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="label mt-6 flex items-center gap-2 leading-relaxed">
        <Inbox className="h-3.5 w-3.5" aria-hidden />
        Spam note: the contact form stores every submission. Clear test entries before sharing the site.
      </p>
    </>
  );
}
