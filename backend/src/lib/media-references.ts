import { prisma as db } from './prisma';
import { deleteMedia } from './gridfs';
import { isGridfsMediaUrl, mediaIdFromUrl, mediaUrlFor } from './media';
import { jsonArray } from './types';

/** Media references embedded in application documents. */

type ProfileMediaRow = { avatar?: string | null; resumeUrl?: string | null } | null;

type ProjectMediaRow = {
  thumbnail?: string | null;
  videoUrl?: string | null;
  githubUrl?: string | null;
  liveUrl?: string | null;
  datasetUrl?: string | null;
  gallery?: string | null;
} | null;

type GalleryMediaRow = { url?: string | null } | null;

type SettingMediaRow = { value?: string | null } | null;

function uniqueMediaUrls(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => isGridfsMediaUrl(value)))];
}

export function profileMediaUrls(row: ProfileMediaRow): string[] {
  return uniqueMediaUrls([row?.avatar, row?.resumeUrl]);
}

export function projectMediaUrls(row: ProjectMediaRow): string[] {
  if (!row) return [];
  return uniqueMediaUrls([
    row.thumbnail,
    row.videoUrl,
    row.githubUrl,
    row.liveUrl,
    row.datasetUrl,
    ...jsonArray<string>(row.gallery ?? '[]'),
  ]);
}

export function galleryMediaUrls(row: GalleryMediaRow): string[] {
  return uniqueMediaUrls([row?.url]);
}

export function settingMediaUrls(row: SettingMediaRow): string[] {
  return uniqueMediaUrls([row?.value]);
}

/**
 * A GridFS file may be referenced by more than one record/field (for example a
 * duplicated project). Scan the application documents before deleting anything.
 */
export async function isMediaReferenced(id: string): Promise<boolean> {
  const needle = mediaUrlFor(id);
  const [profiles, projects, gallery, settings] = await Promise.all([
    db.profile.findMany(),
    db.project.findMany(),
    db.galleryItem.findMany(),
    db.setting.findMany(),
  ]);

  const rows: unknown[] = [...profiles, ...projects, ...gallery, ...settings];
  return rows.some((row) => JSON.stringify(row).includes(needle));
}

/**
 * Deletes GridFS files that are no longer referenced after an update or delete.
 * Files still used by any profile/project/gallery/setting are retained.
 */
export async function releaseMediaUrls(urls: Array<string | null | undefined>): Promise<string[]> {
  const ids = [...new Set(urls.map((url) => mediaIdFromUrl(url)).filter((id): id is string => id !== null))];
  const deleted: string[] = [];

  for (const id of ids) {
    if (await isMediaReferenced(id)) continue;
    try {
      if (await deleteMedia(id)) deleted.push(id);
    } catch (error) {
      // Cleanup must never make a successful content save fail.
      console.error('Could not remove unreferenced GridFS media:', error);
    }
  }

  return deleted;
}
