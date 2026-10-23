import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Gullu's browser endpoint. The answer engine, rate limits and optional AI
 * provider all live in the Express backend; this route only forwards the
 * question and the visitor's IP so the backend can rate-limit correctly.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 });
  }

  const forwardedFor =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (forwardedFor) {
    headers['x-forwarded-for'] = forwardedFor;
    headers['x-real-ip'] = forwardedFor.split(',')[0].trim();
  }

  try {
    const response = await backendFetch('/api/gullu', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Gullu proxy failed:', error);
    return NextResponse.json({ error: 'Gullu is unavailable right now.' }, { status: 502 });
  }
}
