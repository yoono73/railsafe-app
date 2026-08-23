'use client';

import { useState, useCallback, useEffect } from 'react';
import { engineeringQuestions, PART_NAMES, EnggQuestion, EnggPart, EnggGrade, SAVE_KEY } from '@/lib/engineering-exam-data';
import { saveAttempt, removeAttempt, loadWrongAttempts } from '@/lib/kibchul-attempts';

const ENGG_SUBJECT_ID = 400;
const LS_WRONG = 'kibchul_wrong';

const GRADE_COLOR: Record<string, string> = {
  'A+': '#d97706', 'A': '#2563eb', 'B': '#6b7280',
};
const PART_COLOR: Record<number, string> = {
  1:'#0891b2', 2:'#dc2626', 3:'#7c3aed', 4:'#d97706',
  5:'#059669', 6:'#db2777', 7:'#6366f1', 8:'#374151', 9:'#92400e',
};

function saveWrongEntry(q: EnggQuestion, selected: number) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
    const key = `engg_${q.id}`;
    if (existing.some((e: { questionId: string }) => e.questionId === key)) return;
    const entry = {
      subjectId: ENGG_SUBJECT_ID,
      sessionId: PART_NAMES[q.part],
      questionId: key,
      question: q.question,
      choices: Array.from(q.choices),
      answer: q.answer,
      selected,
      explanation: q.explanation ?? '',
      caution: q.trap ?? '',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_WRONG, JSON.stringify([...existing, entry]));
    saveAttempt({
      subject_id: ENGG_SUBJECT_ID,
      session_id: PART_NAMES[q.part],
      kibchul_qid: key,
      is_correct: false,
      selected,
      answer: q.answer,
    }).catch(() => {});
  } catch {}
}

type Mode = 'home' | 'quiz' | 'result';
type FilterGrade = 'ALL' | 'A+' | 'A' | 'B';
type FilterPart = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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

