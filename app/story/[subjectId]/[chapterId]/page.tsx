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

// ── ElevenLabs 3-voice IDs ──
const VOICE_NARRATOR = 'sQ3a15DhENXU8pKTHlcc'; // 여자 나레이터
const VOICE_PARK     = 'Ir7oQcBXWiq4oFGROCfj';  // 박과장
const VOICE_YUNHO    = 'NpneagLVR101ytYGxUPX';  // 윤호

function getVoiceId(character: string): string {
  if (character.includes('과장') || character.includes('박')) return VOICE_PARK;
  if (character.includes('윤호')) return VOICE_YUNHO;
  return VOICE_NARRATOR;
}

export default function StoryPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = Number(params.subjectId);
  const chapterId = Number(params.chapterId);
  const supabase = createClient();

  const [story, setStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── TTS 상태 ──
  const [playingIdx, setPlayingIdx] = useState<number | null>(null); // 현재 재생 중인 dialogue 인덱스
  const [ttsLoading, setTtsLoading] = useState(false); // 불러오는 중
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false); // 중단 요청 플래그

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

  // 대화 순차 재생 (ElevenLabs 3-voice)
  const playDialogues = useCallback(async (dialogues: Dialogue[]) => {
    cancelRef.current = false;
    for (let i = 0; i < dialogues.length; i++) {
      if (cancelRef.current) break;
      const d = dialogues[i];
      setPlayingIdx(i);
      setTtsLoading(true);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: d.text, voiceId: getVoiceId(d.character) }),
        });
        if (!res.ok) throw new Error('TTS fetch failed');
        const blob = await res.blob();
        if (cancelRef.current) break;
        setTtsLoading(false);
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        });
      } catch {
        setTtsLoading(false);
        if (cancelRef.current) break;
        // 에러 발생 시 해당 대화 건너뛰고 다음으로
      }
    }
    if (!cancelRef.current) {
      setPlayingIdx(null);
    }
  }, []);

  // 페이지 변경 시 자동 재생
  useEffect(() => {
    if (loading || !story) return;
    const page = story.pages[currentPage];
    if (!page || page.dialogues.length === 0) return;
    stopTts();
    const timer = setTimeout(() => {
      playDialogues(page.dialogues);
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
    setTimeout(() => playDialogues(page.dialogues), 50);
  };

  const handleStopPlay = () => {
    stopTts();
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

  return (
    <div className="bg-purple-50 min-h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-purple-100 bg-white">
        <button onClick={() => router.push('/dashboard')} className="text-purple-500 hover:text-purple-700 transition">← 대시보드</button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{subjectNames[subjectId]}</span>
        <span className="text-gray-300">›</span>
        <span className="font-medium text-gray-700">{story.chapter_title}</span>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
            {currentPage + 1} / {story.pages.length} 페이지
          </span>
          {/* TTS 상태 뱃지 */}
          {isPlaying && (
            <span className="text-xs text-purple-500 bg-purple-100 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
              🔊 {ttsLoading ? '불러오는 중...' : `${page.dialogues[playingIdx!]?.character || ''} 말하는 중`}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-sm text-gray-700 italic mb-5 leading-relaxed border-l-4 border-purple-200 pl-4">{page.scene}</p>
          <div className="space-y-5">
            {page.dialogues.map((d, i) => {
              const isPark = d.character.includes('과장') || d.character.includes('박');
              const isActive = playingIdx === i;
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

        {page.summary_box && (
          <div className="bg-purple-700 text-white rounded-2xl p-6 mb-4">
            <h3 className="font-bold mb-3 text-base">📌 {page.summary_box.title}</h3>
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
                onClick={handleStopPlay}
                className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg bg-red-50"
                title="정지"
              >⏹ 정지</button>
            ) : (
              <button
                onClick={handleReplay}
                className="text-xs text-purple-400 hover:text-purple-600 transition"
                title="다시 읽기"
              >🔊 다시 읽기</button>
            )}
          </div>

          {isLast ? (
            <button
              onClick={() => { stopTts(); router.push('/dashboard'); }}
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
