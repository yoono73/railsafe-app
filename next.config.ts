import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Vercel serverless function 번들에 public/theory/ HTML 파일 포함
  // readFileSync가 production에서 동작하려면 이 설정이 필수
  outputFileTracingIncludes: {
    '/theory-html/\\[file\\]': ['./public/theory/**/*.html'],
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