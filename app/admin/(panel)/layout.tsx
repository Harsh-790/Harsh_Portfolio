import { requireAdmin } from '@/lib/auth';
import { getCounts } from '@/lib/content';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Every admin page (and every admin action) goes through this check.
  const user = await requireAdmin();
  const counts = await getCounts();

  return (
    <AdminShell user={user} unread={counts.unread}>
      {children}
    </AdminShell>
  );
}
