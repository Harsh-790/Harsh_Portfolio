import defaultSettings from './default-settings.json';
import type { Settings } from './types';

/**
 * Pure schema + defaults — no database imports, so client components
 * (the theme switcher, the admin settings form) can use it safely.
 */

export const DEFAULT_SETTINGS: Settings = defaultSettings as Settings;

export type FieldType = 'text' | 'textarea' | 'lines' | 'stats' | 'select' | 'media' | 'toggle';

export type SettingField = {
  key: string;
  label: string;
  type?: FieldType;
  hint?: string;
  rows?: number;
  options?: string[];
};

export type SettingGroup = {
  id: string;
  title: string;
  note?: string;
  fields: SettingField[];
};

/**
 * Every editable piece of text on the public site.
 * Adding a field here is enough: it shows up in /admin/homepage automatically.
 */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'hero',
    title: 'Hero',
    note: 'Name, role, location and status come from the Profile page.',
    fields: [
      { key: 'home.hero.eyebrow', label: 'Eyebrow label' },
      { key: 'home.hero.kicker', label: 'Kicker line' },
      { key: 'home.hero.description', label: 'Intro paragraph', type: 'textarea', rows: 3 },
      { key: 'home.hero.primaryCta', label: 'Primary button' },
      { key: 'home.hero.secondaryCta', label: 'Secondary button' },
      { key: 'home.hero.pipeline', label: 'Pipeline words', hint: 'Comma separated — rendered as 01 DATA → 02 MODEL → 03 INSIGHT' },
      { key: 'home.hero.cardLabel', label: 'Image card label' },
      { key: 'home.hero.cardValue', label: 'Image card value' },
      { key: 'home.hero.imageCaption', label: 'Image caption' },
    ],
  },
  {
    id: 'stats',
    title: 'Data strip',
    note: 'The measured numbers under the hero. Keep them honest — they read as facts.',
    fields: [{ key: 'home.stats', label: 'Statistics', type: 'stats', hint: 'One per line: Label | Value | Note' }],
  },
  {
    id: 'home-about',
    title: 'Homepage · About preview',
    fields: [
      { key: 'home.about.label', label: 'Label' },
      { key: 'home.about.title', label: 'Heading' },
      { key: 'home.about.titleAccent', label: 'Heading accent line' },
      { key: 'home.about.lead', label: 'Lead sentence', type: 'textarea', rows: 2 },
      { key: 'home.about.body', label: 'Body', type: 'textarea', rows: 5 },
      { key: 'home.about.cta', label: 'Button' },
      {
        key: 'home.about.image',
        label: 'Hero Secondary Image',
        type: 'media',
        hint: 'The image below “A data scientist who ships, not just experiments” on the homepage. Upload or pick from the library; falls back to the profile photo while empty.',
      },
    ],
  },
  {
    id: 'home-projects',
    title: 'Homepage · Projects',
    fields: [
      { key: 'home.projects.label', label: 'Label' },
      { key: 'home.projects.title', label: 'Heading' },
      { key: 'home.projects.lead', label: 'Lead', type: 'textarea', rows: 2 },
      { key: 'home.projects.cta', label: 'Button' },
    ],
  },
  {
    id: 'home-data',
    title: 'Homepage · Signals block',
    fields: [
      { key: 'home.data.label', label: 'Label' },
      { key: 'home.data.title', label: 'Heading' },
      { key: 'home.data.lead', label: 'Lead', type: 'textarea', rows: 2 },
      { key: 'home.data.note', label: 'Footnote' },
    ],
  },
  {
    id: 'home-experience',
    title: 'Homepage · Experience',
    fields: [
      { key: 'home.experience.label', label: 'Label' },
      { key: 'home.experience.title', label: 'Heading' },
      { key: 'home.experience.lead', label: 'Lead', type: 'textarea', rows: 2 },
      { key: 'home.experience.cta', label: 'Button' },
    ],
  },
  {
    id: 'home-skills',
    title: 'Homepage · Skills',
    fields: [
      { key: 'home.skills.label', label: 'Label' },
      { key: 'home.skills.title', label: 'Heading' },
      { key: 'home.skills.lead', label: 'Lead', type: 'textarea', rows: 2 },
      { key: 'home.skills.cta', label: 'Button' },
    ],
  },
  {
    id: 'home-gallery',
    title: 'Homepage · Gallery',
    fields: [
      { key: 'home.gallery.label', label: 'Label' },
      { key: 'home.gallery.title', label: 'Heading' },
      { key: 'home.gallery.lead', label: 'Lead', type: 'textarea', rows: 2 },
      { key: 'home.gallery.cta', label: 'Button' },
    ],
  },
  {
    id: 'home-contact',
    title: 'Homepage · Contact call to action',
    fields: [
      { key: 'home.contact.label', label: 'Label' },
      { key: 'home.contact.title', label: 'Heading' },
      { key: 'home.contact.lead', label: 'Lead', type: 'textarea', rows: 2 },
      { key: 'home.contact.cta', label: 'Button' },
    ],
  },
  {
    id: 'pages',
    title: 'Section pages',
    note: 'Intro lines used on the dedicated pages.',
    fields: [
      { key: 'page.about.lead', label: '/about', type: 'textarea', rows: 2 },
      { key: 'page.projects.lead', label: '/projects', type: 'textarea', rows: 2 },
      { key: 'page.experience.lead', label: '/experience', type: 'textarea', rows: 2 },
      { key: 'page.skills.lead', label: '/skills', type: 'textarea', rows: 2 },
      { key: 'page.gallery.lead', label: '/gallery', type: 'textarea', rows: 2 },
      { key: 'page.contact.lead', label: '/contact', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    fields: [
      { key: 'contact.availability', label: 'Availability line' },
      { key: 'contact.responseTime', label: 'Response time' },
      { key: 'contact.formTitle', label: 'Form title' },
      { key: 'contact.formNote', label: 'Form note' },
      { key: 'contact.successMessage', label: 'Success message', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    fields: [
      { key: 'site.footerTagline', label: 'Tagline' },
      { key: 'site.footerNote', label: 'Small print' },
    ],
  },
  {
    id: 'seo',
    title: 'SEO & sharing',
    fields: [
      { key: 'site.title', label: 'Browser / OG title' },
      { key: 'site.description', label: 'Meta description', type: 'textarea', rows: 2 },
      { key: 'site.keywords', label: 'Keywords', hint: 'Comma separated' },
      { key: 'seo.ogImage', label: 'Social share image URL', hint: 'Optional — upload one from Media first.' },
    ],
  },
  {
    id: 'gullu',
    title: 'Gullu — portfolio assistant',
    note:
      'Gullu answers visitors from the portfolio content itself (projects, skills, experience, profile, links). Private data, messages and credentials are never used. An optional AI provider is configured with environment variables — see the README.',
    fields: [
      {
        key: 'gullu.enabled',
        label: 'Show Gullu on the site',
        type: 'toggle',
        hint: 'Adds the floating assistant to every public page.',
      },
      {
        key: 'gullu.greeting',
        label: 'Greeting',
        type: 'textarea',
        rows: 2,
        hint: 'The first message inside the chat panel.',
      },
      {
        key: 'gullu.description',
        label: 'Short description',
        type: 'textarea',
        rows: 2,
        hint: 'One line under the name in the chat header.',
      },
      {
        key: 'gullu.voice',
        label: 'Voice controls',
        type: 'toggle',
        hint: 'Microphone input and spoken answers, using the browser’s own speech services. Turn off to hide all voice buttons.',
      },
    ],
  },
];

export const ACCENT_PRESETS = [
  { name: 'Terracotta', value: '#6F2D18' },
  { name: 'Warm amber', value: '#B07A16' },
  { name: 'Burnt sienna', value: '#A34A2A' },
  { name: 'Deep violet', value: '#6C4AB6' },
  { name: 'Forest', value: '#3E6B4F' },
];

export const THEME_MODES = ['light', 'dark', 'color'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
