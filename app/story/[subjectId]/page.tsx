'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법',
};
const subjectColors: Record<number, string> = {
  1: '#7c3aed', 2: '#6d28d9', 3: '#5b21b6',
  4: '#4c1d95', 5: '#6d28d9', 6: '#7c3aed', 7: '#5b21b6',
};
const subjectIcons: Record<number, string> = {
  1: '📊', 2: '⚖️', 3: '🚇', 4: '🔧', 5: '📋', 6: '🚦', 7: '🛡️',
};

interface Chapter {
  chapter_number: number;
  chapter_title: string;
}

export default function StorySubjectPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = Number(params.subjectId);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // 챕터 목록
      const { data: chapterData } = await supabase
        .from('subject_stories')
        .select('chapter_number, chapter_title')
        .eq('subject_id', subjectId)
        .order('chapter_number');

      if (chapterData) setChapters(chapterData as Chapter[]);

      // 완료한 챕터
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progressData } = await supabase
          .from('story_progress')
          .select('chapter_number')
          .eq('user_id', user.id)
          .eq('subject_id', subjectId);

        if (progressData) {
          setCompletedChapters(new Set(progressData.map((p: { chapter_number: number }) => p.chapter_number)));
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [subjectId]);

  const color = subjectColors[subjectId] ?? '#7c3aed';
  const completedCount = completedChapters.size;
  const totalCount = chapters.length;

  return (
    <div className="bg-purple-50 min-h-full">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-purple-100 bg-white">
        <button onClick={() => router.push('/story')} className="text-purple-500 hover:text-purple-700 transition">
          ← 스토리
        </button>
        <span className="text-gray-300">›</span>
        <span className="font-medium text-gray-700">{subjectNames[subjectId]}</span>
      </div>

      {/* 과목 헤더 */}
      <div className="px-6 py-5 bg-white border-b border-purple-100">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: color + '18' }}
          >
            {subjectIcons[subjectId]}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{subjectNames[subjectId]}</h1>
            <p className="text-sm text-gray-500 mt-0.5">총 {totalCount}챕터</p>
            {!loading && totalCount > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-purple-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(completedCount / totalCount) * 100}%`, background: color }}
                    />
                  </div>
                  <span className="text-xs font-semibold" style={{ color }}>
                    {completedCount}/{totalCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 챕터 목록 */}
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-2">
        {loading ? (
          <div className="text-center py-12 text-purple-400">불러오는 중...</div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🚧</p>
            <p className="text-gray-500">아직 준비 중인 챕터예요.</p>
          </div>
        ) : (
          chapters.map((ch) => {
            const isDone = completedChapters.has(ch.chapter_number);
            return (
              <button
                key={ch.chapter_number}
                onClick={() => router.push(`/story/${subjectId}/${ch.chapter_number}`)}
                className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition text-left w-full"
              >
                {/* 챕터 번호 */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: isDone ? color : color + '18',
                    color: isDone ? 'white' : color,
                  }}
                >
                  {isDone ? '✓' : `Ch.${ch.chapter_number}`}
                </div>

                {/* 제목 */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Chapter {ch.chapter_number}</p>
                  <p className={`font-semibold truncate ${isDone ? 'text-gray-400' : 'text-gray-800'}`}>
                    {ch.chapter_title}
                  </p>
                </div>

                {/* 상태 */}
                <div className="flex-shrink-0">
                  {isDone ? (
                    <span className="text-xs text-green-500 font-semibold bg-green-50 px-2 py-1 rounded-full">완료</span>
                  ) : (
                    <span className="text-gray-300 text-xl">›</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
