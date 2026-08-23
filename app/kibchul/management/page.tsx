'use client';

import { useState, useCallback, useEffect } from 'react';
import { managementQuestions, MgmtQuestion } from '@/lib/management-exam-data';
import { saveAttempt, removeAttempt, loadWrongAttempts } from '@/lib/kibchul-attempts';

const MGMT_SUBJECT_ID = 200;
const LS_WRONG = 'kibchul_wrong';
const SAVE_KEY = 'kibchul_mgmt_progress';

const PART_NAMES: Record<number, string> = {
  1: '관리이론',
  2: '조직·평가',
  3: '운전행동',
  4: '심리·동기',
  5: '사고분석',
};

const PART_COLOR: Record<number, string> = {
  1: '#0891b2', 2: '#7c3aed', 3: '#059669', 4: '#d97706', 5: '#dc2626',
};

const GRADE_COLOR: Record<string, string> = {
  'A': '#2563eb', 'B': '#6b7280',
};

function saveWrongEntry(q: MgmtQuestion, selected: number) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    const key = `mgmt_${q.id}`;
    if (existing.some((e: { questionId: string }) => e.questionId === key)) return;
    const entry = {
      subjectId: MGMT_SUBJECT_ID,
      sessionId: PART_NAMES[q.part],
      questionId: key,
      question: q.question,
      choices: Array.from(q.choices),
      answer: q.answer,
      selected,
      explanation: q.explanation ?? '',
      caution: '',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_WRONG, JSON.stringify([...existing, entry]));
    saveAttempt({
      subject_id: MGMT_SUBJECT_ID,
      session_id: PART_NAMES[q.part],
      kibchul_qid: key,
      is_correct: false,
      selected,
      answer: q.answer,
    }).catch(() => {});
  } catch {}
}

type Mode = 'home' | 'quiz' | 'result';
type FilterGrade = 'ALL' | 'A' | 'B';
type FilterPart = 0 | 1 | 2 | 3 | 4 | 5;

interface Answer { qid: string; selected: number; correct: boolean; }
interface SavedProgress {
  questionIds: number[]; current: number; answers: Answer[];
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
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function clearProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

export default function ManagementCBTPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [filterGrade, setFilterGrade] = useState<FilterGrade>('ALL');
  const [filterPart, setFilterPart] = useState<FilterPart>(0);
  const [shuffleQ, setShuffleQ] = useState(true);
  const [shuffleC, setShuffleC] = useState(false);

  const [questions, setQuestions] = useState<MgmtQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [choiceOrder, setChoiceOrder] = useState<number[]>([0, 1, 2, 3]);

  useEffect(() => {
    const saved = loadProgress();
    if (saved) setHasSaved(true);
    (async () => {
      const { data } = await loadWrongAttempts(MGMT_SUBJECT_ID);
      if (!data.length) return;
      const qMap = new Map(managementQuestions.map(q => [String(q.id), q]));
      const fromServer = data.flatMap(r => {
        const q = qMap.get(r.kibchul_qid);
        if (!q) return [];
        return [{ subjectId: MGMT_SUBJECT_ID, sessionId: r.session_id ?? '', questionId: r.kibchul_qid,
          question: q.question, choices: [...q.choices], answer: r.answer ?? q.answer,
          selected: r.selected ?? 0, explanation: q.explanation ?? '',
          savedAt: new Date().toISOString() }];
      });
      if (!fromServer.length) return;
      const existing: { subjectId: number }[] = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
      const others = existing.filter(e => e.subjectId !== MGMT_SUBJECT_ID);
      localStorage.setItem(LS_WRONG, JSON.stringify([...others, ...fromServer]));
    })();
  }, []);

  const getFiltered = useCallback(() => {
    let qs = [...managementQuestions];
    if (filterGrade !== 'ALL') qs = qs.filter(q => q.grade === filterGrade);
    if (filterPart !== 0) qs = qs.filter(q => q.part === filterPart);
    return qs;
  }, [filterGrade, filterPart]);

