'use client';

import { useRouter } from 'next/navigation';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊', color: '#7c3aed' },
  { id: 2, name: '교통안전법',     icon: '⚖️', color: '#6d28d9' },
  { id: 3, name: '열차운전',       icon: '🚇', color: '#5b21b6' },
  { id: 4, name: '철도공학',       icon: '🔧', color: '#4c1d95' },
  { id: 5, name: '철도산업기본법', icon: '📋', color: '#6d28d9' },
  { id: 6, name: '철도신호',       icon: '🚦', color: '#7c3aed' },
  { id: 7, name: '철도안전법',     icon: '🛡️', color: '#5b21b6' },
];

export default function StoryIndexPage() {
  const router = useRouter();

  return (
    <div className="bg-purple-50 min-h-full">
      {/* 헤더 */}
      <div className="px-6 py-4 bg-white border-b border-purple-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <div>
            <h1 className="text-lg font-bold text-gray-800">스토리 학습</h1>
            <p className="text-xs text-gray-500">박과장과 윤호의 대화로 배우는 철도 이론</p>
          </div>
        </div>
      </div>

      {/* 과목 목록 */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-3">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => router.push(`/story/${s.id}`)}
            style={{ borderLeft: `4px solid ${s.color}` }}
            className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition text-left w-full"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: s.color + '18' }}
            >
              {s.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{s.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">챕터 목록 보기</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
