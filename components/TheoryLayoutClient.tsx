'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarNav from '@/components/SidebarNav';
import MobileNav from '@/components/MobileNav';

interface TheoryLayoutClientProps {
  user: { email?: string | null };
  children: React.ReactNode;
}

// /theory/new4 경로에서만 외부 사이드바를 숨기고 full-page로 표시
const FULL_PAGE_ROUTES = ['/theory/new4'];

export default function TheoryLayoutClient({ user, children }: TheoryLayoutClientProps) {
  const pathname = usePathname();
  const isFullPage = FULL_PAGE_ROUTES.includes(pathname);

  return (
    <div className="h-[100dvh] bg-zinc-50 flex flex-col overflow-hidden">
      <header className="bg-purple-900 text-white px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🚇</span>
          <span className="font-bold text-base">철도안전관리자</span>
          <span className="text-xs bg-purple-700 px-2 py-0.5 rounded-full ml-1">베타</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-purple-300 hidden sm:block">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-purple-300 hover:text-white transition-colors">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {!isFullPage && <SidebarNav />}
        {!isFullPage && <MobileNav />}
        <main className={`flex-1 flex flex-col overflow-hidden ${isFullPage ? '' : 'pb-20 md:pb-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
