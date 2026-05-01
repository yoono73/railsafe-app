'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const APP_VERSION = 'v0.4';

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

interface WrongAnswer {
  question: Question;
  selectedOption: number;
}

// 시험 모드: 각 문제에 선택한 답 저장
interface ExamAnswer {
  questionId: number;
  selected: number | null;
}

function getOptionText(opt: string | Option): string {
  if (typeof opt === 'string') return opt;
  if (opt && typeof opt === 'object' && 'text' in opt) return opt.text || '';
  return String(opt);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EXAM_COUNT = 20;
const EXAM_SECONDS = 25 * 60; // 25분

const TTS_SPEEDS = [
  { label: '0.7×', value: 0.7, emoji: '🐢' },
  { label: '0.9×', value: 0.9, emoji: '🚶' },
  { label: '1.1×', value: 1.1, emoji: '🏃' },
  { label: '1.3×', value: 1.3, emoji: '🚀' },
];

export default function CbtPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  // ── 모드 선택 상태 ──
  const [mode, setMode] = useState<'select' | 'practice' | 'exam'>('select');

  // ── TTS 속도 ──
  const [ttsRate, setTtsRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.9;
    return parseFloat(localStorage.getItem('cbt_tts_rate') || '0.9');
  });

  const changeTtsRate = (rate: number) => {
    setTtsRate(rate);
    if (typeof window !== 'undefined') localStorage.setItem('cbt_tts_rate', String(rate));
  };

  // ── 공통 ──
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // ── 연습 모드 ──
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const sessionId = useRef<string>(crypto.randomUUID());
  const questionStartTime = useRef<number>(Date.now());

  // ── 시험 모드 ──
  const [examAnswers, setExamAnswers] = useState<ExamAnswer[]>([]);
  const [examCurrent, setExamCurrent] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [examTimeLeft, setExamTimeLeft] = useState(EXAM_SECONDS);
  const [examReviewing, setExamReviewing] = useState(false);
  const examTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const examSessionId = useRef<string>(crypto.randomUUID());
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .order('id');

      if (error) { setLoading(false); return; }

      const filtered = (data || []).filter((q: Question) => {
        if (!Array.isArray(q.options)) return false;
        if (q.options.length !== 4) return false;
        if (q.correct_option < 1 || q.correct_option > 4) return false;
        return q.options.every((o) => getOptionText(o).trim().length > 0);
      });

      setAllQuestions(filtered);
      setLoading(false);
    };
    fetchAll();
  }, [subjectId]);

  // 시험 모드 타이머
  useEffect(() => {
    if (mode !== 'exam' || examFinished) return;
    examTimerRef.current = setInterval(() => {
      setExamTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(examTimerRef.current!);
          handleExamSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (examTimerRef.current) clearInterval(examTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, examFinished]);

  // TTS: 연습 모드 문제 변경 시 자동 읽기
  useEffect(() => {
    if (typeof window === 'undefined' || mode !== 'practice' || loading || finished || questions.length === 0) return;
    const q = questions[current];
    if (!q) return;
    window.speechSynthesis.cancel();
    const utt = new window.SpeechSynthesisUtterance(q.question_text);
    utt.lang = 'ko-KR';
    utt.rate = ttsRate;
    ttsRef.current = utt;
    window.speechSynthesis.speak(utt);
    return () => { window.speechSynthesis.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, mode, loading, finished, questions]);

  // TTS: 시험 모드 문제 변경 시 자동 읽기
  useEffect(() => {
    if (typeof window === 'undefined' || mode !== 'exam' || examFinished || questions.length === 0) return;
    const q = questions[examCurrent];
    if (!q) return;
    window.speechSynthesis.cancel();
    const utt = new window.SpeechSynthesisUtterance(q.question_text);
    utt.lang = 'ko-KR';
    utt.rate = ttsRate;
    ttsRef.current = utt;
    window.speechSynthesis.speak(utt);
    return () => { window.speechSynthesis.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCurrent, mode, examFinished, questions]);

  const ttsPracticeReplay = () => {
    if (!questions.length) return;
    window.speechSynthesis.cancel();
    const utt = new window.SpeechSynthesisUtterance(questions[current].question_text);
    utt.lang = 'ko-KR';
    utt.rate = ttsRate;
    window.speechSynthesis.speak(utt);
  };

  const ttsExamReplay = () => {
    if (!questions.length) return;
    window.speechSynthesis.cancel();
    const utt = new window.SpeechSynthesisUtterance(questions[examCurrent].question_text);
    utt.lang = 'ko-KR';
    utt.rate = ttsRate;
    window.speechSynthesis.speak(utt);
  };

  // 속도 조절 UI 컴포넌트 (인라인)
  const SpeedControl = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginRight: '0.1rem' }}>속도</span>
      {TTS_SPEEDS.map((s) => (
        <button
          key={s.value}
          onClick={() => {
            changeTtsRate(s.value);
            // 현재 재생 중인 발화가 있으면 새 속도로 다시 읽기
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
              const textToRead = mode === 'exam' ? questions[examCurrent]?.question_text : questions[current]?.question_text;
              if (textToRead) {
                const utt = new window.SpeechSynthesisUtterance(textToRead);
                utt.lang = 'ko-KR';
                utt.rate = s.value;
                window.speechSynthesis.speak(utt);
              }
            }
          }}
          style={{
            padding: '0.2rem 0.45rem',
            borderRadius: '0.375rem',
            border: '1.5px solid ' + (ttsRate === s.value ? '#7c3aed' : '#e5e7eb'),
            background: ttsRate === s.value ? '#ede9fe' : 'white',
            color: ttsRate === s.value ? '#7c3aed' : '#9ca3af',
            fontSize: '0.72rem',
            fontWeight: ttsRate === s.value ? '700' : '400',
            cursor: 'pointer',
            lineHeight: '1',
          }}
          title={s.emoji + ' ' + s.label}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const startPractice = () => {
    setQuestions(allQuestions);
    setCurrent(0); setSelected(null); setConfirmed(false);
    setScore(0); setFinished(false); setWrongAnswers([]); setReviewing(false);
    sessionId.current = crypto.randomUUID();
    questionStartTime.current = Date.now();
    setMode('practice');
  };

  const startExam = () => {
    const picked = shuffle(allQuestions).slice(0, Math.min(EXAM_COUNT, allQuestions.length));
    setQuestions(picked);
    setExamAnswers(picked.map((q) => ({ questionId: q.id, selected: null })));
    setExamCurrent(0); setExamFinished(false); setExamReviewing(false);
    setExamTimeLeft(EXAM_SECONDS);
    examSessionId.current = crypto.randomUUID();
    setMode('exam');
  };

  // ── 연습 모드 핸들러 ──
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
    else setWrongAnswers((prev) => [...prev, { question: questions[current], selectedOption: selected }]);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('attempts').insert({
        user_id: user.id,
        question_id: questions[current].id,
        selected_option: selected,
        is_correct: isCorrect,
        time_spent_ms: timeSpent,
        session_mode: 'cbt',
        session_id: sessionId.current,
      });
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) setFinished(true);
    else {
      setCurrent((c) => c + 1);
      setSelected(null); setConfirmed(false);
      questionStartTime.current = Date.now();
    }
  };

  const handleRestart = () => {
    setCurrent(0); setSelected(null); setConfirmed(false);
    setScore(0); setFinished(false); setWrongAnswers([]); setReviewing(false);
    sessionId.current = crypto.randomUUID();
    questionStartTime.current = Date.now();
  };

  useEffect(() => {
    if (finished && questions.length > 0 && mode === 'practice') {
      const pct = Math.round((score / questions.length) * 100);
      const key = 'cbt_progress_' + subjectId;
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({
        lastScore: score, lastTotal: questions.length, lastPct: pct,
        bestPct: Math.max(pct, prev.bestPct || 0),
        lastDate: new Date().toLocaleDateString('ko-KR'),
      }));
    }
  }, [finished, score, questions.length, subjectId, mode]);

  // ── 시험 모드 핸들러 ──
  const handleExamSelect = (optNum: number) => {
    setExamAnswers((prev) => prev.map((a, i) => i === examCurrent ? { ...a, selected: optNum } : a));
  };

  const handleExamSubmit = async (timeout = false) => {
    if (examTimerRef.current) clearInterval(examTimerRef.current);
    setExamFinished(true);

    // DB 저장
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const rows = examAnswers
        .filter((a) => a.selected !== null)
        .map((a, i) => ({
          user_id: user.id,
          question_id: a.questionId,
          selected_option: a.selected,
          is_correct: a.selected === questions[i]?.correct_option,
          time_spent_ms: 0,
          session_mode: 'exam',
          session_id: examSessionId.current,
        }));
      if (rows.length > 0) await supabase.from('attempts').insert(rows);
    }

    if (!timeout) setExamReviewing(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── 로딩 ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f3ff' }}>
        <p style={{ color: '#7c3aed', fontSize: '1.1rem' }}>문제를 불러오는 중...</p>
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f3ff', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>📝</div>
        <p style={{ color: '#7c3aed', fontSize: '1.1rem', fontWeight: '600' }}>아직 CBT 문제가 없습니다</p>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>대시보드로 돌아가기</button>
      </div>
    );
  }

  // ════════════════════════════════
  // 모드 선택 화면
  // ════════════════════════════════
  if (mode === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1f2937' }}>CBT 모의고사</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>총 {allQuestions.length}문제</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 연습 모드 */}
            <button
              onClick={startPractice}
              style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '1rem', padding: '1.5rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem' }}>🎯</span>
                <div>
                  <p style={{ fontWeight: '700', color: '#1f2937', fontSize: '1.05rem' }}>연습 모드</p>
                  <p style={{ color: '#7c3aed', fontSize: '0.8rem', fontWeight: '600' }}>전체 {allQuestions.length}문제</p>
                </div>
              </div>
              <ul style={{ margin: '0', paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {['문제마다 즉시 정답 확인', '해설 바로 확인 가능', '오답 복습 제공'].map((t) => (
                  <li key={t} style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#7c3aed' }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </button>

            {/* 시험 모드 */}
            <button
              onClick={startExam}
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', border: 'none', borderRadius: '1rem', padding: '1.5rem', textAlign: 'left', cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.93')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem' }}>⏱️</span>
                <div>
                  <p style={{ fontWeight: '700', color: 'white', fontSize: '1.05rem' }}>시험 모드</p>
                  <p style={{ color: '#ddd6fe', fontSize: '0.8rem', fontWeight: '600' }}>랜덤 {Math.min(EXAM_COUNT, allQuestions.length)}문제 · 25분</p>
                </div>
              </div>
              <ul style={{ margin: '0', paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {['실제 시험처럼 타이머 제한', '정답은 마지막에 공개', '자유롭게 앞뒤 이동 가능'].map((t) => (
                  <li key={t} style={{ fontSize: '0.85rem', color: '#ede9fe', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#c4b5fd' }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </button>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            style={{ display: 'block', margin: '1.5rem auto 0', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════
  // 시험 모드
  // ════════════════════════════════
  if (mode === 'exam') {

    // 시험 결과 화면
    if (examFinished) {
      const examScore = examAnswers.filter((a, i) => a.selected === questions[i]?.correct_option).length;
      const answered = examAnswers.filter((a) => a.selected !== null).length;
      const pct = Math.round((examScore / questions.length) * 100);

      return (
        <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '1.5rem' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.1)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{pct >= 60 ? '🎉' : '📝'}</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>시험 종료</h2>
              <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#7c3aed', marginBottom: '0.25rem' }}>{examScore} / {questions.length}</p>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>정답률 {pct}% · {answered}/{questions.length}문제 응답</p>
              <div style={{ background: '#f3f4f6', borderRadius: '9999px', height: '10px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div style={{ background: pct >= 60 ? '#16a34a' : '#dc2626', height: '100%', width: pct + '%', borderRadius: '9999px' }} />
              </div>
              <p style={{ fontSize: '0.9rem', color: pct >= 60 ? '#16a34a' : '#dc2626', fontWeight: '600', marginBottom: '1.5rem' }}>
                {pct >= 60 ? '✅ 합격 기준(60%) 달성!' : '❌ 합격 기준(60%) 미달'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => setExamReviewing(true)} style={{ padding: '0.75rem 1.25rem', background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}>
                  문제 해설 보기
                </button>
                <button onClick={() => setMode('select')} style={{ padding: '0.75rem 1.25rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}>
                  다시 도전
                </button>
              </div>
            </div>

            {/* 문제별 정오표 */}
            {!examReviewing && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {questions.map((q, i) => {
                  const ans = examAnswers[i];
                  const isCorrect = ans.selected === q.correct_option;
                  const notAnswered = ans.selected === null;
                  return (
                    <div key={i} style={{
                      background: notAnswered ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff1f2',
                      border: '1.5px solid ' + (notAnswered ? '#e5e7eb' : isCorrect ? '#86efac' : '#fca5a5'),
                      borderRadius: '0.5rem', padding: '0.5rem',
                      textAlign: 'center', fontSize: '0.8rem',
                    }}>
                      <div style={{ color: '#6b7280', marginBottom: '0.2rem' }}>{i + 1}번</div>
                      <div style={{ fontWeight: '700', color: notAnswered ? '#9ca3af' : isCorrect ? '#16a34a' : '#dc2626' }}>
                        {notAnswered ? '-' : isCorrect ? 'O' : 'X'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 해설 목록 */}
            {examReviewing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((q, i) => {
                  const ans = examAnswers[i];
                  const isCorrect = ans.selected === q.correct_option;
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600' }}>{i + 1}번</span>
                        {ans.selected === null
                          ? <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600' }}>미응답</span>
                          : isCorrect
                            ? <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600' }}>정답 ✓</span>
                            : <span style={{ background: '#fff1f2', color: '#dc2626', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600' }}>오답 ✗</span>
                        }
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.6', marginBottom: '0.75rem' }}>{q.question_text}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                        {q.options.map((opt, idx) => {
                          const optNum = idx + 1;
                          const isCorr = q.correct_option === optNum;
                          const isMyAns = ans.selected === optNum;
                          return (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.45rem 0.75rem', borderRadius: '0.5rem',
                              background: isCorr ? '#f0fdf4' : isMyAns ? '#fff1f2' : '#f9fafb',
                              border: '1.5px solid ' + (isCorr ? '#16a34a' : isMyAns ? '#dc2626' : '#e5e7eb'),
                            }}>
                              <span style={{
                                width: '1.4rem', height: '1.4rem', borderRadius: '50%', flexShrink: 0,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                background: isCorr ? '#16a34a' : isMyAns ? '#dc2626' : '#e5e7eb',
                                color: (isCorr || isMyAns) ? 'white' : '#6b7280',
                                fontSize: '0.7rem', fontWeight: 'bold',
                              }}>{optNum}</span>
                              <span style={{ fontSize: '0.85rem', color: '#1f2937', flex: 1 }}>{getOptionText(opt)}</span>
                              {isCorr && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>정답</span>}
                              {isMyAns && !isCorr && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>내 답</span>}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div style={{ background: '#ede9fe', borderRadius: '0.5rem', padding: '0.75rem', borderLeft: '4px solid #7c3aed' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#7c3aed', marginBottom: '0.2rem' }}>해설</p>
                          <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.6' }}>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button onClick={() => router.push('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}>
                대시보드로
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 시험 풀기 화면
    const eq = questions[examCurrent];
    const examSelected = examAnswers[examCurrent]?.selected ?? null;
    const isLast = examCurrent === questions.length - 1;
    const unanswered = examAnswers.filter((a) => a.selected === null).length;

    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '1.5rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {/* 시험 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {examCurrent + 1} / {questions.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {unanswered > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '600' }}>
                  미응답 {unanswered}
                </span>
              )}
              <span style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontWeight: '700',
                fontSize: '1rem',
                background: examTimeLeft <= 60 ? '#fee2e2' : examTimeLeft <= 300 ? '#fef3c7' : '#ede9fe',
                color: examTimeLeft <= 60 ? '#dc2626' : examTimeLeft <= 300 ? '#d97706' : '#7c3aed',
              }}>
                ⏱ {formatTime(examTimeLeft)}
              </span>
            </div>
          </div>

          {/* 진행바 */}
          <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', marginBottom: '1.25rem', overflow: 'hidden' }}>
            <div style={{ background: '#7c3aed', height: '100%', width: ((examCurrent + 1) / questions.length * 100) + '%', borderRadius: '9999px', transition: 'width 0.3s' }} />
          </div>

          {/* 문제 번호 빠른 이동 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
            {questions.map((_, i) => {
              const a = examAnswers[i];
              const answered = a?.selected !== null;
              const isCurr = i === examCurrent;
              return (
                <button
                  key={i}
                  onClick={() => setExamCurrent(i)}
                  style={{
                    width: '2.75rem', height: '2.75rem', borderRadius: '0.375rem',
                    border: isCurr ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                    background: isCurr ? '#7c3aed' : answered ? '#ede9fe' : 'white',
                    color: isCurr ? 'white' : answered ? '#7c3aed' : '#9ca3af',
                    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* 문제 카드 */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 2px 12px rgba(124,58,237,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'inline-block', background: '#ede9fe', color: '#7c3aed', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: '600' }}>
                문제 {examCurrent + 1}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <SpeedControl />
                <button onClick={ttsExamReplay} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7 }} title="다시 읽기">🔊 다시 읽기</button>
              </div>
            </div>
            <p style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.6' }}>{eq.question_text}</p>
          </div>

          {/* 보기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {eq.options.map((opt, idx) => {
              const optNum = idx + 1;
              const isSelected = examSelected === optNum;
              return (
                <button
                  key={idx}
                  onClick={() => handleExamSelect(optNum)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '1rem',
                    background: isSelected ? '#faf5ff' : 'white',
                    border: '2px solid ' + (isSelected ? '#7c3aed' : '#e5e7eb'),
                    borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    background: isSelected ? '#7c3aed' : '#f3f4f6',
                    color: isSelected ? 'white' : '#6b7280',
                    fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0, marginRight: '0.75rem',
                  }}>{optNum}</span>
                  <span style={{ color: '#1f2937', fontSize: '0.95rem', lineHeight: '1.5' }}>{getOptionText(opt)}</span>
                </button>
              );
            })}
          </div>

          {/* 이동 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setExamCurrent((c) => c - 1)}
              disabled={examCurrent === 0}
              style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: examCurrent === 0 ? 'not-allowed' : 'pointer', color: '#374151', opacity: examCurrent === 0 ? 0.4 : 1 }}
            >
              ← 이전
            </button>
            {isLast ? (
              <button
                onClick={() => handleExamSubmit()}
                style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '700' }}
              >
                제출 ({questions.length - unanswered}/{questions.length})
              </button>
            ) : (
              <button
                onClick={() => setExamCurrent((c) => c + 1)}
                style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}
              >
                다음 →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════
  // 연습 모드 (기존)
  // ════════════════════════════════

  // 오답 복습 화면
  if (reviewing) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '1.5rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button onClick={() => setReviewing(false)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.9rem', cursor: 'pointer' }}>
              &larr; 결과로
            </button>
            <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.95rem' }}>오답 {wrongAnswers.length}개</span>
          </div>

          {wrongAnswers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
              <p style={{ color: '#16a34a', fontWeight: '700', fontSize: '1.1rem' }}>오답이 없어요! 완벽해요!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {wrongAnswers.map((wa, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 12px rgba(124,58,237,0.08)' }}>
                  <div style={{ display: 'inline-block', background: '#fee2e2', color: '#dc2626', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.6rem' }}>
                    오답 {i + 1}
                  </div>
                  <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.6', marginBottom: '0.75rem' }}>{wa.question.question_text}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {wa.question.options.map((opt, idx) => {
                      const optNum = idx + 1;
                      const isCorrect = wa.question.correct_option === optNum;
                      const isWrong = wa.selectedOption === optNum;
                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                          background: isCorrect ? '#f0fdf4' : isWrong ? '#fff1f2' : '#f9fafb',
                          border: '1.5px solid ' + (isCorrect ? '#16a34a' : isWrong ? '#dc2626' : '#e5e7eb'),
                        }}>
                          <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isCorrect ? '#16a34a' : isWrong ? '#dc2626' : '#e5e7eb', color: (isCorrect || isWrong) ? 'white' : '#6b7280', fontSize: '0.75rem', fontWeight: 'bold' }}>{optNum}</span>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937', flex: 1 }}>{getOptionText(opt)}</span>
                          {isCorrect && <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1rem' }}>O</span>}
                          {isWrong && <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1rem' }}>X</span>}
                        </div>
                      );
                    })}
                  </div>
                  {wa.question.explanation && (
                    <div style={{ background: '#ede9fe', borderRadius: '0.5rem', padding: '0.75rem', borderLeft: '4px solid #7c3aed' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#7c3aed', marginBottom: '0.2rem' }}>해설</p>
                      <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.6' }}>{wa.question.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>대시보드</button>
            <button onClick={handleRestart} style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>다시 풀기</button>
          </div>
        </div>
      </div>
    );
  }

  // 연습 모드 결과 화면
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.15)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{pct >= 60 ? '🎉' : '📝'}</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed', marginBottom: '0.5rem' }}>결과</h2>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{score} / {questions.length}</p>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>정답률 {pct}%</p>
          <div style={{ background: '#f3f4f6', borderRadius: '9999px', height: '12px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ background: pct >= 60 ? '#16a34a' : '#dc2626', height: '100%', width: pct + '%', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
          </div>

          {wrongAnswers.length > 0 && (
            <button onClick={() => setReviewing(true)} style={{ width: '100%', padding: '0.75rem', background: '#fff1f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '0.5rem', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600', marginBottom: '0.75rem' }}>
              오답 복습 ({wrongAnswers.length}개)
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>대시보드</button>
            <button onClick={handleRestart} style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>다시 풀기</button>
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.7rem', color: '#d1d5db' }}>{APP_VERSION}</p>
        </div>
      </div>
    );
  }

  // 연습 모드 문제 풀기
  const q = questions[current];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '1.5rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button onClick={() => setMode('select')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.9rem', cursor: 'pointer', padding: '0.25rem 0' }}>
            &larr; 나가기
          </button>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{current + 1} / {questions.length}</span>
        </div>

        <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ background: '#7c3aed', height: '100%', width: ((current + 1) / questions.length * 100) + '%', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 2px 12px rgba(124,58,237,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'inline-block', background: '#ede9fe', color: '#7c3aed', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: '600' }}>문제 {current + 1}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <SpeedControl />
              <button onClick={ttsPracticeReplay} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7 }} title="다시 읽기">🔊 다시 읽기</button>
            </div>
          </div>
          <p style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.6' }}>{q.question_text}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {q.options.map((opt, idx) => {
            const optNum = idx + 1;
            const isSelected = selected === optNum;
            const isCorrect = q.correct_option === optNum;

            let borderColor = '#e5e7eb', bgColor = 'white', circleColor = '#6b7280', circleBg = '#f3f4f6';
            if (confirmed) {
              if (isCorrect) { borderColor = '#16a34a'; bgColor = '#f0fdf4'; circleColor = 'white'; circleBg = '#16a34a'; }
              else if (isSelected && !isCorrect) { borderColor = '#dc2626'; bgColor = '#fff1f2'; circleColor = 'white'; circleBg = '#dc2626'; }
            } else if (isSelected) {
              borderColor = '#7c3aed'; bgColor = '#faf5ff'; circleColor = 'white'; circleBg = '#7c3aed';
            }

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => handleSelect(idx)} style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '1rem', background: bgColor, border: '2px solid ' + borderColor, borderRadius: '0.75rem', cursor: confirmed ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', borderRadius: '50%', background: circleBg, color: circleColor, fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0, marginRight: '0.75rem' }}>{optNum}</span>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!confirmed ? (
            <button onClick={handleConfirm} disabled={selected === null} style={{ padding: '0.75rem 2rem', background: selected === null ? '#e5e7eb' : '#7c3aed', color: selected === null ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: '600', cursor: selected === null ? 'not-allowed' : 'pointer', transition: 'background 0.2s ease' }}>확인</button>
          ) : (
            <button onClick={handleNext} style={{ padding: '0.75rem 2rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
              {current + 1 >= questions.length ? '결과 보기' : '다음 문제'}
            </button>
          )}
        </div>

        {confirmed && q.explanation && (
          <div style={{ marginTop: '1rem', background: '#ede9fe', borderRadius: '0.75rem', padding: '1rem', borderLeft: '4px solid #7c3aed' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#7c3aed', marginBottom: '0.25rem' }}>해설</p>
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>{q.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
