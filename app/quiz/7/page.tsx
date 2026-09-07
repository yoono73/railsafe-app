'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ch7Questions,
  RailwayKingQuestion,
} from '@/lib/railway-king-data';
import {
  saveAttempt,
  removeAttempt,
  loadWrongAttempts,
  saveCBTProgress,
  loadCBTProgress,
  clearCBTProgress,
} from '@/lib/kibchul-attempts';
import { createClient } from '@/lib/supabase/client';

// 철도안전법 철도왕 전용 subject_id = 307
const RK_SUBJECT = 307;

// 비로그인 폴백용 localStorage 키
const LS_WRONG    = 'rkWrong_ch7';
const LS_PROGRESS = 'rkProgress_ch7';

type Mode = 'home' | 'quiz' | 'result';
type SubMode = '기출변형' | '신유형' | '오답풀기';

interface AnswerRecord { qid: string; selected: number; correct: boolean; }

// 기출변형(B계열) / 신유형(NEW계열) 분리
const ch7BasicQuestions = ch7Questions.filter(q => q.id.includes('_B'));
const ch7NewQuestions   = ch7Questions.filter(q => q.id.includes('_NEW'));

const CH7_COLOR = '#dc2626';  // 철도안전법 — 레드

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── 스토리지 헬퍼 ─────────────────────────────────────────────────

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function storageLoadWrongIds(): Promise<Set<string>> {
  const user = await getUser();
  if (user) {
    const { data } = await loadWrongAttempts(RK_SUBJECT);
    return new Set(data.map(d => d.kibchul_qid));
  }
  try {
    const raw = localStorage.getItem(LS_WRONG);
    return raw ? new Set(Object.keys(JSON.parse(raw))) : new Set();
  } catch { return new Set(); }
}

async function storageSaveWrong(q: RailwayKingQuestion, selected: number): Promise<void> {
  const user = await getUser();
  if (user) {
    await saveAttempt({
      subject_id: RK_SUBJECT,
      session_id: q.chapter,
      kibchul_qid: q.id,
      is_correct: false,
      selected,
      answer: q.answer,
    });
  } else {
    try {
      const raw = localStorage.getItem(LS_WRONG);
      const obj = raw ? JSON.parse(raw) : {};
      obj[q.id] = 1;
      localStorage.setItem(LS_WRONG, JSON.stringify(obj));
    } catch {}
  }
}

async function storageRemoveWrong(qid: string): Promise<void> {
  const user = await getUser();
  if (user) {
    await removeAttempt(qid);
  } else {
    try {
      const raw = localStorage.getItem(LS_WRONG);
      const obj = raw ? JSON.parse(raw) : {};
      delete obj[qid];
      localStorage.setItem(LS_WRONG, JSON.stringify(obj));
    } catch {}
  }
}

async function storageSaveProgress(
  subMode: SubMode, shuffleOn: boolean,
  questions: RailwayKingQuestion[], current: number, answers: AnswerRecord[]
): Promise<void> {
  const user = await getUser();
  if (user) {
    await saveCBTProgress({
      subject_id: RK_SUBJECT,
      question_ids: questions.map(q => q.id),
      current_index: current,
      answers,
      filter_grade: subMode,
      filter_part: 7,
      shuffle_q: shuffleOn,
    });
  } else {
    try {
      localStorage.setItem(LS_PROGRESS, JSON.stringify({
        subMode, shuffleOn,
        questionIds: questions.map(q => q.id), current, answers,
      }));
    } catch {}
  }
}

