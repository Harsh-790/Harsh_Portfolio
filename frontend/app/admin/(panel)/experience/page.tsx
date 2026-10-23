import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Badge, EmptyState, PageHead, Panel, RowActions, SavedNote } from '@/components/admin/AdminUI';
import { ExperienceForm } from '@/components/admin/ContentForms';
import { requireAdmin } from '@/lib/auth';
import { getAdminExperience } from '@/lib/content';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const items = await getAdminExperience();

  const isNew = params.edit === 'new';
  const editing = params.edit && !isNew ? items.find((item) => item.id === params.edit) ?? null : null;

  return (
    <>
      <PageHead
        label="Content"
        title="Experience"
        description="Roles are rendered as a minimal timeline. Achievements become bullet points — one per line."
        action={
          <Link href="/admin/experience?edit=new" className="btn btn-solid btn-sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add role
          </Link>
        }
      />

      {(isNew || editing) && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Badge tone="solid">{isNew ? 'New role' : 'Editing'}</Badge>
            <Link href="/admin/experience" className="btn btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden />
              Close editor
            </Link>
          </div>
          {params.saved && <SavedNote message="Role added — you are editing it now." />}
          <ExperienceForm item={editing} />
        </div>
      )}

      <Panel title={`Roles (${items.length})`} description="Newest first is achieved with the arrow buttons.">
        {items.length === 0 ? (
          <EmptyState title="No experience entries yet" description="Add the first role to start the timeline." />
        ) : (
          <ul>
            {items.map((item, index) => (
              <li
                key={item.id}
                className="grid gap-4 border-t border-line py-4 first:border-t-0 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-3">
                  <p className="label num">
                    {item.startDate} — {item.current ? 'Present' : item.endDate || '—'}
                  </p>
                  <p className="label mt-1.5">{item.location}</p>
                </div>
                <div className="md:col-span-4">
                  <p className="text-[14px] text-fg">{item.company}</p>
                  <p className="label label-fg mt-1.5">{item.position}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="label">{pad(item.achievements.length)} achievements</p>
                  <p className="label mt-1.5">{item.technologies.length} tools · order {item.order}</p>
                </div>
                <div className="flex items-center gap-1.5 md:col-span-1">
                  {item.published ? <Badge>live</Badge> : <Badge>draft</Badge>}
                </div>
                <div className="md:col-span-2 md:flex md:justify-end">
                  <RowActions
                    resource="experience"
                    id={item.id}
                    editHref={`/admin/experience?edit=${item.id}`}
                    flags={{ published: item.published }}
                    first={index === 0}
                    last={index === items.length - 1}
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
