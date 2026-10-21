import type { Metadata } from 'next';
import { Clock, Download, Mail, MapPin } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import { SocialList } from '@/components/SocialLinks';
import { StatusPill } from '@/components/ui';
import { getProfile, getSocialLinks } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { absoluteUrl } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: 'Contact',
    description: settings['page.contact.lead'],
    alternates: { canonical: '/contact' },
  };
}

export default async function ContactPage() {
  const [profile, socials, settings] = await Promise.all([getProfile(), getSocialLinks(), getSettings()]);
  const availability = settings['contact.availability'] || profile.status;

  return (
    <>
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-20">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -top-1 right-0 text-[19vw] leading-none md:text-[11vw]"
        >
          Say hi
        </span>
        <div className="shell relative">
          <div className="flex items-center gap-4">
            <span className="label">06 / Contact</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="label num">{availability}</span>
          </div>

          <h1 className="display type-1 mt-9">Contact</h1>
          <p className="body-lg mt-6 max-w-[54ch]">{settings['page.contact.lead']}</p>

          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
            {/* ── details ── */}
            <div className="lg:col-span-5">
              <div className="card p-6 md:p-7">
                <p className="label">Direct</p>
                <a
                  href={`mailto:${profile.email}`}
                  className="mt-3 flex items-center gap-3 font-display text-[clamp(1.05rem,2.1vw,1.35rem)] tracking-tight transition-opacity hover:opacity-70"
                >
                  <Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <span className="break-all">{profile.email}</span>
                </a>
                <div className="mt-6 border-t border-line pt-6">
                  <StatusPill tone="live">{availability}</StatusPill>
                </div>
              </div>

              <dl className="rows mt-8">
                <div className="row justify-between">
                  <dt className="label flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Location
                  </dt>
                  <dd className="text-[14px] text-fg">{profile.location || '—'}</dd>
                </div>
                <div className="row justify-between">
                  <dt className="label flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    Response time
                  </dt>
                  <dd className="text-[14px] text-fg">{settings['contact.responseTime']}</dd>
                </div>
                <div className="row justify-between">
                  <dt className="label">Current role</dt>
                  <dd className="text-[14px] text-fg">
                    {[profile.currentRole, profile.company].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
                {profile.resumeUrl && (
                  <div className="row justify-between">
                    <dt className="label">Résumé</dt>
                    <dd>
                      <a href={profile.resumeUrl} download className="link-arrow">
                        Download
                        <Download className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-9 border-t border-line pt-6">
                <p className="label mb-3">Profiles</p>
                <SocialList links={socials} />
                {socials.length === 0 && (
                  <p className="body text-[13px]">No public profiles configured yet.</p>
                )}
              </div>

              <p className="label mt-8 leading-relaxed">
                Prefer email over forms? Write to{' '}
                <a href={`mailto:${profile.email}`} className="link-underline label-fg">
                  {profile.email}
                </a>
              </p>
            </div>

            {/* ── form ── */}
            <div className="lg:col-span-7">
              <ContactForm
                title={settings['contact.formTitle'] || 'Send a message'}
                note={settings['contact.formNote']}
              />
              <p className="label mt-5">
                Or reach out directly · {absoluteUrl('/contact').replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
