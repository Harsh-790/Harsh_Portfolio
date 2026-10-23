import { prisma } from '../lib/prisma';
import { DEFAULT_SETTINGS, SETTING_GROUPS } from '../lib/schemas';
import {
  galleryMediaUrls,
  profileMediaUrls,
  projectMediaUrls,
  releaseMediaUrls,
  settingMediaUrls,
} from '../lib/media-references';
import { lines, slugify, textToRows } from '../lib/types';
import { PROFILE_ID } from './content';

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  errors?: Record<string, string>;
};

export type FormBody = Record<string, unknown>;

/* ── JSON representations of the original FormData fields ─── */

function values(body: FormBody, key: string): string[] {
  const value = body[key];
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function first(body: FormBody, key: string): string {
  return values(body, key)[0] ?? '';
}

function str(body: FormBody, key: string): string {
  return first(body, key).trim();
}

function raw(body: FormBody, key: string): string {
  // Browsers submit textarea newlines as CRLF; store the same LF style as the
  // seeded content so editing a field never rewrites unrelated line endings.
  return first(body, key).replace(/\r\n?/g, '\n');
}

function bool(body: FormBody, key: string): boolean {
  const value = body[key];
  return value === 'on' || value === 'true' || value === '1' || value === true;
}

function num(body: FormBody, key: string, fallback = 0): number {
  const value = Number(first(body, key));
  return Number.isFinite(value) ? value : fallback;
}

function list(body: FormBody, key: string): string[] {
  return lines(raw(body, key));
}

/* ── profile ───────────────────────────────────────────────── */

export async function saveProfile(body: FormBody): Promise<ActionResult> {
  const name = str(body, 'name');
  if (!name) return { ok: false, message: 'A display name is required.' };

  const existing = await prisma.profile.findUnique({ where: { id: PROFILE_ID } });
  const data = {
    name,
    headline: str(body, 'headline'),
    role: str(body, 'role'),
    tagline: str(body, 'tagline'),
    intro: raw(body, 'intro'),
    location: str(body, 'location'),
    status: str(body, 'status'),
    currentRole: str(body, 'currentRole'),
    company: str(body, 'company'),
    email: str(body, 'email'),
    phone: str(body, 'phone'),
    bio: raw(body, 'bio'),
    approach: raw(body, 'approach'),
    education: raw(body, 'education'),
    interests: raw(body, 'interests'),
    avatar: str(body, 'avatar'),
    resumeUrl: str(body, 'resumeUrl'),
    yearsExp: str(body, 'yearsExp'),
  };

  await prisma.profile.upsert({
    where: { id: PROFILE_ID },
    update: data,
    create: { id: PROFILE_ID, ...data },
  });
  await releaseMediaUrls(profileMediaUrls(existing));
  return { ok: true, message: 'Profile saved — the whole site has been updated.' };
}

/* ── projects ──────────────────────────────────────────────── */

export async function saveProject(body: FormBody): Promise<ActionResult> {
  const id = str(body, 'id');
  const title = str(body, 'title');
  if (!title) return { ok: false, message: 'A project title is required.' };

  const existing = id ? await prisma.project.findUnique({ where: { id } }) : null;

  let slug = slugify(str(body, 'slug') || title);
  if (!slug) slug = `project-${Date.now().toString(36)}`;

  const clash = await prisma.project.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const galleryValues = values(body, 'gallery').map((value) => value.trim()).filter(Boolean);
  const gallery = galleryValues.length ? galleryValues : list(body, 'gallery');

  const data = {
    title,
    slug,
    summary: raw(body, 'summary'),
    overview: raw(body, 'overview'),
    problem: raw(body, 'problem'),
    approach: raw(body, 'approach'),
    datasetInfo: raw(body, 'datasetInfo'),
    modelInfo: raw(body, 'modelInfo'),
    results: raw(body, 'results'),
    category: str(body, 'category') || 'Machine Learning',
    status: str(body, 'status') || 'In progress',
    date: str(body, 'date'),
    thumbnail: str(body, 'thumbnail'),
    videoUrl: str(body, 'videoUrl'),
    githubUrl: str(body, 'githubUrl'),
    liveUrl: str(body, 'liveUrl'),
    datasetUrl: str(body, 'datasetUrl'),
    technologies: JSON.stringify(list(body, 'technologies')),
    metrics: JSON.stringify(textToRows(raw(body, 'metrics'))),
    gallery: JSON.stringify(gallery),
    featured: bool(body, 'featured'),
    published: bool(body, 'published'),
    order: num(body, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await prisma.project.update({ where: { id }, data });
  } else {
    const count = await prisma.project.count();
    const created = await prisma.project.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  await releaseMediaUrls(projectMediaUrls(existing));
  return { ok: true, message: id ? 'Project updated.' : 'Project created.', id: savedId };
}

/* ── experience ────────────────────────────────────────────── */

export async function saveExperience(body: FormBody): Promise<ActionResult> {
  const id = str(body, 'id');
  const company = str(body, 'company');
  if (!company) return { ok: false, message: 'An organisation is required.' };

  const data = {
    company,
    position: str(body, 'position'),
    location: str(body, 'location'),
    startDate: str(body, 'startDate'),
    endDate: str(body, 'endDate'),
    current: bool(body, 'current'),
    description: raw(body, 'description'),
    achievements: JSON.stringify(list(body, 'achievements')),
    technologies: JSON.stringify(list(body, 'technologies')),
    published: bool(body, 'published'),
    order: num(body, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await prisma.experience.update({ where: { id }, data });
  } else {
    const count = await prisma.experience.count();
    const created = await prisma.experience.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  return { ok: true, message: id ? 'Role updated.' : 'Role added.', id: savedId };
}

/* ── skills ────────────────────────────────────────────────── */

export async function saveSkill(body: FormBody): Promise<ActionResult> {
  const id = str(body, 'id');
  const name = str(body, 'name');
  if (!name) return { ok: false, message: 'A skill name is required.' };

  const data = {
    name,
    category: str(body, 'category') || 'Tools',
    note: str(body, 'note'),
    highlight: bool(body, 'highlight'),
    published: bool(body, 'published'),
    order: num(body, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await prisma.skill.update({ where: { id }, data });
  } else {
    const count = await prisma.skill.count();
    const created = await prisma.skill.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  return { ok: true, message: id ? 'Skill updated.' : 'Skill added.', id: savedId };
}

/* ── gallery ───────────────────────────────────────────────── */

export async function saveGallery(body: FormBody): Promise<ActionResult> {
  const id = str(body, 'id');
  const url = str(body, 'url');
  if (!url) return { ok: false, message: 'Add media first — the item needs a file or URL.' };

  const existing = id ? await prisma.galleryItem.findUnique({ where: { id } }) : null;
  const data = {
    type: str(body, 'type') === 'video' ? 'video' : 'photo',
    url,
    title: str(body, 'title'),
    description: raw(body, 'description'),
    category: str(body, 'category') || 'Photos',
    date: str(body, 'date'),
    featured: bool(body, 'featured'),
    published: bool(body, 'published'),
    order: num(body, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await prisma.galleryItem.update({ where: { id }, data });
  } else {
    const count = await prisma.galleryItem.count();
    const created = await prisma.galleryItem.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  await releaseMediaUrls(galleryMediaUrls(existing));
  return { ok: true, message: id ? 'Gallery item updated.' : 'Gallery item added.', id: savedId };
}

/* ── social links ──────────────────────────────────────────── */

export async function saveSocial(body: FormBody): Promise<ActionResult> {
  const id = str(body, 'id');
  const platform = str(body, 'platform');
  if (!platform) return { ok: false, message: 'Pick a platform.' };

  const data = {
    platform: platform.toLowerCase(),
    label: str(body, 'label') || platform,
    url: str(body, 'url'),
    enabled: bool(body, 'enabled'),
    order: num(body, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await prisma.socialLink.update({ where: { id }, data });
  } else {
    const count = await prisma.socialLink.count();
    const created = await prisma.socialLink.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  return { ok: true, message: id ? 'Link updated.' : 'Link added.', id: savedId };
}

/* ── settings ──────────────────────────────────────────────── */

export async function saveSettings(body: FormBody): Promise<ActionResult> {
  const keys = String(body.__keys ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  const longKeys = new Set(
    Object.values(SETTING_GROUPS)
      .flatMap((group) => group.fields)
      .filter((field) => field.type === 'textarea' || field.type === 'lines' || field.type === 'stats')
      .map((field) => field.key),
  );

  const updates: Array<{ key: string; value: string }> = [];
  for (const key of keys) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    const value = longKeys.has(key) ? raw(body, key) : str(body, key);
    updates.push({ key, value: key === 'home.stats' ? JSON.stringify(textToRows(value)) : value });
  }

  if (updates.length === 0) return { ok: false, message: 'Nothing to save.' };

  const existing = await prisma.setting.findMany({ where: { key: { in: updates.map((update) => update.key) } } });
  for (const update of updates) {
    await prisma.setting.upsert({ where: { key: update.key }, update: { value: update.value }, create: update });
  }
  await releaseMediaUrls(existing.flatMap((row) => settingMediaUrls(row)));
  return { ok: true, message: `Saved ${updates.length} fields.` };
}

export async function resetSettings(): Promise<void> {
  const existing = await prisma.setting.findMany();
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  await releaseMediaUrls(existing.flatMap((row) => settingMediaUrls(row)));
}

export async function saveTheme(body: FormBody): Promise<ActionResult> {
  const mode = str(body, 'theme.defaultMode');
  const rawAccent = str(body, 'theme.accent');

  if (!['light', 'dark', 'color'].includes(mode)) {
    return { ok: false, message: 'Pick one of the three modes.' };
  }

  let accent = '';
  if (rawAccent) {
    const hex = (rawAccent.startsWith('#') ? rawAccent.slice(1) : rawAccent).trim();
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) {
      return { ok: false, message: 'Accent must be a hex colour, e.g. #6F2D18.' };
    }
    accent = `#${hex.toUpperCase()}`;
  }

  await prisma.setting.upsert({
    where: { key: 'theme.defaultMode' },
    update: { value: mode },
    create: { key: 'theme.defaultMode', value: mode },
  });
  await prisma.setting.upsert({
    where: { key: 'theme.accent' },
    update: { value: accent || DEFAULT_SETTINGS['theme.accent'] },
    create: { key: 'theme.accent', value: accent || DEFAULT_SETTINGS['theme.accent'] },
  });

  return { ok: true, message: 'Theme defaults saved.' };
}

/* ── messages ──────────────────────────────────────────────── */

export async function setMessageRead(id: string, read: boolean): Promise<void> {
  await prisma.message.update({ where: { id }, data: { read } });
}

export async function deleteMessage(id: string): Promise<void> {
  await prisma.message.delete({ where: { id } });
}

/* ── generic record operations ─────────────────────────────── */

type Delegate = {
  findMany: (args?: unknown) => Promise<Array<Record<string, unknown>>>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

function model(resource: string): Delegate {
  const map: Record<string, unknown> = {
    projects: prisma.project,
    experience: prisma.experience,
    skills: prisma.skill,
    gallery: prisma.galleryItem,
    social: prisma.socialLink,
  };
  const found = map[resource];
  if (!found) throw new Error(`Unknown resource: ${resource}`);
  return found as Delegate;
}

export async function deleteRecord(resource: string, id: string): Promise<void> {
  const target = model(resource);

  let oldMedia: string[] = [];
  if (resource === 'projects') {
    oldMedia = projectMediaUrls(await prisma.project.findUnique({ where: { id } }));
  } else if (resource === 'gallery') {
    oldMedia = galleryMediaUrls(await prisma.galleryItem.findUnique({ where: { id } }));
  }

  await target.delete({ where: { id } });
  await releaseMediaUrls(oldMedia);
}

export async function toggleRecord(resource: string, id: string, field: string): Promise<void> {
  const allowed = ['published', 'featured', 'enabled', 'highlight'];
  if (!allowed.includes(field)) return;

  const target = model(resource);
  const record = await target.findUnique({ where: { id } });
  if (!record) return;

  await target.update({
    where: { id: String(record.id) },
    data: { [field]: !record[field] },
  });
}

export async function moveRecord(
  resource: string,
  id: string,
  direction: string,
  scopeField = '',
  scopeValue = '',
): Promise<void> {
  const target = model(resource);
  const where = scopeField && scopeValue ? { [scopeField]: scopeValue } : {};
  const items = await target.findMany({ where, orderBy: [{ order: 'asc' }] });
  const index = items.findIndex((item) => item.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= items.length) return;

  const reordered = [...items];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  for (let i = 0; i < reordered.length; i += 1) {
    await target.update({ where: { id: String(reordered[i].id) }, data: { order: i + 1 } });
  }
}

/** Used by the "duplicate" button on the projects list. */
export async function duplicateProject(id: string): Promise<void> {
  const source = await prisma.project.findUnique({ where: { id } });
  if (!source) return;

  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = source;
  void _id;
  void _createdAt;
  void _updatedAt;

  await prisma.project.create({
    data: {
      ...rest,
      title: `${rest.title} (copy)`,
      slug: `${rest.slug}-copy-${Date.now().toString(36).slice(-4)}`,
      featured: false,
      published: false,
      order: (await prisma.project.count()) + 1,
    },
  });
}
