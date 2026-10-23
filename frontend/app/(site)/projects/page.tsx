import type { Metadata } from 'next';
import ProjectFilters from '@/components/ProjectFilters';
import { ArrowLink } from '@/components/ui';
import { getCategories, getProjects } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: 'Projects',
    description: settings['page.projects.lead'],
    alternates: { canonical: '/projects' },
  };
}

export default async function ProjectsPage() {
  const [projects, categories, settings] = await Promise.all([getProjects(), getCategories(), getSettings()]);

  return (
    <>
      <section className="relative overflow-hidden pt-10 pb-12 md:pt-16 md:pb-16">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -top-1 right-0 text-[22vw] leading-none md:text-[13vw]"
        >
          Work
        </span>
        <div className="shell relative">
          <div className="flex items-center gap-4">
            <span className="label">02 / Projects</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="label num">
              {pad(projects.length)} projects · {pad(categories.length)} domains
            </span>
          </div>

          <h1 className="display type-1 mt-9">Selected work</h1>
          <p className="body-lg mt-6 max-w-[56ch]">{settings['page.projects.lead']}</p>
        </div>
      </section>

      <section className="section border-t border-line pt-10 md:pt-12">
        <div className="shell">
          <ProjectFilters projects={projects} categories={categories} />
        </div>
      </section>

      <section className="section border-t border-line">
        <div className="shell flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="label">End of list</span>
            <h2 className="display type-3 mt-5 max-w-[22ch]">
              Every project above shipped with a metric attached.
            </h2>
          </div>
          <ArrowLink href="/contact">Discuss a project</ArrowLink>
        </div>
      </section>
    </>
  );
}
