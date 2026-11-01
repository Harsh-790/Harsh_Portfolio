'use client';

import { useEffect } from 'react';
import AdminUnavailable from '@/components/admin/AdminUnavailable';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return <AdminUnavailable message={error.message} reset={reset} />;
}
