import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from any HTTPS source (camps upload images from various providers)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/admin/overview", permanent: false },
    ];
  },
};

export default nextConfig;
