'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊', color: 'bg-purple-100' },
  { id: 2, name: '교통안전법', icon: '⚖️', color: 'bg-blue-100' },
  { id: 3, name: '열차운전', icon: '🚇', color: 'bg-amber-100' },
  { id: 4, name: '철도공학', icon: '🔧', color: 'bg-green-100' },
  { id: 5, name: '철도산업기본법', icon: '📋', color: 'bg-teal-100' },
  { id: 6, name: '철도신호', icon: '🚦', color: 'bg-red-100' },
  { id: 7, name: '철도안전법', icon: '🛡️', color: 'bg-slate-100' },
];

function getDday() {
  const exam = new Date('2026-06-21');
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const dday = getDday();

  return (
    

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">학습 현황</h1>
          <p className="text-gray-500 text-sm mt-1">시험일 D-{dday} · 2026.06.21</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition">
              <div className={`w-10 h-10 ${subject.color} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {subject.icon}
              </div>
              <h2 className="font-semibold text-gray-800 mb-3">{subject.name}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/story/${subject.id}/1`)}
                  className="bg-purple-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-purple-800 transition"
                >
                  스토리
                </button>
                <button
                  onClick={() => router.push(`/cbt/${subject.id}`)}
                  className="bg-gray-100 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-200 transition"
                >
                  CBT
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
 
  );
}
