import { NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';

/**
 * Serves files uploaded through /admin/media.
 *
 * They are stored outside `public/` because Next only scans that folder when
 * the production server starts — a fresh upload would 404 until a restart.
 * Range requests are supported so <video> can seek.
 */

const ROOT = join(process.cwd(), 'storage', 'uploads');

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
};

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const relative = path.map((part) => decodeURIComponent(part)).join('/');

  if (!relative || relative.includes('..') || relative.startsWith('/')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const file = join(ROOT, relative);
  if (!file.startsWith(ROOT)) return new NextResponse('Not found', { status: 404 });

  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new NextResponse('Not found', { status: 404 });

  const headers: Record<string, string> = {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  };

  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start >= info.size || start > end) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new NextResponse(stream, { headers: { ...headers, 'Content-Length': String(info.size) } });
}
