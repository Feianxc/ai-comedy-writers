import type { NextConfig } from 'next';

const serverActionOrigins =
  process.env.SERVER_ACTION_ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ['localhost:3000', 'ai-comedy-writers.vercel.app'];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [{ hostname: 'api.second.me' }, { hostname: 'second.me' }],
  },
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins,
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;

