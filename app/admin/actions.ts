'use server';

/* ══════════════════════════════════════════════════════════════
   Admin server actions.
   Every action re-checks the session, writes to MongoDB and then
   revalidates the public site so edits appear immediately.
   ══════════════════════════════════════════════════════════════ */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { endSession, requireAdmin, startSession, verifyCredentials } from '@/lib/auth';
import { DEFAULT_SETTINGS, SETTING_GROUPS } from '@/lib/schemas';
import {
  galleryMediaUrls,
  profileMediaUrls,
  projectMediaUrls,
  releaseMediaUrls,
  settingMediaUrls,
} from '@/lib/media-references';
import { lines, slugify, textToRows } from '@/lib/types';
import { PROFILE_ID } from '@/lib/content';

export type ActionState = { ok: boolean; message: string; id?: string; errors?: Record<string, string> } | null;

/* ── form helpers ──────────────────────────────────────────── */

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const raw = (fd: FormData, key: string) => String(fd.get(key) ?? '');
const bool = (fd: FormData, key: string) => {
  const value = fd.get(key);
  return value === 'on' || value === 'true' || value === '1';
};
const num = (fd: FormData, key: string, fallback = 0) => {
  const value = Number(fd.get(key));
  return Number.isFinite(value) ? value : fallback;
};
const list = (fd: FormData, key: string) => lines(raw(fd, key));

function refresh() {
  revalidatePath('/', 'layout');
}

type Delegate = {
  findMany: (args?: unknown) => Promise<Array<Record<string, unknown>>>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  count: () => Promise<number>;
};

/** Maps a resource key from the UI to its Prisma model. */
function model(resource: string): Delegate {
  const map: Record<string, unknown> = {
    projects: db.project,
    experience: db.experience,
    skills: db.skill,
    gallery: db.galleryItem,
    social: db.socialLink,
  };
  const found = map[resource];
  if (!found) throw new Error(`Unknown resource: ${resource}`);
  return found as Delegate;
}

/* ══ authentication ══════════════════════════════════════════ */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, 'email');
  const password = raw(formData, 'password');

  if (!email || !password) return { ok: false, message: 'Email and password are required.' };

  const user = await verifyCredentials(email, password);
  if (!user) return { ok: false, message: 'Those credentials did not match our records.' };

  await startSession(user.id);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect('/admin/login');
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireAdmin();
  const existing = raw(formData, 'currentPassword');
  const next = raw(formData, 'newPassword');
  const confirm = raw(formData, 'confirmPassword');

  if (next.length < 8) return { ok: false, message: 'Use at least 8 characters for the new password.' };
  if (next !== confirm) return { ok: false, message: 'The two new passwords do not match.' };

  const record = await db.user.findUnique({ where: { id: current.id } });
  if (!record) return { ok: false, message: 'Account not found.' };

  const ok = await verifyCredentials(record.email, existing);
  if (!ok) return { ok: false, message: 'Your current password is not correct.' };

  await db.user.update({ where: { id: record.id }, data: { passwordHash: await hash(next, 12) } });
  return { ok: true, message: 'Password updated.' };
}

/* ══ profile ═════════════════════════════════════════════════ */

export async function saveProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const name = str(formData, 'name');
  if (!name) return { ok: false, message: 'A display name is required.' };
  const existing = await db.profile.findUnique({ where: { id: PROFILE_ID } });

  const data = {
    name,
    headline: str(formData, 'headline'),
    role: str(formData, 'role'),
    tagline: str(formData, 'tagline'),
    intro: raw(formData, 'intro'),
    location: str(formData, 'location'),
    status: str(formData, 'status'),
    currentRole: str(formData, 'currentRole'),
    company: str(formData, 'company'),
    email: str(formData, 'email'),
    phone: str(formData, 'phone'),
    bio: raw(formData, 'bio'),
    approach: raw(formData, 'approach'),
    education: raw(formData, 'education'),
    interests: raw(formData, 'interests'),
    avatar: str(formData, 'avatar'),
    resumeUrl: str(formData, 'resumeUrl'),
    yearsExp: str(formData, 'yearsExp'),
  };

  await db.profile.upsert({ where: { id: PROFILE_ID }, update: data, create: { id: PROFILE_ID, ...data } });
  await releaseMediaUrls(profileMediaUrls(existing));
  refresh();
  return { ok: true, message: 'Profile saved — the whole site has been updated.' };
}

/* ══ projects ════════════════════════════════════════════════ */

