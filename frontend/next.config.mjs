/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploads are posted through the backend media API; keep the form limit.
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
};

export default nextConfig;
