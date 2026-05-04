import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SidebarNav from '@/components/SidebarNav';
import MobileNav from '@/components/MobileNav';

export default async function MindmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      <header className="bg-purple-900 text-white px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚇</span>
          <span className="font-bold text-base">철도안전관리자</span>
          <span className="text-xs bg-purple-700 px-2 py-0.5 rounded-full ml-1">베타</span>
        </div>
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
        <SidebarNav />
        <MobileNav />
        <main className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
