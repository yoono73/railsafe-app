'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  allRailwayKingQuestions,
  ch81Questions,
  ch82Questions,
  ch83Questions,
  ch53Questions,
  CHAPTER_NAMES,
  RailwayKingQuestion,
  RailwayKingChapter,
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

// 철도왕 전용 subject_id = 300
const RK_SUBJECT = 300;

// 비로그인 폴백용 localStorage 키
const LS_WRONG    = 'rkWrong';    // { [qid]: 1 }
const LS_PROGRESS = 'rkProgress'; // JSON

type Mode = 'home' | 'quiz' | 'result';
type SubMode = '기출변형' | '신유형' | '오답풀기';
type ChapterFilter = 'ALL' | 'ch81' | 'ch82' | 'ch83' | 'ch53';

interface AnswerRecord { qid: string; selected: number; correct: boolean; }

// ch53 기출변형(num≤19) / 신유형(num≥20)
const ch53BasicQuestions = ch53Questions.filter(q => q.num <= 19);
const ch53NewQuestions   = ch53Questions.filter(q => q.num >= 20);


// chapterFilter ↔ filter_part 숫자 변환
function cfToNum(cf: ChapterFilter): number {
  return cf === 'ch81' ? 81 : cf === 'ch82' ? 82 : cf === 'ch83' ? 83 : cf === 'ch53' ? 53 : 0;
}
function numToCf(n: number): ChapterFilter {
  return n === 81 ? 'ch81' : n === 82 ? 'ch82' : n === 83 ? 'ch83' : n === 53 ? 'ch53' : 'ALL';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CHAPTER_COLOR: Record<string, string> = {
  ch81: '#0891b2', ch82: '#7c3aed', ch83: '#d97706', ch53: '#059669',
};
const CHAPTER_ICON: Record<string, string> = {
  ch81: '🪨', ch82: '⚡', ch83: '🚂', ch53: '📋',
};

// ─── 스토리지 헬퍼 ─────────────────────────────────────────────────
// 로그인 여부에 따라 Supabase ↔ localStorage 자동 선택

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
  // 비로그인: localStorage
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
  subMode: SubMode, chapterFilter: ChapterFilter, shuffleOn: boolean,
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
      filter_part: cfToNum(chapterFilter),
      shuffle_q: shuffleOn,
    });
  } else {
    try {
      localStorage.setItem(LS_PROGRESS, JSON.stringify({
        subMode, chapterFilter, shuffleOn,
        questionIds: questions.map(q => q.id), current, answers,
      }));
    } catch {}
  }
}

