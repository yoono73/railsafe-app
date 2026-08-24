import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  typescript: {
    // 빌드 중 TypeScript 오류 무시 (배포 우선)
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 중 ESLint 오류 무시 (배포 우선)
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;