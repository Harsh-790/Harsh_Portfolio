import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { GridFSBucket, ObjectId } from 'mongodb';
import { getMongoDb } from './mongodb';
import { isMongoObjectId } from './object-id';
import { MEDIA_BUCKET, kindOfMime, mimeOfFilename, type MediaKind } from './media';

export type StoredMedia = {
  id: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  category?: string;
  legacyPath?: string;
  sha256?: string;
  kind: MediaKind;
};

type GridFile = {
  _id: ObjectId;
  filename: string;
  length: number;
  uploadDate: Date;
  metadata?: Record<string, unknown>;
};

export type UploadMediaOptions = {
  filename: string;
  originalFilename: string;
  contentType: string;
  size: number;
  category?: string;
  legacyPath?: string;
  sha256?: string;
  uploadedAt?: Date;
};

export type MediaStreamOptions = { start?: number; end?: number };

async function bucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getMongoDb(), { bucketName: MEDIA_BUCKET });
}

function stringMeta(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toStoredMedia(file: GridFile): StoredMedia {
  const metadata = file.metadata ?? {};
  const originalFilename = stringMeta(metadata, 'originalFilename') ?? file.filename;
  const contentType = stringMeta(metadata, 'contentType') ?? mimeOfFilename(originalFilename);
  const uploadedAt = metadata.uploadedAt instanceof Date
    ? metadata.uploadedAt
    : file.uploadDate instanceof Date
      ? file.uploadDate
      : new Date(file.uploadDate);

  return {
    id: file._id.toHexString(),
    filename: file.filename,
    originalFilename,
    contentType,
    size: file.length,
    uploadedAt,
    category: stringMeta(metadata, 'category'),
    legacyPath: stringMeta(metadata, 'legacyPath'),
    sha256: stringMeta(metadata, 'sha256'),
    kind: kindOfMime(contentType),
  };
}

export async function findMediaById(id: string): Promise<StoredMedia | null> {
  if (!isMongoObjectId(id)) return null;
  const file = (await (await bucket()).find({ _id: new ObjectId(id) }).next()) as GridFile | null;
  return file ? toStoredMedia(file) : null;
}

export async function findMediaByLegacyPath(legacyPath: string): Promise<StoredMedia | null> {
  const file = (await (await bucket()).find({ 'metadata.legacyPath': legacyPath }).next()) as GridFile | null;
  return file ? toStoredMedia(file) : null;
}

export async function listMedia(): Promise<StoredMedia[]> {
  const files = (await (await bucket()).find({}).sort({ uploadDate: -1 }).toArray()) as GridFile[];
  return files.map(toStoredMedia);
}

export async function countMedia(): Promise<number> {
  const db = await getMongoDb();
  return db.collection(`${MEDIA_BUCKET}.files`).countDocuments();
}

export async function uploadMedia(source: Readable, options: UploadMediaOptions): Promise<StoredMedia> {
  const store = await bucket();
  const uploadedAt = options.uploadedAt ?? new Date();
  const metadata: Record<string, unknown> = {
    originalFilename: options.originalFilename,
    contentType: options.contentType,
    size: options.size,
    uploadedAt,
    category: options.category ?? 'media',
  };
  if (options.legacyPath) metadata.legacyPath = options.legacyPath;
  if (options.sha256) metadata.sha256 = options.sha256;

  const writeStream = store.openUploadStream(options.filename, { metadata });
  const id = writeStream.id as ObjectId;

  try {
    await pipeline(source, writeStream);
  } catch (error) {
    await store.delete(id).catch(() => {});
    throw error;
  }

  const stored = await findMediaById(id.toHexString());
  if (!stored) {
    await store.delete(id).catch(() => {});
    throw new Error('The uploaded media could not be verified.');
  }
  if (stored.size !== options.size) {
    await store.delete(id).catch(() => {});
    throw new Error('The uploaded media size did not match the source file.');
  }

  return stored;
}

export async function openMediaStream(id: string, options: MediaStreamOptions = {}): Promise<Readable> {
  if (!isMongoObjectId(id)) throw new Error('Invalid media id.');
  return (await bucket()).openDownloadStream(new ObjectId(id), options) as unknown as Readable;
}

/** Reads the whole GridFS file once and returns its byte length + SHA-256. */
export async function verifyMediaContent(id: string): Promise<{ size: number; sha256: string }> {
  const stream = await openMediaStream(id);
  const hash = createHash('sha256');
  let size = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    hash.update(buffer);
  }

  return { size, sha256: hash.digest('hex') };
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (!isMongoObjectId(id)) return false;
  const existing = await findMediaById(id);
  if (!existing) return false;

  try {
    await (await bucket()).delete(new ObjectId(id));
    return true;
  } catch (error) {
    // A concurrent delete is safe; a missing file is not an error for callers.
    if (error instanceof Error && /file not found|no such file/i.test(error.message)) return false;
    throw error;
  }
}
