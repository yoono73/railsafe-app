'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊' },
  { id: 2, name: '교통안전법',     icon: '⚖️' },
  { id: 3, name: '열차운전',       icon: '🚇' },
  { id: 4, name: '철도공학',       icon: '🔧' },
  { id: 5, name: '철도산업기본법', icon: '📋' },
  { id: 6, name: '철도신호',       icon: '🚦' },
  { id: 7, name: '철도안전법',     icon: '🛡️' },
];

const subjectNames: Record<number, string> = Object.fromEntries(
  subjects.map(s => [s.id, s.name])
) as Record<number, string>;

const VALID_IDS = [1, 2, 3, 4, 5, 6, 7];

export default function TheoryPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = Number(params.subjectId);
  const isValid = VALID_IDS.includes(subjectId);

  // 유효하지 않은 ID → 대시보드로 리다이렉트
  useEffect(() => {
    if (!isValid) {
      router.replace('/dashboard');
    }
  }, [isValid, router]);

  if (!isValid) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-400 text-sm">잘못된 접근입니다. 이동 중...</p>
      </div>
    );
  }

  const prevId = subjectId > 1 ? subjectId - 1 : null;
  const nextId = subjectId < 7 ? subjectId + 1 : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* 상단 바 */}
      <div className="px-4 py-2 flex items-center gap-2 text-sm border-b border-gray-100 bg-white shrink-0">
        {/* 대시보드 링크 */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          ← 대시보드
        </button>
        <span className="text-gray-200 shrink-0">›</span>

        {/* 과목 드롭다운 — 세로 모드 탐색 핵심 */}
        <select
          value={subjectId}
          onChange={(e) => router.push(`/theory/${e.target.value}`)}
          className="flex-1 min-w-0 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
        >
          {subjects.map(s => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>

        {/* 이전 / 다음 과목 버튼 */}
        <button
          onClick={() => prevId && router.push(`/theory/${prevId}`)}
          disabled={!prevId}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"
          title={prevId ? subjectNames[prevId] : undefined}
        >
          ‹
        </button>
        <button
          onClick={() => nextId && router.push(`/theory/${nextId}`)}
          disabled={!nextId}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"
          title={nextId ? subjectNames[nextId] : undefined}
        >
          ›
        </button>
      </div>

      {/* 핵심정리 HTML iframe — flex-1로 뷰포트 맞춤, 내부 스크롤 */}
      <iframe
        src={`/theory/${subjectId}.html`}
        className="flex-1 w-full border-none min-h-0"
        title={`${subjectNames[subjectId]} 핵심정리`}
        loading="lazy"
      />
    </div>
  );
}
