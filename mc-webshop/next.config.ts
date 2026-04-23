import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // ✅ ใส่ตรงนี้ครับ (ชั้นนอกสุด)

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        // ❌ เอาบรรทัด output: 'standalone' ออกจากตรงนี้
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '143.20.142.34',
        port: '5000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;