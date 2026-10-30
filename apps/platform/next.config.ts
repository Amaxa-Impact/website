import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@amaxa/ui",
    "@amaxa/backend",
    "@amaxa/ccpm",
    "@amaxa/validators",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
