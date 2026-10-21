import { db } from './db';
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

/* ── row → view model ──────────────────────────────────────── */

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

/* ── reads ─────────────────────────────────────────────────── */

export async function getProfile(): Promise<Profile> {
  const row = await db.profile.findUnique({ where: { id: PROFILE_ID } });
  if (row) return row as Profile;
  return {
    id: PROFILE_ID, name: 'Your Name', headline: 'DATA SCIENTIST / AI & ML', role: 'Data Scientist',
    tagline: '', intro: '', location: '', status: '', currentRole: '', company: '', email: '',
    phone: '', bio: '', approach: '', education: '', interests: '', avatar: '', resumeUrl: '', yearsExp: '',
  };
}

export type ProjectQuery = {
  featuredOnly?: boolean;
  includeDrafts?: boolean;
  category?: string;
  limit?: number;
};

export async function getProjects(query: ProjectQuery = {}): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: {
      ...(query.includeDrafts ? {} : { published: true }),
      ...(query.featuredOnly ? { featured: true } : {}),
      ...(query.category && query.category !== 'All' ? { category: query.category } : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    ...(query.limit ? { take: query.limit } : {}),
  });
  return rows.map(toProject);
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const row = await db.project.findUnique({ where: { slug } });
  if (!row || !row.published) return null;
  return toProject(row);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const row = await db.project.findUnique({ where: { id } });
  return row ? toProject(row) : null;
}

/** Related = same category first, then anything else, excluding the current project. */
export async function getRelatedProjects(project: Project, take = 3): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { published: true, id: { not: project.id } },
    orderBy: [{ order: 'asc' }],
  });
  const all = rows.map(toProject);
  const sameCategory = all.filter((p) => p.category === project.category);
  const rest = all.filter((p) => p.category !== project.category);
  return [...sameCategory, ...rest].slice(0, take);
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const rows = await db.project.findMany({ where: { published: true }, select: { category: true } });
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getExperience(limit?: number): Promise<Experience[]> {
  const rows = await db.experience.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }],
    ...(limit ? { take: limit } : {}),
  });
  return rows.map(toExperience);
}

export async function getSkills(): Promise<{ category: string; items: Skill[] }[]> {
  const rows = await db.skill.findMany({ where: { published: true }, orderBy: [{ order: 'asc' }] });
  const grouped = new Map<string, Skill[]>();
  for (const row of rows) {
    const list = grouped.get(row.category) ?? [];
    list.push(row);
    grouped.set(row.category, list);
  }
  return sortByCategory([...grouped.entries()].map(([category, items]) => ({ category, items })));
}

export type GalleryQuery = { featuredOnly?: boolean; limit?: number; category?: string };

export async function getGallery(query: GalleryQuery = {}): Promise<GalleryItem[]> {
  const rows = await db.galleryItem.findMany({
    where: {
      published: true,
      ...(query.featuredOnly ? { featured: true } : {}),
      ...(query.category && query.category !== 'All' ? { category: query.category } : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    ...(query.limit ? { take: query.limit } : {}),
  });
  return rows as GalleryItem[];
}

export async function getGalleryCategories(): Promise<string[]> {
  const rows = await db.galleryItem.findMany({
    where: { published: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category);
}

export async function getSocialLinks(visibleOnly = true): Promise<SocialLink[]> {
  const rows = await db.socialLink.findMany({ orderBy: [{ order: 'asc' }] });
  return rows.filter((r) => !visibleOnly || (r.enabled && r.url.trim().length > 0));
}

/** Admin-created records count, used on the dashboard. */
export async function getCounts() {
  const [projects, published, experience, skills, gallery, messages, unread] = await Promise.all([
    db.project.count(),
    db.project.count({ where: { published: true } }),
    db.experience.count(),
    db.skill.count(),
    db.galleryItem.count(),
    db.message.count(),
    db.message.count({ where: { read: false } }),
  ]);
  return { projects, published, experience, skills, gallery, messages, unread };
}
