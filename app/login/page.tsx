'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    });
    if (!error) setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-purple-900 mb-2">이메일을 확인해주세요</h2>
        <p className="text-zinc-500 text-sm">{email} 로 로그인 링크를 보냈습니다.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚇</div>
          <h1 className="text-2xl font-bold text-purple-900">철도안전관리자</h1>
          <p className="text-zinc-500 text-sm mt-1">학습 플랫폼</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="이메일 입력"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-900 text-white py-3 rounded-xl font-medium hover:bg-purple-800 disabled:opacity-50 transition"
          >
            {loading ? '전송 중...' : '이메일로 로그인'}
          </button>
        </form>
        <p className="text-xs text-zinc-400 text-center mt-4">
          링크 클릭만으로 로그인 · 비밀번호 불필요
        </p>
      </div>
    </div>
  );
}