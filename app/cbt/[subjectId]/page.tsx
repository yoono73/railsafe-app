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

  // ── 운전 모드 ──
  const [drivingMode, setDrivingMode] = useState(false);
  const [driveCountdown, setDriveCountdown] = useState(0);
  const driveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [listening, setListening] = useState(false);   // 음성 인식 중
  const [voiceError, setVoiceError] = useState('');    // 인식 실패 메시지
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  // ── 북마크 ──
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

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
  const cbtAudioRef = useRef<HTMLAudioElement | null>(null);
  const [cbtTtsLoading, setCbtTtsLoading] = useState(false);

  // ElevenLabs TTS (나레이터 여성 목소리)
  const VOICE_NARRATOR_CBT = '5n5gqmaQi9Ewevrz7bOS';

  const playCbtTts = useCallback(async (text: string, rate: number, onEnd?: () => void) => {
    if (cbtAudioRef.current) { cbtAudioRef.current.pause(); cbtAudioRef.current = null; }
    setCbtTtsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: VOICE_NARRATOR_CBT }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setCbtTtsLoading(false);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = rate;
      cbtAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
      audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
      audio.play().catch(() => onEnd?.());
    } catch {
      setCbtTtsLoading(false);
      onEnd?.();
    }
  }, []);

  const stopCbtTts = useCallback(() => {
    if (cbtAudioRef.current) { cbtAudioRef.current.pause(); cbtAudioRef.current = null; }
    window.speechSynthesis?.cancel();
    setCbtTtsLoading(false);
  }, []);

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

      // 북마크 목록 로드
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: bData } = await supabase
          .from('question_bookmarks')
          .select('question_id')
          .eq('user_id', user.id);
        if (bData) setBookmarked(new Set(bData.map((b: { question_id: number }) => b.question_id)));
      }
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

  // drivingSelectRef 항상 최신 함수 참조 유지
  useEffect(() => { drivingSelectRef.current = drivingSelect; });

  // TTS: 연습 모드 문제 변경 시 자동 읽기
  useEffect(() => {
    if (mode !== 'practice' || loading || finished || questions.length === 0) return;
    const q = questions[current];
    if (!q) return;
    setListening(false);
    setVoiceError('');
    stopCbtTts();
    const text = drivingMode
      ? `${q.question_text}. ${q.options.map((o, i) => `${i + 1}번. ${getOptionText(o)}`).join('. ')}`
      : q.question_text;
    const onEnd = drivingMode ? () => { setTimeout(startListening, 300); } : undefined;
    playCbtTts(text, ttsRate, onEnd);
    return () => { stopCbtTts(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, mode, loading, finished, questions, drivingMode]);

  // TTS: 시험 모드 문제 변경 시 자동 읽기
  useEffect(() => {
    if (mode !== 'exam' || examFinished || questions.length === 0) return;
    const q = questions[examCurrent];
    if (!q) return;
    stopCbtTts();
    playCbtTts(q.question_text, ttsRate);
    return () => { stopCbtTts(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCurrent, mode, examFinished, questions]);

  const ttsPracticeReplay = () => {
    if (!questions.length) return;
    playCbtTts(questions[current].question_text, ttsRate);
  };

  const toggleBookmark = async (questionId: number) => {
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBookmarkLoading(false); return; }

    if (bookmarked.has(questionId)) {
      await supabase.from('question_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('question_id', questionId);
      setBookmarked(prev => { const s = new Set(prev); s.delete(questionId); return s; });
    } else {
      await supabase.from('question_bookmarks')
        .insert({ user_id: user.id, question_id: questionId });
      setBookmarked(prev => new Set([...prev, questionId]));
    }
    setBookmarkLoading(false);
  };

  const ttsExamReplay = () => {
    if (!questions.length) return;
    playCbtTts(questions[examCurrent].question_text, ttsRate);
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
            const textToRead = mode === 'exam' ? questions[examCurrent]?.question_text : questions[current]?.question_text;
            if (textToRead) playCbtTts(textToRead, s.value);
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

  // 음성 입력 숫자 파싱
  const parseVoiceAnswer = (text: string): number => {
    const t = text.trim();
    if (/1|일번|일/.test(t)) return 1;
    if (/2|이번|이$/.test(t)) return 2;
    if (/3|삼번|삼/.test(t)) return 3;
    if (/4|사번|사$/.test(t)) return 4;
    return 0;
  };

  // 음성 인식 시작 (TTS 끝난 후 자동 호출)
  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
              || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;

    rec.onstart = () => { setListening(true); setVoiceError(''); };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== 'no-speech') setVoiceError('인식 실패 — 번호를 탭하세요');
    };
    rec.onresult = (e) => {
      for (let i = 0; i < e.results[0].length; i++) {
        const num = parseVoiceAnswer(e.results[0][i].transcript);
        if (num >= 1 && num <= 4) { drivingSelectRef.current(num); return; }
      }
      setVoiceError('못 들었어요 — 다시 말하거나 탭하세요');
    };
    rec.start();
  };

  // drivingSelect를 ref로 감싸기 (클로저 문제 방지)
  const drivingSelectRef = useRef<(n: number) => void>(() => {});

  // 운전 모드 — 번호 터치/음성 즉시 확인 + 음성 결과 + 자동 넘김
  const drivingSelect = async (optNum: number) => {
    if (confirmed) return;
    setListening(false);
    setVoiceError('');
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    setSelected(optNum);
    setConfirmed(true);
    const q = questions[current];
    const isCorrect = optNum === q.correct_option;
    const timeSpent = Date.now() - questionStartTime.current;
    if (isCorrect) setScore((s) => s + 1);
    else setWrongAnswers((prev) => [...prev, { question: q, selectedOption: optNum }]);

    // 결과 음성 안내
    const resultText = isCorrect
      ? '정답입니다.'
      : `오답입니다. 정답은 ${q.correct_option}번. ${getOptionText(q.options[q.correct_option - 1])}.`;
    playCbtTts(resultText, ttsRate);

    // DB 저장
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('attempts').insert({
        user_id: user.id, question_id: q.id,
        selected_option: optNum, is_correct: isCorrect,
        time_spent_ms: timeSpent, session_mode: 'cbt',
        session_id: sessionId.current,
      });
    }

    // 3초 카운트다운 후 자동 넘김
    let count = 3;
    setDriveCountdown(count);
    if (driveTimerRef.current) clearInterval(driveTimerRef.current);
    driveTimerRef.current = setInterval(() => {
      count -= 1;
      setDriveCountdown(count);
      if (count <= 0) {
        clearInterval(driveTimerRef.current!);
        setDriveCountdown(0);
        if (current + 1 >= questions.length) {
          setFinished(true);
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
          setConfirmed(false);
          questionStartTime.current = Date.now();
        }
      }
    }, 1000);
  };

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

            {/* 운전 모드 토글 */}
            <button
              onClick={() => setDrivingMode((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: drivingMode ? '#1e1b4b' : 'white',
                border: '2px solid ' + (drivingMode ? '#6d28d9' : '#e5e7eb'),
                borderRadius: '1rem', padding: '1rem 1.25rem', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🚗</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: '700', color: drivingMode ? 'white' : '#1f2937', fontSize: '0.95rem' }}>운전 모드</p>
                  <p style={{ fontSize: '0.75rem', color: drivingMode ? '#a5b4fc' : '#9ca3af', marginTop: '0.1rem' }}>문제+보기 전부 읽기 · 터치 후 자동 넘김</p>
                </div>
              </div>
              <div style={{
                width: '2.5rem', height: '1.4rem', borderRadius: '9999px',
                background: drivingMode ? '#7c3aed' : '#e5e7eb',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: '0.15rem',
                  left: drivingMode ? '1.2rem' : '0.15rem',
                  width: '1.1rem', height: '1.1rem',
                  borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </button>

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
  // 운전 모드 화면
  // ════════════════════════════════
  if (mode === 'practice' && drivingMode && !finished && !reviewing) {
    const q = questions[current];
    const isCorrectAns = selected === q.correct_option;

    return (
      <div style={{ minHeight: '100vh', background: '#0f0a2e', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            onClick={() => { stopCbtTts(); if (driveTimerRef.current) clearInterval(driveTimerRef.current); setMode('select'); setDrivingMode(false); setCurrent(0); setSelected(null); setConfirmed(false); setScore(0); setFinished(false); setWrongAnswers([]); }}
            style={{ color: '#a5b4fc', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
          >✕ 나가기</button>
          <span style={{ color: '#818cf8', fontSize: '0.85rem', fontWeight: '600' }}>🚗 {current + 1} / {questions.length}</span>
          <SpeedControl />
        </div>

        {/* 진행바 */}
        <div style={{ background: '#1e1b4b', borderRadius: '9999px', height: '4px', marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div style={{ background: '#7c3aed', height: '100%', width: ((current + 1) / questions.length * 100) + '%', borderRadius: '9999px', transition: 'width 0.3s' }} />
        </div>

        {/* 문제 카드 */}
        <div style={{ background: '#1e1b4b', borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1.25rem', flex: 1 }}>
          <p style={{ color: '#c4b5fd', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem' }}>문제 {current + 1}</p>
          <p style={{ color: 'white', fontSize: '1.05rem', fontWeight: '600', lineHeight: '1.7' }}>{q.question_text}</p>

          {/* 음성 인식 상태 */}
          {!confirmed && (
            <div style={{ marginTop: '1rem' }}>
              {listening ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                  <span style={{ fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>🎤</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>듣는 중... "일", "이", "삼", "사" 또는 "1번"~"4번"</span>
                </div>
              ) : voiceError ? (
                <p style={{ color: '#f87171', fontSize: '0.8rem' }}>⚠️ {voiceError}</p>
              ) : (
                <p style={{ color: '#6366f1', fontSize: '0.8rem' }}>🔊 문제를 읽고 나면 자동으로 듣기 시작해요</p>
              )}
            </div>
          )}

          {confirmed && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: isCorrectAns ? '#14532d' : '#450a0a', borderRadius: '0.75rem', borderLeft: '4px solid ' + (isCorrectAns ? '#22c55e' : '#ef4444') }}>
              <p style={{ color: isCorrectAns ? '#86efac' : '#fca5a5', fontWeight: '700', fontSize: '0.95rem' }}>
                {isCorrectAns ? '✅ 정답!' : `❌ 오답 — 정답: ${q.correct_option}번`}
              </p>
              {!isCorrectAns && (
                <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.3rem' }}>{getOptionText(q.options[q.correct_option - 1])}</p>
              )}
              {driveCountdown > 0 && (
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>⏱ {driveCountdown}초 후 다음 문제...</p>
              )}
            </div>
          )}
        </div>

        {/* 큰 숫자 버튼 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {q.options.map((opt, idx) => {
            const optNum = idx + 1;
            const isSelected = selected === optNum;
            const isCorrectOpt = q.correct_option === optNum;

            let bg = '#312e81';
            let border = '2px solid #4c1d95';
            if (confirmed) {
              if (isCorrectOpt) { bg = '#14532d'; border = '2px solid #22c55e'; }
              else if (isSelected) { bg = '#450a0a'; border = '2px solid #ef4444'; }
            } else if (isSelected) {
              bg = '#6d28d9'; border = '2px solid #a78bfa';
            }

            return (
              <button
                key={idx}
                onClick={() => drivingSelect(optNum)}
                disabled={confirmed}
                style={{
                  background: bg, border, borderRadius: '1rem',
                  padding: '1.75rem 1rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  cursor: confirmed ? 'default' : 'pointer', transition: 'all 0.15s',
                  opacity: confirmed && !isCorrectOpt && !isSelected ? 0.4 : 1,
                }}
              >
                <span style={{ color: 'white', fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{optNum}</span>
                <span style={{ color: '#c4b5fd', fontSize: '0.7rem', textAlign: 'center', lineHeight: '1.4', wordBreak: 'keep-all' }}>
                  {getOptionText(opt).slice(0, 20)}{getOptionText(opt).length > 20 ? '…' : ''}
                </span>
              </button>
            );
          })}
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
              <button
                onClick={() => toggleBookmark(q.id)}
                disabled={bookmarkLoading}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, opacity: bookmarkLoading ? 0.4 : 1 }}
                title={bookmarked.has(q.id) ? '북마크 해제' : '북마크'}
              >
                {bookmarked.has(q.id) ? '★' : '☆'}
              </button>
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

        {/* 오답일 때 핵심정리 바로가기 */}
        {confirmed && selected !== q.correct_option && (
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => router.push(`/theory/${subjectId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.2rem',
                background: '#f5f3ff', border: '1.5px solid #c4b5fd',
                color: '#7c3aed', borderRadius: '0.75rem',
                fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
              }}
            >
              📚 핵심정리 강의 보러가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
