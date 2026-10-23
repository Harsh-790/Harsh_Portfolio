/**
 * Option lists shared by the admin forms (client) and the admin pages (server).
 * Kept free of `'use client'` so server components can read the values directly —
 * every export of a client module is a client reference on the server.
 */

export const PROJECT_CATEGORIES = [
  'Data Science',
  'Machine Learning',
  'Deep Learning',
  'AI',
  'Data Analytics',
  'Computer Vision',
  'NLP',
];

export const PROJECT_STATUSES = ['Production', 'Completed', 'Pilot', 'In progress', 'Archived'];

export const GALLERY_CATEGORIES = ['Photos', 'Projects', 'Certificates', 'Events'];

export const SKILL_CATEGORIES = ['Programming', 'Data Science', 'Machine Learning', 'AI', 'Tools'];

export const SOCIAL_PLATFORMS = [
  'github',
  'linkedin',
  'instagram',
  'x',
  'youtube',
  'leetcode',
  'hackerrank',
  'email',
  'website',
  'kaggle',
  'medium',
];
