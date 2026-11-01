import { mkdir, rename, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import fallbackSnapshot from '@/data/public-content.json';
import {
  type Experience,
  type GalleryItem,
  type Profile,
  type Project,
  type Skill,
  type SocialLink,
  type Settings,
} from './types';

/**
 * Public pages are rendered from a snapshot that ships with the frontend.
 * No public page calls the Express API during server rendering, so a sleeping
 * backend can never delay, redirect or blank the portfolio.
 *
 * If the frontend runtime can read its own data file, that copy wins. This lets
 * an authenticated admin action refresh the snapshot and revalidate the public
 * pages without a redeploy. Otherwise the build-time copy above is used.
 */

export type PublicSnapshot = {
  version: 1;
  generatedAt: string;
  profile: Profile;
  projects: Project[];
  experience: Experience[];
  skills: { category: string; items: Skill[] }[];
  gallery: GalleryItem[];
  socials: SocialLink[];
  categories: { name: string; count: number }[];
  galleryCategories: string[];
  settings: Settings;
};

const SNAPSHOT_PATH = join(process.cwd(), 'data', 'public-content.json');

let memorySnapshot: PublicSnapshot | null = null;
let cachedRaw = '';
let cachedSnapshot: PublicSnapshot | null = null;

function looksLikeSnapshot(value: unknown): value is PublicSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PublicSnapshot>;
  return (
    candidate.version === 1 &&
    Boolean(candidate.profile) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.experience) &&
    Array.isArray(candidate.skills) &&
    Array.isArray(candidate.gallery) &&
    Array.isArray(candidate.socials) &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.galleryCategories) &&
    Boolean(candidate.settings)
  );
}

function loadSnapshot(): PublicSnapshot {
  if (memorySnapshot) return memorySnapshot;

  try {
    const raw = readFileSync(SNAPSHOT_PATH, 'utf8');
    if (raw !== cachedRaw) {
      const parsed: unknown = JSON.parse(raw);
      cachedSnapshot = looksLikeSnapshot(parsed) ? parsed : null;
      cachedRaw = raw;
    }
    if (cachedSnapshot) return cachedSnapshot;
  } catch {
    /* A missing or unreadable runtime file falls back to the bundled copy. */
  }

  return fallbackSnapshot as PublicSnapshot;
}

/** Persist a fresh snapshot when the server filesystem is writable. */
export async function refreshPublicContentFromBackend(): Promise<boolean> {
  try {
    // Imported lazily so build-only public pages do not pull the API client
    // into their server-render graph.
    const { backendJson } = await import('./api');
    const next = await backendJson<unknown>('/api/public/snapshot');
    if (!looksLikeSnapshot(next)) return false;

    memorySnapshot = next;
    cachedSnapshot = next;
    cachedRaw = '';

    try {
      const serialized = `${JSON.stringify(next, null, 2)}\n`;
      await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
      const temporary = `${SNAPSHOT_PATH}.tmp`;
      await writeFile(temporary, serialized, 'utf8');
      await rename(temporary, SNAPSHOT_PATH);
      cachedRaw = serialized;
    } catch {
      // Read-only or ephemeral filesystems are fine: memory still serves the
      // refreshed content for this process.
    }

    return true;
  } catch {
    return false;
  }
}

/* ── public selectors ──────────────────────────────────────── */

export function getProfile(): Profile {
  return loadSnapshot().profile;
}

export type ProjectQuery = {
  featuredOnly?: boolean;
  category?: string;
  limit?: number;
};

export function getProjects(query: ProjectQuery = {}): Project[] {
  let rows = [...loadSnapshot().projects];
  if (query.featuredOnly) rows = rows.filter((project) => project.featured);
  if (query.category && query.category !== 'All') {
    rows = rows.filter((project) => project.category === query.category);
  }
  return query.limit ? rows.slice(0, query.limit) : rows;
}

export function getProjectBySlug(slug: string): Project | null {
  return loadSnapshot().projects.find((project) => project.slug === slug) ?? null;
}

/** Related = same category first, then anything else, excluding the current project. */
export function getRelatedProjects(project: Project, take = 3): Project[] {
  const filtered = loadSnapshot().projects.filter((item) => item.id !== project.id);
  const sameCategory = filtered.filter((item) => item.category === project.category);
  const rest = filtered.filter((item) => item.category !== project.category);
  return [...sameCategory, ...rest].slice(0, take);
}

export function getCategories(): { name: string; count: number }[] {
  return [...loadSnapshot().categories];
}

export function getExperience(limit?: number): Experience[] {
  const rows = [...loadSnapshot().experience];
  return limit ? rows.slice(0, limit) : rows;
}

export function getSkills(): { category: string; items: Skill[] }[] {
  return loadSnapshot().skills.map((group) => ({
    category: group.category,
    items: [...group.items],
  }));
}

export type GalleryQuery = { featuredOnly?: boolean; category?: string; limit?: number };

export function getGallery(query: GalleryQuery = {}): GalleryItem[] {
  let rows = [...loadSnapshot().gallery];
  if (query.featuredOnly) rows = rows.filter((item) => item.featured);
  if (query.category && query.category !== 'All') {
    rows = rows.filter((item) => item.category === query.category);
  }
  return query.limit ? rows.slice(0, query.limit) : rows;
}

export function getGalleryCategories(): string[] {
  return [...loadSnapshot().galleryCategories];
}

export function getSocialLinks(): SocialLink[] {
  return [...loadSnapshot().socials];
}

export function getSettings(): Settings {
  return loadSnapshot().settings;
}
