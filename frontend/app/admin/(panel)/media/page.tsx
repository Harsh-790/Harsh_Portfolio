import { PageHead } from '@/components/admin/AdminUI';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  return (
    <>
      <PageHead
        label="Library"
        title="Media"
        description="Every uploaded file in one place: preview, copy the URL, reuse it in a form, or delete it. Content forms read from this same library."
      />
      <MediaLibrary />
    </>
  );
}