  const startNew = useCallback(() => {
    const qs = getFiltered();
    const ordered = shuffleQ ? shuffle(qs) : qs;
    setQuestions(ordered);
    setCurrent(0);
    setSelected(null);
    setShowExpl(false);
    setAnswers([]);
    if (shuffleC) setChoiceOrder(shuffle([0, 1, 2, 3]));
    else setChoiceOrder([0, 1, 2, 3]);
    clearProgress();
    setMode('quiz');
  }, [getFiltered, shuffleQ, shuffleC]);

  const resumeSaved = useCallback(() => {
    const saved = loadProgress();
    if (!saved) return;
    const idMap = new Map(managementQuestions.map(q => [q.id, q]));
    const qs = saved.questionIds.map(id => idMap.get(id)!).filter(Boolean);
    setQuestions(qs);
    setCurrent(saved.current);
    setAnswers(saved.answers);
    setFilterGrade(saved.filterGrade);
    setFilterPart(saved.filterPart as FilterPart);
    setShuffleQ(saved.shuffleQ);
    setSelected(null);
    setShowExpl(false);
    setChoiceOrder([0, 1, 2, 3]);
    setHasSaved(false);
    setMode('quiz');
  }, []);

  const q = questions[current];

  const handleSelect = useCallback((idx: number) => {
    if (showExpl) return;
    setSelected(idx);
    // 선택 즉시 저장 — 이어풀기 대응
    saveProgress({
      questionIds: questions.map(q => q.id),
      current,
      answers,
      filterGrade, filterPart, shuffleQ,
      savedAt: new Date().toISOString(),
    });
  }, [showExpl, questions, current, answers, filterGrade, filterPart, shuffleQ]);

