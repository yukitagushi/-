/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  transpilePackages: ['@silent-voice/ui']
};

export default nextConfig;
