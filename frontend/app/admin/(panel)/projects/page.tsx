import Link from 'next/link';
import { Copy, Plus, X } from 'lucide-react';
import { Badge, EmptyState, PageHead, Panel, RowActions, SavedNote } from '@/components/admin/AdminUI';
import { ProjectForm } from '@/components/admin/ContentForms';
import { ConfirmButton } from '@/components/admin/Fields';
import { duplicateProjectAction } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { getCategories, getProjects } from '@/lib/content';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; saved?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [projects, categories] = await Promise.all([getProjects({ includeDrafts: true }), getCategories()]);

  const isNew = params.edit === 'new';
  const editing = params.edit && !isNew ? projects.find((project) => project.id === params.edit) ?? null : null;
  const search = (params.q ?? '').toLowerCase();
  const list = search
    ? projects.filter((project) =>
        [project.title, project.category, project.status, project.slug].join(' ').toLowerCase().includes(search),
      )
    : projects;

  const categoryNames = [...new Set([...categories.map((c) => c.name), ...projects.map((p) => p.category)])];

  return (
    <>
      <PageHead
        label="Content"
        title="Projects"
        description="Add, edit, reorder, feature, publish or delete projects. The order here is the order used on the public site."
        action={
          <Link href="/admin/projects?edit=new" className="btn btn-solid btn-sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New project
          </Link>
        }
      />

      {(isNew || editing) && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge tone="solid">{isNew ? 'New project' : 'Editing'}</Badge>
              <span className="label">{editing ? editing.slug : 'Unsaved draft'}</span>
            </div>
            <Link href="/admin/projects" className="btn btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden />
              Close editor
            </Link>
          </div>
          {params.saved && <SavedNote message="Project created — you are editing it now." />}
          <ProjectForm project={editing} />
        </div>
      )}

      <Panel
        title={`All projects (${projects.length})`}
        description="Draft rows are hidden from visitors. Use the eye icon to publish or unpublish."
      >
        <form action="/admin/projects" className="mb-5 flex flex-wrap items-center gap-3">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search title, slug, category…"
            className="field sm:max-w-[280px]"
            aria-label="Search projects"
          />
          <button type="submit" className="btn btn-sm">
            Search
          </button>
          {params.q && (
            <Link href="/admin/projects" className="label hover:text-fg">
              Clear
            </Link>
          )}
        </form>

        {list.length === 0 ? (
          <EmptyState
            title="No projects found"
            description="Create your first project — it will appear on the homepage as soon as it is marked featured."
            action={
              <Link href="/admin/projects?edit=new" className="btn btn-sm btn-solid">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New project
              </Link>
            }
          />
        ) : (
          <ul>
            {list.map((project, index) => (
              <li
                key={project.id}
                className="grid gap-4 border-t border-line py-4 first:border-t-0 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-2">
                  <span className="block h-14 w-24 overflow-hidden rounded-lg border border-line bg-bg2">
                    {project.thumbnail ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                </div>

                <div className="md:col-span-4">
                  <p className="text-[14px] text-fg">{project.title}</p>
                  <p className="label mt-1.5">
                    /{project.slug}
                  </p>
                  <p className="label mt-1.5">
                    {project.category} · {project.status} · {project.date || '—'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="label">
                    {pad(project.metrics.length)} metrics · {pad(project.technologies.length)} tools
                  </p>
                  <p className="label mt-1.5">
                    {project.gallery.length} screenshots · order {project.order}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 md:col-span-1">
                  {project.featured && <Badge tone="accent">feat</Badge>}
                  {project.published ? <Badge>live</Badge> : <Badge>draft</Badge>}
                </div>

                <div className="md:col-span-3 md:flex md:justify-end">
                  <RowActions
                    resource="projects"
                    id={project.id}
                    editHref={`/admin/projects?edit=${project.id}`}
                    flags={{ featured: project.featured, published: project.published }}
                    first={index === 0}
                    last={index === list.length - 1}
                    labels={{ featured: 'featured', published: 'published' }}
                    extra={
                      <form action={duplicateProjectAction}>
                        <input type="hidden" name="id" value={project.id} />
                        <ConfirmButton
                          message="Duplicate this project as a hidden draft?"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line2 hover:text-fg"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        </ConfirmButton>
                      </form>
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="label mt-6 leading-relaxed">
        Categories in use: {categoryNames.join(' · ') || 'none yet'}
      </p>
    </>
  );
}
