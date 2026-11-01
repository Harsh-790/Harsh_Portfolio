import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import AdminUnavailable from '@/components/admin/AdminUnavailable';
import { ApiError } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { getCounts } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // A sleeping backend must not fall through to a raw 500 page. Verify the
  // session first, then load the small unread badge; either call can fail.
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    if (error instanceof ApiError && error.status >= 500) {
      return <AdminUnavailable message={error.message} />;
    }
    throw error;
  }

  if (!user) redirect('/admin/login');

  let unread = 0;
  try {
    unread = (await getCounts()).unread;
  } catch (error) {
    if (error instanceof ApiError && error.status >= 500) {
      return <AdminUnavailable message={error.message} />;
    }
    throw error;
  }

  return (
    <AdminShell user={user} unread={unread}>
      {children}
    </AdminShell>
  );
}
