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

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    });
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
          <p className="text-zinc-500 text-sm mt-1">베타 학습 시스템</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-xl py-3 px-4 mb-4 hover:bg-zinc-50 transition font-medium text-zinc-700"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.46 3.1 29.53 1 24 1 14.82 1 7.07 6.48 3.64 14.22l7.1 5.52C12.4 13.18 17.73 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.1 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.42c-.54 2.9-2.18 5.36-4.64 7.01l7.1 5.52C43.18 37.13 46.1 31.27 46.1 24.5z"/>
            <path fill="#FBBC05" d="M10.74 28.26A14.5 14.5 0 0 1 9.5 24c0-1.48.25-2.91.74-4.26l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.57 10.77l7.1-5.51z"/>
            <path fill="#34A853" d="M24 47c5.53 0 10.17-1.83 13.56-4.97l-7.1-5.52C28.72 38.01 26.47 38.5 24 38.5c-6.27 0-11.6-3.68-13.26-8.74l-7.1 5.51C7.07 43.52 14.82 47 24 47z"/>
          </svg>
          Google로 로그인
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-zinc-200"></div>
          <span className="text-zinc-400 text-sm">또는</span>
          <div className="flex-1 h-px bg-zinc-200"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 text-white rounded-xl py-3 font-medium hover:bg-purple-800 transition disabled:opacity-50"
          >
            {loading ? '처리 중...' : '이메일로 로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}