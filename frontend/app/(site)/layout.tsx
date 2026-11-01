import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Gullu from '@/components/Gullu';
import PageShell from '@/components/PageShell';
import { getProfile, getSettings, getSocialLinks } from '@/lib/public-content';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const profile = getProfile();
  const socials = getSocialLinks();
  const settings = getSettings();

  return (
    <div className="flex min-h-dvh flex-col">
      <Header name={profile.name} role={profile.role} />
      <PageShell>{children}</PageShell>
      <div className="mt-auto">
        <Footer profile={profile} socials={socials} settings={settings} />
      </div>
      {settings['gullu.enabled'] === 'on' && (
        <Gullu
          greeting={
            settings['gullu.greeting'] ||
            "Hi, I'm Gullu. Ask me anything about Harsh — his projects, skills, experience or how to reach him."
          }
          description={settings['gullu.description'] || 'Portfolio assistant — Harsh’s work, in plain words.'}
          voice={settings['gullu.voice'] === 'on'}
        />
      )}
    </div>
  );
}
