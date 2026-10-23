import Link from 'next/link';
import { ArrowUpRight, FileText, FolderOpen, Image as ImageIcon, Palette, Plus, Upload } from 'lucide-react';
import { Badge, PageHead, Panel, StatTile } from '@/components/admin/AdminUI';
import { requireAdmin } from '@/lib/auth';
import { getCounts, getProjects, getRecentMessages } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { relativeTime } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireAdmin();
  const counts = await getCounts();
  const [messages, projects, settings] = await Promise.all([
    getRecentMessages(4),
    getProjects({ includeDrafts: true, limit: 4 }),
    getSettings(),
  ]);

  const quickActions = [
    { href: '/admin/homepage', label: 'Edit homepage text', icon: FileText },
    { href: '/admin/projects?edit=new', label: 'Add a project', icon: FolderOpen },
    { href: '/admin/gallery?edit=new', label: 'Add gallery media', icon: ImageIcon },
    { href: '/admin/media', label: 'Upload files', icon: Upload },
    { href: '/admin/theme', label: 'Theme & accent', icon: Palette },
  ];

  return (
    <>
      <PageHead
        label="Overview"
        title="Dashboard"
        description="Everything on the public site is edited from here. Changes appear immediately — no rebuild needed."
        action={
          <Link href="/admin/projects?edit=new" className="btn btn-solid btn-sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New project
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Projects"
          value={counts.projects}
          note={`${counts.published} published · ${counts.projects - counts.published} draft`}
          href="/admin/projects"
        />
        <StatTile label="Experience" value={counts.experience} note="roles listed" href="/admin/experience" />
        <StatTile label="Skills" value={counts.skills} note="across all groups" href="/admin/skills" />
        <StatTile label="Gallery" value={counts.gallery} note="photos & videos" href="/admin/gallery" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent messages"
          description="Sent through the contact form and stored locally."
          footer={
            <div className="flex items-center justify-between gap-4">
              <span className="label num">
                {counts.messages} total · {counts.unread} unread
              </span>
              <Link href="/admin/messages" className="link-arrow">
                Open inbox
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          }
        >
          {messages.length === 0 ? (
            <p className="body text-[13.5px]">No messages yet.</p>
          ) : (
            <ul className="rows">
              {messages.map((message) => (
                <li key={message.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-fg">
                      {message.name}
                      <span className="text-muted"> · {message.subject || 'No subject'}</span>
                    </p>
                    <p className="mt-1 truncate text-[12.5px] text-muted">{message.body}</p>
                  </div>
                  <span className="label shrink-0">{relativeTime(message.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Latest projects"
          footer={
            <Link href="/admin/projects" className="link-arrow">
              Manage all projects
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          <ul className="rows">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center gap-4 py-3">
                <span className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-bg2">
                  {project.thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-fg">{project.title}</p>
                  <p className="label mt-1">
                    {project.category} · {project.date || '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {project.featured && <Badge tone="accent">featured</Badge>}
                  {project.published ? <Badge>live</Badge> : <Badge>draft</Badge>}
                  <Link href={`/admin/projects?edit=${project.id}`} className="label hover:text-fg">
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Quick actions">
          <ul className="rows">
            {quickActions.map((action) => (
              <li key={action.href}>
                <Link href={action.href} className="group flex items-center justify-between gap-4 py-3">
                  <span className="flex items-center gap-3 text-[13.5px] text-fg">
                    <action.icon className="h-4 w-4 text-muted" aria-hidden />
                    {action.label}
                  </span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="System">
          <dl className="rows">
            <div className="row justify-between">
              <dt className="label">Database</dt>
              <dd className="text-[13px] text-fg">MongoDB Atlas · harsh_portfolio</dd>
            </div>
            <div className="row justify-between">
              <dt className="label">Default theme</dt>
              <dd className="text-[13px] text-fg capitalize">{settings['theme.defaultMode']}</dd>
            </div>
            <div className="row justify-between">
              <dt className="label">Accent</dt>
              <dd className="flex items-center gap-2 text-[13px] text-fg">
                <span
                  className="h-3 w-3 rounded-full border border-line"
                  style={{ background: settings['theme.accent'] }}
                  aria-hidden
                />
                {settings['theme.accent']}
              </dd>
            </div>
            <div className="row justify-between">
              <dt className="label">Uploads</dt>
              <dd className="text-[13px] text-fg">MongoDB GridFS</dd>
            </div>
          </dl>
          <p className="field-hint mt-4">
            Re-run <span className="label-fg">npm run db:seed</span> to restore missing demo content.
            Existing records are updated in place and are never deleted.
          </p>
        </Panel>
      </div>
    </>
  );
}
