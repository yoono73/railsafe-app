'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const APP_VERSION = 'v0.3';

interface Option {
  no?: number;
  text?: string;
}

interface Question {
  id: number;
  subject_id: number;
  question_text: string;
  options: (string | Option)[];
  correct_option: number;
  explanation?: string;
}

interface WrongAnswer {
  question: Question;
  selectedOption: number;
}

function getOptionText(opt: string | Option): string {
  if (typeof opt === 'string') return opt;
  if (opt && typeof opt === 'object' && 'text' in opt) return opt.text || '';
  return String(opt);
}

export default function CbtPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const questionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    const fetchAll = async () => {
      const supabase = createClient();

      // 유저 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .order('id');

      if (error) {
        console.error('Error fetching questions:', error);
        setLoading(false);
        return;
      }

      const filtered = (data || []).filter((q: Question) => {
        if (!Array.isArray(q.options)) return false;
        if (q.options.length !== 4) return false;
        if (q.correct_option < 1 || q.correct_option > 4) return false;
        return q.options.every((o) => getOptionText(o).trim().length > 0);
      });

      setQuestions(filtered);
      setLoading(false);
      questionStartTime.current = Date.now();
    };

    fetchAll();
  }, [subjectId]);

  const handleSelect = (idx: number) => {
    if (confirmed) return;
    setSelected(idx + 1);
  };

  const handleConfirm = async () => {
    if (selected === null) return;
    setConfirmed(true);
    const isCorrect = selected === questions[current].correct_option;
    const timeSpent = Date.now() - questionStartTime.current;

    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setWrongAnswers((prev) => [...prev, { question: questions[current], selectedOption: selected }]);
    }

    // DB 저장
    if (userId) {
      const supabase = createClient();
      await supabase.from('attempts').insert({
        user_id: userId,
        question_id: questions[current].id,
        selected_option: selected,
        is_correct: isCorrect,
        time_spent_ms: timeSpent,
        session_mode: 'cbt',
        session_id: sessionId.current,
      });
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setConfirmed(false);
      questionStartTime.current = Date.now();
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setScore(0);
    setFinished(false);
    setWrongAnswers([]);
    setReviewing(false);
  };

  // 진도 저장 (localStorage)
  useEffect(() => {
    if (finished && questions.length > 0) {
      const pct = Math.round((score / questions.length) * 100);
      const key = 'cbt_progress_' + subjectId;
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({
        lastScore: score,
        lastTotal: questions.length,
        lastPct: pct,
        bestPct: Math.max(pct, prev.bestPct || 0),
        lastDate: new Date().toLocaleDateString('ko-KR'),
      }));
    }
  }, [finished, score, questions.length, subjectId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f3ff' }}>
        <p style={{ color: '#7c3aed', fontSize: '1.1rem' }}>문제를 불러오는 중...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f3ff', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>📭</div>
        <p style={{ color: '#7c3aed', fontSize: '1.1rem', fontWeight: '600' }}>아직 CBT 문제가 없습니다</p>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center' }}>이 과목의 문제가 준비 중입니다.<br/>다른 과목을 먼저 풀어보세요!</p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ marginTop: '0.5rem', padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // 오답 복습 화면
  if (reviewing) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '1.5rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setReviewing(false)}
              style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              &larr; 결과로
            </button>
            <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.95rem' }}>
              오답 {wrongAnswers.length}개
            </span>
          </div>

          {wrongAnswers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
              <p style={{ color: '#16a34a', fontWeight: '700', fontSize: '1.1rem' }}>오답이 없어요! 완벽해요!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {wrongAnswers.map((wa, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 12px rgba(124,58,237,0.08)' }}>
                  <div style={{ display: 'inline-block', background: '#fee2e2', color: '#dc2626', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.6rem' }}>
                    오답 {i + 1}
                  </div>
                  <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.6', marginBottom: '0.75rem' }}>
                    {wa.question.question_text}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {wa.question.options.map((opt, idx) => {
                      const optNum = idx + 1;
                      const isCorrect = wa.question.correct_option === optNum;
                      const isWrong = wa.selectedOption === optNum;
                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                          background: isCorrect ? '#f0fdf4' : isWrong ? '#fff1f2' : '#f9fafb',
                          border: '1.5px solid ' + (isCorrect ? '#16a34a' : isWrong ? '#dc2626' : '#e5e7eb'),
                        }}>
                          <span style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '50%', flexShrink: 0,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: isCorrect ? '#16a34a' : isWrong ? '#dc2626' : '#e5e7eb',
                            color: (isCorrect || isWrong) ? 'white' : '#6b7280',
                            fontSize: '0.75rem', fontWeight: 'bold',
                          }}>{optNum}</span>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937', flex: 1 }}>{getOptionText(opt)}</span>
                          {isCorrect && <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1rem' }}>O</span>}
                          {isWrong && <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1rem' }}>X</span>}
                        </div>
                      );
                    })}
                  </div>
                  {wa.question.explanation && (
                    <div style={{ background: '#ede9fe', borderRadius: '0.5rem', padding: '0.75rem', borderLeft: '4px solid #7c3aed' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#7c3aed', marginBottom: '0.2rem' }}>해설</p>
                      <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.6' }}>{wa.question.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}
            >
              대시보드
            </button>
            <button
              onClick={handleRestart}
              style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}
            >
              다시 풀기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 결과 화면
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.15)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {pct >= 60 ? '🎉' : '📝'}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed', marginBottom: '0.5rem' }}>
            결과
          </h2>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            {score} / {questions.length}
          </p>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>정답률 {pct}%</p>
          <div style={{ background: '#f3f4f6', borderRadius: '9999px', height: '12px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ background: pct >= 60 ? '#16a34a' : '#dc2626', height: '100%', width: pct + '%', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
          </div>

          {wrongAnswers.length > 0 && (
            <button
              onClick={() => setReviewing(true)}
              style={{ width: '100%', padding: '0.75rem', background: '#fff1f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '0.5rem', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600', marginBottom: '0.75rem' }}
            >
              오답 복습 ({wrongAnswers.length}개)
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}
            >
              대시보드
            </button>
            <button
              onClick={handleRestart}
              style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}
            >
              다시 풀기
            </button>
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.7rem', color: '#d1d5db' }}>{APP_VERSION}</p>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '1.5rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.9rem', cursor: 'pointer', padding: '0.25rem 0' }}
          >
            &larr; 나가기
          </button>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            {current + 1} / {questions.length}
          </span>
        </div>

        {/* 진행바 */}
        <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ background: '#7c3aed', height: '100%', width: ((current + 1) / questions.length * 100) + '%', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
        </div>

        {/* 문제 카드 */}
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 2px 12px rgba(124,58,237,0.08)' }}>
          <div style={{ display: 'inline-block', background: '#ede9fe', color: '#7c3aed', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            문제 {current + 1}
          </div>
          <p style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.6' }}>
            {q.question_text}
          </p>
        </div>

        {/* 보기 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {q.options.map((opt, idx) => {
            const optNum = idx + 1;
            const isSelected = selected === optNum;
            const isCorrect = q.correct_option === optNum;

            let borderColor = '#e5e7eb';
            let bgColor = 'white';
            let circleColor = '#6b7280';
            let circleBg = '#f3f4f6';

            if (confirmed) {
              if (isCorrect) {
                borderColor = '#16a34a';
                bgColor = '#f0fdf4';
                circleColor = 'white';
                circleBg = '#16a34a';
              } else if (isSelected && !isCorrect) {
                borderColor = '#dc2626';
                bgColor = '#fff1f2';
                circleColor = 'white';
                circleBg = '#dc2626';
              }
            } else if (isSelected) {
              borderColor = '#7c3aed';
              bgColor = '#faf5ff';
              circleColor = 'white';
              circleBg = '#7c3aed';
            }

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleSelect(idx)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    background: bgColor,
                    border: '2px solid ' + borderColor,
                    borderRadius: '0.75rem',
                    cursor: confirmed ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    background: circleBg,
                    color: circleColor,
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    marginRight: '0.75rem',
                  }}>
                    {optNum}
                  </span>
                  <span style={{ color: '#1f2937', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    {getOptionText(opt)}
                  </span>
                </button>

                {/* O/X 표시 */}
                <div style={{ width: '2rem', textAlign: 'center', flexShrink: 0 }}>
                  {confirmed && isCorrect && (
                    <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.5rem' }}>O</span>
                  )}
                  {confirmed && isSelected && !isCorrect && (
                    <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.5rem' }}>X</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={selected === null}
              style={{
                padding: '0.75rem 2rem',
                background: selected === null ? '#e5e7eb' : '#7c3aed',
                color: selected === null ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: selected === null ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              확인
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{
                padding: '0.75rem 2rem',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {current + 1 >= questions.length ? '결과 보기' : '다음 문제'}
            </button>
          )}
        </div>

        {/* 해설 */}
        {confirmed && q.explanation && (
          <div style={{ marginTop: '1rem', background: '#ede9fe', borderRadius: '0.75rem', padding: '1rem', borderLeft: '4px solid #7c3aed' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#7c3aed', marginBottom: '0.25rem' }}>해설</p>
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>{q.explanation}</p>
          </div>
        )}

      </div>
    </div>
  );
}
