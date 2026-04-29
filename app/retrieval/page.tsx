'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법',
};
const subjectColors: Record<number, string> = {
  1: '#7c3aed', 2: '#2563eb', 3: '#d97706',
  4: '#16a34a', 5: '#0d9488', 6: '#dc2626', 7: '#475569',
};

interface Topic {
  id: number;
  subject_id: number;
  topic_name: string;
  chapter_number: number;
  history?: {
    id: string;
    stability_score: number;
    interval_days: number;
    next_retrieval_due: string;
    retrieval_count: number;
  };
}

// SM-2 간략화: quality 1=모름(1점) 3=애매(3점) 5=알아요(5점)
function sm2Next(
  quality: number,
  stability: number,
  intervalDays: number,
  count: number
): { newInterval: number; newStability: number } {
  if (quality < 3) {
    return { newInterval: 1, newStability: Math.max(1.3, stability - 0.2) };
  }
  const newStability = Math.max(1.3, stability + 0.1 - (5 - quality) * 0.08);
  const newInterval = count === 0 ? 1 : count === 1 ? 3 : Math.round(intervalDays * newStability);
  return { newInterval, newStability };
}

export default function RetrievalPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<{ topic: Topic; quality: number }[]>([]);
  const [userId, setUserId] = useState<string>('');

  const loadTopics = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    const today = new Date().toISOString().split('T')[0];

    // 복습 기한 지난 토픽 (topic_learning_history에 기록 있고 오늘 이하)
    const { data: historyData } = await supabase
      .from('topic_learning_history')
      .select('id, topic_id, stability_score, interval_days, next_retrieval_due, retrieval_count')
      .eq('user_id', user.id)
      .lte('next_retrieval_due', today);

    let topicsToReview: Topic[] = [];

    if (historyData && historyData.length > 0) {
      const overdueTopicIds = historyData.map((h: { topic_id: number }) => h.topic_id);
      const { data: topicData } = await supabase
        .from('topics')
        .select('id, subject_id, topic_name, chapter_number')
        .in('id', overdueTopicIds)
        .eq('is_active', true);

      if (topicData) {
        topicsToReview = (topicData as Topic[]).map(t => ({
          ...t,
          history: historyData.find((h: { topic_id: number }) => h.topic_id === t.id),
        }));
      }
    }

    // 복습 기한 지난 것 없으면 → 이력 없는 토픽 (신규) 5개
    if (topicsToReview.length === 0) {
      const { data: existingHistory } = await supabase
        .from('topic_learning_history')
        .select('topic_id')
        .eq('user_id', user.id);

      const studiedIds = (existingHistory || []).map((h: { topic_id: number }) => h.topic_id);

      const { data: newTopics } = await supabase
        .from('topics')
        .select('id, subject_id, topic_name, chapter_number')
        .eq('is_active', true)
        .not('id', 'in', studiedIds.length > 0 ? `(${studiedIds.join(',')})` : '(0)')
        .order('subject_id')
        .order('chapter_number')
        .limit(5);

      topicsToReview = (newTopics || []) as Topic[];
    }

    setTopics(topicsToReview);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleRate = async (quality: number) => {
    if (saving) return;
    setSaving(true);

    const topic = topics[current];
    const prev = topic.history;
    const { newInterval, newStability } = sm2Next(
      quality,
      prev?.stability_score ?? 2.5,
      prev?.interval_days ?? 1,
      prev?.retrieval_count ?? 0,
    );

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + newInterval);
    const nextDueStr = nextDue.toISOString().split('T')[0];

    const supabase = createClient();
    await supabase.from('topic_learning_history').upsert({
      user_id: userId,
      topic_id: topic.id,
      last_studied_at: new Date().toISOString(),
      stability_score: newStability,
      interval_days: newInterval,
      next_retrieval_due: nextDueStr,
      retrieval_count: (prev?.retrieval_count ?? 0) + 1,
    }, { onConflict: 'user_id,topic_id' });

    setResults(r => [...r, { topic, quality }]);
    setSaving(false);

    if (current + 1 >= topics.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
    }
  };

  // ── 로딩 ──
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-orange-50">
        <p className="text-orange-600">복습 목록 불러오는 중...</p>
      </div>
    );
  }

  // ── 할 것 없음 ──
  if (!loading && topics.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-orange-50 gap-4 p-8">
        <div className="text-5xl">🎉</div>
        <p className="text-lg font-bold text-green-600">오늘 복습 완료!</p>
        <p className="text-sm text-gray-500">다음 복습 기한까지 기다려요.</p>
        <button
          onClick={() => router.push('/start')}
          className="mt-2 px-6 py-3 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition"
        >
          학습 시작 화면으로
        </button>
      </div>
    );
  }

  // ── 완료 화면 ──
  if (finished) {
    const knew = results.filter(r => r.quality >= 4).length;
    const vague = results.filter(r => r.quality === 3).length;
    const forgot = results.filter(r => r.quality < 3).length;
    return (
      <div className="min-h-full bg-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">인출 훈련 완료!</h2>

          <div className="flex justify-center gap-4 mb-6">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-green-600">{knew}</span>
              <span className="text-xs text-gray-400 mt-0.5">알아요</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-yellow-500">{vague}</span>
              <span className="text-xs text-gray-400 mt-0.5">애매해요</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-500">{forgot}</span>
              <span className="text-xs text-gray-400 mt-0.5">모르겠어요</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6">
            다음 복습 일정이 자동으로 조정되었어요.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
            >
              대시보드
            </button>
            <button
              onClick={() => router.push('/start')}
              className="px-5 py-2.5 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition"
            >
              학습 계속하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 토픽 카드 ──
  const topic = topics[current];
  const color = subjectColors[topic.subject_id] ?? '#7c3aed';
  const isNew = !topic.history;

  return (
    <div className="min-h-full bg-orange-50">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={() => router.push('/start')} className="text-orange-400 hover:text-orange-600 transition">
          ← 학습 시작
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">인출 훈련</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* 진행 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-orange-500 bg-orange-100 px-3 py-1 rounded-full">
            🧠 {current + 1} / {topics.length}
          </span>
          {isNew && (
            <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
              신규 토픽
            </span>
          )}
        </div>

        {/* 진행바 */}
        <div className="bg-orange-100 rounded-full h-1.5 mb-8 overflow-hidden">
          <div
            className="h-full bg-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${((current) / topics.length) * 100}%` }}
          />
        </div>

        {/* 토픽 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center">
          <div
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
            style={{ background: color + '20', color }}
          >
            {subjectNames[topic.subject_id]}
          </div>
          <p className="text-lg font-bold text-gray-800 leading-relaxed mb-2">
            {topic.topic_name}
          </p>
          {topic.history && (
            <p className="text-xs text-gray-400">
              복습 {topic.history.retrieval_count}회 · 다음 복습까지{' '}
              {topic.history.interval_days}일 간격
            </p>
          )}
        </div>

        {/* 안내 */}
        <p className="text-center text-sm text-gray-500 mb-5">
          이 토픽을 얼마나 기억하고 있나요?
        </p>

        {/* 평가 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleRate(5)}
            disabled={saving}
            className="flex items-center gap-4 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 hover:border-green-400 hover:bg-green-100 transition text-left disabled:opacity-50"
          >
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-green-700">잘 알아요</p>
              <p className="text-xs text-green-500 mt-0.5">핵심 내용을 막힘없이 설명할 수 있어요</p>
            </div>
          </button>

          <button
            onClick={() => handleRate(3)}
            disabled={saving}
            className="flex items-center gap-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl px-6 py-4 hover:border-yellow-400 hover:bg-yellow-100 transition text-left disabled:opacity-50"
          >
            <span className="text-2xl">🤔</span>
            <div>
              <p className="font-bold text-yellow-700">애매해요</p>
              <p className="text-xs text-yellow-500 mt-0.5">대강은 알지만 세부 내용이 흐릿해요</p>
            </div>
          </button>

          <button
            onClick={() => handleRate(1)}
            disabled={saving}
            className="flex items-center gap-4 bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 hover:border-red-400 hover:bg-red-100 transition text-left disabled:opacity-50"
          >
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-bold text-red-700">모르겠어요</p>
              <p className="text-xs text-red-500 mt-0.5">내일 다시 복습할게요</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
