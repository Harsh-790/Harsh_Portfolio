import type { Metadata, Viewport } from 'next';
import { Archivo, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ThemeRestore from '@/components/ThemeRestore';
import { getSettings } from '@/lib/settings';
import { absoluteUrl } from '@/lib/types';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-jet', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = settings['site.title'] || 'Portfolio';
  const description = settings['site.description'] || '';
  const ogImage = settings['seo.ogImage'];

  return {
    metadataBase: new URL(absoluteUrl('/')),
    title: { default: title, template: `%s — ${title.split('—')[0].trim()}` },
    description,
    keywords: settings['site.keywords']?.split(',').map((k) => k.trim()).filter(Boolean),
    authors: [{ name: title.split('—')[0].trim() }],
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      type: 'website',
      url: absoluteUrl('/'),
      siteName: title.split('—')[0].trim(),
      ...(ogImage ? { images: [{ url: absoluteUrl(ogImage), width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [absoluteUrl(ogImage)] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf8' },
    { media: '(prefers-color-scheme: dark)', color: '#08080a' },
  ],
};

/**
 * Applies the stored theme before the first paint so reloading never flashes.
 * Keep this inline and synchronous — it must run before the body renders.
 */
const themeScript = `(function(){try{var k='portfolio-theme',m=localStorage.getItem(k),d=document.documentElement.getAttribute('data-default-theme')||'light';if(m!=='light'&&m!=='dark'&&m!=='color'){m=d;}document.documentElement.setAttribute('data-theme',m);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const defaultMode = ['light', 'dark', 'color'].includes(settings['theme.defaultMode'])
    ? settings['theme.defaultMode']
    : 'light';
  const accent = settings['theme.accent'] || '#6F2D18';

  return (
    <html
      lang="en"
      data-theme={defaultMode}
      data-default-theme={defaultMode}
      data-accent="1"
      style={{ ['--accent-value' as string]: accent }}
      suppressHydrationWarning
    >
      <body className={`${archivo.variable} ${inter.variable} ${mono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeRestore />
        {children}
      </body>
    </html>
  );
}
