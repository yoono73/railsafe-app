import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TheoryLayoutClient from '@/components/TheoryLayoutClient';

export default async function TheoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <TheoryLayoutClient user={user}>
      {children}
    </TheoryLayoutClient>
  );
}
