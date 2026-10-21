import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Braces, Database, ExternalLink, Play } from 'lucide-react';
import Gallery from '@/components/Gallery';
import ProjectCard from '@/components/ProjectCard';
import Reveal from '@/components/Reveal';
import { MetricGrid, Prose, SectionHead, Spec, TagList, Ticks } from '@/components/ui';
import { getProjectBySlug, getProjects, getRelatedProjects } from '@/lib/content';
import { isLocalVideo, pad, videoEmbedUrl } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: 'Project not found' };
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.title,
      description: project.summary,
      type: 'article',
      ...(project.thumbnail ? { images: [{ url: project.thumbnail, alt: project.title }] } : {}),
    },
  };
}

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [related, all] = await Promise.all([getRelatedProjects(project, 3), getProjects()]);
  const position = Math.max(0, all.findIndex((p) => p.id === project.id)) + 1;

  const blocks = [
    { label: 'Overview', value: project.overview },
    { label: 'The problem', value: project.problem },
    { label: 'Approach', value: project.approach },
    { label: 'Dataset', value: project.datasetInfo },
    { label: 'Model', value: project.modelInfo },
    { label: 'Results', value: project.results },
  ].filter((block) => block.value?.trim());

  const links = [
    { url: project.githubUrl, label: 'Source code', icon: Braces },
    { url: project.liveUrl, label: 'Live project', icon: ExternalLink },
    { url: project.datasetUrl, label: 'Dataset', icon: Database },
  ].filter((link) => link.url?.trim());

  const embed = project.videoUrl ? videoEmbedUrl(project.videoUrl) : null;
  const localVideo = project.videoUrl && !embed && isLocalVideo(project.videoUrl);

  return (
    <article>
      {/* ══ header ══ */}
      <section className="pt-8 md:pt-12">
        <div className="shell">
          <div className="flex items-center justify-between gap-4">
            <Link href="/projects" className="link-arrow">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              All projects
            </Link>
            <span className="label num">
              Project {pad(position)} / {pad(all.length)}
            </span>
          </div>
          <div className="hairline mt-5" aria-hidden />

          <div className="mt-9 grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="chip chip-active">{project.category}</span>
                <span className="chip">{project.status}</span>
                <span className="label">{project.date}</span>
              </div>
              <h1 className="display type-1 mt-7 text-balance">{project.title}</h1>
              <p className="body-lg mt-6 max-w-[58ch]">{project.summary}</p>
            </div>

            <div className="lg:col-span-4 lg:pt-2">
              <dl className="rows">
                <Spec label="Category" value={project.category} />
                <Spec label="Status" value={project.status} />
                <Spec label="Year" value={project.date || '—'} />
                <Spec label="Core stack" value={project.technologies.slice(0, 4).join(', ') || '—'} />
              </dl>

              {links.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {links.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn btn-sm"
                    >
                      <link.icon className="h-3.5 w-3.5" aria-hidden />
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ cover ══ */}
      {project.thumbnail && (
        <section className="mt-12 md:mt-16">
          <div className="shell">
            <Reveal>
              <div className="relative">
                <div className="media aspect-[16/10] md:aspect-[16/9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.thumbnail}
                    alt={`${project.title} cover figure`}
                    width={1400}
                    height={1000}
                    className="h-full w-full object-cover"
                  />
                </div>
                <Ticks className="opacity-60" />
              </div>
              <p className="label mt-3.5">
                Fig. 01 — {project.title} / {project.category}
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ══ body ══ */}
      <section className="section">
        <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8 xl:col-span-7">
            {blocks.map((block, i) => (
              <Reveal key={block.label} className="mb-12 border-t border-line pt-7 last:mb-0">
                <div className="flex items-baseline gap-5">
                  <span className="label num">{pad(i + 1)}</span>
                  <h2 className="display type-3">{block.label}</h2>
                </div>
                <div className="mt-5 md:pl-24">
                  <Prose value={block.value} />
                </div>
              </Reveal>
            ))}
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="space-y-9 lg:sticky lg:top-24">
              {project.metrics.length > 0 && (
                <div>
                  <p className="label mb-4">Measured results</p>
                  <MetricGrid metrics={project.metrics} columns={2} />
                </div>
              )}

              {project.technologies.length > 0 && (
                <div className="border-t border-line pt-7">
                  <p className="label mb-4">Technologies</p>
                  <TagList items={project.technologies} />
                </div>
              )}

              {links.length > 0 && (
                <div className="border-t border-line pt-7">
                  <p className="label mb-4">Links</p>
                  <ul className="rows">
                    {links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="group flex items-center justify-between gap-4 py-3"
                        >
                          <span className="flex items-center gap-3 text-[14px] text-fg">
                            <link.icon className="h-4 w-4 text-muted" aria-hidden />
                            {link.label}
                          </span>
                          <ExternalLink
                            className="h-3.5 w-3.5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-line pt-7">
                <p className="label mb-4">Summary</p>
                <p className="text-[13.5px] leading-relaxed text-muted">
                  {project.category} · {project.status} · {project.date}. {project.technologies.length} technologies,{' '}
                  {project.metrics.length} tracked metrics.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ══ screenshots ══ */}
      {project.gallery.length > 0 && (
        <section className="section border-t border-line">
          <div className="shell">
            <SectionHead
              label="Screenshots"
              title="Figures & output"
              lead="Validation plots, dashboards and intermediate output captured while the project ran."
            />
            <div className="mt-12">
              <Gallery
                items={project.gallery.map((url, i) => ({
                  id: `${project.id}-shot-${i}`,
                  type: 'photo',
                  url,
                  title: `${project.title} — figure ${pad(i + 1)}`,
                  description: `${project.category} · captured ${project.date}`,
                  category: project.category,
                  date: project.date,
                }))}
              />
            </div>
          </div>
        </section>
      )}

      {/* ══ video ══ */}
      {project.videoUrl && (
        <section className="section border-t border-line">
          <div className="shell">
            <SectionHead label="Demo" title="Walkthrough" />
            <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-ink">
              {embed ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={embed}
                    title={`${project.title} demo video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              ) : localVideo ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video
                  src={project.videoUrl}
                  poster={project.thumbnail || undefined}
                  controls
                  playsInline
                  className="max-h-[70vh] w-full"
                />
              ) : (
                <a
                  href={project.videoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex aspect-video w-full items-center justify-center gap-3 text-inkfg"
                >
                  <Play className="h-5 w-5" aria-hidden />
                  <span className="label" style={{ color: 'inherit' }}>
                    Open demo video
                  </span>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══ related ══ */}
      {related.length > 0 && (
        <section className="section border-t border-line">
          <div className="shell">
            <SectionHead
              label="Related"
              title="Keep looking"
              action="All projects"
              actionHref="/projects"
            />
            <div className="mt-12 grid gap-14 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {related.map((item, i) => (
                <Reveal key={item.id} delay={i * 70}>
                  <ProjectCard project={item} index={i} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
