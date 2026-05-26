import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // ✅ ใส่ตรงนี้ครับ (ชั้นนอกสุด)

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;