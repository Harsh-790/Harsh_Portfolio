import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Gallery from '@/components/Gallery';
import { getGallery } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import { pad } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: 'Gallery',
    description: settings['page.gallery.lead'],
    alternates: { canonical: '/gallery' },
  };
}

export default async function GalleryPage() {
  const [items, settings] = await Promise.all([getGallery(), getSettings()]);
  const photos = items.filter((i) => i.type !== 'video').length;
  const videos = items.filter((i) => i.type === 'video').length;

  return (
    <>
      <section className="relative overflow-hidden pt-10 pb-12 md:pt-16 md:pb-16">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -top-1 right-0 text-[20vw] leading-none md:text-[12vw]"
        >
          Notes
        </span>
        <div className="shell relative">
          <div className="flex items-center gap-4">
            <span className="label">05 / Gallery</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="label num">
              {pad(photos)} photos · {pad(videos)} videos
            </span>
          </div>

          <h1 className="display type-1 mt-9">Gallery</h1>
          <p className="body-lg mt-6 max-w-[56ch]">{settings['page.gallery.lead']}</p>
        </div>
      </section>

      <section className="section border-t border-line pt-10 md:pt-12">
        <div className="shell">
          <Gallery items={items} showFilters />
        </div>
      </section>

      <section className="section border-t border-line bg-bg2">
        <div className="shell flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="label">Also worth a look</span>
            <h2 className="display type-3 mt-5 max-w-[22ch]">Project figures and validation plots live inside each case study</h2>
          </div>
          <Link href="/projects" className="btn btn-solid shrink-0">
            Browse projects
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
