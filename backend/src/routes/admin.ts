import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getSettings } from '../lib/settings';
import {
  deleteRecord,
  deleteMessage,
  duplicateProject,
  moveRecord,
  resetSettings,
  saveExperience,
  saveGallery,
  saveProfile,
  saveProject,
  saveSettings,
  saveSkill,
  saveSocial,
  saveTheme,
  setMessageRead,
  toggleRecord,
} from '../services/admin';
import {
  getAdminExperience,
  getAdminGallery,
  getAdminMessages,
  getAdminSocialLinks,
  getAdminProjects,
  getCounts,
  getProfile,
  getRecentMessages,
  getSkills,
  type MessageFilter,
} from '../services/content';

export const adminRouter = Router();

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function wrap(handler: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function bodyOf(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function idOf(req: Request): string {
  return String(req.params.id ?? '');
}

adminRouter.use(requireAdmin);

/* ── profile ───────────────────────────────────────────────── */

adminRouter.get('/profile', wrap(async (_req, res) => {
  res.json(await getProfile());
}));

adminRouter.put('/profile', wrap(async (req, res) => {
  res.json(await saveProfile(bodyOf(req)));
}));

/* ── projects ──────────────────────────────────────────────── */

adminRouter.get('/projects', wrap(async (_req, res) => {
  res.json(await getAdminProjects());
}));

adminRouter.post('/projects', wrap(async (req, res) => {
  res.json(await saveProject(bodyOf(req)));
}));

adminRouter.put('/projects/:id', wrap(async (req, res) => {
  res.json(await saveProject({ ...bodyOf(req), id: idOf(req) }));
}));

adminRouter.delete('/projects/:id', wrap(async (req, res) => {
  await deleteRecord('projects', idOf(req));
  res.json({ ok: true });
}));

adminRouter.post('/projects/:id/duplicate', wrap(async (req, res) => {
  await duplicateProject(idOf(req));
  res.json({ ok: true });
}));

/* ── experience ────────────────────────────────────────────── */

adminRouter.get('/experience', wrap(async (_req, res) => {
  res.json(await getAdminExperience());
}));

adminRouter.post('/experience', wrap(async (req, res) => {
  res.json(await saveExperience(bodyOf(req)));
}));

adminRouter.put('/experience/:id', wrap(async (req, res) => {
  res.json(await saveExperience({ ...bodyOf(req), id: idOf(req) }));
}));

adminRouter.delete('/experience/:id', wrap(async (req, res) => {
  await deleteRecord('experience', idOf(req));
  res.json({ ok: true });
}));

/* ── skills ────────────────────────────────────────────────── */

adminRouter.get('/skills', wrap(async (_req, res) => {
  res.json(await getSkills());
}));

adminRouter.post('/skills', wrap(async (req, res) => {
  res.json(await saveSkill(bodyOf(req)));
}));

adminRouter.put('/skills/:id', wrap(async (req, res) => {
  res.json(await saveSkill({ ...bodyOf(req), id: idOf(req) }));
}));

adminRouter.delete('/skills/:id', wrap(async (req, res) => {
  await deleteRecord('skills', idOf(req));
  res.json({ ok: true });
}));

/* ── gallery ───────────────────────────────────────────────── */

adminRouter.get('/gallery', wrap(async (_req, res) => {
  res.json(await getAdminGallery());
}));

adminRouter.post('/gallery', wrap(async (req, res) => {
  res.json(await saveGallery(bodyOf(req)));
}));

adminRouter.put('/gallery/:id', wrap(async (req, res) => {
  res.json(await saveGallery({ ...bodyOf(req), id: idOf(req) }));
}));

adminRouter.delete('/gallery/:id', wrap(async (req, res) => {
  await deleteRecord('gallery', idOf(req));
  res.json({ ok: true });
}));

/* ── social links ──────────────────────────────────────────── */

adminRouter.get('/social-links', wrap(async (_req, res) => {
  res.json(await getAdminSocialLinks());
}));

adminRouter.post('/social-links', wrap(async (req, res) => {
  res.json(await saveSocial(bodyOf(req)));
}));

adminRouter.put('/social-links/:id', wrap(async (req, res) => {
  res.json(await saveSocial({ ...bodyOf(req), id: idOf(req) }));
}));

adminRouter.delete('/social-links/:id', wrap(async (req, res) => {
  await deleteRecord('social', idOf(req));
  res.json({ ok: true });
}));

/* ── settings and theme ────────────────────────────────────── */

adminRouter.get('/settings', wrap(async (_req, res) => {
  res.json(await getSettings());
}));

adminRouter.put('/settings', wrap(async (req, res) => {
  res.json(await saveSettings(bodyOf(req)));
}));

adminRouter.post('/settings/reset', wrap(async (_req, res) => {
  await resetSettings();
  res.json({ ok: true });
}));

adminRouter.put('/theme', wrap(async (req, res) => {
  res.json(await saveTheme(bodyOf(req)));
}));

/* ── messages ──────────────────────────────────────────────── */

adminRouter.get('/messages', wrap(async (req, res) => {
  const raw = String(req.query.filter ?? 'all');
  const filter: MessageFilter = raw === 'unread' || raw === 'read' ? raw : 'all';
  res.json(await getAdminMessages(filter));
}));

adminRouter.get('/recent-messages', wrap(async (req, res) => {
  const take = Number(req.query.take);
  res.json(await getRecentMessages(Number.isFinite(take) && take > 0 ? Math.min(take, 20) : 4));
}));

adminRouter.patch('/messages/:id/read', wrap(async (req, res) => {
  await setMessageRead(idOf(req), Boolean(bodyOf(req).read));
  res.json({ ok: true });
}));

adminRouter.delete('/messages/:id', wrap(async (req, res) => {
  await deleteMessage(idOf(req));
  res.json({ ok: true });
}));

/* ── dashboard ─────────────────────────────────────────────── */

adminRouter.get('/counts', wrap(async (_req, res) => {
  res.json(await getCounts());
}));

/* ── generic record controls ───────────────────────────────── */

const RESOURCES = new Set(['projects', 'experience', 'skills', 'gallery', 'social']);

adminRouter.delete('/records/:resource/:id', wrap(async (req, res) => {
  const { resource } = req.params;
  if (!RESOURCES.has(resource)) {
    res.status(400).json({ error: 'Unknown resource.' });
    return;
  }
  await deleteRecord(resource, idOf(req));
  res.json({ ok: true });
}));

adminRouter.patch('/records/:resource/:id/toggle', wrap(async (req, res) => {
  const { resource } = req.params;
  if (!RESOURCES.has(resource)) {
    res.status(400).json({ error: 'Unknown resource.' });
    return;
  }
  const field = String(bodyOf(req).field ?? '');
  await toggleRecord(resource, idOf(req), field);
  res.json({ ok: true });
}));

adminRouter.post('/records/:resource/:id/move', wrap(async (req, res) => {
  const { resource } = req.params;
  if (!RESOURCES.has(resource)) {
    res.status(400).json({ error: 'Unknown resource.' });
    return;
  }
  const body = bodyOf(req);
  await moveRecord(
    resource,
    idOf(req),
    String(body.direction ?? ''),
    String(body.scopeField ?? ''),
    String(body.scopeValue ?? ''),
  );
  res.json({ ok: true });
}));
