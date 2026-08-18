'use client';

import { useState, useCallback, useEffect } from 'react';
import { SIGNAL_EXAM, SignalQuestion, SIGNAL_PART_LABEL, SignalPart } from '@/lib/signal-exam-data';

// ─── 상수 ──────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  S: '#dc2626', 'A+': '#d97706', A: '#2563eb',
};
const SAVE_KEY = 'signal_exam_progress';
const LS_WRONG = 'kibchul_wrong';
const SIGNAL_SUBJECT_ID = 300;

function saveWrongEntry(q: SignalQuestion, selected: number) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    const alreadyExists = existing.some((e: { questionId: string }) => e.questionId === q.id);
    if (alreadyExists) return;
    const entry = {
      subjectId: SIGNAL_SUBJECT_ID,
      sessionId: SIGNAL_PART_LABEL[q.part as SignalPart] ?? `PART ${q.part}`,
      questionId: q.id,
      question: q.question,
      choices: q.choices,
      answer: q.answer,
      selected,
      explanation: q.explanation ?? '',
      caution: q.caution ?? '',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_WRONG, JSON.stringify([...existing, entry]));
  } catch {}
}

type Mode = 'home' | 'quiz' | 'result';
type FilterGrade = 'ALL' | 'S' | 'A+' | 'A';
type FilterPart = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Answer {
  qid: string;
  selected: number;
  correct: boolean;
}

interface SavedProgress {
  questionIds: string[];
  current: number;
  answers: Answer[];
  filterGrade: FilterGrade;
  filterPart: FilterPart;
  shuffleQ: boolean;
  savedAt: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function saveProgress(data: SavedProgress) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}
