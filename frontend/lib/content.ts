import { ApiError, adminJson, backendJson } from './api';
import {
  jsonArray,
  lines,
  type Experience,
  type GalleryItem,
  type Metric,
  type Profile,
  type Project,
  type Skill,
  type SocialLink,
} from './types';

/** Fixed ObjectId for the single profile document. */
export const PROFILE_ID = '507f1f77bcf86cd799439011';

/* ── row → view model (kept for admin form props) ──────────── */

type ProjectRow = {
  id: string; slug: string; title: string; summary: string; overview: string;
  problem: string; approach: string; datasetInfo: string; modelInfo: string;
  results: string; category: string; status: string; date: string; thumbnail: string;
  videoUrl: string; githubUrl: string; liveUrl: string; datasetUrl: string;
  technologies: string; metrics: string; gallery: string; featured: boolean;
  published: boolean; order: number;
};

type ExperienceRow = {
  id: string; company: string; position: string; location: string; startDate: string;
  endDate: string; current: boolean; description: string; achievements: string;
  technologies: string; published: boolean; order: number;
};

export function toProject(row: ProjectRow): Project {
  return {
    ...row,
    technologies: jsonArray<string>(row.technologies),
    metrics: jsonArray<Metric>(row.metrics),
    gallery: jsonArray<string>(row.gallery),
  };
}

export function toExperience(row: ExperienceRow): Experience {
  return {
    ...row,
    achievements: lines(row.achievements),
    technologies: jsonArray<string>(row.technologies),
  };
}

export const SKILL_CATEGORY_ORDER = ['Programming', 'Data Science', 'Machine Learning', 'AI', 'Tools'];

export function sortByCategory<T extends { category: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = SKILL_CATEGORY_ORDER.indexOf(a.category);
    const bi = SKILL_CATEGORY_ORDER.indexOf(b.category);
    const av = ai === -1 ? 99 : ai;
    const bv = bi === -1 ? 99 : bi;
    if (av !== bv) return av - bv;
    return a.category.localeCompare(b.category);
  });
}

/* ── public reads (frontend → Express API) ─────────────────── */

export async function getProfile(): Promise<Profile> {
  return backendJson<Profile>('/api/public/profile');
}

export type ProjectQuery = {
  featuredOnly?: boolean;
  includeDrafts?: boolean;
  category?: string;
  limit?: number;
};

export async function getProjects(query: ProjectQuery = {}): Promise<Project[]> {
  if (query.includeDrafts) {
    const all = await adminJson<Project[]>('/api/admin/projects');
    let rows = all;
    if (query.featuredOnly) rows = rows.filter((project) => project.featured);
    if (query.category && query.category !== 'All') {
      rows = rows.filter((project) => project.category === query.category);
    }
    return query.limit ? rows.slice(0, query.limit) : rows;
  }

  const params = new URLSearchParams();
  if (query.featuredOnly) params.set('featured', 'true');
  if (query.category && query.category !== 'All') params.set('category', query.category);
  if (query.limit) params.set('limit', String(query.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return backendJson<Project[]>(`/api/public/projects${suffix}`);
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    return await backendJson<Project>(`/api/public/projects/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  const rows = await adminJson<Project[]>('/api/admin/projects');
  return rows.find((project) => project.id === id) ?? null;
}

/** Related = same category first, then anything else, excluding the current project. */
export async function getRelatedProjects(project: Project, take = 3): Promise<Project[]> {
  const all = await getProjects();
  const filtered = all.filter((item) => item.id !== project.id);
  const sameCategory = filtered.filter((item) => item.category === project.category);
  const rest = filtered.filter((item) => item.category !== project.category);
  return [...sameCategory, ...rest].slice(0, take);
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  return backendJson<{ name: string; count: number }[]>('/api/public/categories');
}

export async function getExperience(limit?: number): Promise<Experience[]> {
  const suffix = limit ? `?limit=${limit}` : '';
  return backendJson<Experience[]>(`/api/public/experience${suffix}`);
}

export async function getSkills(): Promise<{ category: string; items: Skill[] }[]> {
  return backendJson<{ category: string; items: Skill[] }[]>('/api/public/skills');
}

export type GalleryQuery = { featuredOnly?: boolean; limit?: number; category?: string };

export async function getGallery(query: GalleryQuery = {}): Promise<GalleryItem[]> {
  const params = new URLSearchParams();
  if (query.featuredOnly) params.set('featured', 'true');
  if (query.category && query.category !== 'All') params.set('category', query.category);
  if (query.limit) params.set('limit', String(query.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return backendJson<GalleryItem[]>(`/api/public/gallery${suffix}`);
}

export async function getGalleryCategories(): Promise<string[]> {
  return backendJson<string[]>('/api/public/gallery-categories');
}

export async function getSocialLinks(visibleOnly = true): Promise<SocialLink[]> {
  if (!visibleOnly) return adminJson<SocialLink[]>('/api/admin/social-links');
  return backendJson<SocialLink[]>('/api/public/social-links');
}

/* ── admin reads ───────────────────────────────────────────── */

export type MessageFilter = 'all' | 'unread' | 'read';

export async function getAdminExperience(): Promise<Experience[]> {
  return adminJson<Experience[]>('/api/admin/experience');
}

export async function getAdminGallery(): Promise<GalleryItem[]> {
  return adminJson<GalleryItem[]>('/api/admin/gallery');
}

export async function getAdminMessages(filter: MessageFilter = 'all') {
  return adminJson<{
    messages: Array<{
      id: string;
      name: string;
      email: string;
      subject: string;
      body: string;
      read: boolean;
      createdAt: string;
    }>;
    total: number;
    unread: number;
  }>(`/api/admin/messages?filter=${filter}`);
}

/** Admin-created records count, used on the dashboard. */
export async function getCounts() {
  return adminJson<{
    projects: number;
    published: number;
    experience: number;
    skills: number;
    gallery: number;
    messages: number;
    unread: number;
  }>('/api/admin/counts');
}

export async function getRecentMessages(take = 4) {
  return adminJson<Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    body: string;
    read: boolean;
    createdAt: string;
  }>>(`/api/admin/recent-messages?take=${take}`);
}
