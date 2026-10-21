import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { findMediaById, openMediaStream } from '@/lib/gridfs';
import { isMongoObjectId } from '@/lib/object-id';
import { mimeOfFilename } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves GridFS media directly from MongoDB Atlas.
 *
 * Files are streamed, never buffered. Range requests are supported so PDFs and
 * <video> elements can seek. GridFS IDs are immutable, so responses can be
 * cached indefinitely.
 */

type RangeResult = { start: number; end: number } | 'invalid' | null;

function parseRange(header: string | null, size: number): RangeResult {
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

function notFound(): NextResponse {
  return new NextResponse('Not found', {
    status: 404,
    headers: { 'X-Content-Type-Options': 'nosniff' },
  });
}

function baseHeaders(contentType: string, size: number, filename: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': contentDisposition(contentType, filename),
    'X-Content-Type-Options': 'nosniff',
  };

  // Uploaded SVGs are active content. They are allowed (existing behaviour) but
  // served with a restrictive CSP so any embedded script cannot execute.
  if (contentType === 'image/svg+xml') {
    headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'";
  }

  return headers;
}

async function metadataFor(id: string) {
  if (!isMongoObjectId(id)) return null;
  return findMediaById(id);
}

export async function HEAD(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await metadataFor(id);
  if (!file) return notFound();

  const contentType = file.contentType || mimeOfFilename(file.originalFilename);
  return new NextResponse(null, {
    headers: baseHeaders(contentType, file.size, file.originalFilename),
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await metadataFor(id);
  if (!file) return notFound();

  const contentType = file.contentType || mimeOfFilename(file.originalFilename);
  const headers = baseHeaders(contentType, file.size, file.originalFilename);
  const range = parseRange(request.headers.get('range'), file.size);

  if (range === 'invalid') {
    return new NextResponse(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${file.size}`,
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  try {
    if (range) {
      const length = range.end - range.start + 1;
      // GridFS uses an exclusive `end` offset (unlike fs.createReadStream).
      // Always pass it: omitting `end` defaults to 0 in the driver, which breaks
      // suffix/open-ended ranges that start after byte zero.
      const stream = await openMediaStream(id, { start: range.start, end: range.end + 1 });
      return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
        status: 206,
        headers: {
          ...headers,
          'Content-Length': String(length),
          'Content-Range': `bytes ${range.start}-${range.end}/${file.size}`,
        },
      });
    }

    const stream = await openMediaStream(id);
    return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
      headers,
    });
  } catch (error) {
    console.error('Could not stream media:', error);
    return new NextResponse('Could not read media', { status: 500 });
  }
}
