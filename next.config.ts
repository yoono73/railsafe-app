import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return {
      // App Router [subjectId] dynamic route보다 먼저 처리
      // /theory/*.html → /theory-html/* (Route Handler가 public/theory/ 파일 서빙)
      beforeFiles: [
        {
          source: '/theory/:file([^/]+\\.html)',
          destination: '/theory-html/:file',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};
export default nextConfig;