export async function saveProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(formData, 'id');
  const title = str(formData, 'title');
  if (!title) return { ok: false, message: 'A project title is required.' };
  const existing = id ? await db.project.findUnique({ where: { id } }) : null;

  let slug = slugify(str(formData, 'slug') || title);
  if (!slug) slug = `project-${Date.now().toString(36)}`;

  const clash = await db.project.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const galleryValues = formData.getAll('gallery').map(String).map((v) => v.trim()).filter(Boolean);
  const gallery = galleryValues.length ? galleryValues : list(formData, 'gallery');

  const data = {
    title,
    slug,
    summary: raw(formData, 'summary'),
    overview: raw(formData, 'overview'),
    problem: raw(formData, 'problem'),
    approach: raw(formData, 'approach'),
    datasetInfo: raw(formData, 'datasetInfo'),
    modelInfo: raw(formData, 'modelInfo'),
    results: raw(formData, 'results'),
    category: str(formData, 'category') || 'Machine Learning',
    status: str(formData, 'status') || 'In progress',
    date: str(formData, 'date'),
    thumbnail: str(formData, 'thumbnail'),
    videoUrl: str(formData, 'videoUrl'),
    githubUrl: str(formData, 'githubUrl'),
    liveUrl: str(formData, 'liveUrl'),
    datasetUrl: str(formData, 'datasetUrl'),
    technologies: JSON.stringify(list(formData, 'technologies')),
    metrics: JSON.stringify(textToRows(raw(formData, 'metrics'))),
    gallery: JSON.stringify(gallery),
    featured: bool(formData, 'featured'),
    published: bool(formData, 'published'),
    order: num(formData, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await db.project.update({ where: { id }, data });
  } else {
    const count = await db.project.count();
    const created = await db.project.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  await releaseMediaUrls(projectMediaUrls(existing));
  refresh();
  return { ok: true, message: id ? 'Project updated.' : 'Project created.', id: savedId };
}

/* ══ experience ══════════════════════════════════════════════ */

export async function saveExperienceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(formData, 'id');
  const company = str(formData, 'company');
  if (!company) return { ok: false, message: 'An organisation is required.' };

  const data = {
    company,
    position: str(formData, 'position'),
    location: str(formData, 'location'),
    startDate: str(formData, 'startDate'),
    endDate: str(formData, 'endDate'),
    current: bool(formData, 'current'),
    description: raw(formData, 'description'),
    achievements: JSON.stringify(list(formData, 'achievements')),
    technologies: JSON.stringify(list(formData, 'technologies')),
    published: bool(formData, 'published'),
    order: num(formData, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await db.experience.update({ where: { id }, data });
  } else {
    const count = await db.experience.count();
    const created = await db.experience.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  refresh();
  return { ok: true, message: id ? 'Role updated.' : 'Role added.', id: savedId };
}

/* ══ skills ══════════════════════════════════════════════════ */

export async function saveSkillAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(formData, 'id');
  const name = str(formData, 'name');
  if (!name) return { ok: false, message: 'A skill name is required.' };

  const data = {
    name,
    category: str(formData, 'category') || 'Tools',
    note: str(formData, 'note'),
    highlight: bool(formData, 'highlight'),
    published: bool(formData, 'published'),
    order: num(formData, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await db.skill.update({ where: { id }, data });
  } else {
    const count = await db.skill.count();
    const created = await db.skill.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  refresh();
  return { ok: true, message: id ? 'Skill updated.' : 'Skill added.', id: savedId };
}

/* ══ gallery ═════════════════════════════════════════════════ */

export async function saveGalleryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(formData, 'id');
  const url = str(formData, 'url');
  if (!url) return { ok: false, message: 'Add media first — the item needs a file or URL.' };
  const existing = id ? await db.galleryItem.findUnique({ where: { id } }) : null;

  const data = {
    type: str(formData, 'type') === 'video' ? 'video' : 'photo',
    url,
    title: str(formData, 'title'),
    description: raw(formData, 'description'),
    category: str(formData, 'category') || 'Photos',
    date: str(formData, 'date'),
    featured: bool(formData, 'featured'),
    published: bool(formData, 'published'),
    order: num(formData, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await db.galleryItem.update({ where: { id }, data });
  } else {
    const count = await db.galleryItem.count();
    const created = await db.galleryItem.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  await releaseMediaUrls(galleryMediaUrls(existing));
  refresh();
  return { ok: true, message: id ? 'Gallery item updated.' : 'Gallery item added.', id: savedId };
}

/* ══ social links ════════════════════════════════════════════ */

export async function saveSocialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(formData, 'id');
  const platform = str(formData, 'platform');
  if (!platform) return { ok: false, message: 'Pick a platform.' };

  const data = {
    platform: platform.toLowerCase(),
    label: str(formData, 'label') || platform,
    url: str(formData, 'url'),
    enabled: bool(formData, 'enabled'),
    order: num(formData, 'order', 0),
  };

  let savedId = id;
  if (id) {
    await db.socialLink.update({ where: { id }, data });
  } else {
    const count = await db.socialLink.count();
    const created = await db.socialLink.create({ data: { ...data, order: data.order || count + 1 } });
    savedId = created.id;
  }

  refresh();
  return { ok: true, message: id ? 'Link updated.' : 'Link added.', id: savedId };
}

/* ══ settings ════════════════════════════════════════════════ */

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const keys = String(formData.get('__keys') ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  // Textareas keep their line breaks; single-line fields are trimmed.
  const longKeys = new Set(
    Object.values(SETTING_GROUPS)
      .flatMap((group) => group.fields)
      .filter((field) => field.type === 'textarea' || field.type === 'lines' || field.type === 'stats')
      .map((field) => field.key),
  );

  const updates: Array<{ key: string; value: string }> = [];
  for (const key of keys) {
    if (!(key in DEFAULT_SETTINGS)) continue; // never write unknown keys
    const value = longKeys.has(key) ? raw(formData, key) : str(formData, key);

    if (key === 'home.stats') {
      updates.push({ key, value: JSON.stringify(textToRows(value)) });
    } else {
      updates.push({ key, value });
    }
  }

  if (updates.length === 0) return { ok: false, message: 'Nothing to save.' };

  const existing = await db.setting.findMany({ where: { key: { in: updates.map((update) => update.key) } } });

  for (const update of updates) {
    await db.setting.upsert({ where: { key: update.key }, update: { value: update.value }, create: update });
  }

  await releaseMediaUrls(existing.flatMap((row) => settingMediaUrls(row)));
  refresh();
  return { ok: true, message: `Saved ${updates.length} fields.` };
}

export async function resetSettingsAction(): Promise<void> {
  await requireAdmin();
  const existing = await db.setting.findMany();
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  await releaseMediaUrls(existing.flatMap((row) => settingMediaUrls(row)));
  refresh();
  redirect('/admin/settings?reset=1');
}

export async function saveThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const mode = str(formData, 'theme.defaultMode');
  const rawAccent = str(formData, 'theme.accent');

  if (!['light', 'dark', 'color'].includes(mode)) return { ok: false, message: 'Pick one of the three modes.' };

  /* Accept "#6F2D18", "6f2d18" or "#abc" and store one canonical 3/6/8-digit hex. */
  let accent = '';
  if (rawAccent) {
    const hex = (rawAccent.startsWith('#') ? rawAccent.slice(1) : rawAccent).trim();
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) {
      return { ok: false, message: 'Accent must be a hex colour, e.g. #6F2D18.' };
    }
    accent = `#${hex.toUpperCase()}`;
  }

  await db.setting.upsert({
    where: { key: 'theme.defaultMode' },
    update: { value: mode },
    create: { key: 'theme.defaultMode', value: mode },
  });
  await db.setting.upsert({
    where: { key: 'theme.accent' },
    update: { value: accent || DEFAULT_SETTINGS['theme.accent'] },
    create: { key: 'theme.accent', value: accent || DEFAULT_SETTINGS['theme.accent'] },
  });

  refresh();
  return { ok: true, message: 'Theme defaults saved.' };
}

/* ══ messages ════════════════════════════════════════════════ */

export async function setMessageReadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, 'id');
  const read = str(formData, 'read') !== 'false';
  await db.message.update({ where: { id }, data: { read } });
  refresh();
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await db.message.delete({ where: { id: str(formData, 'id') } });
  refresh();
}

