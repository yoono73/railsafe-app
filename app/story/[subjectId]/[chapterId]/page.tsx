'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Dialogue {
  character: string;
  icon: string;
  text: string;
}

interface SummaryBox {
  title: string;
  items: string[];
}

interface Page {
  page_number: number;
  total_pages: number;
  scene: string;
  dialogues: Dialogue[];
  summary_box?: SummaryBox;
}

interface Story {
  id: number;
  chapter_title: string;
  pages: Page[];
}

// ── ElevenLabs 4-voice IDs ──
const VOICE_NARRATOR = '5n5gqmaQi9Ewevrz7bOS'; // 여자 나레이터
const VOICE_JO       = 'sQ3a15DhENXU8pKTHlcc';  // 조계장 (남성)
const VOICE_PARK     = 'Ir7oQcBXWiq4oFGROCfj';  // 박과장
const VOICE_YUNHO    = 'NpneagLVR101ytYGxUPX';  // 윤호

function getVoiceId(character: string): string {
  if (character.includes('과장') || character.includes('박')) return VOICE_PARK;
  if (character.includes('윤호')) return VOICE_YUNHO;
  if (character.includes('계장') || character.includes('조')) return VOICE_JO;
  return VOICE_NARRATOR;
}

const TTS_SPEEDS = [
  { label: '0.7×', value: 0.7 },
  { label: '0.9×', value: 0.9 },
  { label: '1.1×', value: 1.1 },
  { label: '1.3×', value: 1.3 },
];

