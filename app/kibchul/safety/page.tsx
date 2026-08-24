'use client';

import { useState, useCallback, useEffect } from 'react';
import { SAFETY_EXAM, SafetyQuestion } from '@/lib/safety-exam-data';
import { saveAttempt, removeAttempt, loadWrongAttempts } from '@/lib/kibchul-attempts';

// ─── 상수 ──────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  S: '#dc2626', 'A+': '#d97706', A: '#2563eb', B: '#6b7280',
};
const PART_LABEL: Record<number, string> = {
  1: 'PART 1 · 2024.12 공개복원',
  2: 'PART 2 · 2025.06 복기·빈출',
  3: 'PART 3 · 2025 후기 기반',
  4: 'PART 4 · 2025~2026 최신기출',
};
const SAVE_KEY = 'safety_exam_progress';
const LS_WRONG = 'kibchul_wrong';
const SAFETY_SUBJECT_ID = 99;

function saveWrongEntry(q: SafetyQuestion, selected: number) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    const alreadyExists = existing.some((e: { questionId: string }) => e.questionId === q.id);
    if (alreadyExists) return;
    const entry = {
      subjectId: SAFETY_SUBJECT_ID,
      sessionId: PART_LABEL[q.part] ?? `PART ${q.part}`,
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
    saveAttempt({ subject_id: SAFETY_SUBJECT_ID, session_id: entry.sessionId, kibchul_qid: q.id, is_correct: false, selected, answer: q.answer }).catch(() => {});
  } catch {}
}

