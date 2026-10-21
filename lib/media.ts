import { isMongoObjectId } from './object-id';

/** Shared, client-safe media rules. Server-only GridFS code lives in lib/gridfs.ts. */

export const MEDIA_BUCKET = 'portfolioMedia';
export const MEDIA_URL_PREFIX = '/api/media/';
export const MAX_MEDIA_BYTES = 24 * 1024 * 1024; // matches the admin form limit

export const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg',
  '.mp4', '.webm', '.ogg', '.mov', '.pdf',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
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

const ALLOWED_MIME_TYPES = new Set([
  ...Object.values(MIME_BY_EXTENSION),
  'image/jpg',
  'audio/ogg',
  'application/octet-stream',
  'binary/octet-stream',
]);

export type MediaKind = 'image' | 'video' | 'file';

export type MediaEntry = {
  /** GridFS ObjectId. Static seed assets do not have one. */
  id?: string;
  name: string;
  url: string;
  size: number;
  modified: number;
  kind: MediaKind;
  protected: boolean;
  contentType?: string;
};

export function extensionOf(name: string): string {
  const clean = name.split(/[?#]/)[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot).toLowerCase() : '';
}

export function mimeOfFilename(name: string): string {
  return MIME_BY_EXTENSION[extensionOf(name)] ?? 'application/octet-stream';
}

export function kindOfFilename(name: string): MediaKind {
  return kindOfMime(mimeOfFilename(name));
}

export function kindOfMime(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
  return 'file';
}

export function validateMediaFile(
  name: string,
  browserType: string,
): { ok: true; extension: string; contentType: string } | { ok: false; reason: string } {
  const extension = extensionOf(name);
  if (!ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      reason: 'Allowed: JPG, PNG, WEBP, AVIF, GIF, SVG, MP4, WEBM, MOV, PDF.',
    };
  }

  const supplied = (browserType || '').split(';')[0].trim().toLowerCase();
  if (supplied && !ALLOWED_MIME_TYPES.has(supplied)) {
    return { ok: false, reason: 'That file type is not supported.' };
  }

  return {
    ok: true,
    extension,
    contentType: supplied && supplied !== 'application/octet-stream' && supplied !== 'binary/octet-stream'
      ? supplied
      : mimeOfFilename(name),
  };
}

export function mediaUrlFor(id: string): string {
  return `${MEDIA_URL_PREFIX}${id}`;
}

/** Extracts the ObjectId from an /api/media/<id> URL, or returns null. */
export function mediaIdFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  let pathname = url.split(/[?#]/)[0];
  if (!pathname.startsWith('/')) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      return null;
    }
  }

  const match = /^\/api\/media\/([0-9a-f]{24})$/i.exec(pathname);
  const id = match?.[1];
  return id && isMongoObjectId(id) ? id : null;
}

export function isGridfsMediaUrl(url: string | null | undefined): boolean {
  return mediaIdFromUrl(url) !== null;
}