/* ══ generic list helpers (delete / reorder / toggle) ════════ */

export async function deleteRecordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const resource = str(formData, 'resource');
  const id = str(formData, 'id');
  const target = model(resource);

  let oldMedia: string[] = [];
  if (resource === 'projects') {
    oldMedia = projectMediaUrls(await db.project.findUnique({ where: { id } }));
  } else if (resource === 'gallery') {
    oldMedia = galleryMediaUrls(await db.galleryItem.findUnique({ where: { id } }));
  }

  await target.delete({ where: { id } });
  await releaseMediaUrls(oldMedia);
  refresh();
}

export async function toggleRecordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const resource = str(formData, 'resource');
  const field = str(formData, 'field');
  const allowed = ['published', 'featured', 'enabled', 'highlight'];
  if (!allowed.includes(field)) return;

  const target = model(resource);
  const record = await target.findUnique({ where: { id: str(formData, 'id') } });
  if (!record) return;

  await target.update({
    where: { id: String(record.id) },
    data: { [field]: !record[field] },
  });
  refresh();
}

export async function moveRecordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const target = model(str(formData, 'resource'));
  const direction = str(formData, 'direction');
  const id = str(formData, 'id');

  // Optional scope keeps reordering inside one group (e.g. a skill category).
  const scopeField = str(formData, 'scopeField');
  const scopeValue = str(formData, 'scopeValue');
  const where = scopeField && scopeValue ? { [scopeField]: scopeValue } : {};

  const items = await target.findMany({ where, orderBy: [{ order: 'asc' }] });
  const index = items.findIndex((item) => item.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= items.length) return;

  const reordered = [...items];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  for (let i = 0; i < reordered.length; i++) {
    await target.update({ where: { id: String(reordered[i].id) }, data: { order: i + 1 } });
  }
  refresh();
}

/** Used by the "duplicate" button on the projects list. */
export async function duplicateProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const source = await db.project.findUnique({ where: { id: str(formData, 'id') } });
  if (!source) return;

  const { id, createdAt, updatedAt, ...rest } = source;
  void id;
  void createdAt;
  void updatedAt;

  await db.project.create({
    data: {
      ...rest,
      title: `${rest.title} (copy)`,
      slug: `${rest.slug}-copy-${Date.now().toString(36).slice(-4)}`,
      featured: false,
      published: false,
      order: (await db.project.count()) + 1,
    },
  });
  refresh();
}
