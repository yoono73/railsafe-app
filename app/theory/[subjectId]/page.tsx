'use client';
import { useParams } from 'next/navigation';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법'
};

export default function TheoryPage() {
  const params = useParams();
  const subjectId = Number(params.subjectId);

  return (
    <div className="flex flex-col h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-gray-100 bg-white shrink-0">
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
      />
    </div>
  );
}