export default function EngineeringCBTPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [filterGrade, setFilterGrade] = useState<FilterGrade>('ALL');
  const [filterPart, setFilterPart] = useState<FilterPart>(0);
  const [shuffleQ, setShuffleQ] = useState(true);
  const [shuffleC, setShuffleC] = useState(false);

  const [questions, setQuestions] = useState<EnggQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [choiceOrder, setChoiceOrder] = useState<number[]>([0,1,2,3]);

  // 이어풀기 감지 + Supabase 오답 동기화
  useEffect(() => {
    const saved = loadProgress();
    if (saved) setHasSaved(true);
    (async () => {
      const { data } = await loadWrongAttempts(ENGG_SUBJECT_ID);
      if (!data.length) return;
      const qMap = new Map(engineeringQuestions.map(q => [String(q.id), q]));
      const fromServer = data.flatMap(r => {
        const q = qMap.get(r.kibchul_qid);
        if (!q) return [];
        return [{ subjectId: ENGG_SUBJECT_ID, sessionId: r.session_id ?? '', questionId: r.kibchul_qid,
          question: q.question, choices: [...q.choices], answer: r.answer ?? q.answer,
          selected: r.selected ?? 0, explanation: q.explanation ?? '',
          savedAt: new Date().toISOString() }];
      });
      if (!fromServer.length) return;
      const existing: { subjectId: number }[] = JSON.parse(localStorage.getItem(LS_WRONG) || '[]');
      const others = existing.filter(e => e.subjectId !== ENGG_SUBJECT_ID);
      localStorage.setItem(LS_WRONG, JSON.stringify([...others, ...fromServer]));
    })();
  }, []);

  const getFiltered = useCallback(() => {
    let qs = [...engineeringQuestions];
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
    if (shuffleC) setChoiceOrder(shuffle([0,1,2,3]));
    else setChoiceOrder([0,1,2,3]);
    clearProgress();
    setMode('quiz');
  }, [getFiltered, shuffleQ, shuffleC]);

  const resumeSaved = useCallback(() => {
    const saved = loadProgress();
    if (!saved) return;
    const idMap = new Map(engineeringQuestions.map(q => [q.id, q]));
    const qs = saved.questionIds.map(id => idMap.get(id)!).filter(Boolean);
    setQuestions(qs);
    setCurrent(saved.current);
    setAnswers(saved.answers);
    setFilterGrade(saved.filterGrade);
    setFilterPart(saved.filterPart);
    setShuffleQ(saved.shuffleQ);
    setSelected(null);
    setShowExpl(false);
    setChoiceOrder([0,1,2,3]);
    setHasSaved(false);
    setMode('quiz');
  }, []);

  const q = questions[current];

  const handleSelect = useCallback((idx: number) => {
    // 재선택 허용 — answers 배열에서 기존 항목 교체
    setSelected(idx);
    setShowExpl(true);
    const correct = idx === q.answer;
    const newAnswers = [
      ...answers.filter(a => a.qid !== String(q.id)),
      { qid: String(q.id), selected: idx, correct },
    ];
    setAnswers(newAnswers);
    if (!correct) saveWrongEntry(q, idx);
    else removeAttempt(String(q.id)).catch(() => {});
    saveProgress({
      questionIds: questions.map(q => q.id),
      current,
      answers: newAnswers,
      filterGrade, filterPart, shuffleQ,
      savedAt: new Date().toISOString(),
    });
  }, [q, answers, questions, current, filterGrade, filterPart, shuffleQ]);

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      clearProgress();
      setMode('result');
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setShowExpl(false);
    if (shuffleC) setChoiceOrder(shuffle([0,1,2,3]));
    else setChoiceOrder([0,1,2,3]);
  }, [current, questions.length, shuffleC]);

  // ─── 홈 화면 ────────────────────────────────────────────────
  if (mode === 'home') {
    const total = engineeringQuestions.length;
    const apCount = engineeringQuestions.filter(q => q.grade === 'A+').length;
    const aCount = engineeringQuestions.filter(q => q.grade === 'A').length;
    const filtered = getFiltered();

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', color:'#fff', borderRadius: 14, padding: '24px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: 4 }}>🔧 철도공학 기출·복원 CBT</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>2024.12 공개복원 25축 + 합격후기 기반 {total}문항</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '.82em' }}>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>A+ {apCount}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>A {aCount}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>B {total-apCount-aCount}문항</span>
          </div>
        </div>

        {/* 이어풀기 */}
        {hasSaved && (
          <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#92400e' }}>📌 이어풀기</div>
              <div style={{ fontSize: '.83em', color: '#78350f' }}>이전 세션이 저장되어 있습니다.</div>
            </div>
            <button onClick={resumeSaved} style={{ background: '#92400e', color:'#fff', border:'none', borderRadius: 8, padding: '8px 16px', fontWeight:'bold', cursor:'pointer' }}>이어풀기</button>
          </div>
        )}

        {/* 필터 */}
        <div style={{ background: '#fff', border:'1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#374151' }}>📐 출제 범위 설정</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '.85em', color: '#6b7280', marginBottom: 6 }}>등급 필터</div>
            <div style={{ display: 'flex', gap: 8, flexWrap:'wrap' }}>
              {(['ALL','A+','A','B'] as FilterGrade[]).map(g => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor:'pointer', fontWeight:'bold', fontSize:'.85em',
                    borderColor: filterGrade===g ? '#92400e' : '#e5e7eb',
                    background: filterGrade===g ? '#78350f' : '#fff',
                    color: filterGrade===g ? '#fff' : '#374151' }}>
                  {g === 'ALL' ? '전체' : g}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '.85em', color: '#6b7280', marginBottom: 6 }}>영역 필터</div>
            <div style={{ display: 'flex', gap: 6, flexWrap:'wrap' }}>
              <button onClick={() => setFilterPart(0)}
                style={{ padding: '4px 12px', borderRadius: 16, border:'1px solid', cursor:'pointer', fontSize:'.8em',
                  borderColor: filterPart===0 ? '#92400e':'#e5e7eb',
                  background: filterPart===0 ? '#78350f':'#fff',
                  color: filterPart===0 ? '#fff':'#374151' }}>전체</button>
              {([1,2,3,4,5,6,7,8,9] as EnggPart[]).map(p => (
                <button key={p} onClick={() => setFilterPart(p)}
                  style={{ padding: '4px 12px', borderRadius: 16, border:'1px solid', cursor:'pointer', fontSize:'.8em',
                    borderColor: filterPart===p ? PART_COLOR[p]:'#e5e7eb',
                    background: filterPart===p ? PART_COLOR[p]:'#fff',
                    color: filterPart===p ? '#fff':'#374151' }}>
                  {p}. {PART_NAMES[p].length > 6 ? PART_NAMES[p].slice(0,6)+'…' : PART_NAMES[p]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap: 16, flexWrap:'wrap' }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.85em', cursor:'pointer' }}>
              <input type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} />
              문제 순서 랜덤
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.85em', cursor:'pointer' }}>
              <input type="checkbox" checked={shuffleC} onChange={e => setShuffleC(e.target.checked)} />
              보기 순서 랜덤
            </label>
          </div>
        </div>

        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:'.85em', color:'#166534' }}>
          선택된 범위: <strong>{filtered.length}문항</strong>
          {filterGrade !== 'ALL' && ` | ${filterGrade}등급`}
          {filterPart !== 0 && ` | ${PART_NAMES[filterPart]}`}
        </div>

        <button onClick={startNew} disabled={filtered.length === 0}
          style={{ width:'100%', padding:'14px', background: filtered.length===0?'#9ca3af':'#78350f', color:'#fff', border:'none', borderRadius:12, fontSize:'1.05em', fontWeight:'bold', cursor: filtered.length===0?'default':'pointer' }}>
          🚀 CBT 시작
        </button>

        {/* 영역별 현황 */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight:'bold', marginBottom: 12, color:'#374151' }}>📊 영역별 문항 현황</div>
          <div style={{ display:'grid', gap:8 }}>
            {([1,2,3,4,5,6,7,8,9] as EnggPart[]).map(p => {
              const qs = engineeringQuestions.filter(q => q.part === p);
              const ap = qs.filter(q => q.grade==='A+').length;
              const a = qs.filter(q => q.grade==='A').length;
              return (
                <div key={p} style={{ background:'#fff', border:`1px solid ${PART_COLOR[p]}40`, borderLeft:`4px solid ${PART_COLOR[p]}`, borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:'.9em', fontWeight:'bold', color:'#374151' }}>{p}. {PART_NAMES[p]}</div>
                  <div style={{ display:'flex', gap:8, fontSize:'.78em' }}>
                    <span style={{ background:'#fef3c7', color:'#92400e', borderRadius:12, padding:'2px 8px' }}>A+ {ap}</span>
                    <span style={{ background:'#dbeafe', color:'#1d4ed8', borderRadius:12, padding:'2px 8px' }}>A {a}</span>
                    <span style={{ background:'#f3f4f6', color:'#374151', borderRadius:12, padding:'2px 8px' }}>총 {qs.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── 퀴즈 화면 ──────────────────────────────────────────────
  if (mode === 'quiz' && q) {
    const progress = Math.round(((current + 1) / questions.length) * 100);
    const correct = answers.filter(a => a.correct).length;

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 14px 80px', fontFamily: 'Malgun Gothic, sans-serif' }}>
        {/* 진행 바 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.82em', color:'#6b7280', marginBottom:4 }}>
            <span>{current+1} / {questions.length}</span>
            <span>정답률 {answers.length ? Math.round(correct/answers.length*100) : 0}%</span>
          </div>
          <div style={{ background:'#e5e7eb', borderRadius:4, height:6 }}>
            <div style={{ width:`${progress}%`, background:'#78350f', borderRadius:4, height:6, transition:'width .3s' }} />
          </div>
        </div>

        {/* 문제 카드 */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:20, marginBottom:16 }}>
          {/* 메타 */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ background: PART_COLOR[q.part], color:'#fff', borderRadius:16, padding:'2px 10px', fontSize:'.75em', fontWeight:'bold' }}>
              {q.part}. {PART_NAMES[q.part]}
            </span>
            <span style={{ background: GRADE_COLOR[q.grade]+'20', color: GRADE_COLOR[q.grade], border:`1px solid ${GRADE_COLOR[q.grade]}40`, borderRadius:16, padding:'2px 10px', fontSize:'.75em', fontWeight:'bold' }}>
              {q.grade}
            </span>
            <span style={{ background:'#f3f4f6', color:'#6b7280', borderRadius:16, padding:'2px 10px', fontSize:'.75em' }}>
              #{q.topic}
            </span>
          </div>

          <div style={{ fontSize:'1em', fontWeight:'bold', lineHeight:1.7, marginBottom:16, color:'#111827' }}>
            {q.question}
          </div>

          {/* 보기 */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {choiceOrder.map((ci, displayIdx) => {
              const choiceText = q.choices[ci];
              const isCorrect = ci === q.answer;
              const isSelected = selected === ci;
              let bg = '#f9fafb', border = '#e5e7eb', color = '#374151';
              if (selected !== null) {
                if (isCorrect) { bg='#dcfce7'; border='#16a34a'; color='#166534'; }
                else if (isSelected) { bg='#fee2e2'; border='#dc2626'; color='#991b1b'; }
              }
              return (
                <button key={ci} onClick={() => handleSelect(ci)}
                  style={{ textAlign:'left', padding:'12px 14px', borderRadius:10, border:`1.5px solid ${border}`, background:bg, color, cursor: selected!==null?'default':'pointer', fontSize:'.92em', lineHeight:1.5, fontFamily:'inherit', transition:'all .15s', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontWeight:'bold', minWidth:20, flexShrink:0 }}>
                    {selected !== null ? (isCorrect ? '✅' : isSelected ? '❌' : `${displayIdx+1}.`) : `${displayIdx+1}.`}
                  </span>
                  {choiceText}
                </button>
              );
            })}
          </div>
        </div>

        {/* 해설 */}
        {showExpl && (
          <div style={{ background: selected===q.answer?'#f0fdf4':'#fef2f2', border:`1px solid ${selected===q.answer?'#86efac':'#fca5a5'}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:8, color: selected===q.answer?'#166534':'#991b1b' }}>
              {selected===q.answer ? '✅ 정답입니다!' : '❌ 오답입니다.'}
            </div>
            <div style={{ fontSize:'.9em', color:'#374151', lineHeight:1.7 }}>
              <strong>해설:</strong> {q.explanation}
            </div>
            {q.trap && (
              <div style={{ marginTop:8, background:'#fff3e0', borderLeft:'3px solid #f59e0b', padding:'6px 10px', borderRadius:'0 6px 6px 0', fontSize:'.85em', color:'#92400e' }}>
                ⚠️ 함정: {q.trap}
              </div>
            )}
          </div>
        )}

        {selected !== null && (
          <button onClick={handleNext} style={{ width:'100%', padding:14, background:'#78350f', color:'#fff', border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold', cursor:'pointer' }}>
            {current+1 >= questions.length ? '🏁 결과 보기' : '다음 문제 →'}
          </button>
        )}

        <button onClick={() => { clearProgress(); setMode('home'); }} style={{ width:'100%', marginTop:8, padding:10, background:'transparent', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, fontSize:'.85em', cursor:'pointer' }}>
          처음으로
        </button>
      </div>
    );
  }

  // ─── 결과 화면 ──────────────────────────────────────────────
  if (mode === 'result') {
    const correct = answers.filter(a => a.correct).length;
    const total = answers.length;
    const pct = Math.round(correct / total * 100);
    const wrongs = answers.filter(a => !a.correct);

    // 영역별 성취
    const partScores: Record<number, { correct:number; total:number }> = {};
    answers.forEach((a, i) => {
      const q = questions[i];
      if (!q) return;
      if (!partScores[q.part]) partScores[q.part] = { correct:0, total:0 };
      partScores[q.part].total++;
      if (a.correct) partScores[q.part].correct++;
    });

    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 14px 80px', fontFamily:'Malgun Gothic, sans-serif' }}>
        {/* 점수 */}
        <div style={{ background:'linear-gradient(135deg,#78350f,#92400e)', color:'#fff', borderRadius:14, padding:'28px 20px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:'3em', fontWeight:'bold' }}>{pct}점</div>
          <div style={{ fontSize:'1.1em', marginTop:4 }}>{correct} / {total} 정답</div>
          <div style={{ marginTop:12, fontSize:'.9em', opacity:.85 }}>
            {pct>=80?'🏆 우수! 실전 준비 완료':pct>=60?'👍 양호. 오답 집중 복습':pct>=40?'📚 기초 개념 재정리 필요':'⚠️ 핵심 개념부터 재학습'}
          </div>
        </div>

        {/* 영역별 성취 */}
        {Object.entries(partScores).length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:12, color:'#374151' }}>📊 영역별 성취</div>
            {Object.entries(partScores).map(([p, sc]) => {
              const pNum = Number(p);
              const rate = Math.round(sc.correct/sc.total*100);
              return (
                <div key={p} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.85em', marginBottom:3 }}>
                    <span style={{ color: PART_COLOR[pNum], fontWeight:'bold' }}>{PART_NAMES[pNum as EnggPart]}</span>
                    <span style={{ color:'#374151' }}>{sc.correct}/{sc.total} ({rate}%)</span>
                  </div>
                  <div style={{ background:'#e5e7eb', borderRadius:4, height:8 }}>
                    <div style={{ width:`${rate}%`, background: rate>=80?'#16a34a':rate>=60?'#d97706':'#dc2626', borderRadius:4, height:8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 오답 해설 */}
        {wrongs.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:12, color:'#374151' }}>❌ 오답 해설 ({wrongs.length}문항)</div>
            {wrongs.map((a, idx) => {
              const wq = questions.find(q => String(q.id) === a.qid);
              if (!wq) return null;
              return (
                <div key={idx} style={{ background:'#fff', border:'1px solid #fca5a5', borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ fontSize:'.82em', color:'#9ca3af', marginBottom:6 }}>
                    {wq.part}. {PART_NAMES[wq.part]} | {wq.grade} | #{wq.topic}
                  </div>
                  <div style={{ fontWeight:'bold', marginBottom:8, fontSize:'.92em' }}>{wq.question}</div>
                  <div style={{ fontSize:'.88em', color:'#dc2626', marginBottom:4 }}>
                    내 답: {wq.choices[a.selected]}
                  </div>
                  <div style={{ fontSize:'.88em', color:'#166534', marginBottom:8 }}>
                    정답: {wq.choices[wq.answer]}
                  </div>
                  <div style={{ fontSize:'.85em', background:'#f9fafb', borderRadius:6, padding:'8px 10px', color:'#374151' }}>
                    {wq.explanation}
                  </div>
                  {wq.trap && (
                    <div style={{ marginTop:6, fontSize:'.82em', color:'#92400e', background:'#fff3e0', borderRadius:4, padding:'5px 8px' }}>
                      ⚠️ {wq.trap}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => { setMode('home'); setAnswers([]); }}
          style={{ width:'100%', padding:14, background:'#78350f', color:'#fff', border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold', cursor:'pointer', marginBottom:8 }}>
          🏠 처음으로
        </button>
        <button onClick={startNew}
          style={{ width:'100%', padding:12, background:'transparent', color:'#78350f', border:'2px solid #78350f', borderRadius:12, fontSize:'.95em', fontWeight:'bold', cursor:'pointer' }}>
          🔄 다시 풀기
        </button>
      </div>
    );
  }

  return null;
}
