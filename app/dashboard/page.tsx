'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjects = [
  { id: 1, name: '교통안전관리론', icon: '📊', color: 'bg-purple-100', textColor: 'text-purple-700' },
  { id: 2, name: '교통안전법', icon: '⚖️', color: 'bg-blue-100', textColor: 'text-blue-700' },
  { id: 3, name: '열차운전', icon: '🚇', color: 'bg-amber-100', textColor: 'text-amber-700' },
  { id: 4, name: '철도공학', icon: '🔧', color: 'bg-green-100', textColor: 'text-green-700' },
  { id: 5, name: '철도산업기본법', icon: '📋', color: 'bg-teal-100', textColor: 'text-teal-700' },
  { id: 6, name: '철도신호', icon: '🚦', color: 'bg-red-100', textColor: 'text-red-700' },
  { id: 7, name: '철도안전법', icon: '🛡️', color: 'bg-slate-100', textColor: 'text-slate-700' },
];

interface SubjectProgress {
  total: number; attempted: number; correct: number;
  storyCompleted: number; storyTotal: number;
  retrievalDone: number; retrievalTotal: number;
}

interface Announcement { id: string; title: string; content: string; is_pinned: boolean; }

function getDday() {
  const exam = new Date('2026-06-21');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = [...new Set(dates.map(d => d.slice(0,10)))].sort().reverse();
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = (new Date(unique[i-1]).getTime() - new Date(unique[i]).getTime()) / 86400000;
    if (diff === 1) streak++; else break;
  }
  return streak;
}

// 이번 달 학습 캘린더 데이터 생성
function buildCalendar(dates: string[]) {
  const now = new Date();
  const year = now.getFullYear(); const month = now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
  const studiedDays = new Set(dates.map(d => d.slice(0,10)));
  return { year, month, daysInMonth, firstDay, studiedDays };
}

