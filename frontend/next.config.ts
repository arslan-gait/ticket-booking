import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async rewrites() {
    const apiBase = (process.env.API_BASE_URL ?? "http://127.0.0.1:8008/api").replace(/\/+$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*/`,
      },
    ];
  },
};

export default nextConfig;
