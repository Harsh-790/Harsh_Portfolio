import { ArrowUpRight } from 'lucide-react';
import { PageHead, Panel } from '@/components/admin/AdminUI';
import { ConfirmButton } from '@/components/admin/Fields';
import { PasswordForm, SettingsForm } from '@/components/admin/SiteForms';
import { resetSettingsAction } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { SETTING_GROUPS } from '@/lib/schemas';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const SITE_GROUPS = ['seo', 'footer', 'gullu'];

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const values = await getSettings();
  const groups = SETTING_GROUPS.filter((group) => SITE_GROUPS.includes(group.id));

  return (
    <>
      <PageHead
        label="Site"
        title="Settings"
        description="Metadata used for search engines and social sharing, the footer text, the Gullu assistant, and the admin password."
      />

      <SettingsForm groups={groups} values={values} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Restore default text"
          description="Wipes every saved text override — homepage, section pages, SEO and footer — and reloads the values shipped with the project."
          footer={
            <form action={resetSettingsAction}>
              <ConfirmButton message="Reset all editable text back to the shipped defaults?" className="btn btn-sm">
                Reset all text to defaults
              </ConfirmButton>
            </form>
          }
        >
          <p className="body text-[13px]">
            Content records (projects, experience, skills, gallery, social links and messages) are not touched — only the
            text fields listed on this page, the homepage page and the theme page.
          </p>
        </Panel>

        <Panel title="Account" description="The login account lives in MongoDB. .env values are only used to create the first admin during seeding.">
          <dl className="rows">
            <div className="row justify-between">
              <dt className="label">Sign-in email</dt>
              <dd className="text-[13px] text-fg">{admin.email}</dd>
            </div>
            <div className="row justify-between">
              <dt className="label">Session cookie</dt>
              <dd className="text-[13px] text-fg">portfolio_session · signed, httpOnly</dd>
            </div>
            <div className="row justify-between">
              <dt className="label">Public site</dt>
              <dd>
                <a href="/" target="_blank" rel="noreferrer" className="link-arrow">
                  Open
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </dd>
            </div>
          </dl>
          <p className="field-hint mt-4">
            Use <span className="label-fg">Change password</span> below to update the password; the
            current password is required. Changing <span className="label-fg">ADMIN_EMAIL</span> or{' '}
            <span className="label-fg">ADMIN_PASSWORD</span> in <span className="label-fg">.env</span>{' '}
            does not change an existing account.
          </p>
        </Panel>
      </div>

      <div className="mt-6">
        <PasswordForm />
      </div>
    </>
  );
}
