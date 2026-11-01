import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api';
import mediaManifest from '@/data/media-manifest.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public media endpoint.
 *
 * Existing files referenced by the committed public snapshot are mirrored at
 * build time under public/media and served from the frontend itself. Only a
 * genuinely new file (uploaded after the last snapshot) falls through to the
 * Express API. This is why the portfolio's images keep working when the
 * backend service is asleep.
 */

const MEDIA_DIR = join(process.cwd(), 'public', 'media');
const MEDIA_ID = /^[0-9a-f]{24}$/i;

type Manifest = {
  files: Record<string, { contentType?: string; filename?: string; size?: number }>;
};

const manifest = mediaManifest as Manifest;

const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'x-content-type-options',
  'content-security-policy',
];

type Range = { start: number; end: number } | 'invalid' | null;

function parseRange(header: string | null, size: number): Range {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return 'invalid';

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return 'invalid';

  let start: number;
  let end: number;
  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0) return 'invalid';
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) return 'invalid';
  if (size === 0 || start >= size || end < start) return 'invalid';
  return { start, end: Math.min(end, size - 1) };
}

function contentDisposition(contentType: string, filename: string): string {
  const inline =
    contentType.startsWith('image/') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/') ||
    contentType === 'application/pdf';
  const safe = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'file';
  return `${inline ? 'inline' : 'attachment'}; filename="${safe}"`;
}

async function localResponse(
  request: Request,
  id: string,
  includeBody: boolean,
): Promise<NextResponse | null> {
  if (!MEDIA_ID.test(id)) return null;

  const file = join(MEDIA_DIR, id);
  let info;
  try {
    info = await stat(file);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;

  const entry = manifest.files[id.toLowerCase()];
  const contentType = entry?.contentType || 'application/octet-stream';
  const filename = entry?.filename || id;
  const headers = new Headers({
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': contentDisposition(contentType, filename),
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': String(info.size),
  });
  if (contentType === 'image/svg+xml') {
    headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  }

  if (!includeBody) return new NextResponse(null, { status: 200, headers });

  const range = parseRange(request.headers.get('range'), info.size);
  if (range === 'invalid') {
    return new NextResponse(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${info.size}`,
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  if (range) {
    const length = range.end - range.start + 1;
    headers.set('Content-Length', String(length));
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
    const stream = createReadStream(file, { start: range.start, end: range.end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
  }

  const stream = createReadStream(file);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, { status: 200, headers });
}

async function proxy(request: Request, id: string, includeBody: boolean): Promise<NextResponse> {
  const range = request.headers.get('range');
  const headers: Record<string, string> = {};
  if (range) headers.Range = range;

  let response: Response;
  try {
    response = await backendFetch(
      `/api/media/${encodeURIComponent(id)}`,
      {
        method: includeBody ? 'GET' : 'HEAD',
        headers,
      },
      null,
      20_000,
    );
  } catch (error) {
    console.error('Media proxy failed:', error);
    return new NextResponse('Media is temporarily unavailable.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const outgoing = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = response.headers.get(name);
    if (value) outgoing.set(name, value);
  }
  if (!outgoing.has('cache-control')) outgoing.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(includeBody ? response.body : null, {
    status: response.status,
    headers: outgoing,
  });
}

async function handle(request: Request, id: string, includeBody: boolean): Promise<NextResponse> {
  if (!MEDIA_ID.test(id)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const local = await localResponse(request, id, includeBody);
  return local ?? proxy(request, id, includeBody);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(request, id, true);
}

export async function HEAD(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(request, id, false);
}
