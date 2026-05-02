'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
const categoryEmoji: Record<string, string> = {
  '숫자': '🔢', '용어': '📖', '조건': '⚠️', '절차': '📋',
};

interface Flashcard {
  id: number;
  subject_id: number;
  question: string;
  answer: string;
  category: string;
  difficulty: number;
  review?: {
    id: number;
    stability_score: number;
    interval_days: number;
    next_review_due: string;
    review_count: number;
  };
}

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
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<{ card: Flashcard; knew: boolean }[]>([]);
  const [userId, setUserId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  const loadCards = useCallback(async (subjectFilter: number | null) => {
    setLoading(true);
    setCards([]);
    setCurrent(0);
    setFlipped(false);
    setFinished(false);
    setResults([]);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    const today = new Date().toISOString().split('T')[0];

    // 오늘 복습해야 할 카드 (next_review_due <= today)
    const { data: reviewData } = await supabase
      .from('flashcard_reviews')
      .select('id, flashcard_id, stability_score, interval_days, next_review_due, review_count')
      .eq('user_id', user.id)
      .lte('next_review_due', today);

    let result: Flashcard[] = [];

    if (reviewData && reviewData.length > 0) {
      const dueIds = reviewData.map((r: { flashcard_id: number }) => r.flashcard_id);
      let query = supabase
        .from('flashcards')
        .select('id, subject_id, question, answer, category, difficulty')
        .in('id', dueIds)
        .eq('is_active', true);
      if (subjectFilter) query = query.eq('subject_id', subjectFilter);

      const { data: cardData } = await query;
      if (cardData) {
        result = (cardData as Flashcard[]).map(c => ({
          ...c,
          review: reviewData.find((r: { flashcard_id: number }) => r.flashcard_id === c.id),
        }));
      }
    }

    // 복습할 카드 없으면 → 새 카드 5개
    if (result.length === 0) {
      const { data: existingReviews } = await supabase
        .from('flashcard_reviews')
        .select('flashcard_id')
        .eq('user_id', user.id);

      const seenIds = (existingReviews || []).map((r: { flashcard_id: number }) => r.flashcard_id);

      let newQuery = supabase
        .from('flashcards')
        .select('id, subject_id, question, answer, category, difficulty')
        .eq('is_active', true)
        .order('subject_id')
        .limit(8);

      if (subjectFilter) newQuery = newQuery.eq('subject_id', subjectFilter);
      if (seenIds.length > 0) newQuery = newQuery.not('id', 'in', `(${seenIds.join(',')})`);

      const { data: newCards } = await newQuery;
      result = (newCards || []) as Flashcard[];
    }

    setCards(result);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadCards(null);
  }, [loadCards]);

  // ElevenLabs TTS 재생
  const playTts = useCallback(async (text: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setTtsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: '5n5gqmaQi9Ewevrz7bOS' }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setTtsLoading(false);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {});
    } catch {
      setTtsLoading(false);
    }
  }, []);

  const stopTts = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setTtsLoading(false);
  }, []);

  // 카드 변경 시 질문 TTS
  useEffect(() => {
    if (!cards.length || finished || loading || flipped) return;
    const card = cards[current];
    if (!card) return;
    stopTts();
    playTts(card.question);
    return () => { stopTts(); };
  }, [current, cards, finished, loading, flipped]);

  const handleFlip = () => {
    setFlipped(true);
    stopTts();
  };

  const handleRate = async (knew: boolean) => {
    if (saving) return;
    setSaving(true);
    stopTts();

    const card = cards[current];
    const prev = card.review;
    const quality = knew ? 5 : 1;
    const { newInterval, newStability } = sm2Next(
      quality,
      prev?.stability_score ?? 2.5,
      prev?.interval_days ?? 1,
      prev?.review_count ?? 0,
    );

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + newInterval);
    const nextDueStr = nextDue.toISOString().split('T')[0];

    const supabase = createClient();
    await supabase.from('flashcard_reviews').upsert({
      user_id: userId,
      flashcard_id: card.id,
      last_reviewed_at: new Date().toISOString(),
      stability_score: newStability,
      interval_days: newInterval,
      next_review_due: nextDueStr,
      review_count: (prev?.review_count ?? 0) + 1,
    }, { onConflict: 'user_id,flashcard_id' });

    setResults(r => [...r, { card, knew }]);
    setSaving(false);

    if (current + 1 >= cards.length) {
      setFinished(true);
    } else {
      setFlipped(false);
      setCurrent(c => c + 1);
    }
  };

  const handleSubjectChange = (subjectId: number | null) => {
    setSelectedSubject(subjectId);
    setShowSubjectPicker(false);
    loadCards(subjectId);
  };

  // ── 로딩 ──
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-orange-50">
        <p className="text-orange-600 animate-pulse">플래시카드 불러오는 중...</p>
      </div>
    );
  }

  // ── 카드 없음 ──
  if (!loading && cards.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-orange-50 gap-4 p-8">
        <div className="text-5xl">🎉</div>
        <p className="text-lg font-bold text-green-600">오늘 복습 완료!</p>
        <p className="text-sm text-gray-500">모든 카드를 다 학습했어요.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-2 px-6 py-3 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition"
        >대시보드로</button>
      </div>
    );
  }

  // ── 완료 ──
  if (finished) {
    const knew = results.filter(r => r.knew).length;
    const forgot = results.filter(r => !r.knew).length;
    return (
      <div className="min-h-full bg-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">플래시카드 완료!</h2>
          <div className="flex justify-center gap-8 mb-6">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-green-600">{knew}</span>
              <span className="text-xs text-gray-400 mt-1">✅ 알았어요</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-red-500">{forgot}</span>
              <span className="text-xs text-gray-400 mt-1">❌ 몰랐어요</span>
            </div>
          </div>
          {forgot > 0 && (
            <div className="bg-red-50 rounded-xl p-4 mb-5 text-left">
              <p className="text-xs font-semibold text-red-600 mb-2">다시 확인할 카드</p>
              {results.filter(r => !r.knew).map((r, i) => (
                <p key={i} className="text-xs text-gray-600 mb-1">• {r.card.question}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mb-6">틀린 카드는 내일 다시 복습해요.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
            >대시보드</button>
            <button
              onClick={() => loadCards(selectedSubject)}
              className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
            >다시 하기</button>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[current];
  const color = subjectColors[card.subject_id] ?? '#7c3aed';
  const isNew = !card.review;

  return (
    <div className="min-h-full bg-orange-50">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center justify-between text-sm border-b border-orange-100 bg-white">
        <div className="flex items-center gap-2">
          <button onClick={() => { stopTts(); router.push('/dashboard'); }} className="text-orange-400 hover:text-orange-600 transition">
            ← 대시보드
          </button>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-700">플래시카드</span>
        </div>
        {/* 과목 필터 */}
        <div className="relative">
          <button
            onClick={() => setShowSubjectPicker(v => !v)}
            className="text-xs px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
          >
            {selectedSubject ? subjectNames[selectedSubject] : '전체 과목'} ▾
          </button>
          {showSubjectPicker && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-1 min-w-[160px]">
              <button
                onClick={() => handleSubjectChange(null)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition ${!selectedSubject ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}
              >전체 과목</button>
              {[1,2,3,4,5,6,7].map(id => (
                <button
                  key={id}
                  onClick={() => handleSubjectChange(id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition ${selectedSubject === id ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}
                >{subjectNames[id]}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* 진행 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-orange-500 bg-orange-100 px-3 py-1 rounded-full">
            🧠 {current + 1} / {cards.length}
          </span>
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">신규</span>
            )}
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: color + '18', color }}>
              {categoryEmoji[card.category] ?? '📌'} {card.category}
            </span>
          </div>
        </div>

        {/* 진행바 */}
        <div className="bg-orange-100 rounded-full h-1.5 mb-6 overflow-hidden">
          <div
            className="h-full bg-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${(current / cards.length) * 100}%` }}
          />
        </div>

        {/* 플래시카드 */}
        <div style={{ perspective: '1000px' }} className="mb-6">
          <div
            style={{
              position: 'relative',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s ease',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '240px',
            }}
          >
            {/* 앞면 — 질문 */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center text-center"
            >
              <div
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
                style={{ background: color + '18', color }}
              >
                {subjectNames[card.subject_id]}
              </div>
              <p className="text-lg font-bold text-gray-800 leading-relaxed">
                {card.question}
              </p>
              <button
                onClick={() => playTts(card.question)}
                className={`mt-4 text-xs transition ${ttsLoading ? 'text-orange-300' : 'text-orange-400 hover:text-orange-600'}`}
              >{ttsLoading ? '⏳ 불러오는 중...' : '🔊 다시 읽기'}</button>
              {card.review && (
                <p className="text-xs text-gray-300 mt-3">
                  {card.review.review_count}회 복습 · {card.review.interval_days}일 간격
                </p>
              )}
            </div>

            {/* 뒷면 — 정답 */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="absolute inset-0 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center text-center"
            >
              <p className="text-xs font-semibold text-orange-500 mb-3">정답</p>
              <p className="text-base font-bold text-gray-800 leading-relaxed whitespace-pre-line">
                {card.answer}
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        {!flipped ? (
          <button
            onClick={handleFlip}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-base hover:bg-orange-600 active:scale-95 transition"
          >
            정답 보기 →
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handleRate(false)}
              disabled={saving}
              className="flex-1 py-4 bg-red-50 border-2 border-red-200 rounded-2xl font-bold text-red-600 hover:bg-red-100 active:scale-95 transition disabled:opacity-50"
            >
              ❌ 몰랐어요
            </button>
            <button
              onClick={() => handleRate(true)}
              disabled={saving}
              className="flex-1 py-4 bg-green-50 border-2 border-green-200 rounded-2xl font-bold text-green-700 hover:bg-green-100 active:scale-95 transition disabled:opacity-50"
            >
              ✅ 알았어요
            </button>
          </div>
        )}

        {/* 힌트: 아직 뒤집기 전 */}
        {!flipped && (
          <p className="text-center text-xs text-gray-400 mt-4">
            머릿속으로 먼저 떠올려본 뒤 정답을 확인하세요
          </p>
        )}
      </div>
    </div>
  );
}
