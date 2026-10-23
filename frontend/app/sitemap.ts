import type { MetadataRoute } from 'next';
import { getProjects } from '@/lib/content';
import { absoluteUrl } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects();
  const now = new Date();

  const pages = ['', '/about', '/projects', '/experience', '/skills', '/gallery', '/contact'].map((path) => ({
    url: absoluteUrl(path || '/'),
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  return [
    ...pages,
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
