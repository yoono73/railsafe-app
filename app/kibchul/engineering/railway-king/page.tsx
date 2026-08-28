'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  allRailwayKingQuestions,
  ch81Questions,
  ch82Questions,
  ch83Questions,
  CHAPTER_NAMES,
  RAILWAY_KING_WRONG_KEY,
  RAILWAY_KING_PROGRESS_KEY,
  RailwayKingQuestion,
  RailwayKingChapter,
} from '@/lib/railway-king-data';

type Mode = 'home' | 'quiz' | 'result';
type SubMode = '기출변형' | '신유형' | '오답풀기';
type ChapterFilter = 'ALL' | 'ch81' | 'ch82' | 'ch83';

interface WrongEntry {
  id: string;
  selected: number;
  savedAt: string;
}

interface ProgressData {
  subMode: SubMode;
  chapterFilter: ChapterFilter;
  questionIds: string[];
  current: number;
  answers: AnswerRecord[];
  savedAt: string;
}

interface AnswerRecord {
  qid: string;
  selected: number;
  correct: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadWrongIds(): Set<string> {
  try {
    const raw = localStorage.getItem(RAILWAY_KING_WRONG_KEY);
    if (!raw) return new Set();
    const entries: WrongEntry[] = JSON.parse(raw);
    return new Set(entries.map(e => e.id));
  } catch { return new Set(); }
}

function saveWrongEntry(q: RailwayKingQuestion, selected: number) {
  try {
    const raw = localStorage.getItem(RAILWAY_KING_WRONG_KEY);
    const entries: WrongEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = entries.filter(e => e.id !== q.id);
    filtered.push({ id: q.id, selected, savedAt: new Date().toISOString() });
    localStorage.setItem(RAILWAY_KING_WRONG_KEY, JSON.stringify(filtered));
  } catch {}
}

function removeWrongEntry(qid: string) {
  try {
    const raw = localStorage.getItem(RAILWAY_KING_WRONG_KEY);
    const entries: WrongEntry[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(RAILWAY_KING_WRONG_KEY, JSON.stringify(entries.filter(e => e.id !== qid)));
  } catch {}
}

function saveProgress(data: ProgressData) {
  try { localStorage.setItem(RAILWAY_KING_PROGRESS_KEY, JSON.stringify(data)); } catch {}
}
function loadProgress(): ProgressData | null {
  try { const s = localStorage.getItem(RAILWAY_KING_PROGRESS_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearProgress() {
  try { localStorage.removeItem(RAILWAY_KING_PROGRESS_KEY); } catch {}
}

const CHAPTER_COLOR: Record<string, string> = {
  ch81: '#0891b2',
  ch82: '#7c3aed',
  ch83: '#d97706',
};

const CHAPTER_ICON: Record<string, string> = {
  ch81: '🪨',
  ch82: '⚡',
  ch83: '🚂',
};

export default function RailwayKingPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [subMode, setSubMode] = useState<SubMode>('기출변형');
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>('ALL');
  const [shuffleOn, setShuffleOn] = useState(true);

  const [questions, setQuestions] = useState<RailwayKingQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    const saved = loadProgress();
    if (saved) setHasSaved(true);
    setWrongCount(loadWrongIds().size);
  }, []);

  const getQuestions = useCallback((sm: SubMode, cf: ChapterFilter): RailwayKingQuestion[] => {
    if (sm === '오답풀기') {
      const wrongIds = loadWrongIds();
      return allRailwayKingQuestions.filter(q => wrongIds.has(q.id));
    }
    if (sm === '신유형') return [];
    // 기출변형
    let pool: RailwayKingQuestion[] = [];
    if (cf === 'ALL') pool = allRailwayKingQuestions;
    else if (cf === 'ch81') pool = ch81Questions;
    else if (cf === 'ch82') pool = ch82Questions;
    else if (cf === 'ch83') pool = ch83Questions;
    return pool;
  }, []);

  const startNew = useCallback((sm: SubMode, cf: ChapterFilter) => {
    const pool = getQuestions(sm, cf);
    if (pool.length === 0) return;
    const ordered = shuffleOn ? shuffle(pool) : pool;
    setQuestions(ordered);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setAnswers([]);
    setSubMode(sm);
    setChapterFilter(cf);
    clearProgress();
    setMode('quiz');
  }, [getQuestions, shuffleOn]);

  const resumeSaved = useCallback(() => {
    const saved = loadProgress();
    if (!saved) return;
    const qMap = new Map(allRailwayKingQuestions.map(q => [q.id, q]));
    const qs = saved.questionIds.map(id => qMap.get(id)!).filter(Boolean);
    setQuestions(qs);
    setCurrent(saved.current);
    setAnswers(saved.answers);
    setSubMode(saved.subMode);
    setChapterFilter(saved.chapterFilter);
    setSelected(null);
    setConfirmed(false);
    setHasSaved(false);
    setMode('quiz');
  }, []);

  const q = questions[current];

  const handleSelect = useCallback((idx: number) => {
    if (confirmed) return;
    setSelected(idx);
  }, [confirmed]);

  const handleConfirm = useCallback(() => {
    if (selected === null || !q) return;
    setConfirmed(true);
    const correct = selected === q.answer;
    const newAnswers = [
      ...answers.filter(a => a.qid !== q.id),
      { qid: q.id, selected, correct },
    ];
    setAnswers(newAnswers);
    if (!correct) saveWrongEntry(q, selected);
    else removeWrongEntry(q.id);
    saveProgress({
      subMode, chapterFilter,
      questionIds: questions.map(q => q.id),
      current, answers: newAnswers,
      savedAt: new Date().toISOString(),
    });
  }, [selected, q, answers, subMode, chapterFilter, questions, current]);

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      clearProgress();
      setWrongCount(loadWrongIds().size);
      setMode('result');
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setConfirmed(false);
  }, [current, questions.length]);