async function storageLoadProgress(): Promise<{
  subMode: SubMode; chapterFilter: ChapterFilter; shuffleOn: boolean;
  questionIds: string[]; current: number; answers: AnswerRecord[];
} | null> {
  const user = await getUser();
  if (user) {
    const d = await loadCBTProgress(RK_SUBJECT);
    if (!d || !d.question_ids.length) return null;
    return {
      subMode: (d.filter_grade as SubMode) || '기출변형',
      chapterFilter: numToCf(d.filter_part),
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
function RailwayKingInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('home');
  const [subMode, setSubMode] = useState<SubMode>('기출변형');
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>('ALL');
  const [shuffleOn, setShuffleOn] = useState(true);

  const [questions, setQuestions] = useState<RailwayKingQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  const [wrongCount, setWrongCount] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ subMode: SubMode; chapterFilter: ChapterFilter } | null>(null);
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
        setSavedInfo({ subMode: saved.subMode, chapterFilter: saved.chapterFilter });
      }
      setInitDone(true);
    })();
  }, []);

  // URL ?m= / ?ch= 파라미터로 홈 화면 subMode/chapterFilter 미리 선택
  useEffect(() => {
    if (!initDone) return;
    const m = searchParams.get('m');
    const ch = searchParams.get('ch') as ChapterFilter | null;
    if (m === 'quiz') setSubMode('기출변형');
    else if (m === 'wrong') setSubMode('오답풀기');
    else if (m === 'new') setSubMode('신유형');
    if (ch && ['ALL','ch81','ch82','ch83','ch53'].includes(ch)) setChapterFilter(ch as ChapterFilter);
    // mode는 'home' 유지 — 홈 화면에서 시작 버튼 클릭
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initDone]);

  const getPool = useCallback(async (sm: SubMode, cf: ChapterFilter): Promise<RailwayKingQuestion[]> => {
    if (sm === '오답풀기') {
      const wrongIds = await storageLoadWrongIds();
      return allRailwayKingQuestions.filter(q => wrongIds.has(q.id));
    }
    if (sm === '신유형') {
      if (cf === 'ch53') return ch53NewQuestions;
      return ch53NewQuestions; // 기본값
    }
    // 기출변형
    if (cf === 'ch81') return ch81Questions;
    if (cf === 'ch82') return ch82Questions;
    if (cf === 'ch83') return ch83Questions;
    if (cf === 'ch53') return ch53BasicQuestions;
    // ALL: ch81+ch82+ch83 기출변형 (ch53 제외 — 별도 챕터로 선택)
    return [...ch81Questions, ...ch82Questions, ...ch83Questions];
  }, []);

  const startNew = useCallback(async (sm: SubMode, cf: ChapterFilter) => {
    const pool = await getPool(sm, cf);
    if (pool.length === 0) return;
    const ordered = shuffleOn ? shuffle(pool) : pool;
    await storageClearProgress();
    setQuestions(ordered);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setAnswers([]);
    setSubMode(sm);
    setChapterFilter(cf);
    setHasSaved(false);
    setSavedInfo(null);
    setMode('quiz');
  }, [getPool, shuffleOn]);

  const resumeSaved = useCallback(async () => {
    const saved = await storageLoadProgress();
    if (!saved) return;
    const qMap = new Map(allRailwayKingQuestions.map(q => [q.id, q]));
    const qs = saved.questionIds.map(id => qMap.get(id)!).filter(Boolean);
    if (!qs.length) return;
    setQuestions(qs);
    setCurrent(saved.current);
    setAnswers(saved.answers);
    setSubMode(saved.subMode);
    setChapterFilter(saved.chapterFilter);
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

    // 오답/정답 저장 (백그라운드)
    if (!correct) {
      storageSaveWrong(q, selected);
    } else {
      storageRemoveWrong(q.id);
    }

    // 진행 상황 저장
    await storageSaveProgress(subMode, chapterFilter, shuffleOn, questions, current, newAnswers);
  }, [selected, q, answers, subMode, chapterFilter, shuffleOn, questions, current]);

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
    const total = allRailwayKingQuestions.length;
    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 16px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>

        {/* 헤더 */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', borderRadius:14, padding:'24px 20px', marginBottom:20 }}>
          <div style={{ fontSize:'1.5em', fontWeight:'bold', marginBottom:4 }}>👑 철도왕 기출변형문제</div>
          <div style={{ fontSize:'.9em', opacity:.85 }}>철도교통 안전관리자 일주일 절대합격 바이블 수록</div>
          <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap', fontSize:'.8em' }}>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>🪨 ch8.1 {ch81Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>⚡ ch8.2 {ch82Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>🚂 ch8.3 {ch83Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>📋 ch5.3 {ch53Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20, padding:'3px 12px' }}>총 {total}문항</span>
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
                {savedInfo.subMode} · {savedInfo.chapterFilter === 'ALL' ? '전체' : CHAPTER_NAMES[savedInfo.chapterFilter as RailwayKingChapter]}
                {isLoggedIn ? ' (클라우드 저장됨)' : ' (이 기기에 저장됨)'}
              </div>
            </div>
            <button onClick={resumeSaved} style={{ background:'#92400e', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:'bold', cursor:'pointer' }}>이어풀기</button>
          </div>
        )}

        {/* 기출변형 카드 */}
        <div style={{ display:'grid', gap:12, marginBottom:20 }}>
          <div style={{ background:'#fff', border:'2px solid #2563eb', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#1d4ed8' }}>📚 기출변형문제</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>교재 수록 문항 — 철도 토목·전기신호·일반차량·교통안전관리론</div>

            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:'.8em', color:'#6b7280', marginBottom:6 }}>챕터 선택</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(['ALL','ch81','ch82','ch83','ch53'] as ChapterFilter[]).map(cf => (
                  <button key={cf} onClick={() => setChapterFilter(cf)}
                    style={{
                      padding:'4px 12px', borderRadius:16, border:'1px solid', cursor:'pointer', fontSize:'.78em', fontWeight:'bold',
                      borderColor: chapterFilter===cf ? (cf==='ALL'?'#2563eb':CHAPTER_COLOR[cf]) : '#e5e7eb',
                      background: chapterFilter===cf ? (cf==='ALL'?'#2563eb':CHAPTER_COLOR[cf]) : '#fff',
                      color: chapterFilter===cf ? '#fff' : '#374151',
                    }}>
                    {cf === 'ALL' ? '전체' : `${CHAPTER_ICON[cf]} ${CHAPTER_NAMES[cf as RailwayKingChapter]}`}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.83em', cursor:'pointer', marginBottom:12 }}>
              <input type="checkbox" checked={shuffleOn} onChange={e => setShuffleOn(e.target.checked)} />
              문제 순서 랜덤
            </label>

            <button onClick={() => startNew('기출변형', chapterFilter)}
              style={{ width:'100%', padding:'11px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, fontWeight:'bold', cursor:'pointer', fontSize:'.95em' }}>
              📚 기출변형문제 시작
            </button>
          </div>

          {/* 신유형 */}
          <div style={{ background:'#fff', border:'2px solid #059669', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#065f46' }}>✨ 신유형문제</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>
              철도산업발전기본법 신유형 {ch53NewQuestions.length}문항
            </div>
            <button onClick={() => startNew('신유형', 'ch53')}
              style={{ width:'100%', padding:'11px', background:'#059669', color:'#fff', border:'none', borderRadius:10, fontWeight:'bold', cursor:'pointer', fontSize:'.95em' }}>
              ✨ 신유형문제 시작
            </button>
          </div>

          {/* 오답풀기 */}
          <div style={{ background:'#fff', border:'2px solid #dc2626', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#b91c1c' }}>🔁 오답문제 풀기</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>
              틀린 문제를 다시 풀어 약점을 보완합니다.
              {wrongCount > 0 ? <span style={{ color:'#dc2626', fontWeight:'bold' }}> 현재 {wrongCount}문항 누적.</span> : ' 아직 오답이 없습니다.'}
              {isLoggedIn && <span style={{ color:'#6b7280' }}> (☁️ 클라우드 저장)</span>}
            </div>
            <button
              onClick={() => wrongCount > 0 && startNew('오답풀기', 'ALL')}
              disabled={wrongCount === 0}
              style={{
                width:'100%', padding:'11px',
                background: wrongCount > 0 ? '#dc2626' : '#e5e7eb',
                color: wrongCount > 0 ? '#fff' : '#9ca3af',
                border:'none', borderRadius:10, fontWeight:'bold',
                cursor: wrongCount > 0 ? 'pointer' : 'default', fontSize:'.95em',
              }}>
              {wrongCount > 0 ? `🔁 오답 ${wrongCount}문항 풀기` : '오답 없음'}
            </button>
          </div>
        </div>

        {/* 챕터별 현황 */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
          <div style={{ fontWeight:'bold', marginBottom:12, color:'#374151' }}>📊 챕터별 문항 현황</div>
          {([
            { ch: 'ch81' as RailwayKingChapter, cnt: ch81Questions.length, sub: '' },
            { ch: 'ch82' as RailwayKingChapter, cnt: ch82Questions.length, sub: '' },
            { ch: 'ch83' as RailwayKingChapter, cnt: ch83Questions.length, sub: '' },
            { ch: 'ch53' as RailwayKingChapter, cnt: ch53Questions.length, sub: `(기출변형 ${ch53BasicQuestions.length} + 신유형 ${ch53NewQuestions.length})` },
          ]).map(({ ch, cnt, sub }) => (
            <div key={ch} style={{ marginBottom:10, padding:'10px 14px', background:'#f9fafb', borderLeft:`4px solid ${CHAPTER_COLOR[ch]}`, borderRadius:'0 8px 8px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:'bold', color:CHAPTER_COLOR[ch], fontSize:'.9em' }}>{CHAPTER_ICON[ch]} {CHAPTER_NAMES[ch]}</span>
                <span style={{ fontSize:'.8em', color:'#6b7280' }}>{cnt}문항 {sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── 퀴즈 ────────────────────────────────────────────────────────
  if (mode === 'quiz' && q) {
    const progress = Math.round(((current + 1) / questions.length) * 100);
    const correctCount = answers.filter(a => a.correct).length;
    const isCorrect = confirmed && selected === q.answer;
    const chColor = CHAPTER_COLOR[q.chapter];

    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'16px 14px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>

        {/* 진행바 */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.8em', color:'#6b7280', marginBottom:4 }}>
            <span>{current+1} / {questions.length}{subMode==='오답풀기' ? ' (오답풀기)' : ''}</span>
            <span>정답률 {answers.length ? Math.round(correctCount/answers.length*100) : 0}%</span>
          </div>
          <div style={{ background:'#e5e7eb', borderRadius:4, height:6 }}>
            <div style={{ width:`${progress}%`, background:chColor, borderRadius:4, height:6, transition:'width .3s' }} />
          </div>
        </div>

        {/* 문제 카드 */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ background:chColor, color:'#fff', borderRadius:16, padding:'2px 10px', fontSize:'.75em', fontWeight:'bold' }}>
              {CHAPTER_ICON[q.chapter]} {CHAPTER_NAMES[q.chapter]}
            </span>
            <span style={{ background:'#f3f4f6', color:'#6b7280', borderRadius:16, padding:'2px 10px', fontSize:'.75em' }}>문제 {q.num}번</span>
          </div>

          <div style={{ fontSize:'1em', fontWeight:'bold', lineHeight:1.75, marginBottom:16, color:'#111827', whiteSpace:'pre-line' }}>
            {q.question}
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
              background: selected === null ? '#e5e7eb' : chColor,
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
            style={{ width:'100%', padding:14, background:chColor, color:'#fff', border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold', cursor:'pointer' }}>
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

    const chScores: Record<string, { correct: number; total: number }> = {};
    answers.forEach(a => {
      const aq = questions.find(q => q.id === a.qid);
      if (!aq) return;
      if (!chScores[aq.chapter]) chScores[aq.chapter] = { correct:0, total:0 };
      chScores[aq.chapter].total++;
      if (a.correct) chScores[aq.chapter].correct++;
    });

    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 14px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', borderRadius:14, padding:'28px 20px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:'3em', fontWeight:'bold' }}>{pct}점</div>
          <div style={{ fontSize:'1.1em', marginTop:4 }}>{correctCount} / {total} 정답</div>
          <div style={{ marginTop:10, fontSize:'.9em', opacity:.85 }}>
            {pct>=80?'🏆 우수! 철도왕 레벨 달성':pct>=60?'👍 양호. 오답 집중 복습!':pct>=40?'📚 기초 개념 재정리 필요':'⚠️ 핵심 개념부터 재학습'}
          </div>
          <div style={{ marginTop:6, fontSize:'.78em', opacity:.65 }}>
            {isLoggedIn ? '☁️ 오답 클라우드 저장 완료' : '📱 이 기기에 저장됨'}
          </div>
        </div>

        {/* 챕터별 성취 */}
        {Object.keys(chScores).length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:12 }}>📊 챕터별 성취</div>
            {Object.entries(chScores).map(([ch, sc]) => {
              const rate = Math.round(sc.correct/sc.total*100);
              return (
                <div key={ch} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.85em', marginBottom:3 }}>
                    <span style={{ color:CHAPTER_COLOR[ch], fontWeight:'bold' }}>{CHAPTER_ICON[ch]} {CHAPTER_NAMES[ch as RailwayKingChapter]}</span>
                    <span>{sc.correct}/{sc.total} ({rate}%)</span>
                  </div>
                  <div style={{ background:'#e5e7eb', borderRadius:4, height:8 }}>
                    <div style={{ width:`${rate}%`, background: rate>=80?'#16a34a':rate>=60?'#d97706':'#dc2626', borderRadius:4, height:8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 누적 오답 */}
        {wrongCount > 0 && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'.88em', color:'#991b1b' }}>누적 오답 {wrongCount}문항</div>
            <button onClick={() => startNew('오답풀기','ALL')}
              style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontSize:'.8em', fontWeight:'bold', cursor:'pointer' }}>
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
                  <div style={{ fontSize:'.8em', color:'#9ca3af', marginBottom:6 }}>{CHAPTER_ICON[wq.chapter]} {CHAPTER_NAMES[wq.chapter]} | 문제 {wq.num}번</div>
                  <div style={{ fontWeight:'bold', marginBottom:8, fontSize:'.92em', lineHeight:1.6, whiteSpace:'pre-line' }}>{wq.question}</div>
                  <div style={{ fontSize:'.88em', color:'#dc2626', marginBottom:4 }}>내 답: {['①','②','③','④'][a.selected]} {wq.choices[a.selected]}</div>
                  <div style={{ fontSize:'.88em', color:'#166534', marginBottom:8 }}>정답: {['①','②','③','④'][wq.answer]} {wq.choices[wq.answer]}</div>
                  <div style={{ fontSize:'.85em', background:'#f9fafb', borderRadius:6, padding:'8px 10px', color:'#374151', lineHeight:1.65 }}>{wq.explanation}</div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={goHome}
          style={{ width:'100%', padding:14, background:'#1d4ed8', color:'#fff', border:'none', borderRadius:12, fontSize:'1em', fontWeight:'bold', cursor:'pointer', marginBottom:8 }}>
          🏠 처음으로
        </button>
        <button onClick={() => startNew(subMode, chapterFilter)}
          style={{ width:'100%', padding:12, background:'transparent', color:'#1d4ed8', border:'2px solid #1d4ed8', borderRadius:12, fontSize:'.95em', fontWeight:'bold', cursor:'pointer' }}>
          🔄 다시 풀기
        </button>
      </div>
    );
  }

  // 신유형 모드 (데이터 없음)
  if (mode === 'quiz' && subMode === '신유형' && questions.length === 0) {
    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 16px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff', textAlign:'center' }}>
        <div style={{ fontSize:'3em', marginBottom:16 }}>✨</div>
        <div style={{ fontWeight:'bold', fontSize:'1.2em', marginBottom:8 }}>신유형문제 준비 중</div>
        <div style={{ color:'#6b7280', marginBottom:24 }}>철도왕 신유형 문제가 곧 업데이트됩니다.</div>
        <button onClick={goHome}
          style={{ padding:'10px 28px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, fontWeight:'bold', cursor:'pointer' }}>
          홈으로
        </button>
      </div>
    );
  }

  return null;
}

export default function RailwayKingPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'50vh', fontFamily:'Malgun Gothic, sans-serif', color:'#6b7280' }}>불러오는 중...</div>}>
      <RailwayKingInner />
    </Suspense>
  );
}
