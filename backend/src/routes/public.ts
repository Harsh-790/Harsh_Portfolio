import { Router } from 'express';
import {
  getCategories,
  getExperience,
  getGallery,
  getGalleryCategories,
  getProfile,
  getProjectBySlug,
  getProjects,
  getSkills,
  getSocialLinks,
} from '../services/content';
import { getSettings } from '../lib/settings';
import { submitContactMessage } from '../services/contact';

export const publicRouter = Router();

function single(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
}

function int(value: unknown): number | undefined {
  const parsed = Number(single(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

publicRouter.get('/profile', async (_req, res, next) => {
  try {
    res.json(await getProfile());
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/projects', async (req, res, next) => {
  try {
    res.json(
      await getProjects({
        featuredOnly: single(req.query.featured) === 'true' || single(req.query.featured) === '1',
        category: single(req.query.category) || undefined,
        limit: int(req.query.limit),
      }),
    );
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/projects/:slug', async (req, res, next) => {
  try {
    const project = await getProjectBySlug(req.params.slug);
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/experience', async (req, res, next) => {
  try {
    res.json(await getExperience(int(req.query.limit)));
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/skills', async (_req, res, next) => {
  try {
    res.json(await getSkills());
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/gallery', async (req, res, next) => {
  try {
    res.json(
      await getGallery({
        featuredOnly: single(req.query.featured) === 'true' || single(req.query.featured) === '1',
        category: single(req.query.category) || undefined,
        limit: int(req.query.limit),
      }),
    );
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/gallery-categories', async (_req, res, next) => {
  try {
    res.json(await getGalleryCategories());
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/categories', async (_req, res, next) => {
  try {
    res.json(await getCategories());
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/social-links', async (_req, res, next) => {
  try {
    res.json(await getSocialLinks(true));
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/settings', async (_req, res, next) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

publicRouter.post('/contact', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    res.json(await submitContactMessage(body));
  } catch (error) {
    next(error);
  }
});
