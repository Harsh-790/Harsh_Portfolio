import { NextResponse } from 'next/server';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { getSessionUser } from '@/lib/auth';
import { slugify } from '@/lib/types';

/**
 * Media library API — upload, list and delete files.
 *
 * Uploads live in `storage/uploads` (served by the /uploads/[...path] route)
 * rather than in `public/`, because Next only picks up new public files when
 * the production server starts. The sample assets in `public/uploads/seed`
 * are listed but protected from deletion.
 */

const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads');
const SEED_DIR = join(process.cwd(), 'public', 'uploads', 'seed');
const ALLOWED = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg',
  '.mp4', '.webm', '.ogg', '.mov', '.pdf',
]);
const MAX_BYTES = 24 * 1024 * 1024; // matches the server action body limit

export type MediaEntry = {
  name: string;
  url: string;
  size: number;
  modified: number;
  kind: 'image' | 'video' | 'file';
  protected: boolean;
};

function kindOf(ext: string): MediaEntry['kind'] {
  if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) return 'video';
  return 'file';
}

async function entriesIn(dir: string, prefix = '', isProtected = false): Promise<MediaEntry[]> {
  try {
    const names = await readdir(dir);
    const entries = await Promise.all(
      names.map(async (name) => {
        const full = join(dir, name);
        const info = await stat(full);
        if (!info.isFile()) return null;
        if (name.startsWith('.')) return null;
        const ext = extname(name).toLowerCase();
        if (!ALLOWED.has(ext)) return null;
        return {
          name: `${prefix}${name}`,
          url: `/uploads/${prefix}${name}`,
          size: info.size,
          modified: info.mtimeMs,
          kind: kindOf(ext),
          protected: isProtected,
        } satisfies MediaEntry;
      }),
    );
    return entries.filter((entry): entry is MediaEntry => entry !== null);
  } catch {
    return [];
  }
}

async function listMedia(): Promise<MediaEntry[]> {
  const [root, seed] = await Promise.all([entriesIn(UPLOAD_DIR), entriesIn(SEED_DIR, 'seed/', true)]);
  return [...root, ...seed].sort((a, b) => b.modified - a.modified);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  return NextResponse.json({ files: await listMedia() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is larger than 24 MB.' }, { status: 413 });
  }

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return NextResponse.json(
      { error: 'Allowed: JPG, PNG, WEBP, AVIF, GIF, SVG, MP4, WEBM, MOV, PDF.' },
      { status: 415 },
    );
  }

  const base = slugify(basename(file.name, ext)).slice(0, 42) || 'file';
  const name = `${Date.now().toString(36)}-${base}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    file: {
      name,
      url: `/uploads/${name}`,
      size: file.size,
      modified: Date.now(),
      kind: kindOf(ext),
      protected: false,
    } satisfies MediaEntry,
  });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name : '';

  // only plain file names inside the uploads directory may be deleted
  if (!/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid file name.' }, { status: 400 });
  }

  const target = join(UPLOAD_DIR, name);
  if (!target.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
  }

  try {
    await unlink(target);
  } catch {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
