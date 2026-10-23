import { NextResponse } from 'next/server';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiError, adminBackendFetch, adminJson } from '@/lib/api';
import { kindOfMime, validateMediaFile, type MediaEntry } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Media library BFF.
 *
 * GridFS listing, uploads and deletes are owned by the Express API. The 31
 * bundled seed files under public/uploads/seed stay with the frontend and are
 * merged into the library read-only, exactly as before.
 */

const SEED_DIR = join(process.cwd(), 'public', 'uploads', 'seed');

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

function failure(error: unknown, fallback: string) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof ApiError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

async function forward(response: Response): Promise<NextResponse> {
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET() {
  try {
    const data = await adminJson<{ files: MediaEntry[] }>('/api/admin/media');
    const seed = await seedEntries();
    return NextResponse.json({
      files: [...data.files, ...seed].sort((a, b) => b.modified - a.modified),
    });
  } catch (error) {
    return failure(error, 'Could not load the media library.');
  }
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const response = await adminBackendFetch('/api/admin/media', { method: 'POST', body: form });
  if (!response) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  return forward(response);
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!/^[0-9a-f]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'A valid media id is required.' }, { status: 400 });
  }

  const response = await adminBackendFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
  if (!response) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  return forward(response);
}
