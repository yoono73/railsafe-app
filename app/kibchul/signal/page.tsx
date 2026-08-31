'use client';

import { useState, useCallback, useEffect } from 'react';
import { SIGNAL_EXAM, SignalQuestion, SIGNAL_PART_NAMES, SignalPart, SignalGrade } from '@/lib/signal-exam-data';
import { saveAttempt, removeAttempt, loadWrongAttempts } from '@/lib/kibchul-attempts';

// ─── 상수 ──────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  S: '#7c3aed', 'A+': '#dc2626', A: '#2563eb',
};
const SIGNAL_SUBJECT_ID = 201;
const SAVE_KEY = 'signal_exam_progress';
const LS_WRONG = 'kibchul_wrong';

function saveWrongEntry(q: SignalQuestion, selected: number) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    if (existing.some((e: { questionId: string }) => e.questionId === q.id)) return;
    const entry = {
      subjectId: SIGNAL_SUBJECT_ID,
      sessionId: SIGNAL_PART_NAMES[q.part],
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
    saveAttempt({ subject_id: SIGNAL_SUBJECT_ID, session_id: entry.sessionId, kibchul_qid: q.id, is_correct: false, selected, answer: q.answer }).catch(() => {});
  } catch {}
}

type Mode = 'home' | 'quiz' | 'result';
type FilterGrade = 'ALL' | 'S' | 'A+' | 'A';
type FilterPart = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Answer { qid: string; selected: number; correct: boolean; }
interface SavedProgress {
  questionIds: string[]; current: number; answers: Answer[];
  filterGrade: FilterGrade; filterPart: FilterPart; shuffleQ: boolean; savedAt: string;
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
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function clearProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function SignalCBTPage() {
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
    if (p && p.questionIds.length > 0 && p.current < p.questionIds.length) setSavedProgress(p);
    (async () => {
      const { data } = await loadWrongAttempts(SIGNAL_SUBJECT_ID);
      if (!data.length) return;
      const qMap = new Map(SIGNAL_EXAM.map(q => [q.id, q]));
      const fromServer = data.flatMap(r => {
        const q = qMap.get(r.kibchul_qid);
        if (!q) return [];
        return [{ subjectId: SIGNAL_SUBJECT_ID, sessionId: r.session_id ?? '', questionId: r.kibchul_qid,
          question: q.question, choices: [...q.choices], answer: r.answer ?? q.answer,
          selected: r.selected ?? 0, explanation: q.explanation ?? '', caution: q.caution ?? '',
          savedAt: new Date().toISOString() }];
      });
      if (!fromServer.length) return;
      const existing: { subjectId: number }[] = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
      const others = existing.filter(e => e.subjectId !== SIGNAL_SUBJECT_ID);
      localStorage.setItem(LS_WRONG, JSON.stringify([...others, ...fromServer]));
    })();
  }, []);

  // 퀴즈 진행 중 자동저장
  useEffect(() => {
    if (mode === 'quiz' && questions.length > 0) {
      saveProgress({ questionIds: questions.map(q => q.id), current, answers, filterGrade, filterPart, shuffleQ, savedAt: new Date().toISOString() });
    }
  }, [mode, questions, current, answers, filterGrade, filterPart, shuffleQ]);

  const filtered = SIGNAL_EXAM.filter(q => {
    const g = filterGrade === 'ALL' || q.grade === filterGrade;
    const p = filterPart === 0 || q.part === filterPart;
    return g && p;
  });

  const startQuiz = useCallback(() => {
    const pool = shuffleQ ? shuffle(filtered) : filtered;
    setQuestions(pool); setCurrent(0); setSelected(null); setRevealed(false);
    setAnswers([]); setSavedProgress(null); clearProgress(); setMode('quiz');
  }, [filtered, shuffleQ]);

  const resumeQuiz = useCallback(() => {
    if (!savedProgress) return;
    const qMap = new Map(SIGNAL_EXAM.map(q => [q.id, q]));
    const pool = savedProgress.questionIds.map(id => qMap.get(id)).filter(Boolean) as SignalQuestion[];
    setQuestions(pool); setCurrent(savedProgress.current); setSelected(null); setRevealed(false);
    setAnswers(savedProgress.answers); setFilterGrade(savedProgress.filterGrade);
    setFilterPart(savedProgress.filterPart as FilterPart); setShuffleQ(savedProgress.shuffleQ);
    setSavedProgress(null); setMode('quiz');
  }, [savedProgress]);

  const handleSelect = (idx: number) => {
    if (revealed) { setRevealed(false); setAnswers(prev => prev.filter(a => a.qid !== questions[current].id)); }
    setSelected(idx);
  };

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const q = questions[current];
    const correct = selected === q.answer;
    setAnswers(prev => [...prev.filter(a => a.qid !== q.id), { qid: q.id, selected, correct }]);
    if (!correct) saveWrongEntry(q, selected);
    else removeAttempt(q.id).catch(() => {});
  };

  const handleNext = () => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) { clearProgress(); setMode('result'); }
    else {
      saveProgress({ questionIds: questions.map(q => q.id), current: nextIdx, answers, filterGrade, filterPart, shuffleQ, savedAt: new Date().toISOString() });
      setCurrent(nextIdx); setSelected(null); setRevealed(false);
    }
  };

  const handleGoHome = () => {
    if (questions.length > 0 && (current > 0 || answers.length > 0 || revealed)) {
      const saveIdx = revealed ? current + 1 : current;
      if (saveIdx < questions.length) {
        saveProgress({ questionIds: questions.map(q => q.id), current: saveIdx, answers, filterGrade, filterPart, shuffleQ, savedAt: new Date().toISOString() });
        setSavedProgress(loadProgress());
      } else { clearProgress(); }
    }
    setMode('home');
  };

  const q = questions[current];
  const correctCount = answers.filter(a => a.correct).length;
  const partCounts = ([1,2,3,4,5,6,7,8] as SignalPart[]).map(p => SIGNAL_EXAM.filter(q => q.part === p).length);

  // ─── HOME ────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: 4 }}>🚦 철도신호 선택과목 CBT</div>
          <div style={{ fontSize: '.85em', opacity: .85 }}>기출복원·후기 기반 200문항 · 신호기·폐색·ATC·KTCS 전영역</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {(['S','A+','A'] as SignalGrade[]).map(g => (
              <span key={g} style={{ background: GRADE_COLOR[g], borderRadius: 20, padding: '2px 10px', fontSize: '.8em', fontWeight: 'bold' }}>
                {g} {SIGNAL_EXAM.filter(q => q.grade === g).length}
              </span>
            ))}
          </div>
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
        <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '.84em', color: '#78350f' }}>
          ⚠️ <strong>선택과목 안내:</strong> 25문항 출제(50점), 40점 이상이면 과락 없음. 기출복원·합격후기 재구성 자료 — 시험 전 법령 재확인 필수.
        </div>

        {/* 영역별 통계 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 10, color: '#374151' }}>📊 출제영역별 문항</div>
          {([1,2,3,4,5,6,7,8] as SignalPart[]).map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 200, fontSize: '.78em', color: '#374151' }}>P{p}. {SIGNAL_PART_NAMES[p]}</span>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 3, height: 8 }}>
                <div style={{ width: `${(partCounts[i] / 200) * 100}%`, background: '#4338ca', borderRadius: 3, height: 8 }} />
              </div>
              <span style={{ fontSize: '.8em', color: '#6b7280', width: 28, textAlign: 'right' }}>{partCounts[i]}</span>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>📋 새로 시작</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>등급 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['ALL','S','A+','A'] as FilterGrade[]).map(g => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterGrade === g ? (GRADE_COLOR[g] ?? '#374151') : '#d1d5db'}`,
                    background: filterGrade === g ? (GRADE_COLOR[g] ?? '#374151') : '#fff',
                    color: filterGrade === g ? '#fff' : '#374151', fontWeight: filterGrade === g ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.9em' }}>
                  {g}{g !== 'ALL' ? ` (${SIGNAL_EXAM.filter(q => q.grade === g).length})` : ` (${SIGNAL_EXAM.length})`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>영역 필터</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterPart(0)}
                style={{ padding: '4px 12px', borderRadius: 6, border: `2px solid ${filterPart === 0 ? '#1e1b4b' : '#d1d5db'}`,
                  background: filterPart === 0 ? '#1e1b4b' : '#fff', color: filterPart === 0 ? '#fff' : '#374151', cursor: 'pointer', fontSize: '.82em' }}>
                전체 ({SIGNAL_EXAM.length})
              </button>
              {([1,2,3,4,5,6,7,8] as SignalPart[]).map(p => (
                <button key={p} onClick={() => setFilterPart(p)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `2px solid ${filterPart === p ? '#4338ca' : '#d1d5db'}`,
                    background: filterPart === p ? '#4338ca' : '#fff', color: filterPart === p ? '#fff' : '#374151', cursor: 'pointer', fontSize: '.78em' }}>
                  P{p} ({SIGNAL_EXAM.filter(q => q.part === p).length})
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
          style={{ width: '100%', padding: '14px', background: filtered.length === 0 ? '#d1d5db' : '#4338ca', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1.05em', fontWeight: 'bold', cursor: filtered.length === 0 ? 'default' : 'pointer' }}>
          {filtered.length > 0 ? `🚀 ${filtered.length}문항 새로 시작` : '문항 없음'}
        </button>
      </div>
    );
  }

  // ─── RESULT ──────────────────────────────────────────────────
  if (mode === 'result') {
    const pct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>🚦 철도신호 CBT 결과</div>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '10px 0' }}>{pct}점</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>{correctCount} / {answers.length} 정답</div>
          {answers.length === 25 && (
            <div style={{ marginTop: 8, fontSize: '.85em', background: pct >= 40 ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.25)', borderRadius: 8, padding: '4px 12px' }}>
              {pct >= 40 ? '✅ 선택과목 과락 없음 (40점 이상)' : '❌ 선택과목 과락 (40점 미만)'}
            </div>
          )}
        </div>

        {/* 등급별 성취 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {(['S','A+','A'] as SignalGrade[]).map(g => {
            const qs = questions.filter(q => q.grade === g);
            if (!qs.length) return null;
            const cor = answers.filter(a => qs.some(q => q.id === a.qid) && a.correct).length;
            return (
              <div key={g} style={{ background: '#fff', border: `2px solid ${GRADE_COLOR[g]}`, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: GRADE_COLOR[g] }}>{g}등급</div>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{cor}/{qs.length}</div>
              </div>
            );
          })}
        </div>

        {/* 오답 목록 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>❌ 틀린 문항</div>
          {answers.filter(a => !a.correct).length === 0
            ? <div style={{ color: '#15803d', fontWeight: 'bold' }}>모두 정답입니다! 🎉</div>
            : answers.filter(a => !a.correct).map(a => {
              const q = questions.find(q => q.id === a.qid)!;
              return (
                <div key={a.qid} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: '.78em', color: '#6b7280', marginBottom: 4 }}>
                    <span style={{ color: GRADE_COLOR[q.grade], fontWeight: 'bold', marginRight: 6 }}>{q.grade}</span>
                    P{q.part}. {SIGNAL_PART_NAMES[q.part]}
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

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { clearProgress(); setMode('home'); }}
            style={{ flex: 1, padding: '12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            ← 홈으로
          </button>
          <button onClick={startQuiz}
            style={{ flex: 1, padding: '12px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            다시 풀기
          </button>
        </div>
      </div>
    );
  }

  // ─── QUIZ ────────────────────────────────────────────────────
  if (!q) return null;
  const progress = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
      {/* 진행 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={handleGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '.85em' }}>← 홈</button>
        <span style={{ fontSize: '.85em', color: '#555' }}>{current + 1} / {questions.length}</span>
        <span style={{ fontSize: '.82em', color: '#6b7280' }}>정답 {correctCount}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, marginBottom: 16 }}>
        <div style={{ background: '#4338ca', height: 6, borderRadius: 99, width: `${progress}%`, transition: 'width .3s' }} />
      </div>

      {/* 문제 카드 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: GRADE_COLOR[q.grade], color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '.78em', fontWeight: 'bold' }}>{q.grade}</span>
          <span style={{ background: '#f3f4f6', color: '#555', borderRadius: 4, padding: '2px 8px', fontSize: '.78em' }}>P{q.part} {SIGNAL_PART_NAMES[q.part]}</span>
          {q.ref && <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 4, padding: '2px 8px', fontSize: '.78em' }}>{q.ref}</span>}
        </div>
        <div style={{ fontSize: '1em', lineHeight: 1.7, fontWeight: 500 }}>{q.question}</div>
      </div>

      {/* 선지 */}
      {q.choices.map((c, i) => {
        const idx = i + 1;
        let bg = '#fff', border = '#e5e7eb', color = '#1f2937', icon = '', fw: 'normal' | 'bold' = 'normal';
        if (revealed) {
          if (idx === q.answer) { bg = '#166534'; border = '#14532d'; color = '#fff'; icon = '✅ '; fw = 'bold'; }
          else if (idx === selected) { bg = '#7f1d1d'; border = '#991b1b'; color = '#fff'; icon = '❌ '; fw = 'bold'; }
          else { bg = '#f3f4f6'; border = '#e5e7eb'; color = '#9ca3af'; }
        } else if (selected === idx) { bg = '#ede9fe'; border = '#7c3aed'; color = '#1f2937'; fw = 'bold'; }
        return (
          <button key={idx} onClick={() => handleSelect(idx)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: 8, background: bg, border: `2px solid ${border}`, borderRadius: 8, cursor: revealed ? 'default' : 'pointer', color, fontSize: '.92em', lineHeight: 1.5, transition: 'all .15s', fontWeight: fw }}>
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
      <div style={{ marginTop: 16 }}>
        {!revealed ? (
          <button onClick={handleReveal} disabled={selected === null}
            style={{ width: '100%', padding: '13px', background: selected === null ? '#d1d5db' : '#4338ca', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: selected === null ? 'default' : 'pointer', fontSize: '.95em' }}>
            정답 확인
          </button>
        ) : (
          <button onClick={handleNext}
            style={{ width: '100%', padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.95em' }}>
            {current + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
          </button>
        )}
      </div>
    </div>
  );
}