export default function StoryPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = Number(params.subjectId);
  const chapterId = Number(params.chapterId);
  const supabase = createClient();

  const [story, setStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progressSaved, setProgressSaved] = useState(false);

  // ── TTS 상태 ──
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false);

  // ── 운전 모드 / 속도 ──
  const [drivingMode, setDrivingMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('story_driving_mode') === 'true';
  });
  const [ttsRate, setTtsRate] = useState(() => {
    if (typeof window === 'undefined') return 0.9;
    return parseFloat(localStorage.getItem('story_tts_rate') || '0.9');
  });
  const drivingModeRef = useRef(drivingMode);
  const ttsRateRef = useRef(ttsRate);

  useEffect(() => { drivingModeRef.current = drivingMode; }, [drivingMode]);
  useEffect(() => { ttsRateRef.current = ttsRate; }, [ttsRate]);

  const toggleDrivingMode = () => {
    const next = !drivingMode;
    setDrivingMode(next);
    localStorage.setItem('story_driving_mode', String(next));
  };

  const changeTtsRate = (rate: number) => {
    setTtsRate(rate);
    localStorage.setItem('story_tts_rate', String(rate));
  };

  // 챕터 완료 시 progress 저장
  const saveProgress = useCallback(async () => {
    if (progressSaved) return;
    setProgressSaved(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('story_progress').upsert({
          user_id: user.id,
          subject_id: subjectId,
          chapter_number: chapterId,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,subject_id,chapter_number' });
      }
    } catch { /* silent */ }
  }, [progressSaved, subjectId, chapterId, supabase]);

  const subjectNames: Record<number, string> = {
    1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
    4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법'
  };

  useEffect(() => {
    async function fetchStory() {
      const { data, error } = await supabase
        .from('subject_stories')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('chapter_number', chapterId)
        .single();
      if (!error && data) setStory(data);
      setLoading(false);
    }
    fetchStory();
  }, [subjectId, chapterId]);

  // 재생 중단
  const stopTts = useCallback(() => {
    cancelRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingIdx(null);
    setTtsLoading(false);
  }, []);

  // 단일 텍스트 재생 (Promise)
  const playOne = useCallback(async (text: string, voiceId: string, rate: number): Promise<void> => {
    if (cancelRef.current) return;
    setTtsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) throw new Error('TTS fetch failed');
      const blob = await res.blob();
      if (cancelRef.current) return;
      setTtsLoading(false);
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.playbackRate = rate;
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch {
      setTtsLoading(false);
    }
  }, []);

  // 대화 + (운전모드시) summary_box 순차 재생
  const playDialogues = useCallback(async (dialogues: Dialogue[], summaryItems?: string[], onFinish?: () => void) => {
    cancelRef.current = false;
    const rate = ttsRateRef.current;

    // 대화 재생
    for (let i = 0; i < dialogues.length; i++) {
      if (cancelRef.current) return;
      const d = dialogues[i];
      setPlayingIdx(i);
      await playOne(d.text, getVoiceId(d.character), rate);
    }

    // 운전 모드 + summary_box: 나레이터가 핵심 암기 포인트 읽기
    if (!cancelRef.current && summaryItems && summaryItems.length > 0) {
      const summaryIdx = dialogues.length; // summary는 dialogues 뒤
      setPlayingIdx(summaryIdx);
      const summaryText = summaryItems.join('. ');
      await playOne(summaryText, VOICE_NARRATOR, rate);
    }

    if (!cancelRef.current) {
      setPlayingIdx(null);
      onFinish?.();
    }
  }, [playOne]);

  // scene + dialogues + (운전모드) summary 합쳐서 재생
  const buildItems = (page: Page): Dialogue[] => {
    const items: Dialogue[] = [];
    if (page.scene && page.scene.trim()) {
      items.push({ character: '나레이터', icon: '📢', text: page.scene });
    }
    items.push(...page.dialogues);
    return items;
  };

  // 페이지 변경 시 자동 재생
  useEffect(() => {
    if (loading || !story) return;
    const page = story.pages[currentPage];
    if (!page) return;
    stopTts();

    const isLastPage = currentPage === story.pages.length - 1;
    const items = buildItems(page);
    const summaryItems = page.summary_box?.items?.length
      ? page.summary_box.items
      : undefined;

    const onFinish = () => {
      if (isLastPage) {
        saveProgress();
        router.push(`/story/${subjectId}`);
      } else {
        setCurrentPage(p => p + 1);
      }
    };

    const timer = setTimeout(() => {
      playDialogues(items, summaryItems, onFinish);
    }, 150);

    return () => {
      clearTimeout(timer);
      stopTts();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, story, loading]);

  const handleReplay = () => {
    if (!story) return;
    const page = story.pages[currentPage];
    if (!page) return;
    stopTts();
    const items = buildItems(page);
    const summaryItems = page.summary_box?.items?.length
      ? page.summary_box.items
      : undefined;
    setTimeout(() => playDialogues(items, summaryItems), 50);
  };

  const isPlaying = playingIdx !== null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-purple-700 text-lg">로딩 중...</div>
    </div>
  );

  if (!story) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-gray-600">아직 준비 중인 챕터예요.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-purple-700 underline">대시보드로 돌아가기</button>
      </div>
    </div>
  );

  const page = story.pages[currentPage];
  const isFirst = currentPage === 0;
  const isLast = currentPage === story.pages.length - 1;
  const items = buildItems(page);
  const sceneIsPlaying = isPlaying && items[playingIdx!]?.character === '나레이터' && playingIdx === 0;
  // summary 재생 중 여부
  const summaryIsPlaying = isPlaying && playingIdx === items.length;

  return (
    <div className="bg-purple-50 min-h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-purple-100 bg-white">
        <button onClick={() => { stopTts(); router.push(`/story/${subjectId}`); }} className="text-purple-500 hover:text-purple-700 transition">← 챕터 목록</button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{subjectNames[subjectId]}</span>
        <span className="text-gray-300">›</span>
        <span className="font-medium text-gray-700">{story.chapter_title}</span>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 상단 컨트롤 바 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="text-sm text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
            {currentPage + 1} / {story.pages.length} 페이지
          </span>

          <div className="flex items-center gap-2">
            {/* 속도 조절 */}
            <div className="flex items-center gap-1">
              {TTS_SPEEDS.map(s => (
                <button
                  key={s.value}
                  onClick={() => changeTtsRate(s.value)}
                  className={`text-xs px-2 py-1 rounded-md border transition ${
                    ttsRate === s.value
                      ? 'border-purple-500 bg-purple-100 text-purple-700 font-bold'
                      : 'border-gray-200 text-gray-400 hover:border-purple-300'
                  }`}
                >{s.label}</button>
              ))}
            </div>

            {/* 운전 모드 토글 */}
            <button
              onClick={toggleDrivingMode}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                drivingMode
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
              }`}
            >🚗 {drivingMode ? '운전모드 ON' : '운전모드'}</button>
          </div>

          {/* TTS 상태 뱃지 */}
          {isPlaying && (
            <span className="text-xs text-purple-500 bg-purple-100 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
              🔊 {ttsLoading
                ? '불러오는 중...'
                : summaryIsPlaying
                  ? '핵심 암기 포인트 읽는 중'
                  : `${items[playingIdx!]?.character || ''} 말하는 중`}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          {/* scene */}
          <p className={`text-sm italic mb-5 leading-relaxed border-l-4 pl-4 transition-all ${
            sceneIsPlaying
              ? 'text-purple-700 border-purple-500 bg-purple-50 rounded-r-lg py-2'
              : 'text-gray-700 border-purple-200'
          }`}>
            {page.scene}
          </p>

          {/* 대화 */}
          <div className="space-y-5">
            {page.dialogues.map((d, i) => {
              const isPark = d.character.includes('과장') || d.character.includes('박');
              const sceneOffset = (page.scene && page.scene.trim()) ? 1 : 0;
              const isActive = playingIdx === i + sceneOffset;
              return (
                <div
                  key={i}
                  className={`flex gap-3 transition-all duration-300 ${isPark ? '' : 'flex-row-reverse'}`}
                  style={{
                    opacity: isPlaying && !isActive ? 0.45 : 1,
                    transform: isActive ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all ${isActive ? 'bg-purple-200 ring-2 ring-purple-400' : 'bg-purple-100'}`}>
                    {isPark ? '👨‍💼' : '🧑'}
                  </div>
                  <div className={`max-w-xs flex flex-col ${isPark ? 'items-start' : 'items-end'}`}>
                    <span className="text-xs text-gray-500 mb-1">{d.character}</span>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
                      isPark
                        ? `bg-gray-100 text-gray-800 rounded-tl-sm ${isActive ? 'ring-2 ring-gray-400' : ''}`
                        : `bg-purple-700 text-white rounded-tr-sm ${isActive ? 'ring-2 ring-purple-300' : ''}`
                    }`}>
                      {d.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* summary_box */}
        {page.summary_box && (
          <div className={`rounded-2xl p-6 mb-4 transition-all ${
            summaryIsPlaying
              ? 'bg-purple-800 ring-2 ring-purple-400'
              : 'bg-purple-700'
          } text-white`}>
            <h3 className="font-bold mb-3 text-base flex items-center gap-2">
              📌 {page.summary_box.title}
              {summaryIsPlaying && <span className="text-xs font-normal bg-purple-500 px-2 py-0.5 rounded-full animate-pulse">🔊 읽는 중</span>}
            </h3>
            <ul className="space-y-2">
              {page.summary_box.items.map((item, i) => (
                <li key={i} className="text-sm leading-relaxed flex gap-2">
                  <span className="text-purple-300 flex-shrink-0 mt-0.5">•</span>
                  <span className="font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 운전 모드 안내 */}
        {drivingMode && (
          <div className="text-center text-xs text-purple-400 bg-purple-50 rounded-xl py-2 mb-4">
            🚗 운전모드: 핵심 암기 포인트까지 읽고 자동으로 다음 페이지로 이동해요
          </div>
        )}

        {/* 네비게이션 */}
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={() => { stopTts(); setCurrentPage(p => p - 1); }}
            disabled={isFirst}
            className="px-6 py-3 rounded-xl bg-white shadow-sm text-gray-600 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition"
          >← 이전</button>

          {/* 중앙 TTS 컨트롤 */}
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button
                onClick={stopTts}
                className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg bg-red-50"
              >⏹ 정지</button>
            ) : (
              <button
                onClick={handleReplay}
                className="text-xs text-purple-400 hover:text-purple-600 transition"
              >🔊 다시 읽기</button>
            )}
          </div>

          {isLast ? (
            <button
              onClick={() => { stopTts(); saveProgress(); router.push(`/story/${subjectId}`); }}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition"
            >완료 ✓</button>
          ) : (
            <button
              onClick={() => { stopTts(); setCurrentPage(p => p + 1); }}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition"
            >다음 →</button>
          )}
        </div>
      </main>
    </div>
  );
}
