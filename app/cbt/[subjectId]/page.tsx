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
    1: 'êµíµìì ê´ë¦¬ë¡ ', 2: 'êµíµìì ë²', 3: 'ì´ì°¨ì´ì ',
    4: 'ì² ëê³µí', 5: 'ì² ëì°ìê¸°ë³¸ë²', 6: 'ì² ëì í¸', 7: 'ì² ëìì ë²'
  };

  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_option, explanation, source_year')
        .eq('subject_id', subjectId)
        .limit(100);
      if (!error && data) {
        const filtered = (data as Question[]).filter(q =>
          Array.isArray(q.options) && q.options.length >= 4 && q.correct_option <= q.options.length
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
      <div className="text-purple-700 text-lg">ë¬¸ì  ë¶ë¬ì¤ë ì¤...</div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-center">
        <div className="text-4xl mb-4">ð§</div>
        <p className="text-gray-600 mb-4">ìì§ ì¤ë¹ ì¤ì¸ ê³¼ëª©ì´ìì.</p>
        <button onClick={() => router.push('/dashboard')} className="text-purple-700 underline">ëìë³´ëë¡ ëìê°ê¸°</button>
      </div>
    </div>
  );

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center mx-4">
          <div className="text-5xl mb-4">{percent >= 70 ? 'ð' : 'ðª'}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ê²°ê³¼</h2>
          <p className="text-4xl font-bold text-purple-700 mb-1">{score} / {questions.length}</p>
          <p className="text-gray-500 text-sm mb-6">ì ëµë¥  {percent}%</p>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
            <div className="bg-purple-700 h-3 rounded-full transition-all" style={{width: `${percent}%`}}></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">ëìë³´ë</button>
            <button onClick={() => { setCurrent(0); setSelected(null); setConfirmed(false); setScore(0); setFinished(false); }} className="flex-1 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition">ë¤ìíê¸°</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const optionLabels = ['â ', 'â¡', 'â¢', 'â£'];

  return (
    <div className="min-h-screen bg-purple-50">
      <header className="bg-purple-800 text-white px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-purple-300 hover:text-white transition text-sm">â ëìë³´ë</button>
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
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          {q.source_year && <span className="text-xs text-purple-500 font-medium bg-purple-50 px-2 py-0.5 rounded mb-3 inline-block">{q.source_year}ë ê¸°ì¶</span>}
          <p className="text-base font-semibold text-gray-800 leading-relaxed">{q.question_text}</p>
        </div>

        <div className="space-y-3 mb-4">
          {q.options.map((opt, i) => {
            let style = 'bg-white border-gray-200 text-gray-700';
            if (confirmed) {
              if (i + 1 === q.correct_option) style = 'bg-green-50 border-green-400 text-green-800';
              else if (i === selected) style = 'bg-red-50 border-red-400 text-red-800';
            } else if (i === selected) {
              style = 'bg-purple-50 border-purple-400 text-purple-800';
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left border-2 rounded-xl px-4 py-3 text-sm leading-relaxed transition ${style} ${confirmed ? 'cursor-default' : 'hover:border-purple-300'}`}
              >
                <span className="font-bold mr-2">{optionLabels[i]}</span>{getOptionText(opt)}
              </button>
            );
          })}
        </div>

        {confirmed && q.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-blue-700 mb-1">ð¡ í´ì¤</p>
            <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        <div className="flex justify-end">
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={selected === null}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium disabled:opacity-30 hover:bg-purple-800 transition"
            >íì¸</button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition"
            >{current + 1 >= questions.length ? 'ê²°ê³¼ ë³´ê¸°' : 'ë¤ì ë¬¸ì  â'}</button>
          )}
        </div>
      </main>
    </div>
  );
}