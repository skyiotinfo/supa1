import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

module.exports = {
  allowedDevOrigins: ['192.168.1.3'],
}

export default nextConfig;
