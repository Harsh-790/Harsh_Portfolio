import Link from 'next/link';
import { ArrowUpRight, Download, MapPin } from 'lucide-react';
import Reveal from '@/components/Reveal';
import ProjectCard from '@/components/ProjectCard';
import Gallery from '@/components/Gallery';
import { SocialBadges } from '@/components/SocialLinks';
import {
  ArrowLink,
  BarFigure,
  Marquee,
  Prose,
  SectionHead,
  StatusPill,
  TagList,
  Ticks,
} from '@/components/ui';
import {
  getCategories,
  getExperience,
  getGallery,
  getProfile,
  getProjects,
  getSkills,
  getSocialLinks,
} from '@/lib/content';
import { getSettings, parseStats } from '@/lib/settings';
import { cn, commaList, pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [profile, featured, allProjects, experience, skills, gallery, socials, settings, categories] =
    await Promise.all([
      getProfile(),
      getProjects({ featuredOnly: true, limit: 3 }),
      getProjects(),
      getExperience(4),
      getSkills(),
      getGallery({ limit: 6 }),
      getSocialLinks(),
      getSettings(),
      getCategories(),
    ]);

  const s = (key: string) => settings[key] ?? '';
  const stats = parseStats(settings['home.stats']);
  const pipeline = commaList(s('home.hero.pipeline'));
  const interests = commaList(profile.interests);
  const [lead, ...restProjects] = featured;
  const skillCount = skills.reduce((total, group) => total + group.items.length, 0);
  /* Hero secondary image — its own field, falling back to the profile photo. */
  const aboutImage = s('home.about.image') || profile.avatar;

  const ticker = [
    ...categories.map((c) => `${c.name.toUpperCase()} · ${pad(c.count)}`),
    'PYTHON',
    'SQL',
    'PYTORCH',
    'SCIKIT-LEARN',
    profile.status.toUpperCase(),
  ];

  return (
    <>
      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24">
        <div aria-hidden className="dotfield pointer-events-none absolute inset-0 opacity-[0.35]" />
        <span aria-hidden className="watermark pointer-events-none absolute -bottom-6 -left-4 text-[26vw] leading-none md:-bottom-10 md:text-[18vw]">
          {pipeline[0] || 'Data'}
        </span>

        <div className="shell relative">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            {/* ── left: statement ── */}
            <div className="lg:col-span-6 xl:col-span-6">
              <div className="flex items-center gap-4">
                <span className="label">{s('home.hero.eyebrow')}</span>
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span className="label label-fg num">{new Date().getFullYear()}</span>
              </div>

              <h1 className="display type-1 mt-7 md:mt-9">{profile.name}</h1>
              <p className="display mt-4 text-[clamp(1.05rem,2.3vw,1.6rem)] text-muted">{profile.headline}</p>

              <div className="hairline mt-8" aria-hidden />

              <p className="mt-8 max-w-[26ch] font-display text-[clamp(1.3rem,2.6vw,1.85rem)] leading-[1.2] tracking-tight text-balance">
                “{profile.tagline}”
              </p>
              <p className="body mt-6 max-w-[46ch]">{s('home.hero.description') || profile.intro}</p>

              {pipeline.length > 0 && (
                <div className="mt-8 flex flex-wrap items-center gap-2.5">
                  {pipeline.map((word, i) => (
                    <span key={word} className="flex items-center gap-2.5">
                      <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-fg">
                        {pad(i + 1)} {word}
                      </span>
                      {i < pipeline.length - 1 && (
                        <span className="text-line2" aria-hidden>
                          →
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-9 flex flex-wrap items-center gap-2.5">
                <Link href="/projects" className="btn btn-solid">
                  {s('home.hero.primaryCta') || 'View projects'}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                {profile.resumeUrl && (
                  <a href={profile.resumeUrl} download className="btn">
                    {s('home.hero.secondaryCta') || 'Download CV'}
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-line pt-6">
                {profile.location && (
                  <span className="label label-fg flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {profile.location}
                  </span>
                )}
                <SocialBadges links={socials} />
              </div>
            </div>

            {/* ── right: portrait ── */}
            <div className="relative lg:col-span-5 lg:col-start-8">
              <Reveal>
                <div className="relative">
                  <div className="media aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]">
                    {profile.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={profile.avatar}
                        alt={`${profile.name} — ${profile.role}`}
                        width={900}
                        height={1200}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="label">Add a profile photo in the admin</span>
                      </div>
                    )}
                  </div>
                  <Ticks className="opacity-70" />

                  <div className="absolute bottom-4 left-4 max-w-[248px] rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur-sm md:bottom-5 md:left-5">
                    <p className="label">{s('home.hero.cardLabel') || 'Currently'}</p>
                    <p className="mt-2 text-[13.5px] leading-snug text-fg">
                      {s('home.hero.cardValue') || profile.currentRole}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-4">
                  <span className="label">{s('home.hero.imageCaption')}</span>
                  <span className="label num">
                    {profile.yearsExp ? `${profile.yearsExp} YRS EXPERIENCE` : profile.status}
                  </span>
                </div>
              </Reveal>

              <span
                aria-hidden
                className="label absolute top-2 -right-7 hidden xl:block"
                style={{ writingMode: 'vertical-rl' }}
              >
                {profile.role} · {profile.location}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ DATA STRIP ════════════════════════════════════════ */}
      {stats.length > 0 && (
        <section className="border-t border-line">
          <div className="shell">
            <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-bg px-4 py-7 md:px-6 md:py-9">
                  <p className="label">{stat.label}</p>
                  <p className="mt-4 font-display text-[clamp(1.9rem,4vw,2.9rem)] leading-none tracking-tight num">
                    {stat.value}
                  </p>
                  {stat.note && <p className="label mt-3.5">{stat.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ticker */}
      <div className="border-t border-line">
        <Marquee items={ticker} />
      </div>

      {/* ══ ABOUT PREVIEW ═════════════════════════════════════ */}
      <section className="section border-t border-line">
        <div className="shell">
          <SectionHead
            label={s('home.about.label')}
            title={s('home.about.title')}
            accent={s('home.about.titleAccent')}
            action={s('home.about.cta')}
            actionHref="/about"
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-4">
              <div className="media aspect-[4/5]">
                {aboutImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={aboutImage}
                    alt={`${profile.name} — about`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <dl className="rows mt-6">
                <div className="row justify-between">
                  <dt className="label">Experience</dt>
                  <dd className="text-[14px] text-fg num">{profile.yearsExp ? `${profile.yearsExp} years` : '—'}</dd>
                </div>
                <div className="row justify-between">
                  <dt className="label">Based in</dt>
                  <dd className="text-[14px] text-fg">{profile.location || '—'}</dd>
                </div>
                <div className="row justify-between">
                  <dt className="label">Currently</dt>
                  <dd className="max-w-[18ch] text-right text-[14px] text-fg">{profile.currentRole || '—'}</dd>
                </div>
              </dl>
            </Reveal>

            <Reveal delay={80} className="lg:col-span-5">
              <p className="font-display text-[clamp(1.15rem,2.1vw,1.55rem)] leading-snug tracking-tight text-balance">
                {s('home.about.lead')}
              </p>
              <Prose className="mt-6" value={s('home.about.body') || profile.bio} />
              <ArrowLink href="/about" className="mt-8">
                {s('home.about.cta') || 'About me'}
              </ArrowLink>
            </Reveal>

            <Reveal delay={140} className="lg:col-span-3">
              <p className="label">Areas of interest</p>
              <TagList items={interests} className="mt-4" />
              <div className="mt-8 border-t border-line pt-5">
                <p className="label">Certifications</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                  {profile.education
                    .split('\n')
                    .map((l) => l.split('|')[1])
                    .filter(Boolean)
                    .slice(1, 3)
                    .join(' · ')}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ SELECTED PROJECTS ═════════════════════════════════ */}
      <section className="section border-t border-line">
        <div className="shell">
          <SectionHead
            label={s('home.projects.label')}
            title={s('home.projects.title')}
            lead={s('home.projects.lead')}
            action={s('home.projects.cta')}
            actionHref="/projects"
          />

          {featured.length === 0 ? (
            <p className="body mt-12">
              No featured projects yet — mark a project as featured in the admin panel.
            </p>
          ) : (
            <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-8">
              {lead && (
                <Reveal className="lg:col-span-7">
                  <ProjectCard project={lead} index={0} variant="feature" />
                </Reveal>
              )}
              {restProjects.length > 0 && (
                <div className="flex flex-col gap-14 lg:col-span-5">
                  {restProjects.map((project, i) => (
                    <Reveal key={project.id} delay={(i + 1) * 80}>
                      <ProjectCard project={project} index={i + 1} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-6">
            <p className="label num">
              {pad(featured.length)} featured / {pad(allProjects.length)} total projects
            </p>
            <ArrowLink href="/projects">{s('home.projects.cta') || 'All projects'}</ArrowLink>
          </div>
        </div>
      </section>

      {/* ══ SIGNALS ═══════════════════════════════════════════ */}
      <section className="ink-block">
        <div className="shell section">
          <div className="flex items-baseline justify-between gap-6 pb-4">
            <span className="label" style={{ color: 'var(--c-inksoft)' }}>
              {s('home.data.label')}
            </span>
            <span className="label" style={{ color: 'var(--c-inksoft)' }}>
              FIG. A — {pad(allProjects.length)} PROJECTS
            </span>
          </div>
          <div className="h-px w-full bg-inkfg/20" aria-hidden />

          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="display type-2">{s('home.data.title')}</h2>
              <p className="mt-6 max-w-[44ch] text-[15.5px] leading-relaxed text-inksoft">{s('home.data.lead')}</p>

              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-inkfg/20 pt-6">
                <div>
                  <dt className="label" style={{ color: 'var(--c-inksoft)' }}>
                    Projects
                  </dt>
                  <dd className="mt-2.5 font-display text-[26px] leading-none num">{pad(allProjects.length)}</dd>
                </div>
                <div>
                  <dt className="label" style={{ color: 'var(--c-inksoft)' }}>
                    Domains
                  </dt>
                  <dd className="mt-2.5 font-display text-[26px] leading-none num">{pad(categories.length)}</dd>
                </div>
                <div>
                  <dt className="label" style={{ color: 'var(--c-inksoft)' }}>
                    Skills
                  </dt>
                  <dd className="mt-2.5 font-display text-[26px] leading-none num">{pad(skillCount)}</dd>
                </div>
              </dl>

              <p className="label mt-8 max-w-[42ch] leading-relaxed" style={{ color: 'var(--c-inksoft)' }}>
                {s('home.data.note')}
              </p>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <BarFigure
                data={categories.slice(0, 7).map((c) => ({ label: c.name.toUpperCase(), count: c.count }))}
              />
              <p className="label mt-5" style={{ color: 'var(--c-inksoft)' }}>
                Projects by category
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ EXPERIENCE PREVIEW ════════════════════════════════ */}
      <section className="section border-t border-line">
        <div className="shell">
          <SectionHead
            label={s('home.experience.label')}
            title={s('home.experience.title')}
            lead={s('home.experience.lead')}
            action={s('home.experience.cta')}
            actionHref="/experience"
          />

          <ul className="mt-12">
            {experience.map((item, i) => (
              <Reveal key={item.id} delay={i * 60}>
                <li className="grid gap-3 border-t border-line py-7 md:grid-cols-12 md:gap-8">
                  <div className="md:col-span-3">
                    <span className="label num">
                      {item.startDate} — {item.current ? 'Present' : item.endDate}
                    </span>
                    {item.location && <p className="label mt-2 opacity-70">{item.location}</p>}
                  </div>
                  <div className="md:col-span-4">
                    <h3 className="display type-4">{item.company}</h3>
                    <p className="label label-fg mt-2.5">{item.position}</p>
                  </div>
                  <div className="md:col-span-5">
                    <p className="body max-w-[62ch]">{item.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
            <li className="border-t border-line" />
          </ul>

          <ArrowLink href="/experience" className="mt-8">
            {s('home.experience.cta') || 'Full timeline'}
          </ArrowLink>
        </div>
      </section>

      {/* ══ SKILLS ════════════════════════════════════════════ */}
      <section className="section border-t border-line bg-bg2">
        <div className="shell">
          <SectionHead
            label={s('home.skills.label')}
            title={s('home.skills.title')}
            lead={s('home.skills.lead')}
            action={s('home.skills.cta')}
            actionHref="/skills"
          />

          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-0">
            {skills.map((group, i) => (
              <Reveal
                key={group.category}
                delay={i * 60}
                className={cn('lg:px-6', i === 0 ? 'lg:pl-0' : 'lg:border-l lg:border-line')}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display type-4">{group.category}</h3>
                  <span className="label num">{pad(group.items.length)}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {group.items.map((skill) => (
                    <li key={skill.id} className="flex items-center justify-between gap-3">
                      <span className={cn('text-[14px]', skill.highlight ? 'text-fg' : 'text-muted')}>
                        {skill.name}
                      </span>
                      {skill.highlight && <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-accent" />}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-6">
            <p className="label flex items-center gap-2">
              <span aria-hidden className="h-1 w-1 rounded-full bg-accent" /> Used weekly
            </p>
            <ArrowLink href="/skills">{s('home.skills.cta') || 'Skill detail'}</ArrowLink>
          </div>
        </div>
      </section>

      {/* ══ GALLERY PREVIEW ═══════════════════════════════════ */}
      <section className="section border-t border-line">
        <div className="shell">
          <SectionHead
            label={s('home.gallery.label')}
            title={s('home.gallery.title')}
            lead={s('home.gallery.lead')}
            action={s('home.gallery.cta')}
            actionHref="/gallery"
          />
          <div className="mt-12">
            <Gallery items={gallery} />
          </div>
        </div>
      </section>

      {/* ══ CONTACT CTA ═══════════════════════════════════════ */}
      <section className="section border-t border-line">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
            <div className="lg:col-span-7">
              <span className="label">{s('home.contact.label')}</span>
              <h2 className="display type-1 mt-6">{s('home.contact.title')}</h2>
              <p className="body-lg mt-6 max-w-[46ch]">{s('home.contact.lead')}</p>
            </div>

            <div className="lg:col-span-5">
              <div className="card p-6 md:p-8">
                <p className="label">Direct</p>
                <a
                  href={`mailto:${profile.email}`}
                  className="mt-3 block font-display text-[clamp(1.15rem,2.4vw,1.6rem)] tracking-tight break-all transition-opacity hover:opacity-70"
                >
                  {profile.email}
                </a>
                <div className="mt-7 flex flex-wrap items-center gap-2.5">
                  <Link href="/contact" className="btn btn-solid">
                    {s('home.contact.cta') || 'Contact'}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  {profile.resumeUrl && (
                    <a href={profile.resumeUrl} download className="btn">
                      CV
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
                <div className="mt-7 border-t border-line pt-6">
                  <StatusPill tone="live">{s('contact.availability') || profile.status}</StatusPill>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
