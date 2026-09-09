'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveAttempt, removeAttempt } from '@/lib/kibchul-attempts';

// ─── 상수 ──────────────────────────────────────────────────────
const CONCEPT_SUBJECT_ID = 204;
const SAVE_KEY = 'concept_engineering_progress';
const LS_WRONG = 'kibchul_wrong';

// ─── 타입 ──────────────────────────────────────────────────────
interface ConceptChoice {
  key: string;
  text: string;
  is_correct: boolean;
  explanation: string;
}

interface ConceptQuestion {
  id: number;
  legacy_id: string;
  question_text: string;
  exam_area: string;
  core_explanation: string;
  trap_point: string;
  memory_line: string;
  choices: ConceptChoice[];
  answer_idx: number; // 1-based
}

type Mode = 'loading' | 'home' | 'quiz' | 'result';

interface Answer {
  qid: number;
  selected: number; // 1-based
  correct: boolean;
}

interface SavedProgress {
  questionIds: number[];
  current: number;
  answers: Answer[];
  shuffleQ: boolean;
  savedAt: string;
}

// ─── 유틸 ──────────────────────────────────────────────────────
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

function saveWrongEntry(q: ConceptQuestion, selectedIdx: number) {
  try {
    const existing: { questionId: string }[] = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    const key = `concept_${q.id}`;
    if (existing.some(e => e.questionId === key)) return;
    const entry = {
      subjectId: CONCEPT_SUBJECT_ID,
      sessionId: q.exam_area,
      questionId: key,
      question: q.question_text,
      choices: q.choices.map(c => c.text),
      answer: q.answer_idx,
      selected: selectedIdx,
      explanation: q.core_explanation,
      caution: q.trap_point,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_WRONG, JSON.stringify([...existing, entry]));
    saveAttempt({
      subject_id: CONCEPT_SUBJECT_ID,
      session_id: q.exam_area,
      kibchul_qid: key,
      is_correct: false,
      selected: selectedIdx,
      answer: q.answer_idx,
    }).catch(() => {});
  } catch {}
}

