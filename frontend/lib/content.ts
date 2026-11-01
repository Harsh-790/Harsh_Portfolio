import { adminJson } from './api';
import {
  jsonArray,
  lines,
  type Experience,
  type GalleryItem,
  type Metric,
  type Profile,
  type Project,
  type Skill,
  type Settings,
  type SocialLink,
} from './types';

/**
 * Admin-only data access. Public pages use lib/public-content.ts and never load
 * anything from the API. These functions are called by authenticated admin
 * pages and server actions, so a sleeping backend only affects the panel.
 */

/** Fixed ObjectId for the single profile document (admin forms use it). */
export const PROFILE_ID = '507f1f77bcf86cd799439011';

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

/* ── admin reads ───────────────────────────────────────────── */

export async function getAdminProfile(): Promise<Profile> {
  return adminJson<Profile>('/api/admin/profile');
}

export async function getAdminSettings(): Promise<Settings> {
  return adminJson<Settings>('/api/admin/settings');
}

export async function getAdminProjects(): Promise<Project[]> {
  return adminJson<Project[]>('/api/admin/projects');
}

export async function getAdminExperience(): Promise<Experience[]> {
  return adminJson<Experience[]>('/api/admin/experience');
}

export async function getAdminSkills(): Promise<{ category: string; items: Skill[] }[]> {
  return adminJson<{ category: string; items: Skill[] }[]>('/api/admin/skills');
}

export async function getAdminGallery(): Promise<GalleryItem[]> {
  return adminJson<GalleryItem[]>('/api/admin/gallery');
}

export async function getAdminSocialLinks(): Promise<SocialLink[]> {
  return adminJson<SocialLink[]>('/api/admin/social-links');
}

export type MessageFilter = 'all' | 'unread' | 'read';

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