  // ─── 홈 ──────────────────────────────────────────────
  if (mode === 'home') {
    const wc = wrongCount;
    const total = allRailwayKingQuestions.length;

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Malgun Gothic, sans-serif', background: '#fff' }}>
        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', borderRadius: 14, padding: '24px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: 4 }}>👑 철도왕 기출변형문제</div>
          <div style={{ fontSize: '.9em', opacity: .85 }}>철도교통 안전관리자 일주일 절대합격 바이블 수록</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', fontSize: '.8em' }}>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>🪨 ch8.1 {ch81Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>⚡ ch8.2 {ch82Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>🚂 ch8.3 {ch83Questions.length}문항</span>
            <span style={{ background:'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px' }}>총 {total}문항</span>
          </div>
        </div>

        {/* 이어풀기 */}
        {hasSaved && (
          <div style={{ background:'#fffbeb', border:'1px solid #fbbf24', borderRadius:10, padding:'14px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:'bold', color:'#92400e' }}>📌 이어풀기</div>
              <div style={{ fontSize:'.83em', color:'#78350f' }}>이전 세션이 저장되어 있습니다.</div>
            </div>
            <button onClick={resumeSaved} style={{ background:'#92400e', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:'bold', cursor:'pointer' }}>이어풀기</button>
          </div>
        )}

        {/* 3가지 모드 카드 */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>

          {/* 기출변형 */}
          <div style={{ background:'#fff', border:'2px solid #2563eb', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#1d4ed8' }}>📚 기출변형문제</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>교재 수록 112문항 — 철도 토목·전기신호·일반차량</div>

            {/* 챕터 필터 */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:'.8em', color:'#6b7280', marginBottom:6 }}>챕터 선택</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(['ALL', 'ch81', 'ch82', 'ch83'] as ChapterFilter[]).map(cf => (
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

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.83em', cursor:'pointer' }}>
                <input type="checkbox" checked={shuffleOn} onChange={e => setShuffleOn(e.target.checked)} />
                문제 순서 랜덤
              </label>
            </div>

            <div style={{ fontSize:'.82em', color:'#6b7280', marginBottom:10 }}>
              선택: {chapterFilter==='ALL' ? `전체 ${total}문항` : `${CHAPTER_NAMES[chapterFilter as RailwayKingChapter]} ${getQuestions('기출변형', chapterFilter).length}문항`}
            </div>

            <button onClick={() => startNew('기출변형', chapterFilter)}
              style={{ width:'100%', padding:'11px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, fontWeight:'bold', cursor:'pointer', fontSize:'.95em' }}>
              📚 기출변형문제 시작
            </button>
          </div>

          {/* 신유형 */}
          <div style={{ background:'#f9fafb', border:'2px dashed #d1d5db', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#9ca3af' }}>✨ 신유형문제</div>
            <div style={{ fontSize:'.85em', color:'#9ca3af', marginBottom:14 }}>준비 중입니다. 철도왕 신유형 문제가 업데이트될 예정입니다.</div>
            <button disabled style={{ width:'100%', padding:'11px', background:'#e5e7eb', color:'#9ca3af', border:'none', borderRadius:10, fontWeight:'bold', cursor:'default', fontSize:'.95em' }}>
              ✨ 준비 중
            </button>
          </div>

          {/* 오답풀기 */}
          <div style={{ background:'#fff', border:'2px solid #dc2626', borderRadius:12, padding:18 }}>
            <div style={{ fontWeight:'bold', fontSize:'1.05em', marginBottom:8, color:'#b91c1c' }}>🔁 오답문제 풀기</div>
            <div style={{ fontSize:'.85em', color:'#374151', marginBottom:14 }}>
              틀린 문제를 다시 풀어 약점을 보완합니다.
              {wc > 0 ? <span style={{ color:'#dc2626', fontWeight:'bold' }}> 현재 {wc}문항 누적.</span> : ' 아직 오답이 없습니다.'}
            </div>
            <button
              onClick={() => wc > 0 && startNew('오답풀기', 'ALL')}
              disabled={wc === 0}
              style={{
                width:'100%', padding:'11px',
                background: wc > 0 ? '#dc2626' : '#e5e7eb',
                color: wc > 0 ? '#fff' : '#9ca3af',
                border:'none', borderRadius:10, fontWeight:'bold',
                cursor: wc > 0 ? 'pointer' : 'default', fontSize:'.95em',
              }}>
              {wc > 0 ? `🔁 오답 ${wc}문항 풀기` : '오답 없음'}
            </button>
          </div>
        </div>

        {/* 챕터별 현황 */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
          <div style={{ fontWeight:'bold', marginBottom:12, color:'#374151' }}>📊 챕터별 문항 현황</div>
          {(['ch81','ch82','ch83'] as RailwayKingChapter[]).map(ch => {
            const qs = ch === 'ch81' ? ch81Questions : ch === 'ch82' ? ch82Questions : ch83Questions;
            return (
              <div key={ch} style={{ marginBottom:10, padding:'10px 14px', background:'#f9fafb', borderLeft:`4px solid ${CHAPTER_COLOR[ch]}`, borderRadius:'0 8px 8px 0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:'bold', color:CHAPTER_COLOR[ch], fontSize:'.9em' }}>
                    {CHAPTER_ICON[ch]} {CHAPTER_NAMES[ch]}
                  </div>
                  <div style={{ fontSize:'.8em', color:'#6b7280' }}>{qs.length}문항</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── 퀴즈 화면 ──────────────────────────────────────────────
  if (mode === 'quiz' && q) {
    const progress = Math.round(((current + 1) / questions.length) * 100);
    const correct = answers.filter(a => a.correct).length;
    const isCorrect = confirmed && selected === q.answer;
    const chColor = CHAPTER_COLOR[q.chapter];

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 14px 80px', fontFamily: 'Malgun Gothic, sans-serif', background: '#fff' }}>
        {/* 진행바 */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.8em', color:'#6b7280', marginBottom:4 }}>
            <span>{current+1} / {questions.length} {subMode === '오답풀기' ? '(오답풀기)' : ''}</span>
            <span>정답률 {answers.length ? Math.round(correct/answers.length*100) : 0}%</span>
          </div>
          <div style={{ background:'#e5e7eb', borderRadius:4, height:6 }}>
            <div style={{ width:`${progress}%`, background: chColor, borderRadius:4, height:6, transition:'width .3s' }} />
          </div>
        </div>

        {/* 문제 카드 */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ background:chColor, color:'#fff', borderRadius:16, padding:'2px 10px', fontSize:'.75em', fontWeight:'bold' }}>
              {CHAPTER_ICON[q.chapter]} {CHAPTER_NAMES[q.chapter]}
            </span>
            <span style={{ background:'#f3f4f6', color:'#6b7280', borderRadius:16, padding:'2px 10px', fontSize:'.75em' }}>
              문제 {q.num}번
            </span>
          </div>

          <div style={{ fontSize:'1em', fontWeight:'bold', lineHeight:1.75, marginBottom:16, color:'#111827', whiteSpace:'pre-line' }}>
            {q.question}
          </div>

          {/* 보기 */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {q.choices.map((choice, ci) => {
              const isSelected = selected === ci;
              const isAns = ci === q.answer;
              let bg = '#f9fafb', border = '#e5e7eb', color = '#374151';
              if (confirmed) {
                if (isAns) { bg='#dcfce7'; border='#16a34a'; color='#166534'; }
                else if (isSelected && !isAns) { bg='#fee2e2'; border='#dc2626'; color='#991b1b'; }
              } else if (isSelected) {
                bg='#eff6ff'; border='#3b82f6'; color='#1e40af';
              }
              return (
                <button key={ci} onClick={() => handleSelect(ci)}
                  style={{
                    textAlign:'left', padding:'12px 14px', borderRadius:10,
                    border:`1.5px solid ${border}`, background:bg, color,
                    cursor: confirmed ? 'default' : 'pointer',
                    fontSize:'.92em', lineHeight:1.5, fontFamily:'inherit',
                    display:'flex', gap:10, alignItems:'flex-start',
                  }}>
                  <span style={{ fontWeight:'bold', minWidth:22, flexShrink:0 }}>
                    {confirmed
                      ? (isAns ? '✅' : isSelected ? '❌' : `${['①','②','③','④'][ci]}`)
                      : (isSelected ? '▶' : `${['①','②','③','④'][ci]}`)}
                  </span>
                  {choice}
                </button>
              );
            })}
          </div>
        </div>

        {/* 확인 버튼 (미확인 상태에서만) */}
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

        {/* 해설 (확인 후) */}
        {confirmed && (
          <div style={{ background: isCorrect ? '#f0fdf4' : '#fef2f2', border:`1px solid ${isCorrect?'#86efac':'#fca5a5'}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:8, color: isCorrect?'#166534':'#991b1b' }}>
              {isCorrect ? '✅ 정답입니다!' : `❌ 오답입니다. 정답: ${['①','②','③','④'][q.answer]} ${q.choices[q.answer]}`}
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

        <button onClick={() => { clearProgress(); setMode('home'); }}
          style={{ width:'100%', marginTop:8, padding:10, background:'transparent', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, fontSize:'.85em', cursor:'pointer' }}>
          처음으로
        </button>
      </div>
    );
  }

  // ─── 결과 화면 ──────────────────────────────────────────────
  if (mode === 'result') {
    const correctCount = answers.filter(a => a.correct).length;
    const total = answers.length;
    const pct = total > 0 ? Math.round(correctCount / total * 100) : 0;
    const wrongs = answers.filter(a => !a.correct);

    // 챕터별 성취
    const chScores: Record<string, { correct:number; total:number }> = {};
    answers.forEach(a => {
      const aq = questions.find(q => q.id === a.qid);
      if (!aq) return;
      if (!chScores[aq.chapter]) chScores[aq.chapter] = { correct:0, total:0 };
      chScores[aq.chapter].total++;
      if (a.correct) chScores[aq.chapter].correct++;
    });

    const wc = loadWrongIds().size;

    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 14px 80px', fontFamily:'Malgun Gothic, sans-serif', background:'#fff' }}>
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', borderRadius:14, padding:'28px 20px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:'3em', fontWeight:'bold' }}>{pct}점</div>
          <div style={{ fontSize:'1.1em', marginTop:4 }}>{correctCount} / {total} 정답</div>
          <div style={{ marginTop:10, fontSize:'.9em', opacity:.85 }}>
            {pct>=80?'🏆 우수! 철도왕 레벨 달성':pct>=60?'👍 양호. 오답 집중 복습!':pct>=40?'📚 기초 개념 재정리 필요':'⚠️ 핵심 개념부터 재학습'}
          </div>
          <div style={{ marginTop:8, fontSize:'.82em', opacity:.7 }}>[철도왕] {subMode} · {chapterFilter==='ALL'?'전체':CHAPTER_NAMES[chapterFilter as RailwayKingChapter]}</div>
        </div>

        {/* 챕터별 성취 */}
        {Object.keys(chScores).length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:12, color:'#374151' }}>📊 챕터별 성취</div>
            {Object.entries(chScores).map(([ch, sc]) => {
              const rate = Math.round(sc.correct/sc.total*100);
              return (
                <div key={ch} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.85em', marginBottom:3 }}>
                    <span style={{ color:CHAPTER_COLOR[ch], fontWeight:'bold' }}>
                      {CHAPTER_ICON[ch]} {CHAPTER_NAMES[ch as RailwayKingChapter]}
                    </span>
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

        {/* 누적 오답 안내 */}
        {wc > 0 && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'.88em', color:'#991b1b' }}>누적 오답 {wc}문항 저장됨</div>
            <button onClick={() => { setMode('home'); setTimeout(() => startNew('오답풀기','ALL'), 100); }}
              style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontSize:'.8em', fontWeight:'bold', cursor:'pointer' }}>
              오답 풀기
            </button>
          </div>
        )}

        {/* 오답 해설 */}
        {wrongs.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:'bold', marginBottom:12, color:'#374151' }}>❌ 오답 해설 ({wrongs.length}문항)</div>
            {wrongs.map((a) => {
              const wq = questions.find(q => q.id === a.qid);
              if (!wq) return null;
              return (
                <div key={a.qid} style={{ background:'#fff', border:'1px solid #fca5a5', borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ fontSize:'.8em', color:'#9ca3af', marginBottom:6 }}>
                    {CHAPTER_ICON[wq.chapter]} {CHAPTER_NAMES[wq.chapter]} | 문제 {wq.num}번
                  </div>
                  <div style={{ fontWeight:'bold', marginBottom:8, fontSize:'.92em', lineHeight:1.6, whiteSpace:'pre-line' }}>{wq.question}</div>
                  <div style={{ fontSize:'.88em', color:'#dc2626', marginBottom:4 }}>
                    내 답: {['①','②','③','④'][a.selected]} {wq.choices[a.selected]}
                  </div>
                  <div style={{ fontSize:'.88em', color:'#166534', marginBottom:8 }}>
                    정답: {['①','②','③','④'][wq.answer]} {wq.choices[wq.answer]}
                  </div>
                  <div style={{ fontSize:'.85em', background:'#f9fafb', borderRadius:6, padding:'8px 10px', color:'#374151', lineHeight:1.65 }}>
                    {wq.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => { setMode('home'); setAnswers([]); clearProgress(); }}
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

  return null;
}
