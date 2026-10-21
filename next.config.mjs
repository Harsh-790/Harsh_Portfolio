/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploads (images / video posters) are posted through server actions.
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  // Keep the build output focused on the app itself.
  outputFileTracingIncludes: {
    '/**': ['./database/schema.prisma'],
  },
};

export default nextConfig;
