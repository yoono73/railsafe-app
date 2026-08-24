'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const subjectNames: Record<number, string> = {
  1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
  4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법',
};

interface Option { no?: number; text?: string; }
interface Question {
  id: number;
  subject_id: number;
  question_text: string;
  options: (string | Option)[];
  correct_option: number;
  explanation?: string;
}

function getOptionText(opt: string | Option): string {
  if (typeof opt === 'string') return opt;
  if (opt && typeof opt === 'object' && 'text' in opt) return opt.text || '';
  return String(opt);
}

export default function BookmarksPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: bData } = await supabase
        .from('question_bookmarks')
        .select('question_id')
        .eq('user_id', user.id);

      if (!bData || bData.length === 0) { setLoading(false); return; }

      const ids = bData.map((b: { question_id: number }) => b.question_id);
      setBookmarked(new Set(ids));

      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .in('id', ids)
        .order('subject_id')
        .order('id');

      setQuestions((qData || []) as Question[]);
      setLoading(false);
    }
    fetch();
  }, [router]);

  const removeBookmark = async (questionId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('question_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('question_id', questionId);
    setBookmarked(prev => { const s = new Set(prev); s.delete(questionId); return s; });
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const filtered = selectedSubject
    ? questions.filter(q => q.subject_id === selectedSubject)
    : questions;

  const subjectsInBookmarks = [...new Set(questions.map(q => q.subject_id))];

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-yellow-50">
        <p className="text-yellow-600 animate-pulse">북마크 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-yellow-50">
      {/* 브레드크럼 */}
      <div className="px-6 py-3 flex items-center gap-2 text-sm border-b border-yellow-100 bg-white">
        <button onClick={() => router.push('/dashboard')} className="text-yellow-600 hover:text-yellow-800 transition">
          ← 대시보드
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">★ 북마크 문제</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800">★ 북마크 문제</h1>
            <p className="text-xs text-gray-500 mt-0.5">총 {questions.length}개 문제</p>
          </div>
        </div>

        {/* 과목 필터 */}
        {subjectsInBookmarks.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${!selectedSubject ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}
            >전체</button>
            {subjectsInBookmarks.map(id => (
              <button
                key={id}
                onClick={() => setSelectedSubject(id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedSubject === id ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}
              >{subjectNames[id]}</button>
            ))}
          </div>
        )}

        {/* 문제 없음 */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">☆</p>
            <p className="text-gray-500 font-semibold">북마크한 문제가 없어요</p>
            <p className="text-sm text-gray-400 mt-1">CBT 문제 풀 때 ☆ 버튼을 눌러 저장하세요</p>
            <button
              onClick={() => router.push('/cbt/1')}
              className="mt-5 px-6 py-2.5 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition"
            >CBT 풀러 가기</button>
          </div>
        )}

        {/* 문제 목록 */}
        <div className="flex flex-col gap-3">
          {filtered.map((q) => {
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* 문제 헤더 */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full mr-2">
                        {subjectNames[q.subject_id]}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 mt-2 leading-relaxed">
                        {q.question_text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeBookmark(q.id); }}
                        className="text-yellow-400 hover:text-gray-400 transition text-lg"
                        title="북마크 해제"
                      >★</button>
                      <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {/* 펼쳐진 상세 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4">
                    <div className="flex flex-col gap-2 mt-3 mb-3">
                      {q.options.map((opt, idx) => {
                        const optNum = idx + 1;
                        const isCorrect = q.correct_option === optNum;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              {optNum}
                            </span>
                            <span className={isCorrect ? 'text-green-700 font-semibold' : 'text-gray-600'}>
                              {getOptionText(opt)}
                            </span>
                            {isCorrect && <span className="ml-auto text-green-500 font-bold">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 rounded-xl p-3">
                        <p className="text-xs font-semibold text-orange-600 mb-1">해설</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
