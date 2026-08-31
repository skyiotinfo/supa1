import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

module.exports = {
  allowedDevOrigins: ['192.168.1.4'],
}

export default nextConfig;
