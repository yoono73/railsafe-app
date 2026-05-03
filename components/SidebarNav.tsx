'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊' },
  { id: 2, name: '교통안전법', icon: '⚖️' },
  { id: 3, name: '열차운전', icon: '🚇' },
  { id: 4, name: '철도공학', icon: '🔧' },
  { id: 5, name: '철도산업기본법', icon: '📋' },
  { id: 6, name: '철도신호', icon: '🚦' },
  { id: 7, name: '철도안전법', icon: '🛡️' },
];

export default function SidebarNav() {
  const pathname = usePathname();

  // 현재 경로에 맞는 섹션 자동 열림
  const getInitialSection = (): 'theory' | 'story' | 'cbt' | null => {
    if (pathname.startsWith('/theory')) return 'theory';
    if (pathname.startsWith('/story')) return 'story';
    if (pathname.startsWith('/cbt')) return 'cbt';
    return null;
  };

  const [openSection, setOpenSection] = useState<'theory' | 'story' | 'cbt' | null>(getInitialSection);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from('content_versions')
        .select('version_string')
        .eq('version_type', 'app')
        .eq('is_current', true)
        .single()
        .then(({ data }) => {
          if (data) setAppVersion(data.version_string);
        });
    });
  }, []);

  const toggle = (section: 'theory' | 'story' | 'cbt') => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const isWrongAnswers = pathname.startsWith('/wronganswers');

  return (
    <aside className="hidden md:flex md:flex-col w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="flex flex-col py-4 gap-1 px-3">

        {/* 학습 현황 */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard'
              ? 'bg-purple-100 text-purple-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">🏠</span>
          학습 현황
        </Link>

        <div className="h-px bg-gray-100 my-2" />

        {/* 핵심정리 */}
        <button
          onClick={() => toggle('theory')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
            openSection === 'theory' ? 'bg-purple-50 text-purple-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">📚</span>
          <span className="flex-1">핵심정리</span>
          <span className="text-xs text-gray-400">{openSection === 'theory' ? '▲' : '▼'}</span>
        </button>

        {openSection === 'theory' && (
          <div className="ml-4 flex flex-col gap-0.5">
            {subjects.map(s => (
              <Link
                key={s.id}
                href={`/theory/${s.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  pathname.startsWith(`/theory/${s.id}`)
                    ? 'bg-purple-100 text-purple-800 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* 스토리 학습 */}
        <button
          onClick={() => toggle('story')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
            openSection === 'story' ? 'bg-purple-50 text-purple-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">📖</span>
          <span className="flex-1">스토리 학습</span>
          <span className="text-xs text-gray-400">{openSection === 'story' ? '▲' : '▼'}</span>
        </button>

        {openSection === 'story' && (
          <div className="ml-4 flex flex-col gap-0.5">
            {subjects.map(s => (
              <Link
                key={s.id}
                href={`/story/${s.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  pathname.startsWith(`/story/${s.id}`)
                    ? 'bg-purple-100 text-purple-800 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* CBT 모의고사 */}
        <button
          onClick={() => toggle('cbt')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
            openSection === 'cbt' ? 'bg-purple-50 text-purple-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">📝</span>
          <span className="flex-1">CBT 모의고사</span>
          <span className="text-xs text-gray-400">{openSection === 'cbt' ? '▲' : '▼'}</span>
        </button>

        {openSection === 'cbt' && (
          <div className="ml-4 flex flex-col gap-0.5">
            {subjects.map(s => (
              <Link
                key={s.id}
                href={`/cbt/${s.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  pathname.startsWith(`/cbt/${s.id}`)
                    ? 'bg-purple-100 text-purple-800 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* 인출훈련 */}
        <Link
          href="/retrieval"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith('/retrieval')
              ? 'bg-orange-100 text-orange-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">🧠</span>
          인출훈련
        </Link>

        {/* 오답노트 */}
        <Link
          href="/wronganswers"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isWrongAnswers
              ? 'bg-red-100 text-red-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">📒</span>
          오답노트
        </Link>

        {/* 오답노트 — 북마크 */}
        <Link
          href="/bookmarks"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith('/bookmarks')
              ? 'bg-amber-100 text-amber-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">🔖</span>
          북마크
        </Link>

        {/* 핵심 토픽 맵 */}
        <Link
          href="/topicmap"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith('/topicmap')
              ? 'bg-amber-100 text-amber-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">🗺️</span>
          핵심 토픽 맵
        </Link>

        {/* 학습가이드 */}
        <Link
          href="/guide"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith('/guide')
              ? 'bg-purple-100 text-purple-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">📘</span>
          학습가이드
        </Link>

        <div className="h-px bg-gray-100 my-2" />

        {/* 오늘의 학습 시작 버튼 */}
        <Link
          href="/start"
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 transition"
        >
          <span>🚀</span>
          오늘의 학습 시작
        </Link>

        {/* 시험일 D-day */}
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 font-semibold">📅 시험일까지</p>
          <p className="text-xs text-amber-600 mt-0.5">2026.06.21</p>
        </div>

        {/* 버전 */}
        {appVersion && (
          <p className="text-center text-xs text-gray-300 pb-1">{appVersion}</p>
        )}

      </nav>
    </aside>
  );
}
