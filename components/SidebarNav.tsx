'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

// useSearchParams를 사용하는 부분을 별도 컴포넌트로 분리 (Suspense 바운더리 처리)
function RailwayKingMenus({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  return (
    <div className="pl-2 border-l border-amber-200 ml-4 mt-0.5 mb-0.5 flex flex-col gap-0.5">
      <div className="text-[10px] text-amber-600 font-bold px-2 py-0.5">👑 철도왕 CBT</div>
      {[
        { m: 'quiz',  label: '기출변형문제' },
        { m: 'new',   label: '신유형문제' },
        { m: 'wrong', label: '오답문제 풀기' },
      ].map(item => {
        const isActive = pathname.startsWith('/kibchul/engineering/railway-king') && searchParams.get('m') === item.m;
        return (
          <Link
            key={item.m}
            href={`/kibchul/engineering/railway-king?m=${item.m}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
              isActive
                ? 'bg-amber-100 text-amber-800 font-semibold'
                : 'text-gray-400 hover:bg-gray-50 hover:text-amber-700'
            }`}
          >
            <span className="text-[10px]">└</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

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
  const getInitialSection = (): 'theory' | 'story' | 'cbt' | 'kibchul' | null => {
    if (pathname.startsWith('/theory')) return 'theory';
    if (pathname.startsWith('/story')) return 'story';
    if (pathname.startsWith('/cbt')) return 'cbt';
    if (pathname.startsWith('/kibchul')) return 'kibchul';
    return null;
  };

  const [openSection, setOpenSection] = useState<'theory' | 'story' | 'cbt' | 'kibchul' | null>(getInitialSection);
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

  const toggle = (section: 'theory' | 'story' | 'cbt' | 'kibchul') => {
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
              <div key={s.id}>
                {/* 철도공학(id=4) 앞에 철도용어 삽입 */}
                {s.id === 4 && (
                  <Link
                    href="/terms"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      pathname.startsWith('/terms')
                        ? 'bg-teal-100 text-teal-800 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-teal-700'
                    }`}
                  >
                    <span>📖</span>
                    <span className="truncate">철도용어</span>
                  </Link>
                )}
                <Link
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
                {/* 철도공학(id=4) 아래 기출변형·신유형 앵커 링크 */}
                {s.id === 4 && (
                  <div className="pl-2 border-l border-amber-200 ml-4 mt-0.5 mb-0.5 flex flex-col gap-0.5">
                    <Link
                      href="/theory/4#quiz-kibchul"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-amber-700 transition-colors"
                    >
                      <span className="text-[10px]">└</span>
                      <span>📝 기출변형문제</span>
                    </Link>
                    <Link
                      href="/theory/4#quiz-newtype"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-purple-700 transition-colors"
                    >
                      <span className="text-[10px]">└</span>
                      <span>🆕 신유형 예상문제</span>
                    </Link>
                  </div>
                )}
                {/* 교통안전법(id=2) 아래 기출변형·신유형 앵커 링크 */}
                {s.id === 2 && (
                  <div className="pl-2 border-l border-green-200 ml-4 mt-0.5 mb-0.5 flex flex-col gap-0.5">
                    <Link
                      href="/theory/2#quiz-kibchul"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-green-700 transition-colors"
                    >
                      <span className="text-[10px]">└</span>
                      <span>📝 기출변형문제</span>
                    </Link>
                    <Link
                      href="/theory/2#quiz-newtype"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-purple-700 transition-colors"
                    >
                      <span className="text-[10px]">└</span>
                      <span>🆕 신유형 예상문제</span>
                    </Link>
                  </div>
                )}
              </div>
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

        {/* 기출문제 */}
        <button
          onClick={() => toggle('kibchul')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
            openSection === 'kibchul' ? 'bg-orange-50 text-orange-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-base">📋</span>
          <span className="flex-1">기출문제</span>
          <span className="text-xs text-gray-400">{openSection === 'kibchul' ? '▲' : '▼'}</span>
        </button>

        {openSection === 'kibchul' && (
          <div className="ml-4 flex flex-col gap-0.5">
            {subjects.map(s => (
              <div key={s.id}>
                <Link
                  href={`/kibchul/${s.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    pathname === `/kibchul/${s.id}`
                      ? 'bg-orange-100 text-orange-800 font-semibold'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.name}</span>
                </Link>
                {s.id === 1 && (
                  <Link
                    href="/kibchul/management"
                    className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname.startsWith('/kibchul/management')
                        ? 'bg-blue-100 text-blue-800 font-semibold'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-blue-700'
                    }`}
                  >
                    <span>└</span>
                    <span>기출·복원 120문항 CBT</span>
                  </Link>
                )}
                {s.id === 4 && (
                  <Link
                    href="/kibchul/engineering"
                    className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/kibchul/engineering'
                        ? 'bg-amber-100 text-amber-800 font-semibold'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-amber-700'
                    }`}
                  >
                    <span>└</span>
                    <span>기출·복원 127문항 CBT</span>
                  </Link>
                )}
                {s.id === 2 && (
                  <Link
                    href="/kibchul/traffic"
                    className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname.startsWith('/kibchul/traffic')
                        ? 'bg-green-100 text-green-800 font-semibold'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-green-700'
                    }`}
                  >
                    <span>└</span>
                    <span>기출 131문항 CBT</span>
                  </Link>
                )}
                {s.id === 5 && (
                  <Link
                    href="/kibchul/industry"
                    className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname.startsWith('/kibchul/industry')
                        ? 'bg-indigo-100 text-indigo-800 font-semibold'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-indigo-700'
                    }`}
                  >
                    <span>└</span>
                    <span>기출 106문항 CBT</span>
                  </Link>
                )}
                {s.id === 6 && (
                  <Link
                    href="/kibchul/signal"
                    className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname.startsWith('/kibchul/signal')
                        ? 'bg-indigo-100 text-indigo-800 font-semibold'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-indigo-700'
                    }`}
                  >
                    <span>└</span>
                    <span>기출·복원 280문항 CBT</span>
                  </Link>
                )}
                {s.id === 7 && (
                  <Link
                    href="/kibchul/safety"
                    className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname.startsWith('/kibchul/safety')
                        ? 'bg-red-100 text-red-800 font-semibold'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-red-700'
                    }`}
                  >
                    <span>└</span>
                    <span>기출 78문항 CBT</span>
                  </Link>
                )}
              </div>
            ))}
            <div className="h-px bg-gray-100 my-1 mx-1" />
            <Link
              href="/kibchul/exam"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                pathname.startsWith('/kibchul/exam')
                  ? 'bg-orange-100 text-orange-800 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span>📝</span>
              <span>전체 시험</span>
            </Link>
            <Link
              href="/kibchul/stats"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                pathname.startsWith('/kibchul/stats')
                  ? 'bg-orange-100 text-orange-800 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span>📊</span>
              <span>정답률 통계</span>
            </Link>
            <Link
              href="/kibchul/wrong"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                pathname.startsWith('/kibchul/wrong')
                  ? 'bg-orange-100 text-orange-800 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span>📒</span>
              <span>기출 오답노트</span>
            </Link>
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
