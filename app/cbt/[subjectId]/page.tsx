'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type OptionItem = string | { no: number; text: string };

interface Question {
  id: number;
  question_text: string;
  options: OptionItem[];
  correct_option: number;
  explanation: string;
  source_year: number | null;
}

function getOptionText(opt: OptionItem): string {
  if (typeof opt === 'string') return opt;
  return opt.text;
}

export default function CBTPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = Number(params.subjectId);
  const supabase = createClient();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const subjectNames: Record<number, string> = {
    1: '교통안전관리론', 2: '교통안전법', 3: '열차운전',
    4: '철도공학', 5: '철도산업기본법', 6: '철도신호', 7: '철도안전법'
  };

  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_option, explanation, source_year')
        .eq('subject_id', subjectId)
        .limit(200);
      if (!error && data) {
        const filtered = (data as Question[]).filter(q =>
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.correct_option >= 1 &&
          q.correct_option <= 4 &&
          q.options.every(o => getOptionText(o).trim().length > 0)
        );
        setQuestions(filtered.slice(0, 20));
      }
      setLoading(false);
    }
    fetchQuestions();
  }, [subjectId]);

  const handleSelect = (idx: number) => {
    if (confirmed) return;
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setConfirmed(true);
    if (selected + 1 === questions[current].correct_option) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-purple-700 text-lg">문제 불러오는 중...</div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-gray-600 mb-4">아직 준비 중인 과목이에요.</p>
        <button onClick={() => router.push('/dashboard')} className="text-purple-700 underline">대시보드로 돌아가기</button>
      </div>
    </div>
  );

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center mx-4">
          <div className="text-5xl mb-4">{percent >= 70 ? '🎉' : '💪'}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">결과</h2>
          <p className="text-4xl font-bold text-purple-700 mb-1">{score} / {questions.length}</p>
          <p className="text-gray-500 text-sm mb-6">정답률 {percent}%</p>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
            <div className="bg-purple-700 h-3 rounded-full transition-all" style={{width: `${percent}%`}}></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">대시보드</button>
            <button onClick={() => { setCurrent(0); setSelected(null); setConfirmed(false); setScore(0); setFinished(false); }} className="flex-1 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition">다시풀기</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="min-h-screen bg-purple-50">
      <header className="bg-purple-800 text-white px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-purple-300 hover:text-white transition text-sm">← 대시보드</button>
        <span className="text-purple-400">|</span>
        <span className="text-sm font-medium">{subjectNames[subjectId]} CBT</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
            {current + 1} / {questions.length}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="bg-purple-700 h-2 rounded-full transition-all" style={{width: `${((current + 1) / questions.length) * 100}%`}}></div>
          </div>
          <span className="text-sm text-green-600 font-medium">{score}점</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          {q.source_year && (
            <span className="text-xs text-purple-500 font-medium bg-purple-50 px-2 py-0.5 rounded mb-3 inline-block">
              {q.source_year}년 기출
            </span>
          )}
          <p className="text-base font-semibold text-gray-800 leading-relaxed">{q.question_text}</p>
        </div>

        <div className="space-y-3 mb-4">
          {q.options.map((opt, i) => {
            const isCorrect = i + 1 === q.correct_option;
            const isSelected = i === selected;
            const num = i + 1;

            let borderColor = '#e5e7eb';
            let bgColor = '#ffffff';
            let textColor = '#374151';
            let numBg = '#f3f4f6';
            let numColor = '#6b7280';

            if (confirmed) {
              if (isCorrect) {
                borderColor = '#16a34a';
                bgColor = '#f0fdf4';
                numBg = '#16a34a';
                numColor = '#ffffff';
              } else if (isSelected) {
                borderColor = '#dc2626';
                bgColor = '#fef2f2';
                numBg = '#dc2626';
                numColor = '#ffffff';
              } else {
                textColor = '#9ca3af';
              }
            } else if (isSelected) {
              borderColor = '#7c3aed';
              bgColor = '#faf5ff';
              numBg = '#7c3aed';
              numColor = '#ffffff';
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: 12,
                  border: `2px solid ${borderColor}`,
                  background: bgColor,
                  color: textColor,
                  padding: '12px 16px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: confirmed ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: numBg,
                  color: numColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>{num}</span>
                {getOptionText(opt)}
              </button>
            );
          })}
        </div>

        {confirmed && q.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-blue-700 mb-1">해설</p>
            <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        <div className="flex justify-end">
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={selected === null}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium disabled:opacity-30 hover:bg-purple-800 transition"
            >확인</button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition"
            >{current + 1 >= questions.length ? '결과 보기' : '다음 문제'}</button>
          )}
        </div>
      </main>
    </div>
  );
}