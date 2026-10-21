import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { getSessionUser } from '@/lib/auth';
import { deleteMedia, findMediaById, listMedia, uploadMedia, type StoredMedia } from '@/lib/gridfs';
import { isMediaReferenced } from '@/lib/media-references';
import {
  MAX_MEDIA_BYTES,
  kindOfMime,
  mediaUrlFor,
  validateMediaFile,
  type MediaEntry,
} from '@/lib/media';
import { isMongoObjectId } from '@/lib/object-id';
import { slugify } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Media library API — upload, list and delete files.
 *
 * Uploaded files live in the MongoDB Atlas GridFS bucket "portfolioMedia" and
 * are served by /api/media/[id]. The sample assets in public/uploads/seed are
 * static bundled files: they remain read-only and are listed for reuse.
 */

const SEED_DIR = join(process.cwd(), 'public', 'uploads', 'seed');

function toEntry(file: StoredMedia): MediaEntry {
  return {
    id: file.id,
    name: file.originalFilename,
    url: mediaUrlFor(file.id),
    size: file.size,
    modified: file.uploadedAt.getTime(),
    kind: file.kind,
    protected: false,
    contentType: file.contentType,
  };
}

async function gridEntries(): Promise<MediaEntry[]> {
  return (await listMedia()).map(toEntry);
}

async function seedEntries(): Promise<MediaEntry[]> {
  try {
    const names = await readdir(SEED_DIR);
    const entries = await Promise.all<MediaEntry | null>(
      names.map(async (name) => {
        if (name.startsWith('.')) return null;
        const full = join(SEED_DIR, name);
        const info = await stat(full);
        if (!info.isFile()) return null;

        const validation = validateMediaFile(name, '');
        if (!validation.ok) return null;

        return {
          name: `seed/${name}`,
          url: `/uploads/seed/${encodeURIComponent(name)}`,
          size: info.size,
          modified: info.mtimeMs,
          kind: kindOfMime(validation.contentType),
          protected: true,
          contentType: validation.contentType,
        } satisfies MediaEntry;
      }),
    );

    return entries.filter((entry): entry is MediaEntry => entry !== null);
  } catch {
    return [];
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const [grid, seed] = await Promise.all([gridEntries(), seedEntries()]);
    return NextResponse.json({
      files: [...grid, ...seed].sort((a, b) => b.modified - a.modified),
    });
  } catch (error) {
    console.error('Could not list media:', error);
    return NextResponse.json({ error: 'Could not load the media library.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: 'That file is larger than 24 MB.' }, { status: 413 });
  }

  const originalFilename =
    basename(file.name || 'file')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 180) || 'file';
  const validation = validateMediaFile(originalFilename, file.type);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 415 });
  }

  const base = slugify(basename(originalFilename, extname(originalFilename))).slice(0, 42) || 'file';
  const filename = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}-${base}${validation.extension}`;
  const category = String(form.get('category') ?? '').trim().slice(0, 60) || kindOfMime(validation.contentType);

  try {
    const source = Readable.fromWeb(
      file.stream() as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
    );
    const stored = await uploadMedia(source, {
      filename,
      originalFilename,
      contentType: validation.contentType,
      size: file.size,
      category,
    });

    return NextResponse.json({ file: toEntry(stored) });
  } catch (error) {
    console.error('Media upload failed:', error);
    return NextResponse.json({ error: 'The file could not be stored. Nothing was changed.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';

  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'A valid media id is required.' }, { status: 400 });
  }

  try {
    const file = await findMediaById(id);
    if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    if (await isMediaReferenced(id)) {
      return NextResponse.json(
        { error: 'This file is still used on the site. Replace or remove those references first.' },
        { status: 409 },
      );
    }

    const deleted = await deleteMedia(id);
    if (!deleted) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Media delete failed:', error);
    return NextResponse.json({ error: 'The file could not be deleted.' }, { status: 500 });
  }
}
