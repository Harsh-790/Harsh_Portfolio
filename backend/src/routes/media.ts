import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  deleteMedia,
  findMediaById,
  listMedia,
  openMediaStream,
  uploadMedia,
  type StoredMedia,
} from '../lib/gridfs';
import { isMediaReferenced } from '../lib/media-references';
import {
  MAX_MEDIA_BYTES,
  kindOfMime,
  mediaUrlFor,
  validateMediaFile,
  type MediaEntry,
} from '../lib/media';
import { isMongoObjectId } from '../lib/object-id';
import { slugify } from '../lib/types';
import { requireAdmin } from '../middleware/auth';

export const publicMediaRouter = Router();
export const adminMediaRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MEDIA_BYTES },
});

type RangeResult = { start: number; end: number } | 'invalid' | null;

function parseRange(header: string | undefined, size: number): RangeResult {
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

function baseHeaders(contentType: string, size: number, filename: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': contentDisposition(contentType, filename),
    'X-Content-Type-Options': 'nosniff',
  };

  if (contentType === 'image/svg+xml') {
    headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'";
  }

  return headers;
}

function notFound(res: Response): void {
  res.status(404).type('text/plain').set('X-Content-Type-Options', 'nosniff').send('Not found');
}

async function serveMedia(req: Request, res: Response, includeBody: boolean): Promise<void> {
  const id = req.params.id;
  if (!isMongoObjectId(id)) {
    notFound(res);
    return;
  }

  const file = await findMediaById(id);
  if (!file) {
    notFound(res);
    return;
  }

  const contentType = file.contentType || 'application/octet-stream';
  const headers = baseHeaders(contentType, file.size, file.originalFilename);
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);

  if (!includeBody) {
    res.status(200).end();
    return;
  }

  const range = parseRange(req.headers.range, file.size);
  if (range === 'invalid') {
    res.status(416).set({
      'Content-Range': `bytes */${file.size}`,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
    }).end();
    return;
  }

  try {
    if (range) {
      const length = range.end - range.start + 1;
      res.status(206).set({
        'Content-Length': String(length),
        'Content-Range': `bytes ${range.start}-${range.end}/${file.size}`,
      });
      const stream = await openMediaStream(id, { start: range.start, end: range.end + 1 });
      stream.on('error', (error) => {
        console.error('Could not stream media:', error);
        res.destroy(error);
      });
      stream.pipe(res);
      return;
    }

    const stream = await openMediaStream(id);
    stream.on('error', (error) => {
      console.error('Could not stream media:', error);
      res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Could not read media:', error);
    if (!res.headersSent) res.status(500).type('text/plain').send('Could not read media');
    else res.destroy();
  }
}

publicMediaRouter.get('/:id', (req, res, next) => {
  serveMedia(req, res, true).catch(next);
});

publicMediaRouter.head('/:id', (req, res, next) => {
  serveMedia(req, res, false).catch(next);
});

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

adminMediaRouter.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const files = await listMedia();
    res.json({ files: files.map(toEntry) });
  } catch (error) {
    next(error);
  }
});

adminMediaRouter.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || file.size === 0) {
      res.status(400).json({ error: 'No file received.' });
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      res.status(413).json({ error: 'That file is larger than 24 MB.' });
      return;
    }

    const originalFilename =
      String(file.originalname || 'file')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .split(/[\\/]/)
        .pop()
        ?.slice(0, 180) || 'file';
    const validation = validateMediaFile(originalFilename, file.mimetype);
    if (!validation.ok) {
      res.status(415).json({ error: validation.reason });
      return;
    }

    const base = slugify(originalFilename.replace(/\.[^.]+$/, '')).slice(0, 42) || 'file';
    const filename = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}-${base}${validation.extension}`;
    const category = String(req.body.category ?? '').trim().slice(0, 60) || kindOfMime(validation.contentType);

    const stored = await uploadMedia(Readable.from(file.buffer), {
      filename,
      originalFilename,
      contentType: validation.contentType,
      size: file.size,
      category,
    });

    res.json({ file: toEntry(stored) });
  } catch (error) {
    next(error);
  }
});

adminMediaRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isMongoObjectId(id)) {
      res.status(400).json({ error: 'A valid media id is required.' });
      return;
    }

    const file = await findMediaById(id);
    if (!file) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    if (await isMediaReferenced(id)) {
      res.status(409).json({
        error: 'This file is still used on the site. Replace or remove those references first.',
      });
      return;
    }

    const deleted = await deleteMedia(id);
    if (!deleted) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
