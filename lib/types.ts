/* Shared types + tiny helpers. No abstractions beyond what the app needs. */

export type Metric = { label: string; value: string; note?: string };
export type Stat = { label: string; value: string; note?: string };

export type Profile = {
  id: string;
  name: string;
  headline: string;
  role: string;
  tagline: string;
  intro: string;
  location: string;
  status: string;
  currentRole: string;
  company: string;
  email: string;
  phone: string;
  bio: string;
  approach: string;
  education: string;
  interests: string;
  avatar: string;
  resumeUrl: string;
  yearsExp: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  overview: string;
  problem: string;
  approach: string;
  datasetInfo: string;
  modelInfo: string;
  results: string;
  category: string;
  status: string;
  date: string;
  thumbnail: string;
  videoUrl: string;
  githubUrl: string;
  liveUrl: string;
  datasetUrl: string;
  technologies: string[];
  metrics: Metric[];
  gallery: string[];
  featured: boolean;
  published: boolean;
  order: number;
};

export type Experience = {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
  published: boolean;
  order: number;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
  note: string;
  highlight: boolean;
  published: boolean;
  order: number;
};

export type GalleryItem = {
  id: string;
  type: string;
  url: string;
  title: string;
  description: string;
  category: string;
  date: string;
  featured: boolean;
  published: boolean;
  order: number;
};

export type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  order: number;
  enabled: boolean;
};

export type Settings = Record<string, string>;

/* ── helpers ───────────────────────────────────────────────── */

/** `className` joiner — avoids pulling in clsx for four lines of code. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Safely read a JSON array column. */
export function jsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Split a textarea value into non-empty, trimmed lines. */
export function lines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Paragraphs from a textarea (blank line = new paragraph). */
export function paragraphs(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Comma separated values → trimmed array. */
export function commaList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** "2020 — 2024 | B.Tech ..." → { left, right } */
export function splitPair(line: string): { left: string; right: string } {
  const i = line.indexOf('|');
  if (i === -1) return { left: '', right: line.trim() };
  return { left: line.slice(0, i).trim(), right: line.slice(i + 1).trim() };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}

/** Turn any video URL into something embeddable in an iframe (YouTube / Vimeo). */
export function videoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function isLocalVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) && !/^https?:/i.test(url);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── text ⇄ data helpers used by the admin forms ───────────── */

/** "Accuracy | 94.7% | held-out set" per line ⇄ Metric[] */
export function textToRows(text: string): Metric[] {
  return lines(text)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts[0])
    .map(([label, value = '', note = '']) => ({ label, value, note: note || undefined }));
}

export function rowsToText(rows: Metric[] | Stat[]): string {
  return (rows ?? [])
    .map((row) => [row.label, row.value, row.note ?? ''].join(' | ').replace(/\s*\|\s*$/, ''))
    .join('\n');
}

export function listToText(items: string[]): string {
  return (items ?? []).join('\n');
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  if (!path) return base;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