function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function SignalExamPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [filterGrade, setFilterGrade] = useState<FilterGrade>('ALL');
  const [filterPart, setFilterPart] = useState<FilterPart>(0);
  const [shuffleQ, setShuffleQ] = useState(false);

  const [questions, setQuestions] = useState<SignalQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const p = loadProgress();
    if (p && p.questionIds.length > 0 && p.current < p.questionIds.length) {
      setSavedProgress(p);
    }
  }, []);

  const filtered = SIGNAL_EXAM.filter(q => {
    const g = filterGrade === 'ALL' || q.grade === filterGrade;
    const p = filterPart === 0 || q.part === filterPart;
    return g && p;
  });

  const startQuiz = useCallback(() => {
    const pool = shuffleQ ? shuffle(filtered) : filtered;
    setQuestions(pool);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setSavedProgress(null);
    clearProgress();
    setMode('quiz');
  }, [filtered, shuffleQ]);

  const resumeQuiz = useCallback(() => {
    if (!savedProgress) return;
    const qMap = new Map(SIGNAL_EXAM.map(q => [q.id, q]));
    const pool = savedProgress.questionIds.map(id => qMap.get(id)).filter(Boolean) as SignalQuestion[];
    setQuestions(pool);
    setCurrent(savedProgress.current);
    setSelected(null);
    setRevealed(false);
    setAnswers(savedProgress.answers);
    setFilterGrade(savedProgress.filterGrade);
    setFilterPart(savedProgress.filterPart);
    setShuffleQ(savedProgress.shuffleQ);
    setSavedProgress(null);
    setMode('quiz');
  }, [savedProgress]);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
  };

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const q = questions[current];
    const correct = selected === q.answer;
    setAnswers(prev => [...prev, { qid: q.id, selected, correct }]);
    if (!correct) saveWrongEntry(q, selected);
  };

  const handleNext = () => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      clearProgress();
      setMode('result');
    } else {
      saveProgress({
        questionIds: questions.map(q => q.id),
        current: nextIdx,
        answers: [...answers],
        filterGrade,
        filterPart,
        shuffleQ,
        savedAt: new Date().toISOString(),
      });
      setCurrent(nextIdx);
      setSelected(null);
      setRevealed(false);
    }
  };

  const handleGoHome = () => {
    if (questions.length > 0 && (current > 0 || answers.length > 0 || revealed)) {
      const saveIdx = revealed ? current + 1 : current;
      if (saveIdx < questions.length) {
        saveProgress({
          questionIds: questions.map(q => q.id),
          current: saveIdx,
          answers,
          filterGrade,
          filterPart,
          shuffleQ,
          savedAt: new Date().toISOString(),
        });
      } else {
        clearProgress();
      }
    }
    setMode('home');
  };

  const q = questions[current];
  const correctCount = answers.filter(a => a.correct).length;
  const PARTS: SignalPart[] = [1, 2, 3, 4, 5, 6, 7, 8];

  // ─── HOME ──────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', background: '#f8f9fa', minHeight: '100vh' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: 4 }}>🚦 철도신호 CBT</div>
          <div style={{ fontSize: '.85em', opacity: .85 }}>기출·복원 통합문제집 200제 2026</div>
          <div style={{ fontSize: '.78em', opacity: .7, marginTop: 6 }}>Part 1~8: 신호기→선로전환→궤도회로→폐색→ATS/ATC→CBTC→KTCS→혼합</div>
        </div>

        {/* 이어풀기 배너 */}
        {savedProgress && (
          <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 }}>📌 이어서 풀기 가능</div>
            <div style={{ fontSize: '.85em', color: '#374151', marginBottom: 10 }}>
              {savedProgress.current}번째 문제까지 완료 · 총 {savedProgress.questionIds.length}문항 ·
              정답 {savedProgress.answers.filter((a: Answer) => a.correct).length}/{savedProgress.answers.length}
              <span style={{ color: '#6b7280', marginLeft: 6 }}>
                ({new Date(savedProgress.savedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 저장)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={resumeQuiz}
                style={{ flex: 2, padding: '10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.92em' }}>
                ▶ 이어서 풀기 ({savedProgress.current + 1}번 문제부터)
              </button>
              <button onClick={() => { clearProgress(); setSavedProgress(null); }}
                style={{ flex: 1, padding: '10px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: '.88em' }}>
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 안내 */}
        <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '.85em', color: '#78350f' }}>
          ⚠️ <strong>학습용 자료 안내:</strong> 공개 복원·합격후기·공식자료 기반 재구성 자료입니다.
          KTCS-2/3·LTE-R·CBTC 등 최신 시스템은 공식자료 기준으로 재구성되었습니다.
        </div>

        {/* 등급 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {(['S', 'A+', 'A'] as FilterGrade[]).map(g => {
            const cnt = SIGNAL_EXAM.filter(q => q.grade === g).length;
            const gradeLabel = g === 'S' ? '최빈출' : g === 'A+' ? '빈출' : '법령';
            return (
              <div key={g} style={{ background: '#fff', border: `2px solid ${GRADE_COLOR[g]}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: GRADE_COLOR[g], fontWeight: 'bold', fontSize: '1.1em' }}>{g}</div>
                <div style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{cnt}</div>
                <div style={{ fontSize: '.7em', color: '#666' }}>{gradeLabel}</div>
              </div>
            );
          })}
        </div>

        {/* PART 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 24 }}>
          {PARTS.map(p => {
            const cnt = SIGNAL_EXAM.filter(q => q.part === p).length;
            const label = SIGNAL_PART_LABEL[p];
            const shortLabel = label.substring(0, 7);
            return (
              <div key={p} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: '.7em', color: '#2563eb', fontWeight: 'bold', marginBottom: 2 }}>P{p}</div>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{cnt}</div>
                <div style={{ fontSize: '.6em', color: '#666', lineHeight: 1.2 }}>{shortLabel}</div>
              </div>
            );
          })}
        </div>

        {/* 필터 패널 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>📋 새로 시작</div>

          {/* 등급 필터 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>등급 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['ALL', 'S', 'A+', 'A'] as FilterGrade[]).map(g => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterGrade === g ? (GRADE_COLOR[g] ?? '#2563eb') : '#d1d5db'}`, background: filterGrade === g ? (GRADE_COLOR[g] ?? '#2563eb') : '#fff', color: filterGrade === g ? '#fff' : '#374151', fontWeight: filterGrade === g ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.9em' }}>
                  {g} {g !== 'ALL' ? `(${SIGNAL_EXAM.filter(q => q.grade === g).length})` : `(${SIGNAL_EXAM.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* PART 필터 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>PART 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterPart(0)}
                style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterPart === 0 ? '#1e3a5f' : '#d1d5db'}`, background: filterPart === 0 ? '#1e3a5f' : '#fff', color: filterPart === 0 ? '#fff' : '#374151', fontWeight: filterPart === 0 ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.88em' }}>
                전체 ({SIGNAL_EXAM.length})
              </button>
              {PARTS.map(p => (
                <button key={p} onClick={() => setFilterPart(p)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterPart === p ? '#1e3a5f' : '#d1d5db'}`, background: filterPart === p ? '#1e3a5f' : '#fff', color: filterPart === p ? '#fff' : '#374151', fontWeight: filterPart === p ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.88em' }}>
                  P{p} ({SIGNAL_EXAM.filter(q => q.part === p).length})
                </button>
              ))}
            </div>
            {filterPart !== 0 && (
              <div style={{ fontSize: '.8em', color: '#6b7280', marginTop: 6 }}>
                {SIGNAL_PART_LABEL[filterPart as SignalPart]}
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9em' }}>
            <input type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} />
            문제 순서 섞기
          </label>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '.85em', color: '#1e40af' }}>
          선택된 문항: <strong>{filtered.length}문항</strong>
        </div>

        <button onClick={startQuiz} disabled={filtered.length === 0}
          style={{ width: '100%', padding: '14px', background: filtered.length === 0 ? '#d1d5db' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1.05em', fontWeight: 'bold', cursor: filtered.length === 0 ? 'default' : 'pointer' }}>
          {filtered.length > 0 ? `🚀 ${filtered.length}문항 새로 시작` : '문항 없음'}
        </button>
      </div>
    );
  }

  // ─── RESULT ────────────────────────────────────────────────────
  if (mode === 'result') {
    const pct = Math.round((correctCount / answers.length) * 100);
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', background: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>결과</div>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '10px 0' }}>{pct}점</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>{correctCount} / {answers.length} 정답</div>
        </div>

        {/* 등급별 성취 */}
        {(['S', 'A+', 'A'] as const).map(g => {
          const qs = questions.filter(q => q.grade === g);
          if (!qs.length) return null;
          const ans = answers.filter(a => qs.some(q => q.id === a.qid));
          const cor = ans.filter(a => a.correct).length;
          return (
            <div key={g} style={{ background: '#fff', border: `2px solid ${GRADE_COLOR[g]}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: GRADE_COLOR[g] }}>{g}등급</span>
              <span>{cor} / {qs.length}</span>
            </div>
          );
        })}

        {/* PART별 성취 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: '.9em', color: '#374151' }}>PART별 성취</div>
          {PARTS.map(p => {
            const qs = questions.filter(q => q.part === p);
            if (!qs.length) return null;
            const ans = answers.filter(a => qs.some(q => q.id === a.qid));
            const cor = ans.filter(a => a.correct).length;
            const pct2 = ans.length ? Math.round((cor / ans.length) * 100) : 0;
            const shortLabel = SIGNAL_PART_LABEL[p].substring(0, 12);
            return (
              <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: p < 8 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: '.85em', color: '#555' }}>P{p} {shortLabel}</span>
                <span style={{ fontSize: '.85em', fontWeight: 'bold', color: pct2 >= 70 ? '#15803d' : pct2 >= 50 ? '#d97706' : '#dc2626' }}>{cor}/{ans.length} ({pct2}%)</span>
              </div>
            );
          })}
        </div>

        {/* 오답 목록 */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>❌ 틀린 문항</div>
          {answers.filter(a => !a.correct).length === 0
            ? <div style={{ color: '#15803d', fontWeight: 'bold', padding: '16px', background: '#fff', borderRadius: 8, textAlign: 'center' }}>모두 정답입니다! 🎉</div>
            : answers.filter(a => !a.correct).map(a => {
              const q2 = questions.find(q => q.id === a.qid)!;
              const shortLabel = SIGNAL_PART_LABEL[q2.part].substring(0, 10);
              return (
                <div key={a.qid} style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: '.8em', color: '#2563eb', marginBottom: 4 }}>
                    P{q2.part} · {shortLabel} · {q2.grade}등급
                  </div>
                  <div style={{ fontSize: '.9em', marginBottom: 8, fontWeight: 500, whiteSpace: 'pre-line' }}>{q2.question}</div>
                  <div style={{ fontSize: '.85em', color: '#ef4444' }}>내 답: {a.selected}번 — {q2.choices[a.selected - 1]}</div>
                  <div style={{ fontSize: '.85em', color: '#15803d' }}>정답: {q2.answer}번 — {q2.choices[q2.answer - 1]}</div>
                  <div style={{ fontSize: '.82em', color: '#555', marginTop: 6, borderTop: '1px solid #fecaca', paddingTop: 6 }}>{q2.explanation}</div>
                  {q2.caution && <div style={{ fontSize: '.8em', color: '#b45309', background: '#fff8e1', borderRadius: 4, padding: '4px 8px', marginTop: 6 }}>⚠️ {q2.caution}</div>}
                </div>
              );
            })
          }
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => { clearProgress(); setMode('home'); }}
            style={{ flex: 1, padding: '12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            ← 홈으로
          </button>
          <button onClick={startQuiz}
            style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            다시 풀기
          </button>
        </div>
      </div>
    );
  }

  // ─── QUIZ ──────────────────────────────────────────────────────
  if (!q) return null;
  const progress = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* 진행 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={handleGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '.85em' }}>← 홈</button>
        <span style={{ fontSize: '.85em', color: '#555' }}>{current + 1} / {questions.length}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, marginBottom: 16 }}>
        <div style={{ background: '#2563eb', height: 6, borderRadius: 99, width: `${progress}%`, transition: 'width .3s' }} />
      </div>

      {/* 문제 카드 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: GRADE_COLOR[q.grade] ?? '#6b7280', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '.78em', fontWeight: 'bold' }}>{q.grade}등급</span>
          <span style={{ background: '#f3f4f6', color: '#555', borderRadius: 4, padding: '2px 8px', fontSize: '.78em' }}>P{q.part}</span>
          {q.num && <span style={{ background: '#f3f4f6', color: '#9ca3af', borderRadius: 4, padding: '2px 8px', fontSize: '.75em' }}>#{q.num}</span>}
        </div>
        <div style={{ fontSize: '1em', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-line' }}>{q.question}</div>
      </div>

      {/* 선지 */}
      {q.choices.map((c, i) => {
        const idx = i + 1;
        let bg = '#fff', border = '#e5e7eb', color = '#1f2937', icon = '', fontWeight: 'normal' | 'bold' = 'normal';
        if (revealed) {
          if (idx === q.answer) {
            bg = '#1e3a5f'; border = '#1e3a5f'; color = '#fff'; icon = '✅ '; fontWeight = 'bold';
          } else if (idx === selected) {
            bg = '#7f1d1d'; border = '#991b1b'; color = '#fff'; icon = '❌ '; fontWeight = 'bold';
          } else {
            bg = '#f3f4f6'; border = '#e5e7eb'; color = '#9ca3af';
          }
        } else if (selected === idx) {
          bg = '#eff6ff'; border = '#2563eb'; color = '#1e3a5f'; fontWeight = 'bold';
        }
        return (
          <button key={idx} onClick={() => handleSelect(idx)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: 8, background: bg, border: `2px solid ${border}`, borderRadius: 8, cursor: revealed ? 'default' : 'pointer', color, fontSize: '.92em', lineHeight: 1.5, transition: 'all .15s', fontWeight }}>
            <span style={{ fontWeight: 'bold', marginRight: 4 }}>{icon}{idx}.</span>{c}
          </button>
        );
      })}

      {/* 해설 */}
      {revealed && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginTop: 8, fontSize: '.88em', color: '#1e3a5f' }}>
          <strong>✅ 정답: {q.answer}번 — {q.choices[q.answer - 1]}</strong>
          <div style={{ marginTop: 6 }}>{q.explanation}</div>
          {q.caution && (
            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 6, padding: '6px 10px', marginTop: 8, color: '#78350f' }}>
              ⚠️ {q.caution}
            </div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        {!revealed ? (
          <button onClick={handleReveal} disabled={selected === null}
            style={{ flex: 1, padding: '13px', background: selected === null ? '#d1d5db' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: selected === null ? 'default' : 'pointer', fontSize: '.95em' }}>
            정답 확인
          </button>
        ) : (
          <button onClick={handleNext}
            style={{ flex: 1, padding: '13px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.95em' }}>
            {current + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
          </button>
        )}
      </div>
    </div>
  );
}
