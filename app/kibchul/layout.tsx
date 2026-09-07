import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SidebarNav from '@/components/SidebarNav';
import MobileNav from '@/components/MobileNav';
import HeaderBadge from '@/components/HeaderBadge';

export default async function KibchulLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-orange-800 text-white px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <span className="font-bold text-base">철도안전관리자</span>
          <HeaderBadge />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-orange-300 hidden sm:block">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-orange-300 hover:text-white transition-colors">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SidebarNav />
        <MobileNav />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
