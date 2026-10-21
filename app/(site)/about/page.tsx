import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Download, MapPin } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { SocialList } from '@/components/SocialLinks';
import { ArrowLink, Prose, SplitRows, StatusPill, TagList, Ticks } from '@/components/ui';
import { getProfile, getSkills, getSocialLinks } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { commaList, lines, pad, splitPair } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  return {
    title: 'About',
    description: profile.intro || profile.bio.slice(0, 150),
    alternates: { canonical: '/about' },
  };
}

export default async function AboutPage() {
  const [profile, socials, settings, skills] = await Promise.all([
    getProfile(),
    getSocialLinks(),
    getSettings(),
    getSkills(),
  ]);

  const approach = lines(profile.approach).map((line) => splitPair(line));
  const interests = commaList(profile.interests);
  const skillCount = skills.reduce((total, group) => total + group.items.length, 0);
  const meta = [
    { label: 'Name', value: profile.name },
    { label: 'Role', value: profile.role },
    { label: 'Based in', value: profile.location },
    { label: 'Experience', value: profile.yearsExp ? `${profile.yearsExp} years` : '—' },
    { label: 'Currently', value: [profile.currentRole, profile.company].filter(Boolean).join(' · ') },
    { label: 'Skills tracked', value: pad(skillCount) },
  ];

  return (
    <>
      {/* ── page header ── */}
      <section className="relative overflow-hidden pt-10 pb-14 md:pt-16 md:pb-20">
        <span aria-hidden className="watermark pointer-events-none absolute -top-2 right-0 text-[24vw] leading-none md:text-[15vw]">
          About
        </span>
        <div className="shell relative">
          <div className="flex items-center gap-4">
            <span className="label">01 / About</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="label num">{profile.location}</span>
          </div>

          <div className="mt-9 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <h1 className="display type-1">{profile.role}</h1>
              <p className="body-lg mt-6 max-w-[52ch]">{settings['page.about.lead']}</p>

              <div className="mt-9 flex flex-wrap items-center gap-2.5">
                <Link href="/contact" className="btn btn-solid">
                  Work with me
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                {profile.resumeUrl && (
                  <a href={profile.resumeUrl} download className="btn">
                    Download CV
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-5 border-t border-line pt-6">
                <StatusPill tone="live">{settings['contact.availability'] || profile.status}</StatusPill>
                <span className="label label-fg flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {profile.location}
                </span>
              </div>
            </div>

            <Reveal className="lg:col-span-4 lg:col-start-9">
              <div className="relative">
                <div className="media aspect-[4/5]">
                  {profile.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profile.avatar}
                      alt={`${profile.name} — ${profile.role}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <Ticks />
              </div>
              <p className="label mt-3.5">Profile / {profile.name}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── biography ── */}
      <section className="section border-t border-line">
        <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-3">
            <span className="label">02 / Biography</span>
          </div>
          <Reveal className="lg:col-span-6">
            <Prose value={profile.bio} />
          </Reveal>
          <Reveal delay={80} className="lg:col-span-3">
            <dl className="rows">
              {meta.map((item) => (
                <div key={item.label} className="row flex-col gap-1.5 py-3">
                  <dt className="label">{item.label}</dt>
                  <dd className="text-[14px] leading-snug text-fg">{item.value || '—'}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ── approach ── */}
      {approach.length > 0 && (
        <section className="section border-t border-line bg-bg2">
          <div className="shell">
            <div className="flex items-center gap-4 pb-4">
              <span className="label">03 / Approach</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span className="label num">{pad(approach.length)} steps</span>
            </div>
            <div className="hairline" />
            <h2 className="display type-2 mt-7 max-w-[20ch]">How I run a project</h2>

            <ol className="mt-12 grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
              {approach.map((item, i) => (
                <li key={item.right} className="bg-bg2 p-6 md:p-8">
                  <span className="label num">{pad(i + 1)}</span>
                  <h3 className="display type-4 mt-6">{item.left || item.right}</h3>
                  {item.left && <p className="body mt-4 max-w-[46ch]">{item.right}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── education + interests ── */}
      <section className="section border-t border-line">
        <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-4 pb-4">
              <span className="label">04 / Education</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>
            <div className="hairline" />
            <SplitRows value={profile.education} className="mt-2" />
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="flex items-center gap-4 pb-4">
              <span className="label">05 / Interests</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>
            <div className="hairline" />
            <TagList items={interests} className="mt-6" />

            <div className="mt-9 border-t border-line pt-6">
              <p className="label mb-3">Elsewhere</p>
              <SocialList links={socials} />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section border-t border-line">
        <div className="shell flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="label">Next</span>
            <h2 className="display type-2 mt-5 max-w-[18ch]">See the work, then the numbers</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/projects" className="btn btn-solid">
              Projects
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link href="/contact" className="btn">
              Contact
            </Link>
          </div>
        </div>
        <div className="shell mt-12">
          <ArrowLink href="/skills">Browse the toolkit</ArrowLink>
        </div>
      </section>
    </>
  );
}
