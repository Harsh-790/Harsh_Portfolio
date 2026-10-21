import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { TagList } from '@/components/ui';
import { getExperience, getProfile } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: 'Experience',
    description: settings['page.experience.lead'],
    alternates: { canonical: '/experience' },
  };
}

export default async function ExperiencePage() {
  const [experience, profile, settings] = await Promise.all([getExperience(), getProfile(), getSettings()]);

  const companies = new Set(experience.map((e) => e.company));
  const current = experience.find((e) => e.current);

  return (
    <>
      <section className="relative overflow-hidden pt-10 pb-12 md:pt-16 md:pb-16">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -top-1 right-0 text-[20vw] leading-none md:text-[12vw]"
        >
          Track
        </span>
        <div className="shell relative">
          <div className="flex items-center gap-4">
            <span className="label">03 / Experience</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="label num">
              {pad(experience.length)} roles · {pad(companies.size)} organisations
            </span>
          </div>

          <h1 className="display type-1 mt-9">Experience</h1>
          <p className="body-lg mt-6 max-w-[56ch]">{settings['page.experience.lead']}</p>

          <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
            <div className="bg-bg py-6 pr-6">
              <p className="label">Currently</p>
              <p className="mt-3 text-[15px] text-fg">
                {current ? current.position : profile.currentRole || '—'}
              </p>
              {current && <p className="label mt-2">{current.company}</p>}
            </div>
            <div className="bg-bg py-6 sm:px-6">
              <p className="label">Years in data</p>
              <p className="mt-3 font-display text-[28px] leading-none num">{profile.yearsExp || '—'}</p>
            </div>
            <div className="bg-bg py-6 pl-6">
              <p className="label">Based in</p>
              <p className="mt-3 text-[15px] text-fg">{profile.location || '—'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t border-line pt-10 md:pt-12">
        <div className="shell">
          {experience.length === 0 && <p className="body">No experience entries yet.</p>}

          {experience.map((item, i) => (
            <Reveal key={item.id} delay={i * 50}>
              <article className="grid gap-6 border-t border-line py-10 lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-3">
                  <span className="label num">
                    {item.startDate} — {item.current ? 'Present' : item.endDate || '—'}
                  </span>
                  {item.location && <p className="label mt-2.5 opacity-70">{item.location}</p>}
                  <p className="label mt-2.5 opacity-70 num">{pad(experience.length - i)}</p>
                </div>

                <div className="lg:col-span-4">
                  <h2 className="display type-3">{item.company}</h2>
                  <p className="label label-fg mt-3">{item.position}</p>
                  {item.technologies.length > 0 && <TagList items={item.technologies} className="mt-5" />}
                </div>

                <div className="lg:col-span-5">
                  {item.description && <p className="body max-w-[62ch]">{item.description}</p>}
                  {item.achievements.length > 0 && (
                    <ul className="mt-6 space-y-3">
                      {item.achievements.map((achievement) => (
                        <li key={achievement} className="flex gap-3.5">
                          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span className="max-w-[58ch] text-[14px] leading-relaxed text-muted">{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
          <div className="border-t border-line" />
        </div>
      </section>

      <section className="section border-t border-line bg-bg2">
        <div className="shell flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="label">Next</span>
            <h2 className="display type-3 mt-5 max-w-[24ch]">See what that experience produced</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/projects" className="btn btn-solid">
              Projects
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link href="/skills" className="btn">
              Skills
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
