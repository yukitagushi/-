import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias["@silent-voice/ui"] = path.resolve(__dirname, "ui");
    return config;
  }
};

export default nextConfig;