// ─── Supabase fetch ─────────────────────────────────────────────
async function fetchConceptQuestions(): Promise<ConceptQuestion[]> {
  const supabase = createClient();

  const { data: versionRows, error: vErr } = await supabase
    .from('question_versions')
    .select(`
      id,
      question_id,
      question_text,
      questions!inner ( id, legacy_question_id, subject_id ),
      question_explanations ( exam_area, core_explanation, trap_point, memory_line ),
      choices ( choice_key, choice_text, is_correct, explanation, sort_order )
    `)
    .eq('version_no', 1)
    .eq('questions.subject_id', 4)
    .order('questions(legacy_question_id)');

  if (vErr || !versionRows) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (versionRows as any[])
    .filter(row => row.questions)
    .map(row => {
      const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      const qe = Array.isArray(row.question_explanations)
        ? row.question_explanations[0]
        : row.question_explanations;
      const rawChoices = [...(row.choices ?? [])].sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      );
      const choices: ConceptChoice[] = rawChoices.map((c: {
        choice_key: string; choice_text: string; is_correct: boolean; explanation: string;
      }) => ({
        key: c.choice_key,
        text: c.choice_text,
        is_correct: c.is_correct,
        explanation: c.explanation,
      }));
      const answer_idx = choices.findIndex(c => c.is_correct) + 1;
      return {
        id: q?.id as number,
        legacy_id: q?.legacy_question_id as string,
        question_text: row.question_text as string,
        exam_area: qe?.exam_area ?? '',
        core_explanation: qe?.core_explanation ?? '',
        trap_point: qe?.trap_point ?? '',
        memory_line: qe?.memory_line ?? '',
        choices,
        answer_idx,
      };
    })
    .sort((a, b) => (a.legacy_id ?? '').localeCompare(b.legacy_id ?? ''));
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function ConceptEngineeringPage() {
  const [mode, setMode] = useState<Mode>('loading');
  const [allQuestions, setAllQuestions] = useState<ConceptQuestion[]>([]);
  const [questions, setQuestions] = useState<ConceptQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [shuffleQ, setShuffleQ] = useState(false);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null);

  useEffect(() => {
    fetchConceptQuestions().then(qs => {
      setAllQuestions(qs);
      const p = loadProgress();
      if (p && p.questionIds.length > 0 && p.current < p.questionIds.length) {
        setSavedProgress(p);
      }
      setMode('home');
    }).catch(() => setMode('home'));
  }, []);

  const startQuiz = useCallback(() => {
    const pool = shuffleQ ? shuffle(allQuestions) : allQuestions;
    setQuestions(pool);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setSavedProgress(null);
    clearProgress();
    setMode('quiz');
  }, [allQuestions, shuffleQ]);

  const resumeQuiz = useCallback(() => {
    if (!savedProgress) return;
    const qMap = new Map(allQuestions.map(q => [q.id, q]));
    const pool = savedProgress.questionIds.map(id => qMap.get(id)).filter(Boolean) as ConceptQuestion[];
    setQuestions(pool);
    setCurrent(savedProgress.current);
    setSelected(null);
    setRevealed(false);
    setAnswers(savedProgress.answers);
    setShuffleQ(savedProgress.shuffleQ);
    setSavedProgress(null);
    setMode('quiz');
  }, [savedProgress, allQuestions]);

  // 퀴즈 중 자동저장
  useEffect(() => {
    if (mode === 'quiz' && questions.length > 0) {
      saveProgress({
        questionIds: questions.map(q => q.id),
        current,
        answers,
        shuffleQ,
        savedAt: new Date().toISOString(),
      });
    }
  }, [mode, questions, current, answers, shuffleQ]);

  const handleSelect = (idx: number) => {
    if (revealed) {
      setRevealed(false);
      setAnswers(prev => prev.filter(a => a.qid !== questions[current].id));
    }
    setSelected(idx);
  };

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const q = questions[current];
    const correct = selected === q.answer_idx;
    setAnswers(prev => [...prev, { qid: q.id, selected, correct }]);
    if (!correct) saveWrongEntry(q, selected);
    else removeAttempt(`concept_${q.id}`).catch(() => {});
  };

  const handleNext = () => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      clearProgress();
      setMode('result');
    } else {
      setCurrent(nextIdx);
      setSelected(null);
      setRevealed(false);
    }
  };

  const handleGoHome = () => {
    if (questions.length > 0 && (current > 0 || answers.length > 0 || revealed)) {
      const saveIdx = revealed ? current + 1 : current;
      if (saveIdx < questions.length) {
        saveProgress({ questionIds: questions.map(q => q.id), current: saveIdx, answers, shuffleQ, savedAt: new Date().toISOString() });
      } else {
        clearProgress();
      }
    }
    setMode('home');
  };

  // ─── LOADING ────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: '#6b7280' }}>
        문제를 불러오는 중...
      </div>
    );
  }

  // ─── HOME ──────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', background: '#f8f9fa', minHeight: '100vh' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: 4 }}>🚂 철도공학 핵심개념 문제</div>
          <div style={{ fontSize: '.85em', opacity: .85 }}>궤도·차량·전기·신호 집중 훈련 — {allQuestions.length}문항</div>
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
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '.85em', color: '#1e3a8a' }}>
          💡 <strong>핵심개념 문제 안내:</strong> 철도공학 핵심개념의 궤도구조·차량·전기·신호 분야를 다루는 핵심 훈련 문항입니다.
          선지별 해설과 함정 포인트가 함께 제공됩니다.
        </div>

        {/* 문항 수 카드 */}
        <div style={{ background: '#fff', border: '2px solid #3b82f6', borderRadius: 10, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#1d4ed8' }}>{allQuestions.length}</div>
          <div style={{ fontSize: '.85em', color: '#374151' }}>핵심개념 문항</div>
        </div>

        {/* 셔플 옵션 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9em' }}>
            <input type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} />
            문제 순서 섞기
          </label>
        </div>

        <button onClick={startQuiz} disabled={allQuestions.length === 0}
          style={{ width: '100%', padding: '14px', background: allQuestions.length === 0 ? '#d1d5db' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1.05em', fontWeight: 'bold', cursor: allQuestions.length === 0 ? 'default' : 'pointer' }}>
          {allQuestions.length > 0 ? `🚀 ${allQuestions.length}문항 시작` : '문항 없음'}
        </button>
      </div>
    );
  }

  // ─── RESULT ────────────────────────────────────────────────────
  if (mode === 'result') {
    const correctCount = answers.filter(a => a.correct).length;
    const pct = answers.length ? Math.round((correctCount / answers.length) * 100) : 0;
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', background: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>결과</div>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '10px 0' }}>{pct}점</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>{correctCount} / {answers.length} 정답</div>
        </div>

        {/* 오답 목록 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>❌ 틀린 문항</div>
          {answers.filter(a => !a.correct).length === 0
            ? <div style={{ color: '#15803d', fontWeight: 'bold', padding: '16px', background: '#fff', borderRadius: 8, textAlign: 'center' }}>모두 정답입니다! 🎉</div>
            : answers.filter(a => !a.correct).map(a => {
              const q2 = questions.find(q => q.id === a.qid)!;
              return (
                <div key={a.qid} style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: '.78em', color: '#1d4ed8', marginBottom: 4 }}>{q2.exam_area}</div>
                  <div style={{ fontSize: '.9em', marginBottom: 8, fontWeight: 500 }}>{q2.question_text}</div>
                  <div style={{ fontSize: '.85em', color: '#ef4444' }}>
                    내 답: {a.selected}번 — {q2.choices[a.selected - 1]?.text}
                  </div>
                  <div style={{ fontSize: '.85em', color: '#15803d' }}>
                    정답: {q2.answer_idx}번 — {q2.choices[q2.answer_idx - 1]?.text}
                  </div>
                  <div style={{ fontSize: '.82em', color: '#374151', marginTop: 6, borderTop: '1px solid #fecaca', paddingTop: 6 }}>{q2.core_explanation}</div>
                  {q2.trap_point && (
                    <div style={{ fontSize: '.8em', color: '#b45309', background: '#fff8e1', borderRadius: 4, padding: '4px 8px', marginTop: 6 }}>
                      ⚠️ {q2.trap_point}
                    </div>
                  )}
                  {q2.memory_line && (
                    <div style={{ fontSize: '.8em', color: '#1e3a8a', background: '#eff6ff', borderRadius: 4, padding: '4px 8px', marginTop: 4 }}>
                      🔑 {q2.memory_line}
                    </div>
                  )}
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
            style={{ flex: 1, padding: '12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            다시 풀기
          </button>
        </div>
      </div>
    );
  }

  // ─── QUIZ ──────────────────────────────────────────────────────
  const q = questions[current];
  if (!q) return null;
  const progress = Math.round(((current + 1) / questions.length) * 100);
  const correctChoice = q.choices[q.answer_idx - 1];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* 진행 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={handleGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '.85em' }}>← 홈</button>
        <span style={{ fontSize: '.85em', color: '#555' }}>{current + 1} / {questions.length}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, marginBottom: 16 }}>
        <div style={{ background: '#3b82f6', height: 6, borderRadius: 99, width: `${progress}%`, transition: 'width .3s' }} />
      </div>

      {/* 문제 카드 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, padding: '2px 8px', fontSize: '.78em', fontWeight: 'bold' }}>
            {q.exam_area}
          </span>
        </div>
        <div style={{ fontSize: '1em', lineHeight: 1.7, fontWeight: 500 }}>{q.question_text}</div>
      </div>

      {/* 선지 */}
      {q.choices.map((c, i) => {
        const idx = i + 1;
        let bg = '#fff', border = '#e5e7eb', color = '#1f2937', icon = '', fontWeight: 'normal' | 'bold' = 'normal';
        if (revealed) {
          if (c.is_correct) {
            bg = '#166534'; border = '#14532d'; color = '#fff'; icon = '✅ '; fontWeight = 'bold';
          } else if (idx === selected) {
            bg = '#7f1d1d'; border = '#991b1b'; color = '#fff'; icon = '❌ '; fontWeight = 'bold';
          } else {
            bg = '#f3f4f6'; border = '#e5e7eb'; color = '#9ca3af';
          }
        } else if (selected === idx) {
          bg = '#eff6ff'; border = '#3b82f6'; color = '#1e3a8a'; fontWeight = 'bold';
        }
        return (
          <div key={idx}>
            <button onClick={() => handleSelect(idx)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: revealed ? 0 : 8, background: bg, border: `2px solid ${border}`, borderRadius: revealed ? '8px 8px 0 0' : 8, cursor: revealed ? 'default' : 'pointer', color, fontSize: '.92em', lineHeight: 1.5, transition: 'all .15s', fontWeight }}>
              <span style={{ fontWeight: 'bold', marginRight: 4 }}>{icon}{idx}.</span>{c.text}
            </button>
            {/* 선지별 해설 (정답 공개 후) */}
            {revealed && (
              <div style={{ background: c.is_correct ? '#f0fdf4' : idx === selected ? '#fff1f2' : '#fafafa', border: `1px solid ${c.is_correct ? '#86efac' : idx === selected ? '#fca5a5' : '#e5e7eb'}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '8px 14px', marginBottom: 8, fontSize: '.82em', color: c.is_correct ? '#14532d' : idx === selected ? '#7f1d1d' : '#6b7280' }}>
                {c.explanation || (c.is_correct ? '정답입니다.' : '오답입니다.')}
              </div>
            )}
          </div>
        );
      })}

      {/* 핵심 해설 (정답 공개 후) */}
      {revealed && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', marginTop: 4, fontSize: '.88em', color: '#14532d' }}>
          <strong>✅ 정답: {q.answer_idx}번 — {correctChoice?.text}</strong>
          <div style={{ marginTop: 8, color: '#374151' }}>{q.core_explanation}</div>
          {q.trap_point && (
            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 6, padding: '6px 10px', marginTop: 8, color: '#78350f' }}>
              ⚠️ 함정 포인트: {q.trap_point}
            </div>
          )}
          {q.memory_line && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 10px', marginTop: 6, color: '#1e3a8a' }}>
              🔑 암기 포인트: {q.memory_line}
            </div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        {!revealed ? (
          <button onClick={handleReveal} disabled={selected === null}
            style={{ flex: 1, padding: '13px', background: selected === null ? '#d1d5db' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: selected === null ? 'default' : 'pointer', fontSize: '.95em' }}>
            정답 확인
          </button>
        ) : (
          <button onClick={handleNext}
            style={{ flex: 1, padding: '13px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.95em' }}>
            {current + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
          </button>
        )}
      </div>
    </div>
  );
}
