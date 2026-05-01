'use client';
import { useEffect, useState, useRef } from 'react';
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

export default function StoryPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = Number(params.subjectId);
  const chapterId = Number(params.chapterId);
  const supabase = createClient();

  const [story, setStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // TTS: 페이지 변경 시 대화문 자동 읽기
  useEffect(() => {
    if (typeof window === 'undefined' || loading || !story) return;
    const page = story.pages[currentPage];
    if (!page) return;
    window.speechSynthesis.cancel();
    const text = page.dialogues.map((d) => `${d.character}. ${d.text}`).join(' ');
    const utt = new window.SpeechSynthesisUtterance(text);
    utt.lang = 'ko-KR';
    utt.rate = 0.9;
    ttsRef.current = utt;
    window.speechSynthesis.speak(utt);
    return () => { window.speechSynthesis.cancel(); };
  }, [currentPage, story, loading]);

  const ttsReplay = () => {
    if (!story) return;
    const page = story.pages[currentPage];
    if (!page) return;
    window.speechSynthesis.cancel();
    const text = page.dialogues.map((d) => `${d.character}. ${d.text}`).join(' ');
    const utt = new window.SpeechSynthesisUtterance(text);
    utt.lang = 'ko-KR';
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  };

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
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-sm text-gray-700 italic mb-5 leading-relaxed border-l-4 border-purple-200 pl-4">{page.scene}</p>
          <div className="space-y-5">
            {page.dialogues.map((d, i) => {
              const isPark = d.character.includes('과장');
              return (
                <div key={i} className={`flex gap-3 ${isPark ? '' : 'flex-row-reverse'}`}>
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                    {isPark ? '👨‍💼' : '🧑'}
                  </div>
                  <div className={`max-w-xs flex flex-col ${isPark ? 'items-start' : 'items-end'}`}>
                    <span className="text-xs text-gray-500 mb-1">{d.character}</span>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isPark ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-purple-700 text-white rounded-tr-sm'}`}>
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
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={isFirst}
            className="px-6 py-3 rounded-xl bg-white shadow-sm text-gray-600 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition"
          >← 이전</button>
          <button
            onClick={ttsReplay}
            className="text-xs text-purple-400 hover:text-purple-600 transition"
            title="다시 읽기"
          >🔊 다시 읽기</button>
          {isLast ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition"
            >완료 ✓</button>
          ) : (
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition"
            >다음 →</button>
          )}
        </div>
      </main>
    </div>
  );
}
