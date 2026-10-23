import { ArrowUpRight } from 'lucide-react';
import { PageHead } from '@/components/admin/AdminUI';
import { ProfileForm } from '@/components/admin/SiteForms';
import { requireAdmin } from '@/lib/auth';
import { getProfile } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function AdminAboutPage() {
  await requireAdmin();
  const profile = await getProfile();

  return (
    <>
      <PageHead
        label="Content"
        title="Profile & about"
        description="Your identity, biography, approach, education and the files every “Download CV” button points to."
        action={
          <a href="/about" target="_blank" rel="noreferrer" className="btn btn-sm">
            View /about
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        }
      />

      <ProfileForm profile={profile} />
    </>
  );
}
