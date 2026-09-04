'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론',
  2: '교통안전법',
  3: '열차운전',
  4: '철도공학',
  5: '철도산업기본법',
};

const IFRAME_SRC: Record<number, string> = {
  1: '/theory/1-quiz.html',
  2: '/theory/2-quiz.html',
  3: '/theory/3-quiz.html',
  4: '/theory/4-quiz.html',
  5: '/theory/5-quiz.html',
};

const VALID_IDS = [1, 2, 3, 4, 5];

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = Number(params.subjectId);
  const isValid = VALID_IDS.includes(subjectId);

  useEffect(() => {
    if (!isValid) router.replace('/dashboard');
  }, [isValid, router]);

  if (!isValid) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="px-4 py-2 flex items-center gap-2 text-sm border-b border-gray-100 bg-white shrink-0">
        <button
          onClick={() => router.push(`/theory/${subjectId}`)}
          className="text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          ← 핵심정리
        </button>
        <span className="text-gray-200">›</span>
        <span className="font-medium text-gray-700">
          {subjectNames[subjectId]} — 철도왕 문제(기출·신유형)
        </span>
      </div>
      <iframe
        src={IFRAME_SRC[subjectId]}
        className="flex-1 w-full border-none min-h-0"
        title={subjectNames[subjectId]}
      />
    </div>
  );
}
