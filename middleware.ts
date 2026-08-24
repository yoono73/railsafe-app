import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase 클라이언트 없이 쿠키의 JWT를 로컬 파싱으로만 세션 확인.
 * 네트워크 요청 제로 → MIDDLEWARE_INVOCATION_TIMEOUT 원천 차단.
 * 실제 유저 검증(getUser)은 각 Server Component/Route Handler에서 수행.
 */
function hasValidSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();

  // Supabase 세션 쿠키: 'sb-[ref]-auth-token' (미분할) 또는 '.0','.1'... (청크 분할)
  // 청크를 인덱스 순으로 모아 하나의 값으로 재조립한다. (base 쿠키는 인덱스 -1로 취급해 맨 앞)
  const authCookies = cookies
    .filter(c => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => {
      const ai = a.name.match(/\.(\d+)$/); const bi = b.name.match(/\.(\d+)$/);
      return (ai ? +ai[1] : -1) - (bi ? +bi[1] : -1);
    });
  if (authCookies.length === 0) return false;

  try {
    // 1) 청크 재조립 후 URL 디코딩
    let value = authCookies.map(c => c.value).join('');
    try { value = decodeURIComponent(value); } catch {}

    // 2) 'base64-' 접두어면 벗기고 UTF-8로 정확히 디코딩 (한글 메타데이터 대비)
    if (value.startsWith('base64-')) {
      const bin = atob(value.slice(7));
      const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
      value = new TextDecoder().decode(bytes);
    }

    // 3) 세션 JSON에서 access_token 추출 (문자열 토큰 그대로인 경우도 처리)
    const parsed = JSON.parse(value);
    const token: string = (parsed && typeof parsed === 'object') ? (parsed.access_token ?? '') : String(parsed);

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // 4) JWT payload(base64url) 디코딩 후 만료 확인
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.exp ?? 0) > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/dashboard', '/cbt', '/story', '/theory', '/wronganswers', '/retrieval', '/start'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const loggedIn = hasValidSession(request);

  if (!loggedIn && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (loggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
