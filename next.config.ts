import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { hostname: 'api.second.me' },
      { hostname: 'second.me' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
