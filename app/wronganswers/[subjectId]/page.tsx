'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { warmupBluetooth } from '@/lib/audioWarmup';

const VOICE_NARRATOR = '5n5gqmaQi9Ewevrz7bOS';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법'
};

interface Option {
  no?: number;
  text?: string;
}

interface Question {
  id: number;
  subject_id: number;
  question_text: string;
  options: (string | Option)[];
  correct_option: number;
  explanation?: string;
}

type Rating = 'O' | '△' | 'X';
type RatingFilter = 'all' | Rating | 'none';
const PASS_REASONS = ['범위 외', '이미 완벽', '오류 의심', '기타'] as const;
type PassReason = typeof PASS_REASONS[number];

function getOptionText(opt: string | Option): string {
  if (typeof opt === 'string') return opt;
  if (opt && typeof opt === 'object' && 'text' in opt) return opt.text || '';
  return String(opt);
}

export default function WrongAnswersSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = Number(params.subjectId);

  const [allWrongQuestions, setAllWrongQuestions] = useState<Question[]>([]);
  const [questionRatings, setQuestionRatings] = useState<Map<number, Rating>>(new Map());
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [ratingLoading, setRatingLoading] = useState(false);

  // ── 패스풀 ──
  const [passedIds, setPassedIds] = useState<Set<number>>(new Set());
  const [passLoading, setPassLoading] = useState(false);
  const [passPickerFor, setPassPickerFor] = useState<number | null>(null);

  const questions = ratingFilter === 'all'
    ? allWrongQuestions
    : ratingFilter === 'none'
    ? allWrongQuestions.filter(q => !questionRatings.has(q.id))
    : allWrongQuestions.filter(q => questionRatings.get(q.id) === ratingFilter);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionId = useRef<string>(crypto.randomUUID());
  const questionStartTime = useRef<number>(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  useEffect(() => {
    async function fetchWrongQuestions() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 이 과목에서 틀린 question_id 목록 가져오기
      const { data: attempts, error: attErr } = await supabase
        .from('attempts')
        .select('question_id')
        .eq('user_id', user.id)
        .eq('is_correct', false);

      if (attErr || !attempts) { setLoading(false); return; }

      // 중복 제거
      const wrongIds = [...new Set(attempts.map((a: { question_id: number }) => a.question_id))];

      if (wrongIds.length === 0) { setLoading(false); return; }

      // 해당 과목 문제만 필터
      const { data: questionData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .in('id', wrongIds);

      if (qErr || !questionData) { setLoading(false); return; }

      // 유효한 문제만
      const filtered = (questionData as Question[]).filter((q) => {
        if (!Array.isArray(q.options)) return false;
        if (q.options.length !== 4) return false;
        if (q.correct_option < 1 || q.correct_option > 4) return false;
        return q.options.every((o) => getOptionText(o).trim().length > 0);
      });

      setAllWrongQuestions(filtered);

      // ratings 로드
      const { data: rData } = await supabase
        .from('question_ratings')
        .select('question_id, rating')
        .eq('user_id', user.id);
      if (rData) {
        const m = new Map<number, Rating>();
        rData.forEach((r: { question_id: number; rating: string }) =>
          m.set(r.question_id, r.rating as Rating)
        );
        setQuestionRatings(m);
      }

      // pass_pool 로드
      const { data: pData } = await supabase
        .from('pass_pool')
        .select('question_id')
        .eq('user_id', user.id);
      if (pData) setPassedIds(new Set(pData.map((p: { question_id: number }) => p.question_id)));

      setLoading(false);
      questionStartTime.current = Date.now();
    }
    fetchWrongQuestions();
  }, [subjectId, router]);

  // ElevenLabs TTS
  const speakText = useCallback(async (text: string) => {
    try {
      // 기존 재생 중지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setTtsLoading(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: VOICE_NARRATOR }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await warmupBluetooth();
      audio.play().catch(() => {});
    } catch (e) {
      console.error('TTS error:', e);
    } finally {
      setTtsLoading(false);
    }
  }, []);

  // TTS: 문제 변경 시 자동 읽기
  useEffect(() => {
    if (loading || finished || questions.length === 0) return;
    const q = questions[current];
    if (!q) return;
    speakText(q.question_text);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [current, questions, loading, finished, speakText]);

  const ttsReplay = () => {
    if (!questions.length) return;
    speakText(questions[current].question_text);
  };

  const changeFilter = (f: RatingFilter) => {
    setRatingFilter(f);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
  };

  const saveRating = async (questionId: number, rating: Rating) => {
    if (ratingLoading) return;
    setRatingLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRatingLoading(false); return; }
    await supabase.from('question_ratings').upsert(
      { user_id: user.id, question_id: questionId, rating, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,question_id' }
    );
    setQuestionRatings(prev => new Map(prev).set(questionId, rating));
    setRatingLoading(false);
  };

  const togglePass = async (questionId: number, reason?: PassReason) => {
    if (passLoading) return;
    setPassLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPassLoading(false); return; }

    if (passedIds.has(questionId)) {
      await supabase.from('pass_pool').delete().eq('user_id', user.id).eq('question_id', questionId);
      setPassedIds(prev => { const s = new Set(prev); s.delete(questionId); return s; });
    } else {
      await supabase.from('pass_pool').upsert(
        { user_id: user.id, question_id: questionId, reason: reason ?? '기타' },
        { onConflict: 'user_id,question_id' }
      );
      setPassedIds(prev => new Set(prev).add(questionId));
    }
    setPassPickerFor(null);
    setPassLoading(false);
  };

  const handleSelect = (idx: number) => {
    if (confirmed) return;
    setSelected(idx + 1);
  };

  const handleConfirm = async () => {
    if (selected === null) return;
    setConfirmed(true);
    const isCorrect = selected === questions[current].correct_option;
    const timeSpent = Date.now() - questionStartTime.current;

    if (isCorrect) setScore((s) => s + 1);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('attempts').insert({
        user_id: user.id,
        question_id: questions[current].id,
        selected_option: selected,
        is_correct: isCorrect,
        time_spent_ms: timeSpent,
        session_mode: 'wronganswer',
        session_id: sessionId.current,
      });
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setConfirmed(false);
      questionStartTime.current = Date.now();
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setScore(0);
    setFinished(false);
    sessionId.current = crypto.randomUUID();
    questionStartTime.current = Date.now();
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-red-50">
        <p className="text-red-600">오답 불러오는 중...</p>
      </div>
    );
  }

  if (allWrongQuestions.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-red-50 gap-4 p-8">
        <div className="text-5xl">🎯</div>
        <p className="text-lg font-bold text-green-600">이 과목 오답이 없어요!</p>
        <p className="text-sm text-gray-500">CBT를 더 풀어보세요.</p>
        <button
          onClick={() => router.push('/wronganswers')}
          className="mt-2 px-6 py-3 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition"
        >
          오답노트로 돌아가기
        </button>
      </div>
    );
  }

  // 필터 결과가 0개인 경우
  if (questions.length === 0) {
    const filterLabel = ratingFilter === 'O' ? '○ 알아요' : ratingFilter === '△' ? '△ 헷갈려요' : ratingFilter === 'X' ? '× 몰라요' : '미분류';
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-red-50 gap-4 p-8">
        <div className="text-4xl">🔍</div>
        <p className="text-base font-bold text-gray-700">"{filterLabel}" 분류 문제가 없어요</p>
        <button onClick={() => changeFilter('all')} className="px-5 py-2 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition">
          전체 보기
        </button>
      </div>
    );
  }

  // 결과 화면
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-full bg-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">{pct >= 80 ? '🎉' : '💪'}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">오답 재도전 완료!</h2>
          <p className="text-4xl font-bold text-red-600 mb-1">{score} / {questions.length}</p>
          <p className="text-gray-500 text-sm mb-5">정답률 {pct}%</p>
          <div className="bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: pct + '%', background: pct >= 80 ? '#16a34a' : '#dc2626' }}
            />
          </div>
          {pct >= 80 ? (
            <p className="text-sm text-green-600 font-semibold mb-5">🌟 완벽해요! 이 과목 오답을 정복했어요!</p>
          ) : (
            <p className="text-sm text-red-500 mb-5">아직 틀린 문제가 있어요. 다시 도전해봐요!</p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/wronganswers')}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
            >
              오답노트
            </button>
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition"
            >
              다시 풀기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="bg-red-50 min-h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-red-100 bg-white">
        <button onClick={() => router.push('/wronganswers')} className="text-red-400 hover:text-red-600 transition">← 오답노트</button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{subjectNames[subjectId]}</span>
        <span className="text-gray-300">›</span>
        <span className="font-medium text-gray-700">오답 재도전</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-red-500 bg-red-100 px-3 py-1 rounded-full">
            📒 오답 {current + 1} / {questions.length}
          </span>
        </div>

        {/* ○△× 필터 */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {([
            { key: 'all' as RatingFilter,  label: '전체',       count: allWrongQuestions.length },
            { key: 'X'   as RatingFilter,  label: '× 몰라요',   count: allWrongQuestions.filter(q => questionRatings.get(q.id) === 'X').length },
            { key: '△'  as RatingFilter,  label: '△ 헷갈려요', count: allWrongQuestions.filter(q => questionRatings.get(q.id) === '△').length },
            { key: 'O'   as RatingFilter,  label: '○ 알아요',   count: allWrongQuestions.filter(q => questionRatings.get(q.id) === 'O').length },
            { key: 'none' as RatingFilter, label: '미분류',      count: allWrongQuestions.filter(q => !questionRatings.has(q.id)).length },
          ]).map(({ key, label, count }) => {
            const active = ratingFilter === key;
            const accent = key === 'O' ? '#16a34a' : key === '△' ? '#ca8a04' : key === 'X' ? '#dc2626' : key === 'none' ? '#6b7280' : '#7c3aed';
            return (
              <button
                key={key}
                onClick={() => changeFilter(key)}
                style={{
                  padding: '0.35rem 0.7rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '600',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? accent : 'white',
                  color: active ? 'white' : '#6b7280',
                  border: `1.5px solid ${active ? accent : '#e5e7eb'}`,
                }}
              >
                {label}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* 진행바 */}
        <div className="bg-red-100 rounded-full h-1.5 mb-5 overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-300"
            style={{ width: questions.length > 0 ? ((current + 1) / questions.length * 100) + '%' : '0%' }}
          />
        </div>

        {/* 문제 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-block bg-red-50 text-red-600 rounded-lg px-3 py-1 text-xs font-semibold">
              오답문제 {current + 1}
            </div>
            <button
              onClick={ttsReplay}
              disabled={ttsLoading}
              className="text-xs text-red-400 hover:text-red-600 transition disabled:opacity-50"
              title="다시 읽기"
            >{ttsLoading ? '⏳ 읽는 중...' : '🔊 다시 읽기'}</button>
          </div>
          <p className="text-base font-semibold text-gray-800 leading-relaxed">{q.question_text}</p>
        </div>

        {/* 보기 */}
        <div className="flex flex-col gap-3 mb-5">
          {q.options.map((opt, idx) => {
            const optNum = idx + 1;
            const isSelected = selected === optNum;
            const isCorrect = q.correct_option === optNum;

            let borderColor = '#e5e7eb';
            let bgColor = 'white';
            let circleColor = '#6b7280';
            let circleBg = '#f3f4f6';

            if (confirmed) {
              if (isCorrect) { borderColor = '#16a34a'; bgColor = '#f0fdf4'; circleColor = 'white'; circleBg = '#16a34a'; }
              else if (isSelected) { borderColor = '#dc2626'; bgColor = '#fff1f2'; circleColor = 'white'; circleBg = '#dc2626'; }
            } else if (isSelected) {
              borderColor = '#dc2626'; bgColor = '#fff5f5'; circleColor = 'white'; circleBg = '#dc2626';
            }

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleSelect(idx)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', padding: '1rem',
                    background: bgColor, border: '2px solid ' + borderColor,
                    borderRadius: '0.75rem', cursor: confirmed ? 'default' : 'pointer',
                    textAlign: 'left', transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    background: circleBg, color: circleColor,
                    fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0, marginRight: '0.75rem',
                  }}>{optNum}</span>
                  <span style={{ color: '#1f2937', fontSize: '0.95rem', lineHeight: '1.5' }}>{getOptionText(opt)}</span>
                </button>
                <div style={{ width: '2rem', textAlign: 'center', flexShrink: 0 }}>
                  {confirmed && isCorrect && <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.5rem' }}>O</span>}
                  {confirmed && isSelected && !isCorrect && <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.5rem' }}>X</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 해설 */}
        {confirmed && q.explanation && (
          <div className="bg-orange-50 border-l-4 border-orange-400 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-orange-600 mb-1">해설</p>
            <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {/* 핵심정리 바로가기 — 확인 후 항상 표시 */}
        {confirmed && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={() => router.push(`/theory/${subjectId}`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 transition"
            >
              📚 핵심정리 강의 보러가기
            </button>
          </div>
        )}

        {/* ○△× 분류 버튼 */}
        {confirmed && (
          <div style={{ marginBottom: '1rem', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: '600' }}>이 문제 분류하기</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['O', '△', 'X'] as Rating[]).map(r => {
                const active = questionRatings.get(q.id) === r;
                const accent = r === 'O' ? '#16a34a' : r === '△' ? '#ca8a04' : '#dc2626';
                const bg = r === 'O' ? '#dcfce7' : r === '△' ? '#fef9c3' : '#fee2e2';
                const label = r === 'O' ? '○ 알아요' : r === '△' ? '△ 헷갈려요' : '× 몰라요';
                return (
                  <button
                    key={r}
                    onClick={() => saveRating(q.id, r)}
                    disabled={ratingLoading}
                    style={{ flex: 1, padding: '0.45rem 0.3rem', background: active ? bg : 'white', border: `1.5px solid ${active ? accent : '#e5e7eb'}`, borderRadius: '0.5rem', color: active ? accent : '#9ca3af', fontSize: '0.8rem', fontWeight: active ? '700' : '500', cursor: ratingLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 패스풀 손절 버튼 */}
        {confirmed && (() => {
          const isPassed = passedIds.has(q.id);
          const isPicking = passPickerFor === q.id;
          return (
            <div style={{ marginBottom: '1rem' }}>
              {isPassed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '600', flex: 1 }}>✂️ 패스풀에 등록됨</span>
                  <button
                    onClick={() => togglePass(q.id)}
                    disabled={passLoading}
                    style={{ fontSize: '0.75rem', color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    해제
                  </button>
                </div>
              ) : isPicking ? (
                <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: '0.75rem', padding: '0.7rem 0.9rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.4rem 0', fontWeight: '600' }}>손절 사유 선택</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {PASS_REASONS.map(r => (
                      <button
                        key={r}
                        onClick={() => togglePass(q.id, r)}
                        disabled={passLoading}
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', background: 'white', border: '1.5px solid #fdba74', borderRadius: '9999px', color: '#9a3412', cursor: 'pointer', fontWeight: '500' }}
                      >
                        {r}
                      </button>
                    ))}
                    <button
                      onClick={() => setPassPickerFor(null)}
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '9999px', color: '#9ca3af', cursor: 'pointer' }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setPassPickerFor(q.id)}
                  style={{ width: '100%', padding: '0.4rem', fontSize: '0.78rem', background: 'white', border: '1.5px dashed #d1d5db', borderRadius: '0.5rem', color: '#9ca3af', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#b45309'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; }}
                >
                  ✂️ 이 문제 손절하기
                </button>
              )}
            </div>
          );
        })()}

        {/* 버튼 */}
        <div className="flex justify-end">
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={selected === null}
              className={`px-8 py-3 rounded-xl text-sm font-semibold transition ${
                selected === null
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              확인
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              {current + 1 >= questions.length ? '결과 보기' : '다음 문제'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
