import { ArrowUpRight } from 'lucide-react';
import { PageHead } from '@/components/admin/AdminUI';
import { SettingsForm } from '@/components/admin/SiteForms';
import { requireAdmin } from '@/lib/auth';
import { SETTING_GROUPS } from '@/lib/schemas';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** Groups that shape the homepage and the intro lines of the section pages. */
const HOME_GROUPS = [
  'hero',
  'stats',
  'home-about',
  'home-projects',
  'home-data',
  'home-experience',
  'home-skills',
  'home-gallery',
  'home-contact',
  'pages',
  'contact',
];

export default async function AdminHomepagePage() {
  await requireAdmin();
  const values = await getSettings();
  const groups = SETTING_GROUPS.filter((group) => HOME_GROUPS.includes(group.id));

  return (
    <>
      <PageHead
        label="Content"
        title="Homepage text"
        description="Every heading, paragraph, label and button on the homepage — and the intro line of each section page. Nothing here is hardcoded in the code."
        action={
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm">
            View site
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        }
      />

      <SettingsForm groups={groups} values={values} />

      <p className="label mt-6 leading-relaxed">
        Tip: use the Media page to upload before pointing any image field at a file.
      </p>
    </>
  );
}
