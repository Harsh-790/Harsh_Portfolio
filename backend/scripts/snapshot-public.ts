import 'dotenv/config';

import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

import { prisma } from '../src/lib/prisma';
import { findMediaById, openMediaStream } from '../src/lib/gridfs';
import { getPublicSnapshot } from '../src/services/snapshot';

/**
 * Build the committed public-content snapshot and mirror referenced GridFS
 * files into frontend/public/media.
 *
 * Run from the backend directory:
 *   npm run snapshot:public
 *
 * This script is read-only against MongoDB and GridFS. It never writes to the
 * database, never deletes media and never changes an existing file id.
 */

const repoRoot = resolve(__dirname, '..', '..');
const frontendRoot = join(repoRoot, 'frontend');
const dataDir = join(frontendRoot, 'data');
const mediaDir = join(frontendRoot, 'public', 'media');

type MediaManifestEntry = {
  contentType: string;
  filename: string;
  size: number;
};

type MediaManifest = {
  version: 1;
  generatedAt: string;
  files: Record<string, MediaManifestEntry>;
};

const MEDIA_ID_RE = /\/api\/media\/([0-9a-f]{24})(?:[^0-9a-f]|$)/gi;

function collectMediaIds(value: unknown, ids: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(MEDIA_ID_RE)) ids.add(match[1].toLowerCase());
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, ids);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectMediaIds(item, ids);
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

async function main(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });

  const snapshot = await getPublicSnapshot();
  await writeJson(join(dataDir, 'public-content.json'), snapshot);

  const ids = new Set<string>();
  collectMediaIds(snapshot, ids);

  const manifest: MediaManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    files: {},
  };

  let mirrored = 0;
  let missing = 0;

  for (const id of [...ids].sort()) {
    const file = await findMediaById(id);
    if (!file) {
      missing += 1;
      console.warn(`Media ${id} is referenced by public content but was not found in GridFS; leaving it to the proxy.`);
      continue;
    }

    const target = join(mediaDir, id);
    const temporary = `${target}.tmp`;
    await rm(temporary, { force: true });

    const source = await openMediaStream(id);
    await pipeline(source, createWriteStream(temporary));
    await rename(temporary, target);

    manifest.files[id] = {
      contentType: file.contentType || 'application/octet-stream',
      filename: file.originalFilename,
      size: file.size,
    };
    mirrored += 1;
  }

  await writeJson(join(dataDir, 'media-manifest.json'), manifest);

  console.log(
    `Public snapshot written: ${snapshot.projects.length} projects, ${snapshot.gallery.length} gallery items, ` +
      `${snapshot.experience.length} roles, ${snapshot.skills.reduce((n, group) => n + group.items.length, 0)} skills.`,
  );
  console.log(`Mirrored ${mirrored}/${ids.size} referenced GridFS files into frontend/public/media.`);
  if (missing > 0) console.warn(`${missing} referenced media file(s) were missing from GridFS.`);
}

main()
  .catch((error) => {
    console.error('Snapshot generation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    // GridFS keeps its own Mongo client open; the script is a one-shot job.
    setTimeout(() => process.exit(process.exitCode ?? 0), 50).unref();
  });