type Mode = 'home' | 'quiz' | 'result';
type FilterGrade = 'ALL' | 'S' | 'A+' | 'A' | 'B';
type FilterPart = 0 | 1 | 2 | 3 | 4;

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
export default function SafetyExamPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [filterGrade, setFilterGrade] = useState<FilterGrade>('ALL');
  const [filterPart, setFilterPart] = useState<FilterPart>(0);
  const [shuffleQ, setShuffleQ] = useState(false);

  const [questions, setQuestions] = useState<SafetyQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null);

  // 마운트 시 저장된 진행상태 확인 + Supabase 오답 동기화
  useEffect(() => {
    const p = loadProgress();
    if (p && p.questionIds.length > 0 && p.current < p.questionIds.length) {
      setSavedProgress(p);
    }
    (async () => {
      const { data } = await loadWrongAttempts(SAFETY_SUBJECT_ID);
      if (!data.length) return;
      const qMap = new Map(SAFETY_EXAM.map(q => [q.id, q]));
      const fromServer = data.flatMap(r => {
        const q = qMap.get(r.kibchul_qid);
        if (!q) return [];
        return [{ subjectId: SAFETY_SUBJECT_ID, sessionId: r.session_id ?? '', questionId: r.kibchul_qid,
          question: q.question, choices: [...q.choices], answer: r.answer ?? q.answer,
          selected: r.selected ?? 0, explanation: q.explanation ?? '', caution: q.caution ?? '',
          savedAt: new Date().toISOString() }];
      });
      if (!fromServer.length) return;
      const existing: { subjectId: number }[] = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
      const others = existing.filter(e => e.subjectId !== SAFETY_SUBJECT_ID);
      localStorage.setItem(LS_WRONG, JSON.stringify([...others, ...fromServer]));
    })();
  }, []);

  // 퀴즈 진행 중 자동저장 (브라우저 뒤로가기 대응)
  useEffect(() => {
    if (mode === 'quiz' && questions.length > 0) {
      saveProgress({
        questionIds: questions.map(q => q.id),
        current,
        answers,
        filterGrade,
        filterPart,
        shuffleQ,
        savedAt: new Date().toISOString(),
      });
    }
  }, [mode, questions, current, answers, filterGrade, filterPart, shuffleQ]);

  // 필터링
  const filtered = SAFETY_EXAM.filter(q => {
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

  // 이어풀기
  const resumeQuiz = useCallback(() => {
    if (!savedProgress) return;
    const qMap = new Map(SAFETY_EXAM.map(q => [q.id, q]));
    const pool = savedProgress.questionIds.map(id => qMap.get(id)).filter(Boolean) as SafetyQuestion[];
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
    // 정답 확인 후에도 재선택 허용 → reveal 초기화
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
    const correct = selected === q.answer;
    setAnswers(prev => [...prev, { qid: q.id, selected, correct }]);
    if (!correct) saveWrongEntry(q, selected);
    else removeAttempt(q.id).catch(() => {});
  };

  const handleNext = () => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      clearProgress();
      setMode('result');
    } else {
      // 진행상태 저장
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

  // 홈으로 돌아갈 때 진행상태 저장
  const handleGoHome = () => {
    // 풀기 시작한 경우에만 저장
    if (questions.length > 0 && (current > 0 || answers.length > 0 || revealed)) {
      // 정답 확인 후 홈으로 → current+1 저장 (다음 문제부터 이어서)
      // 정답 확인 전 홈으로 → current 저장 (같은 문제부터 이어서)
      const saveIdx = revealed ? current + 1 : current;
      // 저장할 answers: revealed면 현재 문제 답이 포함된 최신 상태
      const saveAnswers = revealed ? answers : answers;
      if (saveIdx < questions.length) {
        saveProgress({
          questionIds: questions.map(q => q.id),
          current: saveIdx,
          answers: saveAnswers,
          filterGrade,
          filterPart,
          shuffleQ,
          savedAt: new Date().toISOString(),
        });
      } else {
        // 마지막 문제까지 다 풀었으면 저장 불필요
        clearProgress();
      }
    }
    setMode('home');
  };

  const q = questions[current];
  const correctCount = answers.filter(a => a.correct).length;

  // ─── HOME ──────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: 4 }}>⚖️ 철도안전법 기출·복원 CBT</div>
          <div style={{ fontSize: '.85em', opacity: .85 }}>2024.12 공개복원 · 2025.06 복기·빈출 · 2025 합격후기 재구성</div>
          <div style={{ fontSize: '.78em', opacity: .7, marginTop: 6 }}>법령 기준: 철도안전법 [2026.3.3 시행], 시행령·시행규칙 [2026.3.24 시행]</div>
        </div>

        {/* 이어풀기 배너 */}
        {savedProgress && (
          <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 }}>📌 이어서 풀기 가능</div>
            <div style={{ fontSize: '.85em', color: '#374151', marginBottom: 10 }}>
              {savedProgress.current}번째 문제까지 완료 · 총 {savedProgress.questionIds.length}문항 ·
              정답 {savedProgress.answers.filter(a => a.correct).length}/{savedProgress.answers.length}
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

        {/* 주의 안내 */}
        <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '.85em', color: '#78350f' }}>
          ⚠️ <strong>학습용 자료 안내:</strong> 공식 기출문제집이 아닌, 수험생 복원·합격후기 기반 재구성 자료입니다.
          벌칙·과태료·수치 등은 개정 가능성이 있으므로 <strong>시험 직전 현행 법령을 반드시 재확인</strong>하세요.
        </div>

        {/* 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {(['S', 'A+', 'A', 'B'] as FilterGrade[]).map(g => {
            const cnt = SAFETY_EXAM.filter(q => q.grade === g).length;
            return (
              <div key={g} style={{ background: '#fff', border: `2px solid ${GRADE_COLOR[g]}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: GRADE_COLOR[g], fontWeight: 'bold', fontSize: '1.1em' }}>{g}</div>
                <div style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{cnt}</div>
                <div style={{ fontSize: '.75em', color: '#666' }}>문항</div>
              </div>
            );
          })}
        </div>

        {/* 필터 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>📋 새로 시작</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>등급 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['ALL', 'S', 'A+', 'A', 'B'] as FilterGrade[]).map(g => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterGrade === g ? (GRADE_COLOR[g] ?? '#374151') : '#d1d5db'}`, background: filterGrade === g ? (GRADE_COLOR[g] ?? '#374151') : '#fff', color: filterGrade === g ? '#fff' : '#374151', fontWeight: filterGrade === g ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.9em' }}>
                  {g} {g !== 'ALL' ? `(${SAFETY_EXAM.filter(q => q.grade === g).length})` : `(${SAFETY_EXAM.length})`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>PART 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([0, 1, 2, 3, 4] as FilterPart[]).map(p => (
                <button key={p} onClick={() => setFilterPart(p)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterPart === p ? '#7f1d1d' : '#d1d5db'}`, background: filterPart === p ? '#7f1d1d' : '#fff', color: filterPart === p ? '#fff' : '#374151', fontWeight: filterPart === p ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.88em' }}>
                  {p === 0 ? `전체 (${SAFETY_EXAM.length})` : `P${p} (${SAFETY_EXAM.filter(q => q.part === p).length})`}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9em' }}>
            <input type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} />
            문제 순서 섞기
          </label>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '.85em', color: '#14532d' }}>
          선택된 문항: <strong>{filtered.length}문항</strong>
        </div>

        <button onClick={startQuiz} disabled={filtered.length === 0}
          style={{ width: '100%', padding: '14px', background: filtered.length === 0 ? '#d1d5db' : '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1.05em', fontWeight: 'bold', cursor: filtered.length === 0 ? 'default' : 'pointer' }}>
          {filtered.length > 0 ? `🚀 ${filtered.length}문항 새로 시작` : '문항 없음'}
        </button>
      </div>
    );
  }

  // ─── RESULT ────────────────────────────────────────────────────
  if (mode === 'result') {
    const pct = Math.round((correctCount / answers.length) * 100);
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>결과</div>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '10px 0' }}>{pct}점</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>{correctCount} / {answers.length} 정답</div>
        </div>

        {/* 등급별 성취 */}
        {(['S', 'A+', 'A', 'B'] as const).map(g => {
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

        {/* 오답 목록 */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>❌ 틀린 문항</div>
          {answers.filter(a => !a.correct).length === 0
            ? <div style={{ color: '#15803d', fontWeight: 'bold' }}>모두 정답입니다! 🎉</div>
            : answers.filter(a => !a.correct).map(a => {
              const q = questions.find(q => q.id === a.qid)!;
              return (
                <div key={a.qid} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: '.8em', color: '#dc2626', marginBottom: 4 }}>
                    {PART_LABEL[q.part]} · {q.grade}등급
                  </div>
                  <div style={{ fontSize: '.9em', marginBottom: 8 }}>{q.question}</div>
                  <div style={{ fontSize: '.85em', color: '#ef4444' }}>내 답: {a.selected}번 — {q.choices[a.selected - 1]}</div>
                  <div style={{ fontSize: '.85em', color: '#15803d' }}>정답: {q.answer}번 — {q.choices[q.answer - 1]}</div>
                  <div style={{ fontSize: '.82em', color: '#555', marginTop: 6, borderTop: '1px solid #fecaca', paddingTop: 6 }}>{q.explanation}</div>
                  {q.caution && <div style={{ fontSize: '.8em', color: '#b45309', background: '#fff8e1', borderRadius: 4, padding: '4px 8px', marginTop: 6 }}>⚠️ {q.caution}</div>}
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
            style={{ flex: 1, padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px' }}>
      {/* 진행 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={handleGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '.85em' }}>← 홈</button>
        <span style={{ fontSize: '.85em', color: '#555' }}>{current + 1} / {questions.length}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, marginBottom: 16 }}>
        <div style={{ background: '#dc2626', height: 6, borderRadius: 99, width: `${progress}%`, transition: 'width .3s' }} />
      </div>

      {/* 문제 카드 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {/* 뱃지 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: GRADE_COLOR[q.grade], color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '.78em', fontWeight: 'bold' }}>{q.grade}등급</span>
          <span style={{ background: '#f3f4f6', color: '#555', borderRadius: 4, padding: '2px 8px', fontSize: '.78em' }}>P{q.part}</span>
          {q.source && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, padding: '2px 8px', fontSize: '.78em' }}>📅 {q.source}</span>}
        </div>
        <div style={{ fontSize: '1em', lineHeight: 1.7, fontWeight: 500 }}>{q.question}</div>
      </div>

      {/* 선지 */}
      {q.choices.map((c, i) => {
        const idx = i + 1;
        let bg = '#fff', border = '#e5e7eb', color = '#1f2937', icon = '', fontWeight: 'normal' | 'bold' = 'normal';
        if (revealed) {
          if (idx === q.answer) {
            bg = '#166534'; border = '#14532d'; color = '#fff'; icon = '✅ '; fontWeight = 'bold';
          } else if (idx === selected) {
            bg = '#7f1d1d'; border = '#991b1b'; color = '#fff'; icon = '❌ '; fontWeight = 'bold';
          } else {
            bg = '#f3f4f6'; border = '#e5e7eb'; color = '#9ca3af';
          }
        } else if (selected === idx) {
          bg = '#fef9c3'; border = '#ca8a04'; color = '#78350f'; fontWeight = 'bold';
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
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', marginTop: 8, fontSize: '.88em', color: '#14532d' }}>
          <strong>✅ 정답: {q.answer}번</strong>
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
            style={{ flex: 1, padding: '13px', background: selected === null ? '#d1d5db' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: selected === null ? 'default' : 'pointer', fontSize: '.95em' }}>
            정답 확인
          </button>
        ) : (
          <button onClick={handleNext}
            style={{ flex: 1, padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.95em' }}>
            {current + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
          </button>
        )}
      </div>
    </div>
  );
}
