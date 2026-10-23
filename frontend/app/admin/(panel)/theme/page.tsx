import { ArrowUpRight } from 'lucide-react';
import { PageHead, Panel } from '@/components/admin/AdminUI';
import { ThemeForm } from '@/components/admin/SiteForms';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminThemePage() {
  await requireAdmin();
  const values = await getSettings();

  return (
    <>
      <PageHead
        label="Site"
        title="Theme"
        description="Light, dark and colour modes are built in. Pick which one visitors land on — their own switch is remembered in the browser."
        action={
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm">
            Preview on site
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        }
      />

      <ThemeForm values={values} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="How the modes differ">
          <ul className="rows">
            <li className="row flex-col items-start gap-1.5 py-3">
              <span className="label label-fg">Light</span>
              <span className="body text-[13px]">
                Paper white background, near-black ink. The default editorial look.
              </span>
            </li>
            <li className="row flex-col items-start gap-1.5 py-3">
              <span className="label label-fg">Dark</span>
              <span className="body text-[13px]">
                Near-black background, warm off-white ink. Accent stays neutral — no neon blue.
              </span>
            </li>
            <li className="row flex-col items-start gap-1.5 py-3">
              <span className="label label-fg">Colour</span>
              <span className="body text-[13px]">
                Warm sand background with the accent below used for labels, links and highlights.
              </span>
            </li>
          </ul>
        </Panel>

        <Panel title="Good to know">
          <ul className="rows">
            <li className="row flex-col items-start gap-1.5 py-3">
              <span className="label label-fg">Switching is instant</span>
              <span className="body text-[13px]">
                The mode is applied before the page paints, so there is no flash of the wrong theme.
              </span>
            </li>
            <li className="row flex-col items-start gap-1.5 py-3">
              <span className="label label-fg">Accent scope</span>
              <span className="body text-[13px]">
                The custom accent is only used in colour mode; light and dark keep the monochrome editorial look.
              </span>
            </li>
            <li className="row flex-col items-start gap-1.5 py-3">
              <span className="label label-fg">Reduced motion</span>
              <span className="body text-[13px]">
                Theme transitions and page animations are skipped automatically for visitors who ask for reduced motion.
              </span>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
