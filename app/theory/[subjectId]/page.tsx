'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법'
};

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

  return (
    <div className="flex flex-col h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-gray-100 bg-white shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          ← 대시보드
        </button>
        <span className="text-gray-300">›</span>
        <span className="text-gray-500">핵심정리</span>
        <span className="text-gray-300">›</span>
        <span className="font-medium text-gray-700">{subjectNames[subjectId]}</span>
      </div>

      {/* 핵심정리 HTML iframe */}
      <iframe
        src={`/theory/${subjectId}.html`}
        className="flex-1 w-full border-none"
        style={{ minHeight: 'calc(100vh - 110px)' }}
        title={`${subjectNames[subjectId]} 핵심정리`}
        loading="lazy"
      />
    </div>
  );
}
