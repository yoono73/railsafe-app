import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFileSync } from 'fs';

/**
 * /theory/*.html 요청을 처리하는 Route Handler.
 * next.config.ts의 beforeFiles rewrite에 의해
 * /theory/foo.html → /theory-html/foo 로 내부 redirect된 후 여기서 처리.
 * public/theory/ 디렉터리의 실제 HTML 파일을 읽어서 서빙한다.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { file: string } }
) {
  const filename = params.file;

  // path traversal 방지
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // .html 확장자만 허용
  if (!filename.endsWith('.html')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'theory', filename);
    const content = readFileSync(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
