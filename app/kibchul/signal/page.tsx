'use client';

import { useState, useCallback, useEffect } from 'react';
import { SIGNAL_EXAM, SIGNAL_PART_NAMES, SignalQuestion, SignalPart } from '@/lib/signal-exam-data';
import { saveAttempt, removeAttempt, loadWrongAttempts } from '@/lib/kibchul-attempts';

// ─── 상수 ──────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  S: '#dc2626', 'A+': '#d97706', A: '#2563eb',
};
const SIGNAL_SUBJECT_ID = 300;
const SAVE_KEY = 'signal_exam_progress';
const LS_WRONG = 'kibchul_wrong';

// 파트별 색상 (8 파트)
const PART_COLOR: Record<number, string> = {
  1: '#7c3aed', 2: '#0891b2', 3: '#059669', 4: '#d97706',
  5: '#dc2626', 6: '#6366f1', 7: '#db2777', 8: '#374151',
};

function saveWrongEntry(q: SignalQuestion, selected: number) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    if (existing.some((e: { questionId: string }) => e.questionId === q.id)) return;
    const sessionId = SIGNAL_PART_NAMES[q.part as SignalPart];
    const entry = {
      subjectId: SIGNAL_SUBJECT_ID,
      sessionId,
      questionId: q.id,
      question: q.question,
      choices: Array.from(q.choices),
      answer: q.answer,
      selected,
      explanation: q.explanation ?? '',
      caution: q.caution ?? '',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_WRONG, JSON.stringify([...existing, entry]));
    saveAttempt({
      subject_id: SIGNAL_SUBJECT_ID,
      session_id: sessionId,
      kibchul_qid: q.id,
      is_correct: false,
      selected,
      answer: q.answer,
    }).catch(() => {});
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
function saveProgress(d: SavedProgress) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {} }
function loadProgress(): SavedProgress | null { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearProgress() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

// ─── 선로전환기 SVG 애니메이션 인라인 컴포넌트 ──────────────────
function SwitchAnimation({ pos }: { pos: 'normal' | 'reverse' }) {
  // pos: 'normal'=정위(직진), 'reverse'=반위(분기)
  const isReverse = pos === 'reverse';
  const tongX = isReverse ? 18 : 0; // 텅레일 이동량
  return (
    <svg viewBox="0 0 320 140" style={{ width: '100%', maxWidth: 340, display: 'block', margin: '0 auto' }}>
      {/* 배경 */}
      <rect width="320" height="140" fill="#f0fdf4" rx="8" />

      {/* 기본레일 (상하 2개 고정) */}
      {/* 위 기본레일 */}
      <line x1="10" y1="40" x2="310" y2="40" stroke="#555" strokeWidth="5" strokeLinecap="round" />
      {/* 아래 기본레일 */}
      <line x1="10" y1="100" x2="310" y2="100" stroke="#555" strokeWidth="5" strokeLinecap="round" />

      {/* 분기선 (우측 상단으로 갈라짐) */}
      <line x1="180" y1="40" x2="310" y2="10" stroke="#999" strokeWidth="4" strokeDasharray="6,3" />

      {/* 텅레일 상단 — 정위: 기본레일에 밀착(아래), 반위: 위쪽 분기방향으로 이동 */}
      <line
        x1="80"
        y1={isReverse ? 40 : 45}
        x2="180"
        y2={isReverse ? 40 : 50}
        stroke={isReverse ? '#ef4444' : '#2563eb'}
        strokeWidth="4"
        strokeLinecap="round"
        style={{ transition: 'all 0.6s ease' }}
      />
      {/* 텅레일 하단 */}
      <line
        x1="80"
        y1={isReverse ? 55 : 95}
        x2="180"
        y2={isReverse ? 68 : 95}
        stroke={isReverse ? '#f97316' : '#2563eb'}
        strokeWidth="4"
        strokeLinecap="round"
        style={{ transition: 'all 0.6s ease' }}
      />

      {/* 크로싱(Crossing) */}
      <ellipse cx="230" cy="50" rx="14" ry="8" fill="none" stroke="#78350f" strokeWidth="2.5" />
      <text x="230" y="53" textAnchor="middle" fontSize="7" fill="#78350f" fontWeight="bold">크로싱</text>

      {/* 열차 경로 화살표 */}
      {!isReverse && (
        <g>
          <line x1="20" y1="70" x2="290" y2="70" stroke="#22c55e" strokeWidth="2" strokeDasharray="8,4" opacity="0.7" />
          <polygon points="290,66 300,70 290,74" fill="#22c55e" />
          <text x="155" y="85" textAnchor="middle" fontSize="10" fill="#15803d" fontWeight="bold">✔ 직진 (정위)</text>
        </g>
      )}
      {isReverse && (
        <g>
          <path d="M 20 70 Q 120 70 200 25" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="8,4" opacity="0.8" />
          <polygon points="197,18 204,28 194,27" fill="#f59e0b" />
          <text x="120" y="90" textAnchor="middle" fontSize="10" fill="#b45309" fontWeight="bold">↗ 분기 (반위)</text>
        </g>
      )}

      {/* 레이블 */}
      <text x="16" y="30" fontSize="9" fill="#555">기본레일</text>
      <text x="80" y={isReverse ? 34 : 62} fontSize="9" fill={isReverse ? '#dc2626' : '#1d4ed8'} fontWeight="bold"
        style={{ transition: 'all 0.6s ease' }}>
        텅레일
      </text>

      {/* 상태 표시 */}
      <rect x="8" y="112" width="304" height="22" rx="4"
        fill={isReverse ? '#fef3c7' : '#dcfce7'} />
      <text x="160" y="126" textAnchor="middle" fontSize="11" fontWeight="bold"
        fill={isReverse ? '#92400e' : '#166534'}>
        {isReverse ? '반위 (反位) — 분기선 방향' : '정위 (正位) — 직진 방향'}
      </text>
    </svg>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function SignalExamPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [filterGrade, setFilterGrade] = useState<FilterGrade>('ALL');
  const [filterPart, setFilterPart] = useState<FilterPart>(0);
  const [shuffleQ, setShuffleQ] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [switchPos, setSwitchPos] = useState<'normal' | 'reverse'>('normal');

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

  const filtered = SIGNAL_EXAM.filter(q => {
    const g = filterGrade === 'ALL' || q.grade === filterGrade;
    const p = filterPart === 0 || q.part === filterPart;
    return g && p;
  });

  const startQuiz = useCallback(() => {
    const pool = shuffleQ ? shuffle(filtered) : filtered;
    setQuestions(pool); setCurrent(0); setSelected(null);
    setRevealed(false); setAnswers([]); setSavedProgress(null);
    clearProgress(); setMode('quiz');
  }, [filtered, shuffleQ]);

  const resumeQuiz = useCallback(() => {
    if (!savedProgress) return;
    const qMap = new Map(SIGNAL_EXAM.map(q => [q.id, q]));
    const pool = savedProgress.questionIds.map(id => qMap.get(id)).filter(Boolean) as SignalQuestion[];
    setQuestions(pool); setCurrent(savedProgress.current); setSelected(null);
    setRevealed(false); setAnswers(savedProgress.answers);
    setFilterGrade(savedProgress.filterGrade); setFilterPart(savedProgress.filterPart);
    setShuffleQ(savedProgress.shuffleQ); setSavedProgress(null); setMode('quiz');
  }, [savedProgress]);

  const handleSelect = (idx: number) => { if (!revealed) setSelected(idx); };
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
      } else { clearProgress(); }
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
        <div style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: 4 }}>🚦 철도신호 기출·복원 CBT</div>
          <div style={{ fontSize: '.85em', opacity: .85 }}>기출복원 240문항 + 핵심정리 기반 40문항 = 총 280문항</div>
          <div style={{ fontSize: '.78em', opacity: .7, marginTop: 4 }}>PART 1~8 | 신호기·선로전환기·궤도회로·폐색·열차제어·CBTC·KTCS</div>
        </div>

        {/* 선로전환기 이해 도우미 */}
        <div style={{ background: '#fff', border: '2px solid #4f46e5', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSwitch ? 12 : 0 }}>
            <span style={{ fontWeight: 'bold', color: '#312e81', fontSize: '.95em' }}>🔀 선로전환기 작동 원리</span>
            <button onClick={() => setShowSwitch(!showSwitch)}
              style={{ padding: '4px 12px', background: showSwitch ? '#e0e7ff' : '#4f46e5', color: showSwitch ? '#312e81' : '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.82em', fontWeight: 'bold' }}>
              {showSwitch ? '닫기' : '▶ 보기'}
            </button>
          </div>
          {showSwitch && (
            <div>
              <SwitchAnimation pos={switchPos} />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={() => setSwitchPos('normal')}
                  style={{ flex: 1, padding: '10px', background: switchPos === 'normal' ? '#166534' : '#f0fdf4', color: switchPos === 'normal' ? '#fff' : '#166534', border: '2px solid #166534', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.9em', transition: 'all .3s' }}>
                  정위 (直線)
                </button>
                <button onClick={() => setSwitchPos('reverse')}
                  style={{ flex: 1, padding: '10px', background: switchPos === 'reverse' ? '#92400e' : '#fffbeb', color: switchPos === 'reverse' ? '#fff' : '#92400e', border: '2px solid #92400e', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.9em', transition: 'all .3s' }}>
                  반위 (分岐)
                </button>
              </div>
              <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 6, padding: '10px 12px', fontSize: '.83em', color: '#374151', lineHeight: 1.7 }}>
                <strong>텅레일(Tongue Rail)</strong>: 뾰족하게 가공된 이동 레일. 기본레일에 밀착/이탈하여 진로를 결정.<br/>
                <strong>정위</strong>: 텅레일이 직진 기본레일에 밀착 → 열차가 직선 통과.<br/>
                <strong>반위</strong>: 텅레일이 분기 방향 레일에 밀착 → 열차가 분기선으로 진입.<br/>
                <strong>대향 진입</strong>: 텅레일 뾰족한 쪽(첨단부)으로 들어오는 방향 → <span style={{ color: '#dc2626', fontWeight: 'bold' }}>탈선 위험</span><br/>
                <strong>배향 진입</strong>: 텅레일 넓은 쪽(둔단부)에서 들어오는 방향 → <span style={{ color: '#d97706', fontWeight: 'bold' }}>할출 위험</span>
              </div>
            </div>
          )}
        </div>

        {/* 이어풀기 */}
        {savedProgress && (
          <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 }}>📌 이어서 풀기 가능</div>
            <div style={{ fontSize: '.85em', color: '#374151', marginBottom: 10 }}>
              {savedProgress.current}번째 완료 · 총 {savedProgress.questionIds.length}문항 · 정답 {savedProgress.answers.filter(a => a.correct).length}/{savedProgress.answers.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={resumeQuiz}
                style={{ flex: 2, padding: '10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.92em' }}>
                ▶ 이어서 ({savedProgress.current + 1}번부터)
              </button>
              <button onClick={() => { clearProgress(); setSavedProgress(null); }}
                style={{ flex: 1, padding: '10px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: '.88em' }}>
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 등급 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {(['S', 'A+', 'A'] as FilterGrade[]).map(g => (
            <div key={g} style={{ background: '#fff', border: `2px solid ${GRADE_COLOR[g]}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ color: GRADE_COLOR[g], fontWeight: 'bold', fontSize: '1.05em' }}>{g}</div>
              <div style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{SIGNAL_EXAM.filter(q => q.grade === g).length}</div>
              <div style={{ fontSize: '.75em', color: '#666' }}>문항</div>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>📋 새로 시작</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>등급 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['ALL', 'S', 'A+', 'A'] as FilterGrade[]).map(g => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: `2px solid ${filterGrade === g ? (GRADE_COLOR[g] ?? '#374151') : '#d1d5db'}`, background: filterGrade === g ? (GRADE_COLOR[g] ?? '#374151') : '#fff', color: filterGrade === g ? '#fff' : '#374151', fontWeight: filterGrade === g ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.88em' }}>
                  {g} {g !== 'ALL' ? `(${SIGNAL_EXAM.filter(q => q.grade === g).length})` : `(${SIGNAL_EXAM.length})`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.85em', color: '#555', marginBottom: 6 }}>PART 필터</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterPart(0)}
                style={{ padding: '4px 12px', borderRadius: 6, border: `2px solid ${filterPart === 0 ? '#312e81' : '#d1d5db'}`, background: filterPart === 0 ? '#312e81' : '#fff', color: filterPart === 0 ? '#fff' : '#374151', fontWeight: filterPart === 0 ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.82em' }}>
                전체({SIGNAL_EXAM.length})
              </button>
              {([1, 2, 3, 4, 5, 6, 7, 8] as SignalPart[]).map(p => (
                <button key={p} onClick={() => setFilterPart(p)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `2px solid ${filterPart === p ? PART_COLOR[p] : '#d1d5db'}`, background: filterPart === p ? PART_COLOR[p] : '#fff', color: filterPart === p ? '#fff' : '#374151', cursor: 'pointer', fontSize: '.78em', fontWeight: filterPart === p ? 'bold' : 'normal' }}>
                  P{p}({SIGNAL_EXAM.filter(q => q.part === p).length})
                </button>
              ))}
            </div>
            {filterPart !== 0 && (
              <div style={{ marginTop: 6, fontSize: '.8em', color: PART_COLOR[filterPart], fontWeight: 'bold' }}>
                {SIGNAL_PART_NAMES[filterPart as SignalPart]}
              </div>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9em' }}>
            <input type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} />
            문제 순서 섞기
          </label>
        </div>

        <div style={{ background: '#ede9fe', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: '.85em', color: '#4c1d95', fontWeight: 'bold' }}>
          선택된 문항: {filtered.length}문항
        </div>

        <button onClick={startQuiz} disabled={filtered.length === 0}
          style={{ width: '100%', padding: '14px', background: filtered.length === 0 ? '#d1d5db' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1.05em', fontWeight: 'bold', cursor: filtered.length === 0 ? 'default' : 'pointer' }}>
          {filtered.length > 0 ? `🚀 ${filtered.length}문항 시작` : '문항 없음'}
        </button>
      </div>
    );
  }

  // ─── RESULT ────────────────────────────────────────────────────
  if (mode === 'result') {
    const pct = Math.round((correctCount / answers.length) * 100);
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '1.1em', fontWeight: 'bold' }}>🚦 철도신호 결과</div>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '10px 0' }}>{pct}점</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>{correctCount} / {answers.length} 정답</div>
        </div>

        {/* 파트별 성취 */}
        {([1, 2, 3, 4, 5, 6, 7, 8] as SignalPart[]).map(p => {
          const qs = questions.filter(q => q.part === p);
          if (!qs.length) return null;
          const ans = answers.filter(a => qs.some(q => q.id === a.qid));
          const cor = ans.filter(a => a.correct).length;
          return (
            <div key={p} style={{ background: '#fff', border: `2px solid ${PART_COLOR[p]}`, borderRadius: 8, padding: '8px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: PART_COLOR[p], fontSize: '.85em', fontWeight: 'bold' }}>P{p} {SIGNAL_PART_NAMES[p]}</span>
              <span style={{ fontWeight: 'bold' }}>{cor}/{qs.length}</span>
            </div>
          );
        })}

        {/* 오답 목록 */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>❌ 틀린 문항</div>
          {answers.filter(a => !a.correct).length === 0
            ? <div style={{ color: '#15803d', fontWeight: 'bold', padding: 16, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>모두 정답! 🎉</div>
            : answers.filter(a => !a.correct).map(a => {
              const q = questions.find(q => q.id === a.qid)!;
              return (
                <div key={a.qid} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: '.78em', color: '#dc2626', marginBottom: 4 }}>
                    P{q.part} · {SIGNAL_PART_NAMES[q.part as SignalPart]} · {q.grade}
                  </div>
                  <div style={{ fontSize: '.9em', marginBottom: 8, fontWeight: 500 }}>{q.question}</div>
                  <div style={{ fontSize: '.85em', color: '#ef4444' }}>내 답: {a.selected}번 — {q.choices[a.selected - 1]}</div>
                  <div style={{ fontSize: '.85em', color: '#15803d' }}>정답: {q.answer}번 — {q.choices[q.answer - 1]}</div>
                  <div style={{ fontSize: '.82em', color: '#555', marginTop: 6, borderTop: '1px solid #fecaca', paddingTop: 6 }}>{q.explanation}</div>
                  {q.caution && <div style={{ fontSize: '.8em', color: '#b45309', background: '#fff8e1', borderRadius: 4, padding: '4px 8px', marginTop: 6 }}>⚠️ {q.caution}</div>}
                </div>
              );
            })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => { clearProgress(); setMode('home'); }}
            style={{ flex: 1, padding: '12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
            ← 홈
          </button>
          <button onClick={startQuiz}
            style={{ flex: 1, padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
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
      {/* 진행바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <button onClick={handleGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '.85em' }}>← 홈</button>
        <span style={{ fontSize: '.85em', color: '#555' }}>{current + 1} / {questions.length}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, marginBottom: 14 }}>
        <div style={{ background: '#4f46e5', height: 6, borderRadius: 99, width: `${progress}%`, transition: 'width .3s' }} />
      </div>

      {/* 문제 카드 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ background: GRADE_COLOR[q.grade], color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '.77em', fontWeight: 'bold' }}>{q.grade}</span>
          <span style={{ background: PART_COLOR[q.part], color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '.77em' }}>P{q.part}</span>
          <span style={{ background: '#f3f4f6', color: '#555', borderRadius: 4, padding: '2px 8px', fontSize: '.77em' }}>{SIGNAL_PART_NAMES[q.part as SignalPart]}</span>
        </div>
        <div style={{ fontSize: '1em', lineHeight: 1.75, fontWeight: 500 }}>{q.question}</div>
      </div>

      {/* 선지 */}
      {q.choices.map((c, i) => {
        const idx = i + 1;
        let bg = '#fff', border = '#e5e7eb', color = '#1f2937', icon = '';
        if (revealed) {
          if (idx === q.answer) { bg = '#dcfce7'; border = '#16a34a'; color = '#166534'; icon = ' ✓'; }
          else if (idx === selected) { bg = '#fee2e2'; border = '#dc2626'; color = '#991b1b'; icon = ' ✗'; }
          else { color = '#9ca3af'; }
        } else if (idx === selected) { bg = '#ede9fe'; border = '#4f46e5'; color = '#312e81'; }
        return (
          <button key={idx} onClick={() => handleSelect(idx)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 8, border: `2px solid ${border}`, background: bg, color, marginBottom: 8, cursor: revealed ? 'default' : 'pointer', fontSize: '.93em', lineHeight: 1.55, transition: 'all .15s' }}>
            <span style={{ fontWeight: 'bold', marginRight: 6 }}>{idx}</span>{c}{icon}
          </button>
        );
      })}

      {/* 해설 */}
      {revealed && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginTop: 4, marginBottom: 12 }}>
          <div style={{ fontSize: '.85em', color: '#14532d', lineHeight: 1.65 }}>💡 {q.explanation}</div>
          {q.caution && (
            <div style={{ fontSize: '.82em', color: '#92400e', background: '#fff8e1', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>⚠️ {q.caution}</div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!revealed
          ? <button onClick={handleReveal} disabled={selected === null}
              style={{ flex: 1, padding: '13px', background: selected === null ? '#d1d5db' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: selected === null ? 'default' : 'pointer', fontSize: '1em' }}>
              정답 확인
            </button>
          : <button onClick={handleNext}
              style={{ flex: 1, padding: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}>
              {current + 1 < questions.length ? '다음 →' : '결과 보기'}
            </button>
        }
      </div>
    </div>
  );
}
