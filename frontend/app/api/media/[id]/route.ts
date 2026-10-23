import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public, cacheable proxy for GridFS media served by the Express API.
 * The URL shape stays /api/media/<id>, so every existing database reference
 * and every page keeps working unchanged.
 */

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

async function proxy(request: Request, id: string, includeBody: boolean): Promise<NextResponse> {
  const range = request.headers.get('range');
  const headers: Record<string, string> = {};
  if (range) headers.Range = range;

  let response: Response;
  try {
    response = await backendFetch(`/api/media/${encodeURIComponent(id)}`, {
      method: includeBody ? 'GET' : 'HEAD',
      headers,
    });
  } catch (error) {
    console.error('Media proxy failed:', error);
    return NextResponse.json({ error: 'Media service unavailable.' }, { status: 502 });
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(request, id, true);
}

export async function HEAD(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(request, id, false);
}