async function storageLoadProgress(): Promise<{
  subMode: SubMode; shuffleOn: boolean;
  questionIds: string[]; current: number; answers: AnswerRecord[];
} | null> {
  const user = await getUser();
  if (user) {
    const d = await loadCBTProgress(RK_SUBJECT);
    if (!d || !d.question_ids.length) return null;
    return {
      subMode: (d.filter_grade as SubMode) || '기출변형',
      shuffleOn: d.shuffle_q,
      questionIds: d.question_ids,
      current: d.current_index,
      answers: d.answers,
    };
  } else {
    try {
      const raw = localStorage.getItem(LS_PROGRESS);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}

async function storageClearProgress(): Promise<void> {
  const user = await getUser();
  if (user) {
    await clearCBTProgress(RK_SUBJECT);
  } else {
    try { localStorage.removeItem(LS_PROGRESS); } catch {}
  }
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────
function RailwayKingCh7Inner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('home');
  const [subMode, setSubMode] = useState<SubMode>('기출변형');
  const [shuffleOn, setShuffleOn] = useState(true);

  const [questions, setQuestions] = useState<RailwayKingQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  const [wrongCount, setWrongCount] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ subMode: SubMode } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initDone, setInitDone] = useState(false);

  // 초기 로드
  useEffect(() => {
    (async () => {
      const user = await getUser();
      setIsLoggedIn(!!user);

      const [wrongIds, saved] = await Promise.all([
        storageLoadWrongIds(),
        storageLoadProgress(),
      ]);
      setWrongCount(wrongIds.size);
      if (saved && saved.questionIds.length > 0) {
        setHasSaved(true);
        setSavedInfo({ subMode: saved.subMode });
      }
      setInitDone(true);
    })();
  }, []);

  // URL ?m= 파라미터로 홈 화면 subMode 미리 선택
  useEffect(() => {
    if (!initDone) return;
    const m = searchParams.get('m');
    if (m === 'new') setSubMode('신유형');
    else if (m === 'wrong') setSubMode('오답풀기');
    else setSubMode('기출변형');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initDone]);

  const getPool = useCallback(async (sm: SubMode): Promise<RailwayKingQuestion[]> => {
    if (sm === '오답풀기') {
      const wrongIds = await storageLoadWrongIds();
      return ch7Questions.filter(q => wrongIds.has(q.id));
    }
    if (sm === '신유형') return ch7NewQuestions;
    return ch7BasicQuestions; // 기출변형
  }, []);

  const startNew = useCallback(async (sm: SubMode) => {
    const pool = await getPool(sm);
    if (pool.length === 0) return;
    const ordered = shuffleOn ? shuffle(pool) : pool;
    await storageClearProgress();
    setQuestions(ordered);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setAnswers([]);
    setSubMode(sm);
    setHasSaved(false);
    setSavedInfo(null);
    setMode('quiz');
  }, [getPool, shuffleOn]);

  const resumeSaved = useCallback(async () => {
    const saved = await storageLoadProgress();
    if (!saved) return;
    const qMap = new Map(ch7Questions.map(q => [q.id, q]));
    const qs = saved.questionIds.map(id => qMap.get(id)!).filter(Boolean);
    if (!qs.length) return;
    setQuestions(qs);
    setCurrent(saved.current);
    setAnswers(saved.answers);
    setSubMode(saved.subMode);
    setSelected(null);
    setConfirmed(false);
    setHasSaved(false);
    setSavedInfo(null);
    setMode('quiz');
  }, []);

  const q = questions[current];

  const handleConfirm = useCallback(async () => {
    if (selected === null || !q) return;
    setConfirmed(true);
    const correct = selected === q.answer;
    const newAnswers: AnswerRecord[] = [
      ...answers.filter(a => a.qid !== q.id),
      { qid: q.id, selected, correct },
    ];
    setAnswers(newAnswers);

    if (!correct) {
      storageSaveWrong(q, selected);
    } else {
      storageRemoveWrong(q.id);
    }

    await storageSaveProgress(subMode, shuffleOn, questions, current, newAnswers);
  }, [selected, q, answers, subMode, shuffleOn, questions, current]);

  const handleNext = useCallback(async () => {
    if (current + 1 >= questions.length) {
      await storageClearProgress();
      const wids = await storageLoadWrongIds();
      setWrongCount(wids.size);
      setMode('result');
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setConfirmed(false);
  }, [current, questions.length]);

  const goHome = useCallback(async () => {
    await storageClearProgress();
    const wids = await storageLoadWrongIds();
    setWrongCount(wids.size);
    setHasSaved(false);
    setSavedInfo(null);
    setMode('home');
    setAnswers([]);
  }, []);

  // 문제 내용에서 [prefix] 제거 (표시용)
  const displayQuestion = (qText: string) =>
    qText.replace(/^\[[^\]]+\]\s*/, '');

  // ─── 로딩 ────────────────────────────────────────────────────────
  if (!initDone) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'50vh', fontFamily:'Malgun Gothic, sans-serif' }}>
        <div style={{ color:'#6b7280' }}>불러오는 중...</div>
      </div>
    );
  }

  // ─── 홈 ──────────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 16px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>

        {/* 헤더 */}
        <div style={{ background:'linear-gradient(135deg,#7f1d1d,#dc2626)', color:'#fff', borderRadius:14, padding:'24px 20px', marginBottom:20 }}>
          <div style={{ fontSize:'1.5em', fontWeight:'bold', marginBottom:4 }}>👑 철도왕 기출변형문제</div>
          <div style={{ fontSize:'.9em', opacity:.85 }}>철도교통 안전관리자 일주일 절대합격 바이블 · 철도안전법 편</div>
          <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap', fontSize:'.8em' }}>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>🛡️ 기출변형 {ch7BasicQuestions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>✨ 신유형 {ch7NewQuestions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>총 {ch7Questions.length}문항</span>
          </div>
          <div style={{ marginTop:8, fontSize:'.75em', opacity:.65 }}>
            {isLoggedIn ? '☁️ 오답·진행상황 클라우드 저장' : '📱 비로그인: 이 기기에만 저장'}
          </div>
        </div>

        {/* 이어풀기 */}
        {hasSaved && savedInfo && (
          <div style={{ background:'#fffbeb', border:'1px solid #fbbf24', borderRadius:10, padding:'14px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div>
              <div style={{ fontWeight:'bold', color:'#92400e' }}>📌 이어풀기</div>
              <div style={{ fontSize:'.83em', color:'#78350f' }}>
                {savedInfo.subMode}
                {isLoggedIn ? ' (클라우드 저장됨)' : ' (이 기기에 저장됨)'}
              </div>
            </div>
            <button onClick={resumeSaved} style={{ background:'#92400e', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:'bold', cursor:'pointer' }}>이어풀기</button>
          </div>
        )}

        {/* 모드 카드 */}
        <div style={{ display:'grid', gap:12, marginBottom:20 }}>

          {/* 기출변형 */}
          <div style={{ background:'#fff', border:'2px solid #dc2626', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#991b1b' }}>📚 기출변형문제</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>
              교재 수록 철도안전법 기출변형 {ch7BasicQuestions.length}문항 · 총칙~보칙 전 범위
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.83em', cursor:'pointer', marginBottom:12 }}>
              <input type="checkbox" checked={shuffleOn} onChange={e => setShuffleOn(e.target.checked)} />
              문제 순서 랜덤
            </label>
            <button onClick={() => startNew('기출변형')}
              style={{ width:'100%', padding:'11px', background:'#dc2626', color:'#fff', border:'none', borderRadius:10, fontWeight:'bold', cursor:'pointer', fontSize:'.95em' }}>
              📚 기출변형문제 시작
            </button>
          </div>

          {/* 신유형 */}
          <div style={{ background:'#fff', border:'2px solid #059669', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#065f46' }}>✨ 신유형문제</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>
              철도안전법 신유형 {ch7NewQuestions.length}문항 · 최신 출제 경향 반영
            </div>
            <button onClick={() => startNew('신유형')}
              style={{ width:'100%', padding:'11px', background:'#059669', color:'#fff', border:'none', borderRadius:10, fontWeight:'bold', cursor:'pointer', fontSize:'.95em' }}>
              ✨ 신유형문제 시작
            </button>
          </div>

          {/* 오답풀기 */}
          <div style={{ background:'#fff', border:'2px solid #6b7280', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#374151' }}>🔁 오답문제 풀기</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>
              틀린 문제를 다시 풀어 약점을 보완합니다.
              {wrongCount > 0 ? <span style={{ color:'#dc2626', fontWeight:'bold' }}> 현재 {wrongCount}문항 누적.</span> : ' 아직 오답이 없습니다.'}
              {isLoggedIn && <span style={{ color:'#6b7280' }}> (☁️ 클라우드 저장)</span>}
            </div>
            <button
              onClick={() => wrongCount > 0 && startNew('오답풀기')}
              disabled={wrongCount === 0}
              style={{
                width:'100%', padding:'11px',
                background: wrongCount > 0 ? '#374151' : '#e5e7eb',
                color: wrongCount > 0 ? '#fff' : '#9ca3af',
                border:'none', borderRadius:10, fontWeight:'bold',
                cursor: wrongCount > 0 ? 'pointer' : 'default', fontSize:'.95em',
              }}>
              {wrongCount > 0 ? `🔁 오답 ${wrongCount}문항 풀기` : '오답 없음'}
            </button>
          </div>
        </div>

        {/* 안내 */}
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', fontSize:'.82em', color:'#991b1b' }}>
          <strong>📌 철도안전법 구성</strong><br />
          총칙 / 철도안전관리체계 / 철도종사자 안전관리 / 철도차량·시설 안전관리 / 사고·장애 보고 / 보칙·벌칙 전 범위 수록
        </div>
      </div>
    );
  }

  // ─── 퀴즈 ────────────────────────────────────────────────────────
  if (mode === 'quiz' && q) {
    const progress = Math.round(((current + 1) / questions.length) * 100);
    const correctCount = answers.filter(a => a.correct).length;
    const isCorrect = confirmed && selected === q.answer;
    const qColor = subMode === '신유형' ? '#059669' : CH7_COLOR;

    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'16px 14px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>

        {/* 진행바 */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.8em', color:'#6b7280', marginBottom:4 }}>
            <span>{current+1} / {questions.length}{subMode==='오답풀기' ? ' (오답풀기)' : ''}</span>
            <span>정답률 {answers.length ? Math.round(correctCount/answers.length*100) : 0}%</span>
          </div>
          <div style={{ background:'#e5e7eb', borderRadius:4, height:6 }}>
            <div style={{ width:`${progress}%`, background:qColor, borderRadius:4, height:6, transition:'width .3s' }} />
          </div>
        </div>

        {/* 문제 카드 */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ background:qColor, color:'#fff', borderRadius:16, padding:'2px 10px', fontSize:'.75em', fontWeight:'bold' }}>
              🛡️ 철도안전법 {subMode === '신유형' ? '신유형' : '기출변형'}
            </span>
            <span style={{ background:'#f3f4f6', color:'#6b7280', borderRadius:16, padding:'2px 10px', fontSize:'.75em' }}>문제 {q.num}번</span>
          </div>

          <div style={{ fontSize:'1em', fontWeight:'bold', lineHeight:1.75, marginBottom:16, color:'#111827', whiteSpace:'pre-line' }}>
            {displayQuestion(q.question)}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {q.choices.map((choice, ci) => {
              const isSel = selected === ci;
              const isAns = ci === q.answer;
              let bg='#f9fafb', border='#e5e7eb', color='#374151';
              if (confirmed) {
                if (isAns) { bg='#dcfce7'; border='#16a34a'; color='#166534'; }
                else if (isSel) { bg='#fee2e2'; border='#dc2626'; color='#991b1b'; }
              } else if (isSel) { bg='#eff6ff'; border='#3b82f6'; color='#1e40af'; }
              return (
                <button key={ci} onClick={() => !confirmed && setSelected(ci)}
                  style={{
                    textAlign:'left', padding:'12px 14px', borderRadius:10,
                    border:`1.5px solid ${border}`, background:bg, color,
                    cursor: confirmed ? 'default' : 'pointer',
                    fontSize:'.92em', lineHeight:1.5, fontFamily:'inherit',
                    display:'flex', gap:10, alignItems:'flex-start',
                  }}>
                  <span style={{ fontWeight:'bold', minWidth:22, flexShrink:0 }}>
                    {confirmed ? (isAns ? '✅' : isSel ? '❌' : ['①','②','③','④'][ci]) : (isSel ? '▶' : ['①','②','③','④'][ci])}
                  </span>
                  {choice}
                </button>
              );
            })}
          </div>
        </div>

        {/* 확인 버튼 */}
        {!confirmed && (
          <button onClick={handleConfirm} disabled={selected === null}
            style={{
              width:'100%', padding:13,
              background: selected === null ? '#e5e7eb' : qColor,
              color: selected === null ? '#9ca3af' : '#fff',
              border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold',
              cursor: selected === null ? 'default' : 'pointer', marginBottom:8,
            }}>
            ✔ 확인
          </button>
        )}

        {/* 해설 */}
        {confirmed && (
          <div style={{ background: isCorrect ? '#f0fdf4' : '#fef2f2', border:`1px solid ${isCorrect?'#86efac':'#fca5a5'}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:8, color: isCorrect?'#166534':'#991b1b' }}>
              {isCorrect ? '✅ 정답입니다!' : `❌ 오답. 정답: ${['①','②','③','④'][q.answer]} ${q.choices[q.answer]}`}
            </div>
            <div style={{ fontSize:'.9em', color:'#374151', lineHeight:1.75 }}>
              <strong>해설:</strong> {q.explanation}
            </div>
          </div>
        )}

        {confirmed && (
          <button onClick={handleNext}
            style={{ width:'100%', padding:14, background:qColor, color:'#fff', border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold', cursor:'pointer' }}>
            {current+1 >= questions.length ? '🏁 결과 보기' : '다음 문제 →'}
          </button>
        )}

        <button onClick={goHome}
          style={{ width:'100%', marginTop:8, padding:10, background:'transparent', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, fontSize:'.85em', cursor:'pointer' }}>
          처음으로
        </button>
      </div>
    );
  }

  // ─── 결과 ────────────────────────────────────────────────────────
  if (mode === 'result') {
    const correctCount = answers.filter(a => a.correct).length;
    const total = answers.length;
    const pct = total > 0 ? Math.round(correctCount / total * 100) : 0;
    const wrongs = answers.filter(a => !a.correct);

    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 14px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>
        <div style={{ background:'linear-gradient(135deg,#7f1d1d,#dc2626)', color:'#fff', borderRadius:14, padding:'28px 20px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:'3em', fontWeight:'bold' }}>{pct}점</div>
          <div style={{ fontSize:'1.1em', marginTop:4 }}>{correctCount} / {total} 정답</div>
          <div style={{ marginTop:10, fontSize:'.9em', opacity:.85 }}>
            {pct>=80?'🏆 우수! 철도안전법 완벽 이해':pct>=60?'👍 양호. 오답 집중 복습!':pct>=40?'📚 기초 개념 재정리 필요':'⚠️ 핵심 개념부터 재학습'}
          </div>
          <div style={{ marginTop:6, fontSize:'.78em', opacity:.65 }}>
            {isLoggedIn ? '☁️ 오답 클라우드 저장 완료' : '📱 이 기기에 저장됨'}
          </div>
        </div>

        {/* 누적 오답 */}
        {wrongCount > 0 && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'.88em', color:'#991b1b' }}>누적 오답 {wrongCount}문항</div>
            <button onClick={() => startNew('오답풀기')}
              style={{ background:'#374151', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontSize:'.8em', fontWeight:'bold', cursor:'pointer' }}>
              오답 풀기
            </button>
          </div>
        )}

        {/* 오답 해설 */}
        {wrongs.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:12 }}>❌ 오답 해설 ({wrongs.length}문항)</div>
            {wrongs.map(a => {
              const wq = questions.find(q => q.id === a.qid);
              if (!wq) return null;
              return (
                <div key={a.qid} style={{ background:'#fff', border:'1px solid #fca5a5', borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ fontSize:'.8em', color:'#9ca3af', marginBottom:6 }}>🛡️ 철도안전법 | 문제 {wq.num}번</div>
                  <div style={{ fontWeight:'bold', marginBottom:8, fontSize:'.92em', lineHeight:1.6, whiteSpace:'pre-line' }}>{displayQuestion(wq.question)}</div>
                  <div style={{ fontSize:'.88em', color:'#374151', marginBottom:4 }}>내 답: {['①','②','③','④'][a.selected]} {wq.choices[a.selected]}</div>
                  <div style={{ fontSize:'.88em', color:'#166534', marginBottom:8 }}>정답: {['①','②','③','④'][wq.answer]} {wq.choices[wq.answer]}</div>
                  <div style={{ fontSize:'.85em', background:'#f9fafb', borderRadius:6, padding:'8px 10px', color:'#374151', lineHeight:1.65 }}>{wq.explanation}</div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={goHome}
          style={{ width:'100%', padding:14, background:CH7_COLOR, color:'#fff', border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold', cursor:'pointer', marginBottom:8 }}>
          🏠 처음으로
        </button>
        <button onClick={() => startNew(subMode)}
          style={{ width:'100%', padding:12, background:'transparent', color:CH7_COLOR, border:`2px solid ${CH7_COLOR}`, borderRadius:12, fontSize:'.95em', fontWeight:'bold', cursor:'pointer' }}>
          🔄 다시 풀기
        </button>
      </div>
    );
  }

  return null;
}

export default function RailwayKingCh7Page() {
  return (
    <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'50vh', fontFamily:'Malgun Gothic, sans-serif', color:'#6b7280' }}>불러오는 중...</div>}>
      <RailwayKingCh7Inner />
    </Suspense>
  );
}