  const handleReveal = useCallback(() => {
    if (selected === null || showExpl) return;
    setShowExpl(true);
    const correct = selected === q.answer;
    const newAnswers = [
      ...answers.filter(a => a.qid !== String(q.id)),
      { qid: String(q.id), selected, correct },
    ];
    setAnswers(newAnswers);
    if (!correct) saveWrongEntry(q, selected);
    else removeAttempt(String(q.id)).catch(() => {});
    saveProgress({
      questionIds: questions.map(q => q.id),
      current,
      answers: newAnswers,
      filterGrade, filterPart, shuffleQ,
      savedAt: new Date().toISOString(),
    });
  }, [selected, showExpl, q, answers, questions, current, filterGrade, filterPart, shuffleQ]);

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      clearProgress();
      setMode('result');
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setShowExpl(false);
    if (shuffleC) setChoiceOrder(shuffle([0, 1, 2, 3]));
    else setChoiceOrder([0, 1, 2, 3]);
  }, [current, questions.length, shuffleC]);

  // ─── 홈 화면 ────────────────────────────────────────────────
  if (mode === 'home') {
    const total = managementQuestions.length;
    const aCount = managementQuestions.filter(q => q.grade === 'A').length;
    const filtered = getFiltered();

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#0c4a6e,#075985)', color: '#fff', borderRadius: 14, padding: '24px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: 4 }}>📊 교통안전관리론 기출·복원 CBT</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>2020~2026 기출복원 + 신경향 대응 {total}문항</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '.82em' }}>
            <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>A등급 {aCount}문항</span>
            <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>B등급 {total - aCount}문항</span>
          </div>
        </div>

        {/* 이어풀기 */}
        {hasSaved && (
          <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#1e40af' }}>📌 이어풀기</div>
              <div style={{ fontSize: '.83em', color: '#1d4ed8' }}>이전 세션이 저장되어 있습니다.</div>
            </div>
            <button onClick={resumeSaved} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}>이어풀기</button>
          </div>
        )}

        {/* 필터 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#374151' }}>📐 출제 범위 설정</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '.85em', color: '#6b7280', marginBottom: 6 }}>등급 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['ALL', 'A', 'B'] as FilterGrade[]).map(g => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontWeight: 'bold', fontSize: '.85em',
                    borderColor: filterGrade === g ? '#075985' : '#e5e7eb',
                    background: filterGrade === g ? '#0c4a6e' : '#fff',
                    color: filterGrade === g ? '#fff' : '#374151'
                  }}>
                  {g === 'ALL' ? '전체' : g}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '.85em', color: '#6b7280', marginBottom: 6 }}>영역 필터</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterPart(0)}
                style={{
                  padding: '4px 12px', borderRadius: 16, border: '1px solid', cursor: 'pointer', fontSize: '.8em',
                  borderColor: filterPart === 0 ? '#075985' : '#e5e7eb',
                  background: filterPart === 0 ? '#0c4a6e' : '#fff',
                  color: filterPart === 0 ? '#fff' : '#374151'
                }}>전체</button>
              {([1, 2, 3, 4, 5] as FilterPart[]).map(p => (
                <button key={p} onClick={() => setFilterPart(p)}
                  style={{
                    padding: '4px 12px', borderRadius: 16, border: '1px solid', cursor: 'pointer', fontSize: '.8em',
                    borderColor: filterPart === p ? PART_COLOR[p] : '#e5e7eb',
                    background: filterPart === p ? PART_COLOR[p] : '#fff',
                    color: filterPart === p ? '#fff' : '#374151'
                  }}>
                  {p}. {PART_NAMES[p]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85em', cursor: 'pointer' }}>
              <input type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} />
              문제 섞기
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85em', cursor: 'pointer' }}>
              <input type="checkbox" checked={shuffleC} onChange={e => setShuffleC(e.target.checked)} />
              선지 섞기
            </label>
          </div>
        </div>

        {/* 시작 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: '.88em', color: '#6b7280', marginBottom: 10 }}>
            현재 필터: <strong style={{ color: '#111' }}>{filtered.length}문항</strong>
          </div>
          <button onClick={startNew} disabled={filtered.length === 0}
            style={{
              width: '100%', padding: '14px', background: filtered.length ? '#0c4a6e' : '#9ca3af',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: '1.05em', fontWeight: 'bold', cursor: filtered.length ? 'pointer' : 'default'
            }}>
            🚀 CBT 시작
          </button>
        </div>

        {/* 파트별 통계 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 10, color: '#374151' }}>📊 영역별 문항 수</div>
          {([1, 2, 3, 4, 5] as FilterPart[]).map(p => {
            const cnt = managementQuestions.filter(q => q.part === p).length;
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ width: 90, fontSize: '.82em', color: PART_COLOR[p], fontWeight: 'bold' }}>{PART_NAMES[p]}</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 10 }}>
                  <div style={{ width: `${(cnt / total) * 100}%`, background: PART_COLOR[p], borderRadius: 4, height: 10 }} />
                </div>
                <span style={{ fontSize: '.82em', color: '#6b7280', minWidth: 30 }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── 퀴즈 화면 ─────────────────────────────────────────────
  if (mode === 'quiz' && q) {
    const correctCount = answers.filter(a => a.correct).length;
    const progress = ((current) / questions.length) * 100;

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        {/* 상단 바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: '.82em', color: '#6b7280' }}>{current + 1} / {questions.length}</span>
          <span style={{ fontSize: '.82em', color: '#6b7280' }}>정답 {correctCount}개</span>
          <button onClick={() => { clearProgress(); setMode('home'); }}
            style={{ fontSize: '.8em', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>나가기</button>
        </div>

        {/* 진행 바 */}
        <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, marginBottom: 16 }}>
          <div style={{ width: `${progress}%`, background: '#0c4a6e', borderRadius: 4, height: 6, transition: 'width .3s' }} />
        </div>

        {/* 문제 카드 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ background: PART_COLOR[q.part], color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: '.75em', fontWeight: 'bold' }}>
              {PART_NAMES[q.part]}
            </span>
            <span style={{ background: '#e0f2fe', color: GRADE_COLOR[q.grade] ?? '#374151', borderRadius: 12, padding: '2px 10px', fontSize: '.75em', fontWeight: 'bold' }}>
              {q.grade}
            </span>
            <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 12, padding: '2px 10px', fontSize: '.75em' }}>
              {q.topic}
            </span>
          </div>
          <div style={{ fontSize: '1em', fontWeight: '600', lineHeight: 1.6, color: '#111' }}>{q.question}</div>
        </div>

        {/* 선지 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {choiceOrder.map((ci, displayIdx) => {
            const label = ['①', '②', '③', '④'][displayIdx];
            const isSelected = selected === ci;
            const isCorrect = ci === q.answer;
            let bg = '#fff', border = '#e5e7eb', color = '#111';
            if (showExpl) {
              if (isCorrect) { bg = '#dcfce7'; border = '#16a34a'; color = '#15803d'; }
              else if (isSelected) { bg = '#fee2e2'; border = '#dc2626'; color = '#b91c1c'; }
            } else if (isSelected) { bg = '#eff6ff'; border = '#3b82f6'; }
            return (
              <button key={ci} onClick={() => !showExpl && handleSelect(ci)}
                style={{ textAlign: 'left', background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '12px 14px', cursor: showExpl ? 'default' : 'pointer', transition: 'all .15s' }}>
                <span style={{ fontWeight: 'bold', color: border, marginRight: 8 }}>{label}</span>
                <span style={{ color }}>{q.choices[ci]}</span>
                {showExpl && isCorrect && <span style={{ float: 'right', color: '#16a34a', fontWeight: 'bold' }}>✓</span>}
                {showExpl && isSelected && !isCorrect && <span style={{ float: 'right', color: '#dc2626', fontWeight: 'bold' }}>✗</span>}
              </button>
            );
          })}
        </div>

        {/* 해설 */}
        {showExpl && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: 6 }}>💡 해설</div>
            <div style={{ fontSize: '.9em', color: '#0c4a6e', lineHeight: 1.6 }}>{q.explanation}</div>
            {q.source && <div style={{ fontSize: '.78em', color: '#64748b', marginTop: 6 }}>출처: {q.source}</div>}
          </div>
        )}

        {/* 정답 확인 / 다음 버튼 */}
        <div style={{ marginTop: 4 }}>
          {!showExpl ? (
            <button onClick={handleReveal} disabled={selected === null}
              style={{ width: '100%', padding: 14, background: selected === null ? '#d1d5db' : '#0c4a6e', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1em', fontWeight: 'bold', cursor: selected === null ? 'default' : 'pointer' }}>
              정답 확인
            </button>
          ) : (
            <button onClick={handleNext}
              style={{ width: '100%', padding: 14, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' }}>
              {current + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── 결과 화면 ─────────────────────────────────────────────
  if (mode === 'result') {
    const correctCount = answers.filter(a => a.correct).length;
    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        <div style={{ background: 'linear-gradient(135deg,#0c4a6e,#075985)', color: '#fff', borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{pct}점</div>
          <div style={{ fontSize: '1em', opacity: .85, marginTop: 4 }}>{total}문항 중 {correctCount}개 정답</div>
          <div style={{ fontSize: '.9em', opacity: .7, marginTop: 4 }}>
            {pct >= 60 ? '✅ 합격권 진입!' : pct >= 40 ? '📚 조금 더 학습이 필요합니다.' : '💪 기초부터 다시 시작해봐요!'}
          </div>
        </div>

        {/* 파트별 성적 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>영역별 성적</div>
          {([1, 2, 3, 4, 5] as FilterPart[]).map(p => {
            const pqs = questions.filter(q => q.part === p);
            if (!pqs.length) return null;
            const correct = pqs.filter(q => answers.find(a => a.qid === String(q.id) && a.correct)).length;
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 80, fontSize: '.82em', color: PART_COLOR[p], fontWeight: 'bold' }}>{PART_NAMES[p]}</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 10 }}>
                  <div style={{ width: `${pqs.length ? (correct / pqs.length) * 100 : 0}%`, background: PART_COLOR[p], borderRadius: 4, height: 10 }} />
                </div>
                <span style={{ fontSize: '.82em', color: '#6b7280', minWidth: 40 }}>{correct}/{pqs.length}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setMode('home'); setAnswers([]); }}
            style={{ flex: 1, padding: 14, background: '#0c4a6e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer' }}>
            🏠 처음으로
          </button>
          <button onClick={startNew}
            style={{ flex: 1, padding: 14, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer' }}>
            🔄 다시 풀기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
