'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법'
};

const subjectIcons: Record<number, string> = {
  1: '📊', 2: '⚖️', 3: '🚇', 4: '🔧', 5: '📋', 6: '🚦', 7: '🛡️'
};

interface SubjectStat {
  subjectId: number;
  count: number;
}

export default function WrongAnswersPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 오답 목록 가져오기 (가장 최근 시도 기준)
      const { data, error } = await supabase
        .from('attempts')
        .select('question_id, is_correct, questions(subject_id)')
        .eq('user_id', user.id)
        .eq('is_correct', false);

      if (error || !data) { setLoading(false); return; }

      // 중복 question_id 제거 (같은 문제를 여러 번 틀린 경우 1개로 카운트)
      const uniqueWrong = new Map<number, number>();
      data.forEach((row: { question_id: number; is_correct: boolean; questions: { subject_id: number }[] | { subject_id: number } | null }) => {
        const sid = Array.isArray(row.questions)
          ? row.questions[0]?.subject_id
          : (row.questions as { subject_id: number } | null)?.subject_id;
        if (sid && !uniqueWrong.has(row.question_id)) {
          uniqueWrong.set(row.question_id, sid);
        }
      });

      // 과목별 집계
      const countBySubject = new Map<number, number>();
      uniqueWrong.forEach((sid) => {
        countBySubject.set(sid, (countBySubject.get(sid) || 0) + 1);
      });

      const result: SubjectStat[] = Array.from(countBySubject.entries())
        .map(([subjectId, count]) => ({ subjectId, count }))
        .sort((a, b) => a.subjectId - b.subjectId);

      setStats(result);
      setTotal(uniqueWrong.size);
      setLoading(false);
    }
    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-purple-50">
        <p className="text-purple-700">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-red-50 min-h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-red-100 bg-white shrink-0">
        <button onClick={() => router.push('/dashboard')} className="text-red-400 hover:text-red-600 transition">← 대시보드</button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">오답노트</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 요약 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl">📒</div>
          <div>
            <p className="text-sm text-gray-500">총 오답 문제</p>
            <p className="text-3xl font-bold text-red-600">{total}<span className="text-base font-normal text-gray-500 ml-1">문제</span></p>
          </div>
        </div>

        {total === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-lg font-bold text-green-600 mb-2">오답이 없어요!</p>
            <p className="text-sm text-gray-500">CBT를 풀면 틀린 문제가 여기에 쌓여요.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 px-6 py-3 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition"
            >
              CBT 풀러 가기
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">과목별 오답 현황</h2>
            <div className="flex flex-col gap-3">
              {stats.map(({ subjectId, count }) => (
                <div
                  key={subjectId}
                  className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-xl flex-shrink-0">
                    {subjectIcons[subjectId]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{subjectNames[subjectId]}</p>
                    <p className="text-sm text-red-500 mt-0.5">{count}문제 오답</p>
                  </div>
                  <button
                    onClick={() => router.push(`/wronganswers/${subjectId}`)}
                    className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition shadow-sm"
                  >
                    재도전 →
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-6">같은 문제를 여러 번 틀려도 1문제로 표시됩니다</p>
          </>
        )}
      </div>
    </div>
  );
}
