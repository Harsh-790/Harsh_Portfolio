import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { getSkills } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { cn, pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: 'Skills',
    description: settings['page.skills.lead'],
    alternates: { canonical: '/skills' },
  };
}

export default async function SkillsPage() {
  const [groups, settings] = await Promise.all([getSkills(), getSettings()]);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const highlighted = groups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.highlight).length,
    0,
  );

  return (
    <>
      <section className="relative overflow-hidden pt-10 pb-12 md:pt-16 md:pb-16">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -top-1 right-0 text-[20vw] leading-none md:text-[12vw]"
        >
          Stack
        </span>
        <div className="shell relative">
          <div className="flex items-center gap-4">
            <span className="label">04 / Toolkit</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="label num">
              {pad(total)} skills · {pad(groups.length)} groups
            </span>
          </div>

          <h1 className="display type-1 mt-9">Skills</h1>
          <p className="body-lg mt-6 max-w-[56ch]">{settings['page.skills.lead']}</p>

          <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
            <div className="bg-bg py-6 pr-6">
              <p className="label">Tools & methods</p>
              <p className="mt-3 font-display text-[28px] leading-none num">{pad(total)}</p>
            </div>
            <div className="bg-bg py-6 sm:px-6">
              <p className="label">Used weekly</p>
              <p className="mt-3 font-display text-[28px] leading-none num">{pad(highlighted)}</p>
            </div>
            <div className="bg-bg py-6 pl-6">
              <p className="label">Groups</p>
              <p className="mt-3 font-display text-[28px] leading-none num">{pad(groups.length)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t border-line pt-10 md:pt-12">
        <div className="shell space-y-16 md:space-y-20">
          {groups.length === 0 && <p className="body">No skills added yet.</p>}

          {groups.map((group, groupIndex) => (
            <div key={group.category}>
              <div className="flex items-center gap-4 pb-4">
                <span className="label num">{pad(groupIndex + 1)}</span>
                <h2 className="label label-fg">{group.category}</h2>
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span className="label num">{pad(group.items.length)}</span>
              </div>
              <div className="hairline" />

              <ul className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((skill, i) => (
                  <Reveal key={skill.id} delay={Math.min(i * 35, 260)} className="bg-bg">
                    <li
                      className={cn(
                        'group h-full p-5 transition-colors',
                        skill.highlight ? 'bg-bg' : 'bg-bg',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[15px] leading-snug font-medium tracking-tight text-fg">{skill.name}</h3>
                        {skill.highlight && (
                          <span
                            aria-label="Used weekly"
                            title="Used weekly"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                          />
                        )}
                      </div>
                      {skill.note && <p className="label mt-3 leading-relaxed">{skill.note}</p>}
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="section border-t border-line bg-bg2">
        <div className="shell flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="label">Note</span>
            <p className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-muted">
              Marks in <span className="inline-flex translate-y-[3px] items-center px-1"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" /></span>{' '}
              indicate tools I use every week. Everything else is usable, but I would rather be honest about depth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/projects" className="btn btn-solid">
              See it applied
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link href="/contact" className="btn">
              Contact
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