export default function DashboardPage() {
  const router = useRouter();
  const dday = getDday();
  const [progress, setProgress] = useState<Record<number, SubjectProgress>>({});
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [activityDates, setActivityDates] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
      setDismissedIds(new Set(saved));
    } catch { /* ignore */ }

    const fetchAll = async () => {
      const supabase = createClient();

      const { data: ann } = await supabase
        .from('announcements').select('id,title,content,is_pinned')
        .is('expires_at', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }).limit(3);
      if (ann) setAnnouncements(ann as Announcement[]);

      const [
        { data: qCounts },
        { data: attempts },
        { data: storyCounts },
        { data: storyProgress },
        { data: flashcardCounts },
        { data: flashcardReviews },
      ] = await Promise.all([
        supabase.from('questions').select('subject_id').in('subject_id', subjects.map(s=>s.id)),
        supabase.from('attempts').select('question_id,is_correct,attempted_at,questions(subject_id)'),
        supabase.from('subject_stories').select('subject_id'),
        supabase.from('story_progress').select('subject_id'),
        supabase.from('flashcards').select('subject_id'),
        supabase.from('flashcard_reviews').select('flashcard_id,flashcards(subject_id)'),
      ]);

      // 스트릭 & 활동 날짜
      const attemptDates = (attempts||[]).map((a:{attempted_at:string})=>a.attempted_at).filter(Boolean);
      setActivityDates(attemptDates);
      setStreak(calcStreak(attemptDates));
      setTotalSolved(new Set((attempts||[]).map((a:{question_id:number})=>a.question_id)).size);

      // 과목별 집계
      const result: Record<number, SubjectProgress> = {};
      subjects.forEach(s => { result[s.id] = { total:0, attempted:0, correct:0, storyCompleted:0, storyTotal:0, retrievalDone:0, retrievalTotal:0 }; });

      (qCounts||[]).forEach((q:{subject_id:number}) => { if(result[q.subject_id]) result[q.subject_id].total++; });

      const attemptedMap: Record<number,Set<number>> = {};
      const correctMap: Record<number,Set<number>> = {};
      (attempts||[]).forEach((a:{question_id:number;is_correct:boolean;questions:{subject_id:number}[]|null}) => {
        const sid = Array.isArray(a.questions) ? a.questions[0]?.subject_id : (a.questions as {subject_id:number}|null)?.subject_id;
        if (!sid) return;
        if (!attemptedMap[sid]) attemptedMap[sid]=new Set();
        if (!correctMap[sid]) correctMap[sid]=new Set();
        attemptedMap[sid].add(a.question_id);
        if (a.is_correct) correctMap[sid].add(a.question_id);
      });

      const storyTotalMap: Record<number,number> = {};
      const storyCompletedMap: Record<number,number> = {};
      (storyCounts||[]).forEach((s:{subject_id:number}) => { storyTotalMap[s.subject_id]=(storyTotalMap[s.subject_id]||0)+1; });
      (storyProgress||[]).forEach((s:{subject_id:number}) => { storyCompletedMap[s.subject_id]=(storyCompletedMap[s.subject_id]||0)+1; });

      const flashTotalMap: Record<number,number> = {};
      const flashDoneMap: Record<number,number> = {};
      (flashcardCounts||[]).forEach((f:{subject_id:number}) => { flashTotalMap[f.subject_id]=(flashTotalMap[f.subject_id]||0)+1; });
      (flashcardReviews||[]).forEach((r:{flashcard_id:number;flashcards:{subject_id:number}[]|null}) => {
        const sid = Array.isArray(r.flashcards) ? r.flashcards[0]?.subject_id : (r.flashcards as {subject_id:number}|null)?.subject_id;
        if (sid) flashDoneMap[sid]=(flashDoneMap[sid]||0)+1;
      });

      subjects.forEach(s => {
        result[s.id].attempted = attemptedMap[s.id]?.size||0;
        result[s.id].correct = correctMap[s.id]?.size||0;
        result[s.id].storyTotal = storyTotalMap[s.id]||0;
        result[s.id].storyCompleted = storyCompletedMap[s.id]||0;
        result[s.id].retrievalTotal = flashTotalMap[s.id]||0;
        result[s.id].retrievalDone = Math.min(flashDoneMap[s.id]||0, flashTotalMap[s.id]||0);
      });

      setProgress(result);
      setLoadingProgress(false);
    };
    fetchAll();
  }, []);

  const dismissAnnouncement = (id: string) => {
    const next = new Set(dismissedIds); next.add(id); setDismissedIds(next);
    try { localStorage.setItem('dismissed_announcements', JSON.stringify([...next])); } catch { /* ignore */ }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));

  const weakSubject = !loadingProgress
    ? subjects.map(s => {
        const p = progress[s.id];
        const attempted = p?.attempted||0; const correct = p?.correct||0;
        return { ...s, attempted, correctPct: attempted>0 ? Math.round((correct/attempted)*100) : 101 };
      }).filter(s=>s.attempted>0).sort((a,b)=>a.correctPct-b.correctPct)[0]
    : null;

  // 캘린더
  const cal = buildCalendar(activityDates);
  const todayStr = new Date().toISOString().slice(0,10);

  return (
    <>
      {/* 공지 배너 */}
      {visibleAnnouncements.map(ann => (
        <div key={ann.id} className="mb-4 flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4">
          <span className="text-xl shrink-0 mt-0.5">📢</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-purple-800">{ann.title}</p>
            <p className="text-xs text-purple-600 mt-0.5 leading-relaxed">{ann.content}</p>
          </div>
          <button onClick={()=>dismissAnnouncement(ann.id)} className="text-purple-300 hover:text-purple-500 transition text-lg leading-none shrink-0">×</button>
        </div>
      ))}

      {/* ── 상단 통계 카드 ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className={`rounded-2xl p-4 text-center ${dday<=7?'bg-red-600':dday<=30?'bg-orange-500':'bg-purple-700'} text-white`}>
          <p className="text-xs font-semibold opacity-80 mb-0.5">시험일까지</p>
          <p className="text-3xl font-black leading-none">D-{dday}</p>
          <p className="text-xs opacity-70 mt-0.5">2026.06.21</p>
        </div>
        <div className="rounded-2xl p-4 text-center bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-amber-600 mb-0.5">연속 학습</p>
          <p className="text-3xl font-black text-amber-600 leading-none">{streak}</p>
          <p className="text-xs text-amber-500 mt-0.5">일째 🔥</p>
        </div>
        <div className="rounded-2xl p-4 text-center bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-blue-600 mb-0.5">총 풀이</p>
          <p className="text-3xl font-black text-blue-600 leading-none">{totalSolved}</p>
          <p className="text-xs text-blue-500 mt-0.5">문제 ✅</p>
        </div>
      </div>

      {/* ── 학습 캘린더 ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">
            {cal.year}년 {cal.month+1}월 학습 캘린더
          </h2>
          <span className="text-xs text-gray-400">{cal.studiedDays.size}일 학습</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="text-xs text-gray-400 font-semibold pb-1">{d}</div>
          ))}
          {/* 빈 칸 */}
          {Array.from({length: cal.firstDay}).map((_,i) => <div key={`empty-${i}`} />)}
          {/* 날짜 */}
          {Array.from({length: cal.daysInMonth}).map((_,i) => {
            const day = i+1;
            const dateStr = `${cal.year}-${String(cal.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const hasActivity = cal.studiedDays.has(dateStr);
            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium
                  ${isToday ? 'ring-2 ring-purple-400' : ''}
                  ${hasActivity ? 'bg-purple-600 text-white' : 'text-gray-400'}
                `}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 약점 과목 분석 ── */}
      {weakSubject && weakSubject.correctPct < 70 && (
        <div
          className="mb-5 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-red-100 transition"
          onClick={() => router.push(`/cbt/${weakSubject.id}`)}
        >
          <div className="text-3xl">⚠️</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">약점 과목 발견!</p>
            <p className="text-xs text-red-500 mt-0.5">
              <span className="font-semibold">{weakSubject.name}</span> 정답률 {weakSubject.correctPct}% — 집중 학습 필요
            </p>
          </div>
          <div className="text-red-400 font-bold text-xl">›</div>
        </div>
      )}

      {/* ── 헤더 버튼 ── */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">과목별 학습 현황</h1>
        <div className="flex items-center gap-2">
          <button onClick={()=>router.push('/bookmarks')} className="shrink-0 flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-yellow-100 transition">
            <span>★</span> 북마크
          </button>
          <button onClick={()=>router.push('/start')} className="shrink-0 flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm">
            <span>🚀</span> 오늘의 학습
          </button>
        </div>
      </div>

      {/* ── 과목 카드 그리드 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => {
          const p = progress[subject.id];
          const attempted = p?.attempted||0; const correct = p?.correct||0;
          const total = p?.total||0;
          const storyCompleted = p?.storyCompleted||0; const storyTotal = p?.storyTotal||0;
          const retrievalDone = p?.retrievalDone||0; const retrievalTotal = p?.retrievalTotal||0;
          const cbtPct = total>0 ? Math.round((attempted/total)*100) : 0;
          const storyPct = storyTotal>0 ? Math.round((storyCompleted/storyTotal)*100) : 0;
          const retrievalPct = retrievalTotal>0 ? Math.round((retrievalDone/retrievalTotal)*100) : 0;
          const correctPct = attempted>0 ? Math.round((correct/attempted)*100) : 0;
          const isWeak = weakSubject?.id===subject.id && weakSubject.correctPct<70;

          return (
            <div key={subject.id} className={`bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition ${isWeak?'ring-2 ring-red-300':''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${subject.color} rounded-xl flex items-center justify-center text-xl`}>{subject.icon}</div>
                {isWeak && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">⚠️ 약점</span>}
              </div>
              <h2 className="font-semibold text-gray-800 mb-3 text-sm">{subject.name}</h2>

              {!loadingProgress && (
                <div className="mb-3 space-y-2">
                  {/* 스토리 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">📖 스토리 {storyCompleted}/{storyTotal}</span>
                      <span className="text-xs font-semibold text-purple-500">{storyPct}%</span>
                    </div>
                    <div className="bg-purple-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{width:`${storyPct}%`}} />
                    </div>
                  </div>
                  {/* 인출훈련 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">🧠 인출훈련 {retrievalDone}/{retrievalTotal}</span>
                      <span className="text-xs font-semibold text-orange-500">{retrievalPct}%</span>
                    </div>
                    <div className="bg-orange-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400 transition-all duration-500" style={{width:`${retrievalPct}%`}} />
                    </div>
                  </div>
                  {/* CBT */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">
                        📝 {attempted>0 ? `${attempted}/${total}문제 · 정답률 ${correctPct}%` : 'CBT 미풀이'}
                      </span>
                      <span className={`text-xs font-semibold ${correctPct>=60?'text-green-600':attempted>0?'text-red-500':'text-blue-500'}`}>{cbtPct}%</span>
                    </div>
                    <div className="bg-blue-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{width:`${cbtPct}%`, background: cbtPct===0?'#e5e7eb':correctPct>=60?'#16a34a':'#3b82f6'}} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={()=>router.push(`/story/${subject.id}`)} className="bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-purple-800 transition">스토리</button>
                <button onClick={()=>router.push(`/cbt/${subject.id}`)} className={`text-xs px-3 py-1.5 rounded-lg transition ${isWeak?'bg-red-100 text-red-700 hover:bg-red-200':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>CBT</button>
                <button onClick={()=>router.push('/retrieval')} className="bg-orange-50 text-orange-600 text-xs px-3 py-1.5 rounded-lg hover:bg-orange-100 transition">인출훈련</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
