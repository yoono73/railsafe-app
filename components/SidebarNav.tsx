'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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
  const [openSection, setOpenSection] = useState<'story' | 'cbt' | null>(null);

  const toggle = (section: 'story' | 'cbt') => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
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
                href={`/story/${s.id}/1`}
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

        <div className="h-px bg-gray-100 my-2" />

        {/* 시험일 D-day */}
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 font-semibold">📅 시험일까지</p>
          <p className="text-xs text-amber-600 mt-0.5">2026.06.21</p>
        </div>

      </nav>
    </aside>
  );
}
