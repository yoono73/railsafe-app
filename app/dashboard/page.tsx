'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊', color: 'bg-purple-100' },
  { id: 2, name: '교통안전법', icon: '⚖️', color: 'bg-blue-100' },
  { id: 3, name: '열차운전', icon: '🚇', color: 'bg-amber-100' },
  { id: 4, name: '철도공학', icon: '🔧', color: 'bg-green-100' },
  { id: 5, name: '철도산업기본법', icon: '📋', color: 'bg-teal-100' },
  { id: 6, name: '철도신호', icon: '🚦', color: 'bg-red-100' },
  { id: 7, name: '철도안전법', icon: '🛡️', color: 'bg-slate-100' },
];

interface SubjectProgress {
  total: number;
  attempted: number;
  correct: number;
}

function getDday() {
  const exam = new Date('2026-06-21');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function DashboardPage() {
  const router = useRouter();
  const dday = getDday();
  const [progress, setProgress] = useState<Record<number, SubjectProgress>>({});
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      const supabase = createClient();

      // 각 과목별 전체 문제 수
      const { data: qCounts } = await supabase
        .from('questions')
        .select('subject_id')
        .in('subject_id', subjects.map(s => s.id));

      // 내 attempts (question_id + is_correct + subject_id 조인)
      const { data: attempts } = await supabase
        .from('attempts')
        .select('question_id, is_correct, questions(subject_id)');

      const result: Record<number, SubjectProgress> = {};

      // 전체 문제 수 집계
      (qCounts || []).forEach((q: { subject_id: number }) => {
        if (!result[q.subject_id]) result[q.subject_id] = { total: 0, attempted: 0, correct: 0 };
        result[q.subject_id].total += 1;
      });

      // 풀이 기록 집계 (distinct question_id 기준)
      const attemptedMap: Record<number, Set<number>> = {};
      const correctMap: Record<number, Set<number>> = {};

      (attempts || []).forEach((a: { question_id: number; is_correct: boolean; questions: { subject_id: number }[] | null }) => {
        const sid = Array.isArray(a.questions) ? a.questions[0]?.subject_id : (a.questions as { subject_id: number } | null)?.subject_id;
        if (!sid) return;
        if (!attemptedMap[sid]) attemptedMap[sid] = new Set();
        if (!correctMap[sid]) correctMap[sid] = new Set();
        attemptedMap[sid].add(a.question_id);
        if (a.is_correct) correctMap[sid].add(a.question_id);
      });

      subjects.forEach(s => {
        if (!result[s.id]) result[s.id] = { total: 0, attempted: 0, correct: 0 };
        result[s.id].attempted = attemptedMap[s.id]?.size || 0;
        result[s.id].correct = correctMap[s.id]?.size || 0;
      });

      setProgress(result);
      setLoadingProgress(false);
    };

    fetchProgress();
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">학습 현황</h1>
        <p className="text-gray-500 text-sm mt-1">시험일 D-{dday} · 2026.06.21</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => {
          const p = progress[subject.id];
          const attempted = p?.attempted || 0;
          const correct = p?.correct || 0;
          const total = p?.total || 0;
          const pct = total > 0 ? Math.round((attempted / total) * 100) : 0;
          const correctPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

          return (
            <div key={subject.id} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition">
              <div className={`w-10 h-10 ${subject.color} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {subject.icon}
              </div>
              <h2 className="font-semibold text-gray-800 mb-1">{subject.name}</h2>

              {/* 진행률 */}
              {!loadingProgress && (
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">
                      {attempted > 0 ? `${attempted}/${total}문제 · 정답률 ${correctPct}%` : '아직 안 풀었어요'}
                    </span>
                    <span className="text-xs font-semibold text-purple-600">{pct}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct === 0 ? '#e5e7eb' : correct / (attempted || 1) >= 0.6 ? '#16a34a' : '#7c3aed'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/story/${subject.id}/1`)}
                  className="bg-purple-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-purple-800 transition"
                >
                  스토리
                </button>
                <button
                  onClick={() => router.push(`/cbt/${subject.id}`)}
                  className="bg-gray-100 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-200 transition"
                >
                  CBT
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
