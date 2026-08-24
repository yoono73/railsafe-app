'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

const SUBJECTS = [
  { id: 1, name: '교통안전관리론', icon: '📊', short: '안전관리론' },
  { id: 2, name: '교통안전법',     icon: '⚖️', short: '교통안전법' },
  { id: 3, name: '열차운전',       icon: '🚇', short: '열차운전'  },
  { id: 4, name: '철도공학',       icon: '🔧', short: '철도공학'  },
  { id: 5, name: '철도산업기본법', icon: '📋', short: '산업기본법' },
  { id: 6, name: '철도신호',       icon: '🚦', short: '철도신호'  },
  { id: 7, name: '철도안전법',     icon: '🛡️', short: '철도안전법' },
];

function MindmapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sParam = searchParams.get('s');
  const subjectId = sParam ? Number(sParam) : null; // null = 전체 방사형

  const src   = subjectId ? `/mindmap/${subjectId}.html` : '/mindmap/overview.html';
  const title = subjectId
    ? SUBJECTS.find(s => s.id === subjectId)?.name ?? ''
    : '전체 과목 연결 구조';

  function goTo(id: number | null) {
    const url = id ? `/mindmap?s=${id}` : '/mindmap';
    router.push(url);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* 상단 컨트롤 바 */}
      <div className="px-3 py-2 bg-white border-b border-gray-100 shrink-0 space-y-2">

        {/* 타이틀 + 돌아가기 */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push('/guide')}
            className="text-gray-400 hover:text-purple-600 transition text-xs shrink-0"
          >
            ← 학습가이드
          </button>
          <span className="text-gray-200 shrink-0">›</span>
          <span className="font-semibold text-gray-700 text-xs">🧠 마인드맵</span>
          <span className="text-gray-200 shrink-0">›</span>
          <span className="text-gray-500 text-xs truncate">{title}</span>
        </div>

        {/* 탭: 전체 + 7과목 (가로 스크롤) */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => goTo(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
              !subjectId
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            🌐 전체
          </button>
          {SUBJECTS.map(s => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                subjectId === s.id
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              {s.icon} {s.short}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-gray-400">👆 터치 드래그로 이동 · 핀치로 확대/축소</p>
      </div>

      {/* 마인드맵 iframe */}
      <iframe
        key={src}
        src={src}
        className="flex-1 w-full border-none min-h-0"
        title={title}
        loading="lazy"
      />
    </div>
  );
}

export default function MindmapPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-400 text-sm">로딩 중...</div>}>
      <MindmapContent />
    </Suspense>
  );
}
