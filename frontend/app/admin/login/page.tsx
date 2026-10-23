import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { LoginForm } from '@/components/admin/SiteForms';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/admin');

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="dotfield pointer-events-none absolute inset-0 opacity-40" />

      <header className="relative border-b border-line">
        <div className="shell flex h-[60px] items-center justify-between md:h-[68px]">
          <Link href="/" className="display text-[15px] md:text-[17px]">
            Portfolio<span className="ml-0.5 align-super text-[7px]">®</span>
          </Link>
          <span className="label">Private area</span>
        </div>
      </header>

      <main id="main" className="relative flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-[420px]">
          <span className="label">Admin / 01</span>
          <h1 className="display type-3 mt-5">Sign in</h1>
          <p className="body mt-4 text-[14px]">
            Content management for this portfolio. Public visitors never see this page — it is excluded from search
            engines and every route below it requires a valid session.
          </p>

          <div className="card mt-8 p-6">
            <div className="mb-6 flex items-center gap-3 border-b border-line pb-4">
              <Lock className="h-4 w-4 text-muted" aria-hidden />
              <p className="label label-fg">Credentials</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
