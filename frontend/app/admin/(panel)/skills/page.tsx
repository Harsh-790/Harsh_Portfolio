import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Badge, EmptyState, PageHead, Panel, RowActions, SavedNote } from '@/components/admin/AdminUI';
import { SkillForm } from '@/components/admin/ContentForms';
import { requireAdmin } from '@/lib/auth';
import { getSkills } from '@/lib/content';
import { SKILL_CATEGORIES } from '@/lib/options';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const groups = await getSkills();
  const all = groups.flatMap((group) => group.items);

  const isNew = params.edit === 'new';
  const editing = params.edit && !isNew ? all.find((skill) => skill.id === params.edit) ?? null : null;
  const total = all.length;
  const highlighted = all.filter((skill) => skill.highlight).length;

  return (
    <>
      <PageHead
        label="Content"
        title="Skills"
        description="Grouped by category with no percentage bars. Mark the tools you use weekly so the lists stay honest."
        action={
          <Link href="/admin/skills?edit=new" className="btn btn-solid btn-sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add skill
          </Link>
        }
      />

      {(isNew || editing) && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Badge tone="solid">{isNew ? 'New skill' : 'Editing'}</Badge>
            <Link href="/admin/skills" className="btn btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden />
              Close editor
            </Link>
          </div>
          {params.saved && <SavedNote message="Skill added — you are editing it now." />}
          <SkillForm item={editing} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="label">Skills</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{total}</p>
        </div>
        <div className="card p-4">
          <p className="label">Used weekly</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{highlighted}</p>
        </div>
        <div className="card p-4">
          <p className="label">Groups</p>
          <p className="mt-3 font-display text-[22px] leading-none num">{groups.length}</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <Panel title="Skills">
          <EmptyState title="No skills yet" description="Add your first skill to build the toolkit page." />
        </Panel>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Panel
              key={group.category}
              title={`${group.category} (${group.items.length})`}
              description={SKILL_CATEGORIES.includes(group.category) ? undefined : 'Custom category.'}
            >
              <ul>
                {group.items.map((skill, index) => (
                  <li
                    key={skill.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-3 first:border-t-0"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[13.5px] text-fg">
                        {skill.name}
                        {skill.highlight && <Badge tone="accent">weekly</Badge>}
                        {!skill.published && <Badge>draft</Badge>}
                      </p>
                      {skill.note && <p className="label mt-1.5">{skill.note}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="label num">order {pad(skill.order)}</span>
                      <RowActions
                        resource="skills"
                        id={skill.id}
                        editHref={`/admin/skills?edit=${skill.id}`}
                        flags={{ highlight: skill.highlight, published: skill.published }}
                        first={index === 0}
                        last={index === group.items.length - 1}
                        labels={{ highlight: 'used weekly' }}
                        scope={{ field: 'category', value: group.category }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
