import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn, pad, type Project } from '@/lib/types';

/**
 * Project card, used on the homepage and on /projects.
 * `variant="feature"` is the large editorial block, `compact` the stacked one.
 */
export default function ProjectCard({
  project,
  index,
  variant = 'compact',
  className,
}: {
  project: Project;
  index: number;
  variant?: 'feature' | 'compact';
  className?: string;
}) {
  const feature = variant === 'feature';
  const tech = project.technologies.slice(0, feature ? 4 : 3);
  const metrics = project.metrics.slice(0, feature ? 3 : 1);

  return (
    <article className={cn('group', className)}>
      <Link href={`/projects/${project.slug}`} className="block focus-visible:outline-offset-4">
        <div className={cn('media media-zoom', feature ? 'aspect-[16/11] md:aspect-[16/10]' : 'aspect-[16/10]')}>
          {project.thumbnail ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={project.thumbnail}
              alt={`${project.title} — ${project.category}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="label">No cover</span>
            </div>
          )}

          <span className="absolute top-3.5 left-3.5 z-10 rounded-full bg-bg/85 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-fg backdrop-blur-sm">
            {project.category}
          </span>
          <span className="absolute top-3.5 right-3.5 z-10 font-mono text-[9.5px] tracking-[0.16em] text-fg/70">
            {pad(index + 1)}
          </span>
          <span className="pointer-events-none absolute right-3.5 bottom-3.5 z-10 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-fg text-bg opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <div className={cn('flex items-baseline justify-between gap-4', feature ? 'mt-6' : 'mt-5')}>
          <h3 className={cn('display transition-opacity group-hover:opacity-70', feature ? 'text-[clamp(1.5rem,3vw,2.1rem)]' : 'type-4')}>
            {project.title}
          </h3>
          <span className="label shrink-0 num">{project.date}</span>
        </div>

        <p className={cn('body mt-2.5 max-w-[54ch]', feature ? 'text-[15.5px] md:max-w-[60ch]' : 'line-clamp-2')}>
          {project.summary}
        </p>

        {metrics.length > 0 && (
          <dl className={cn('mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4')}>
            {metrics.map((m) => (
              <div key={m.label}>
                <dt className="label-sm">{m.label}</dt>
                <dd className="mt-1.5 font-display text-[19px] leading-none tracking-tight num">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {tech.length > 0 && (
          <p className="label mt-4">{tech.join(' · ')}</p>
        )}
      </Link>
    </article>
  );
}
