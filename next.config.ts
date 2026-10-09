import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // OAuth avatar hosts (Discord / Google) — nothing else may be remote-loaded.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      // DEF Planner shipped at /defense for a day before moving — keep old links alive.
      { source: "/defense", destination: "/def-planner", permanent: true },
    ];
  },
};

export default nextConfig;
