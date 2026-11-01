'use client';

import { useEffect } from 'react';
import AdminUnavailable from '@/components/admin/AdminUnavailable';

/**
 * Parent boundary for errors thrown by the `(panel)` layout. Next.js error
 * boundaries do not catch errors from the layout in the same segment, so this
 * is a second line of defence behind the layout's own outage handling.
 */
export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin segment error:', error);
  }, [error]);

  return <AdminUnavailable message={error.message} reset={reset} />;
}
