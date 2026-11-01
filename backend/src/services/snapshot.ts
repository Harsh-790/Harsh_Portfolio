import {
  getCategories,
  getExperience,
  getGallery,
  getGalleryCategories,
  getProfile,
  getProjects,
  getSkills,
  getSocialLinks,
} from './content';
import { getSettings } from '../lib/settings';
import type {
  Experience,
  GalleryItem,
  Profile,
  Project,
  Settings,
  Skill,
  SocialLink,
} from '../lib/types';

/**
 * The only shape that is copied into the frontend repository.
 *
 * Keep this deliberately narrow: public documents, published rows and public
 * settings only. Admin users, password hashes, messages, upload metadata and
 * any database identifiers outside the public document ids never belong here.
 */
export type PublicSnapshot = {
  version: 1;
  generatedAt: string;
  profile: Profile;
  projects: Project[];
  experience: Experience[];
  skills: { category: string; items: Skill[] }[];
  gallery: GalleryItem[];
  socials: SocialLink[];
  categories: { name: string; count: number }[];
  galleryCategories: string[];
  settings: Settings;
};

/** Settings that are safe and useful to render the public site. */
const PUBLIC_SETTING_PREFIXES = [
  'site.',
  'home.',
  'page.',
  'contact.',
  'theme.',
  'gullu.',
  'seo.',
];

function publicSettings(settings: Settings): Settings {
  return Object.fromEntries(
    Object.entries(settings).filter(([key]) =>
      PUBLIC_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix)),
    ),
  );
}

/**
 * Read-only snapshot of the public portfolio. The Express endpoint and the
 * build-time generator use the same function, so the frontend always receives
 * exactly the rows a public visitor is allowed to see.
 */
export async function getPublicSnapshot(): Promise<PublicSnapshot> {
  const [profile, projects, experience, skills, gallery, socials, categories, galleryCategories, settings] =
    await Promise.all([
      getProfile(),
      getProjects(),
      getExperience(),
      getSkills(),
      getGallery(),
      getSocialLinks(true),
      getCategories(),
      getGalleryCategories(),
      getSettings(),
    ]);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    profile,
    projects,
    experience,
    skills,
    gallery,
    socials,
    categories,
    galleryCategories,
    settings: publicSettings(settings),
  };
}
