import { ImageResponse } from 'next/og';
import { getProfile } from '@/lib/content';
import { getSettings } from '@/lib/settings';

/**
 * Share card used for Open Graph / Twitter previews. Rendered with next/og so
 * it always reflects the current profile text instead of a frozen image file.
 * Set `seo.ogImage` in /admin/settings to override it with your own upload.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Portfolio share card';
export const revalidate = 3600;

const PAPER = '#fafaf8';
const INK = '#0e0e0f';
const MUTED = '#6c6c70';
const LINE = '#e5e5df';

export default async function OpengraphImage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const accent = settings['theme.accent'] || '#6F2D18';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          color: INK,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 4, color: MUTED }}>
          <span>{(profile.name || 'Portfolio').toUpperCase()}</span>
          <span>{profile.yearsExp ? `${profile.yearsExp} YEARS` : 'DATA SCIENCE'}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', width: 96, height: 8, background: accent, borderRadius: 4 }} />
          <div style={{ display: 'flex', fontSize: 84, lineHeight: 1.05, letterSpacing: -2, maxWidth: 940 }}>
            {profile.name || 'Data Scientist'}
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: MUTED, maxWidth: 900 }}>
            {profile.headline || profile.role || 'Data Science & Machine Learning'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: `2px solid ${LINE}`,
            paddingTop: 28,
            fontSize: 24,
            color: MUTED,
          }}
        >
          <span>{profile.company || profile.currentRole || profile.role || 'Portfolio'}</span>
          <span>{profile.location || settings['site.title'] || ''}</span>
        </div>
      </div>
    ),
    size,
  );
}
