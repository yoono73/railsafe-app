import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚇</span>
          <span className="font-bold">철도안전관리자</span>
          <span className="text-xs bg-purple-700 px-2 py-0.5 rounded-full ml-2">베타</span>
        </div>
        <span className="text-sm text-purple-300">{user.email}</span>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}