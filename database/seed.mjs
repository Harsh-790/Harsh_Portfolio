/**
 * Seeds the MongoDB database with the admin account, site settings and the
 * demo portfolio content from database/content.json.
 *
 *   npm run db:seed
 *
 * Safe to rerun: every record is matched by a stable key (slug, name, url,
 * platform, fixed profile id) and updated in place. Nothing is deleted, so
 * records created or edited through the admin panel are never destroyed.
 *
 * ADMIN_EMAIL / ADMIN_PASSWORD are seed-time only: they create the first admin
 * when the User collection is empty. An existing admin's email and password are
 * left untouched, so changing .env later does not change an existing login.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const root = process.cwd();
const content = JSON.parse(readFileSync(join(root, 'database', 'content.json'), 'utf8'));
const settings = JSON.parse(readFileSync(join(root, 'lib', 'default-settings.json'), 'utf8'));

/** Fixed ObjectId for the single profile document (matches lib/content.ts). */
const PROFILE_ID = '507f1f77bcf86cd799439011';

/**
 * Encode a JSON column exactly once.
 *
 * `content.json` stores these columns as JSON *strings* (e.g. "[\"Python\",…]"), so
 * stringifying them again double-encodes the value: JSON.parse then returns a string
 * rather than an array, and `jsonArray()` in lib/types.ts correctly gives up and returns
 * []. That silently emptied every project's technologies/metrics/gallery on the site.
 * Strings are stored as-is; arrays/objects are stringified.
 */
const json = (v) => (typeof v === 'string' ? v : JSON.stringify(v));

/** Update an existing row by id, or create it when no match was found. */
async function upsertBy(model, where, data) {
  const existing = await model.findFirst({ where });
  if (existing) {
    await model.update({ where: { id: existing.id }, data });
    return 'updated';
  }
  await model.create({ data });
  return 'created';
}

async function main() {
  /* ── admin account ─────────────────────────────────────── */
  const email = (process.env.ADMIN_EMAIL || 'admin@portfolio.local').toLowerCase();
  const name = process.env.ADMIN_NAME || 'Portfolio Admin';

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.trim().length === 0) {
      throw new Error(
        'ADMIN_PASSWORD is required to create the initial admin account. Set it in .env and rerun the seed.',
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name, passwordHash } });
    console.log(`  admin       created ${email}`);
  } else {
    // Never reset, duplicate, or modify an existing admin account.
    console.log('  admin       existing account left unchanged');
  }

  /* ── settings (key/value) ──────────────────────────────── */
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  /* ── profile ───────────────────────────────────────────── */
  const { id: _contentId, ...profile } = content.profile;
  await prisma.profile.upsert({
    where: { id: PROFILE_ID },
    update: profile,
    create: { id: PROFILE_ID, ...profile },
  });

  /* ── portfolio content (updated in place, never deleted) ─ */
  for (const p of content.projects) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        summary: p.summary,
        overview: p.overview,
        problem: p.problem,
        approach: p.approach,
        datasetInfo: p.datasetInfo,
        modelInfo: p.modelInfo,
        results: p.results,
        category: p.category,
        status: p.status,
        date: p.date,
        thumbnail: p.thumbnail,
        videoUrl: p.videoUrl,
        githubUrl: p.githubUrl,
        liveUrl: p.liveUrl,
        datasetUrl: p.datasetUrl,
        technologies: json(p.technologies),
        metrics: json(p.metrics),
        gallery: json(p.gallery),
        featured: p.featured,
        published: p.published,
        order: p.order,
      },
      create: {
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        overview: p.overview,
        problem: p.problem,
        approach: p.approach,
        datasetInfo: p.datasetInfo,
        modelInfo: p.modelInfo,
        results: p.results,
        category: p.category,
        status: p.status,
        date: p.date,
        thumbnail: p.thumbnail,
        videoUrl: p.videoUrl,
        githubUrl: p.githubUrl,
        liveUrl: p.liveUrl,
        datasetUrl: p.datasetUrl,
        technologies: json(p.technologies),
        metrics: json(p.metrics),
        gallery: json(p.gallery),
        featured: p.featured,
        published: p.published,
        order: p.order,
      },
    });
  }

  for (const e of content.experience) {
    const data = {
      company: e.company,
      position: e.position,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      description: e.description,
      achievements: json(e.achievements),
      technologies: json(e.technologies),
      published: e.published,
      order: e.order,
    };
    await upsertBy(prisma.experience, { company: e.company, position: e.position, startDate: e.startDate }, data);
  }

  for (const s of content.skills) {
    const data = {
      name: s.name,
      category: s.category,
      note: s.note,
      highlight: s.highlight,
      published: true,
      order: s.order,
    };
    await upsertBy(prisma.skill, { name: s.name }, data);
  }

  for (const g of content.gallery) {
    const data = {
      type: g.type,
      url: g.url,
      title: g.title,
      description: g.description,
      category: g.category,
      date: g.date,
      featured: g.featured,
      published: true,
      order: g.order,
    };
    await upsertBy(prisma.galleryItem, { url: g.url }, data);
  }

  for (const s of content.social) {
    const data = { platform: s.platform, label: s.label, url: s.url, order: s.order };
    await upsertBy(prisma.socialLink, { platform: s.platform }, data);
  }

  // Demo messages are inserted only when that exact message is absent.
  for (const m of content.messages) {
    const existing = await prisma.message.findFirst({
      where: { name: m.name, email: m.email, subject: m.subject, body: m.body },
    });
    if (!existing) await prisma.message.create({ data: m });
  }

  const counts = {
    projects: await prisma.project.count(),
    experience: await prisma.experience.count(),
    skills: await prisma.skill.count(),
    gallery: await prisma.galleryItem.count(),
  };

  console.log('✓ database seeded (non-destructive)');
  console.log(`  admin login : ${email}  (password from .env)`);
  console.log(`  projects ${counts.projects} · experience ${counts.experience} · skills ${counts.skills} · gallery ${counts.gallery}`);

  reportMissingAssets();
}

/**
 * Every /uploads/... path in the seed content must exist on disk, otherwise the
 * page renders a broken image and nothing else complains. Run `npm run assets`
 * to regenerate anything that is missing.
 */
function reportMissingAssets() {
  const referenced = new Set(
    (JSON.stringify(content).match(/\/uploads\/[A-Za-z0-9._/-]+/g) || []).map((p) => p.replace(/\\/g, '')),
  );
  const missing = [...referenced].filter((url) => !existsSync(join(root, 'public', url.replace(/^\//, ''))));

  if (missing.length === 0) {
    console.log(`  media       ${referenced.size} referenced files present`);
    return;
  }
  console.log(`\n⚠ ${missing.length} referenced media file(s) are missing — run "npm run assets":`);
  for (const url of missing) console.log(`    ${url}`);
}

main()
  .catch((e) => {
    console.error('✗ seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
