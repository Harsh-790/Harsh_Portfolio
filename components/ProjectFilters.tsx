'use client';

import { useMemo, useState } from 'react';
import ProjectCard from './ProjectCard';
import { cn, pad, type Project } from '@/lib/types';

/** Asymmetric four-step rhythm so the grid never reads as a plain card wall. */
function span(i: number): string {
  switch (i % 4) {
    case 0:
      return 'lg:col-span-7';
    case 1:
      return 'lg:col-span-5 lg:mt-16 xl:mt-24';
    case 2:
      return 'lg:col-span-5';
    default:
      return 'lg:col-span-7 lg:mt-16 xl:mt-24';
  }
}

export default function ProjectFilters({
  projects,
  categories,
}: {
  projects: Project[];
  categories: { name: string; count: number }[];
}) {
  const [active, setActive] = useState('All');

  const visible = useMemo(
    () => (active === 'All' ? projects : projects.filter((p) => p.category === active)),
    [projects, active],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="no-bar flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            role="tab"
            aria-selected={active === 'All'}
            onClick={() => setActive('All')}
            className={cn('chip shrink-0', active === 'All' && 'chip-active')}
          >
            All <span className="opacity-60 num">{pad(projects.length)}</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              role="tab"
              aria-selected={active === category.name}
              onClick={() => setActive(category.name)}
              className={cn('chip shrink-0', active === category.name && 'chip-active')}
            >
              {category.name} <span className="opacity-60 num">{pad(category.count)}</span>
            </button>
          ))}
        </div>
        <p className="label num" aria-live="polite">
          {pad(visible.length)} shown
        </p>
      </div>

      <div className="mt-12 grid items-start gap-14 lg:grid-cols-12 lg:gap-8 xl:gap-10">
        {visible.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} className={span(i)} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="body py-20 text-center">No projects in this category yet.</p>
      )}
    </div>
  );
}
