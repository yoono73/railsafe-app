'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊' },
  { id: 2, name: '교통안전법', icon: '⚖️' },
  { id: 3, name: '열차운전', icon: '🚇' },
  { id: 4, name: '철도공학', icon: '🔧' },
  { id: 5, name: '철도산업기본법', icon: '📋' },
  { id: 6, name: '철도신호', icon: '🚦' },
  { id: 7, name: '철도안전법', icon: '🛡️' },
];

function getDday() {
  const exam = new Date('2026-06-21');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function StartPage() {
  const router = useRouter();
  const dday = getDday();
  const [overdueCount, setOverdueCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mode, setMode] = useState<'main' | 'story' | 'cbt'>('main');
  const [showModal, setShowModal] = useState(false);
  const [snoozeActive, setSnoozeActive] = useState(false);
  const snoozeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const today = new Date().toISOString().split('T')[0];
      const { data: overdue } = await supabase
        .from('topic_learning_history')
        .select('id')
        .eq('user_id', user.id)
        .lte('next_retrieval_due', today);
      const count = overdue?.length ?? 0;
      setOverdueCount(count);
      if (count > 0) setShowModal(true);

      const { data: wrongAttempts } = await supabase
        .from('attempts')
        .select('question_id')
        .eq('user_id', user.id)
        .eq('is_correct', false);
      if (wrongAttempts) {
        const uniqueIds = new Set(wrongAttempts.map((a) => a.question_id));
        setWrongCount(uniqueIds.size);
      }
    }
    fetchStats();

    return () => {
      if (snoozeTimerRef.current) clearTimeout(snoozeTimerRef.current);
    };
  }, [router]);

  const handleSnooze = () => {
    setShowModal(false);
    setSnoozeActive(true);
    snoozeTimerRef.current = setTimeout(() => {
      setSnoozeActive(false);
      setShowModal(true);
    }, 3 * 60 * 1000);
  };

  const handlePass = () => {
    setShowModal(false);
  };

  const RetrievalModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm">
        <div className="text-5xl text-center mb-3">🧠</div>
        <h2 className="text-lg font-bold text-gray-800 text-center mb-1">
          인출훈련 기한 초과!
        </h2>
        <p className="text-sm text-center text-gray-500 mb-1">
          <span className="font-bold text-orange-600">{overdueCount}개</span> 토픽 복습이 밀렸어요.
        </p>
        <p className="text-xs text-center text-gray-400 mb-7">
          지금 하면 기억 강화 효과가 가장 높아요 💡
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/retrieval')}
            className="w-full py-4 bg-purple-700 text-white rounded-2xl font-bold text-sm hover:bg-purple-800 active:bg-purple-900 transition"
          >
            ① 지금 시작하기
          </button>
          <button
            onClick={handleSnooze}
            className="w-full py-3.5 bg-orange-50 border-2 border-orange-200 text-orange-700 rounded-2xl font-semibold text-sm hover:bg-orange-100 transition"
          >
            ② 3분 후 알림
          </button>
          <button
            onClick={handlePass}
            className="w-full py-2.5 text-gray-400 text-xs hover:text-gray-500 transition"
          >
            ③ 오늘은 패스
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === 'story') {
    return (
      <div className="min-h-full bg-purple-50 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => setMode('main')}
          className="self-start mb-6 text-purple-500 hover:text-purple-700 text-sm font-medium transition"
        >
          ← 돌아가기
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-2">어느 과목부터 시작할까요?</h2>
        <p className="text-sm text-gray-500 mb-6">스토리로 개념을 익혀보세요</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => router.push(`/story/${s.id}/1`)}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-5 py-4 text-left hover:shadow-md hover:border-purple-300 border border-transparent transition"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-semibold text-gray-700">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'cbt') {
    return (
      <div className="min-h-full bg-purple-50 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => setMode('main')}
          className="self-start mb-6 text-purple-500 hover:text-purple-700 text-sm font-medium transition"
        >
          ← 돌아가기
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-2">어느 과목을 시험볼까요?</h2>
        <p className="text-sm text-gray-500 mb-6">CBT 모의고사로 실전 감각을 키워요</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => router.push(`/cbt/${s.id}`)}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-5 py-4 text-left hover:shadow-md hover:border-purple-300 border border-transparent transition"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-semibold text-gray-700">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && <RetrievalModal />}
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-50 to-white">
        <div className="flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          📅 시험일까지 D-{dday} · 2026.06.21
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">오늘 어떻게 공부할까요?</h1>
        <p className="text-sm text-gray-500 mb-8">학습 방식을 선택하세요</p>

        {overdueCount > 0 && (
          <div
            className="w-full max-w-md mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 cursor-pointer hover:bg-red-100 transition"
            onClick={() => router.push('/retrieval')}
          >
            <span className="text-2xl">🔴</span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {overdueCount}개 미완료{snoozeActive ? ' · 잠시 후 알림' : ''}
              </p>
              <p className="text-xs text-red-400">인출훈련 기한이 지났어요. 탭하면 시작해요.</p>
            </div>
            <span className="ml-auto text-red-300">›</span>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-md">
          <button
            onClick={() => setMode('story')}
            className="flex items-center gap-4 bg-white border-2 border-purple-200 rounded-2xl px-6 py-5 text-left hover:border-purple-500 hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl group-hover:bg-purple-200 transition">📖</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-base">처음부터</p>
              <p className="text-xs text-gray-500 mt-0.5">스토리로 개념을 재미있게 익혀요</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>

          <button
            onClick={() => router.push('/wronganswers')}
            className="flex items-center gap-4 bg-white border-2 border-red-200 rounded-2xl px-6 py-5 text-left hover:border-red-400 hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl group-hover:bg-red-100 transition">📒</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-base">오답 복습</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {wrongCount > 0 ? `틀린 문제 ${wrongCount}개 — 다시 도전해봐요` : '틀린 문제가 없어요. CBT를 먼저 풀어보세요!'}
              </p>
            </div>
            {wrongCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {wrongCount > 99 ? '99+' : wrongCount}
              </span>
            )}
            <span className="text-gray-300 text-xl">›</span>
          </button>

          <button
            onClick={() => setMode('cbt')}
            className="flex items-center gap-4 bg-white border-2 border-blue-200 rounded-2xl px-6 py-5 text-left hover:border-blue-400 hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition">📝</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-base">시험 직전</p>
              <p className="text-xs text-gray-500 mt-0.5">CBT 모의고사로 실전 감각을 키워요</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>

          <button
            onClick={() => router.push('/topicmap')}
            className="flex items-center gap-4 bg-white border-2 border-amber-200 rounded-2xl px-6 py-5 text-left hover:border-amber-400 hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl group-hover:bg-amber-100 transition">🗺️</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-base">핵심 토픽 맵</p>
              <p className="text-xs text-gray-500 mt-0.5">기출 빈도 Tier 1/2/3 — 뭐부터 외울지 확인</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-8 text-xs text-gray-400 hover:text-gray-600 transition underline underline-offset-2"
        >
          학습 현황 대시보드로 이동
        </button>
      </div>
    </>
  );
}
