'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  KIBCHUL_SUBJECTS,
  getSubjectById,
  getSessionsBySubject,
  KibchulQuestion,
  KibchulSession,
} from '@/lib/kibchul-data';

// ─────────────────────────────────────────
// localStorage 키 & 타입 정의
// ─────────────────────────────────────────
const LS_WRONG = 'kibchul_wrong';
const LS_STATS = 'kibchul_stats';

// ─── 이어하기 ───
function lsQuizKey(subjectId: number) { return `kibchul_quiz_${subjectId}`; }
function saveQuizProgress(subjectId: number, quiz: QuizState) {
  try { localStorage.setItem(lsQuizKey(subjectId), JSON.stringify(quiz)); } catch { /* ignore */ }
}
function loadQuizProgress(subjectId: number): QuizState | null {
  try { const d = localStorage.getItem(lsQuizKey(subjectId)); return d ? JSON.parse(d) : null; } catch { return null; }
}
function clearQuizProgress(subjectId: number) {
  localStorage.removeItem(lsQuizKey(subjectId));
}

interface WrongEntry {
  subjectId: number;
  sessionId: string;
  questionId: string;
  question: string;
  choices: string[];
  answer: number;
  selected: number;
  explanation: string;
  savedAt: string;
}

export interface StatEntry {
  subjectId: number;
  sessionId: string;
  correct: number;
  total: number;
  timestamp: string;
}

// ─── 오답 ───
function loadWrong(): WrongEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_WRONG) || '[]'); } catch { return []; }
}
function saveWrong(entries: WrongEntry[]) {
  localStorage.setItem(LS_WRONG, JSON.stringify(entries));
}
function addWrong(entry: WrongEntry) {
  const all = loadWrong();
  const filtered = all.filter(e => e.questionId !== entry.questionId);
  saveWrong([...filtered, entry]);
}
function removeWrong(questionId: string) {
  saveWrong(loadWrong().filter(e => e.questionId !== questionId));
}

// ─── 통계 ───
function loadStats(): StatEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_STATS) || '[]'); } catch { return []; }
}
function addStat(entry: StatEntry) {
  const all = loadStats();
  // 같은 subjectId+sessionId 최신 1개만 유지
  const filtered = all.filter(e => !(e.subjectId === entry.subjectId && e.sessionId === entry.sessionId));
  localStorage.setItem(LS_STATS, JSON.stringify([...filtered, entry]));
}
function getSessionStat(subjectId: number, sessionId: string): StatEntry | null {
  return loadStats().find(e => e.subjectId === subjectId && e.sessionId === sessionId) ?? null;
}

// ─── shuffle ───
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Screen = 'session_select' | 'quiz' | 'result';
type QuizMode = 'practice' | 'exam';

interface QuizState {
  questions: KibchulQuestion[];
  currentIdx: number;
  selected: (number | null)[];
  revealed: boolean[];
  mode: QuizMode;
  subjectId: number;
  sessionId: string;
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────
export default function KibchulPage() {
  const params = useParams();
  const router = useRouter();
  const subjectIdParam = Number(params.subjectId);

  const subject = getSubjectById(subjectIdParam);
  const sessions = getSessionsBySubject(subjectIdParam);

  const [screen, setScreen] = useState<Screen>('session_select');
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [savedProgress, setSavedProgress] = useState<QuizState | null>(null);

  useEffect(() => {
    setWrongCount(loadWrong().filter(e => e.subjectId === subjectIdParam).length);
    setSavedProgress(loadQuizProgress(subjectIdParam));
  }, [subjectIdParam]);

  const startQuiz = useCallback((session: KibchulSession, mode: QuizMode, shuffled: boolean) => {
    clearQuizProgress(subjectIdParam);
    setSavedProgress(null);
    let qs = [...session.questions];
    // 손상된 문항 제거: 빈 보기가 있거나 질문이 너무 짧은 경우
    qs = qs.filter(q =>
      q.question.trim().length > 5 &&
      q.choices.every(c => c.trim().length > 0)
    );
    if (shuffled) qs = shuffle(qs);
    setQuiz({
      questions: qs,
      currentIdx: 0,
      selected: Array(qs.length).fill(null),
      revealed: Array(qs.length).fill(false),
      mode,
      subjectId: subjectIdParam,
      sessionId: session.id,
    });
    setScreen('quiz');
  }, [subjectIdParam]);

  const startWrongOnly = useCallback((mode: QuizMode) => {
    clearQuizProgress(subjectIdParam);
    setSavedProgress(null);
    const wrongs = loadWrong().filter(e => e.subjectId === subjectIdParam);
    if (wrongs.length === 0) return;
    const qs: KibchulQuestion[] = wrongs.map(w => ({
      id: w.questionId,
      question: w.question,
      choices: w.choices as [string, string, string, string],
      answer: w.answer as 1 | 2 | 3 | 4,
      explanation: w.explanation,
    }));
    setQuiz({
      questions: shuffle(qs),
      currentIdx: 0,
      selected: Array(qs.length).fill(null),
      revealed: Array(qs.length).fill(false),
      mode,
      subjectId: subjectIdParam,
      sessionId: 'wrong_only',
    });
    setScreen('quiz');
  }, [subjectIdParam]);

  if (!subject) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>과목을 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm">
          홈으로
        </button>
      </div>
    );
  }

  if (screen === 'session_select') {
    return (
      <SessionSelectScreen
        subject={subject}
        sessions={sessions}
        wrongCount={wrongCount}
        onStart={startQuiz}
        onStartWrong={startWrongOnly}
        onBack={() => router.push('/dashboard')}
        allSubjects={KIBCHUL_SUBJECTS}
        currentSubjectId={subjectIdParam}
        onSubjectChange={(id) => router.push(`/kibchul/${id}`)}
        onGoStats={() => router.push('/kibchul/stats')}
        onGoExam={() => router.push('/kibchul/exam')}
        onGoWrong={() => router.push('/kibchul/wrong')}
        savedProgress={savedProgress}
        onResume={(p) => { setQuiz(p); setScreen('quiz'); }}
      />
    );
  }

  if (screen === 'quiz' && quiz) {
    return (
      <QuizScreen
        quiz={quiz}
        setQuiz={setQuiz}
        onFinish={() => {
          clearQuizProgress(subjectIdParam);
          setSavedProgress(null);
          setWrongCount(loadWrong().filter(e => e.subjectId === subjectIdParam).length);
          setScreen('result');
        }}
        onBack={() => {
          // wrong_only는 저장 안 함, 나머지는 현재 진행상태 저장
          if (quiz && quiz.sessionId !== 'wrong_only') {
            saveQuizProgress(subjectIdParam, quiz);
            setSavedProgress(quiz);
          }
          setScreen('session_select');
          setQuiz(null);
        }}
      />
    );
  }

  if (screen === 'result' && quiz) {
    const correct = quiz.selected.filter((s, i) => s === quiz.questions[i].answer).length;
    return (
      <ResultScreen
        quiz={quiz}
        correct={correct}
        onRetry={() => setScreen('quiz')}
        onBack={() => {
          clearQuizProgress(subjectIdParam);
          setSavedProgress(null);
          setScreen('session_select');
          setQuiz(null);
        }}
        subjectId={subjectIdParam}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────
// 세션 선택 화면
// ─────────────────────────────────────────
function SessionSelectScreen({
  subject, sessions, wrongCount, onStart, onStartWrong, onBack,
  allSubjects, currentSubjectId, onSubjectChange,
  onGoStats, onGoExam, onGoWrong,
  savedProgress, onResume,
}: {
  subject: ReturnType<typeof getSubjectById>;
  sessions: KibchulSession[];
  wrongCount: number;
  onStart: (s: KibchulSession, mode: QuizMode, shuffled: boolean) => void;
  onStartWrong: (mode: QuizMode) => void;
  onBack: () => void;
  allSubjects: typeof KIBCHUL_SUBJECTS;
  currentSubjectId: number;
  onSubjectChange: (id: number) => void;
  onGoStats: () => void;
  onGoExam: () => void;
  onGoWrong: () => void;
  savedProgress?: QuizState | null;
  onResume?: (p: QuizState) => void;
}) {
  return (
    <div className="min-h-full bg-orange-50">
      {/* 브레드크럼 + 유틸 버튼 */}
      <div className="px-4 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={onBack} className="text-orange-400 hover:text-orange-600 transition">← 대시보드</button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">📋 기출문제</span>
        <div className="ml-auto flex gap-2">
          <button onClick={onGoExam} className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200 transition">
            📝 전체 시험
          </button>
          <button onClick={onGoStats} className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition">
            📊 통계
          </button>
          <button onClick={onGoWrong} className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition">
            📒 오답노트
          </button>
        </div>
      </div>

      {/* 과목 탭 */}
      <div className="bg-white border-b border-orange-100 px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {allSubjects.map(s => (
            <button
              key={s.id}
              onClick={() => onSubjectChange(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                s.id === currentSubjectId
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
              }`}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 과목 헤더 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-3xl">
            {subject!.icon}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{subject!.name}</h1>
            <p className="text-sm text-gray-500">총 {sessions.reduce((s, ss) => s + ss.questions.filter(q => q.question.trim().length > 5 && q.choices.every(c => c.trim().length > 0)).length, 0)}문제 · {sessions.length}개 회차</p>
          </div>
        </div>

        {/* 이어하기 배너 */}
        {savedProgress && onResume && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-700 text-sm">⏸ 이어서 풀기</p>
              <p className="text-xs text-blue-500 mt-0.5">
                {sessions.find(s => s.id === savedProgress.sessionId)?.label ?? savedProgress.sessionId}
                {' '}· {savedProgress.currentIdx + 1}/{savedProgress.questions.length}번째 문제
                {' '}· {savedProgress.mode === 'practice' ? '연습' : '시험'} 모드
              </p>
            </div>
            <button
              onClick={() => onResume(savedProgress)}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              이어하기 →
            </button>
          </div>
        )}

        {/* 오답 복습 */}
        {wrongCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-red-700">📒 오답 복습</p>
                <p className="text-sm text-red-500">{wrongCount}문제 오답 저장됨</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onStartWrong('practice')} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition">
                  연습
                </button>
                <button onClick={() => onStartWrong('exam')} className="px-3 py-1.5 bg-gray-700 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition">
                  시험
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 회차별 목록 */}
        <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">회차별 문제</h2>
        <div className="flex flex-col gap-3">
          {sessions.filter(sess => sess.questions.filter(q => q.question.trim().length > 5 && q.choices.every(c => c.trim().length > 0)).length > 0).map(sess => {
            const stat = getSessionStat(currentSubjectId, sess.id);
            const pct = stat ? Math.round((stat.correct / stat.total) * 100) : null;
            return (
              <div key={sess.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{sess.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-gray-500">{sess.questions.filter(q => q.question.trim().length > 5 && q.choices.every(c => c.trim().length > 0)).length}문제</p>
                      {pct !== null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          pct >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          최근 {pct}점
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onStart(sess, 'practice', false)} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition">
                      연습
                    </button>
                    <button onClick={() => onStart(sess, 'practice', true)} className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-200 transition">
                      셔플
                    </button>
                    <button onClick={() => onStart(sess, 'exam', true)} className="px-3 py-1.5 bg-gray-700 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition">
                      시험
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">연습: 즉시 해설 · 시험: 마지막에 채점 · 오답은 자동 저장</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 퀴즈 화면
// ─────────────────────────────────────────
function QuizScreen({
  quiz, setQuiz, onFinish, onBack,
}: {
  quiz: QuizState;
  setQuiz: React.Dispatch<React.SetStateAction<QuizState | null>>;
  onFinish: () => void;
  onBack: () => void;
}) {
  const q = quiz.questions[quiz.currentIdx];
  const selected = quiz.selected[quiz.currentIdx];
  const revealed = quiz.revealed[quiz.currentIdx];
  const isPractice = quiz.mode === 'practice';

  const handleSelect = (idx: number) => {
    // 연습/시험 모두 언제든 재선택 허용
    const newSelected = [...quiz.selected];
    newSelected[quiz.currentIdx] = idx;

    const newRevealed = [...quiz.revealed];
    if (isPractice) {
      newRevealed[quiz.currentIdx] = true;
      // 재선택 시 오답 추적 갱신 (기존 제거 후 재평가)
      removeWrong(q.id);
      if (idx !== q.answer) {
        addWrong({
          subjectId: quiz.subjectId,
          sessionId: quiz.sessionId,
          questionId: q.id,
          question: q.question,
          choices: [...q.choices],
          answer: q.answer,
          selected: idx,
          explanation: q.explanation,
          savedAt: new Date().toISOString(),
        });
      }
    }

    setQuiz(prev => prev ? { ...prev, selected: newSelected, revealed: newRevealed } : null);
  };

  const goNext = () => {
    if (quiz.currentIdx < quiz.questions.length - 1) {
      setQuiz(prev => prev ? { ...prev, currentIdx: prev.currentIdx + 1 } : null);
    } else {
      if (!isPractice) {
        quiz.questions.forEach((question, i) => {
          const sel = quiz.selected[i];
          if (sel !== null && sel !== question.answer) {
            addWrong({
              subjectId: quiz.subjectId,
              sessionId: quiz.sessionId,
              questionId: question.id,
              question: question.question,
              choices: [...question.choices],
              answer: question.answer,
              selected: sel,
              explanation: question.explanation,
              savedAt: new Date().toISOString(),
            });
          } else if (sel === question.answer) {
            removeWrong(question.id);
          }
        });
      }
      onFinish();
    }
  };

  const goPrev = () => {
    if (quiz.currentIdx > 0) {
      setQuiz(prev => prev ? { ...prev, currentIdx: prev.currentIdx - 1 } : null);
    }
  };

  const progress = ((quiz.currentIdx + 1) / quiz.questions.length) * 100;
  const isLast = quiz.currentIdx === quiz.questions.length - 1;
  const canGoNext = selected !== null; // 선택만 하면 항상 다음 가능

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</button>
        <div className="flex-1">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-sm text-gray-500 font-medium shrink-0">{quiz.currentIdx + 1} / {quiz.questions.length}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPractice ? 'bg-orange-100 text-orange-700' : 'bg-gray-700 text-white'}`}>
          {isPractice ? '연습' : '시험'}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-xs text-orange-500 font-medium mb-2">Q{quiz.currentIdx + 1}</p>
          <p className="text-gray-800 text-base leading-relaxed font-medium">{q.question}</p>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {q.choices.map((choice, idx) => {
            const optNum = idx + 1;
            const isSelected = selected === optNum;
            const isCorrect = q.answer === optNum;

            let btnClass = 'border-gray-200 bg-white text-gray-700';
            if (isPractice && revealed) {
              if (isCorrect) btnClass = 'border-green-400 bg-green-50 text-green-800';
              else if (isSelected) btnClass = 'border-red-400 bg-red-50 text-red-700';
            } else if (!isPractice && isSelected) {
              btnClass = 'border-orange-400 bg-orange-50 text-orange-800';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(optNum)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm leading-snug ${btnClass}`}
              >
                <span className="font-bold mr-2 text-gray-400">{['①', '②', '③', '④'][idx]}</span>
                {choice}
                {isPractice && revealed && isCorrect && <span className="ml-2 text-green-600 font-bold">✓</span>}
                {isPractice && revealed && isSelected && !isCorrect && <span className="ml-2 text-red-500 font-bold">✗</span>}
              </button>
            );
          })}
        </div>

        {isPractice && revealed && q.explanation && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">💡 해설</p>
            <p className="text-sm text-amber-900 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={goPrev}
            disabled={quiz.currentIdx === 0}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition"
          >
            ← 이전
          </button>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-30 transition ${
              isLast ? 'bg-orange-700 hover:bg-orange-800' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {isLast ? '결과 보기 →' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 결과 화면
// ─────────────────────────────────────────
function ResultScreen({
  quiz, correct, onRetry, onBack, subjectId,
}: {
  quiz: QuizState;
  correct: number;
  onRetry: () => void;
  onBack: () => void;
  subjectId: number;
}) {
  const total = quiz.questions.length;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 60;

  const [showWrong, setShowWrong] = useState(false);
  const wrongItems = quiz.questions
    .map((q, i) => ({ q, selected: quiz.selected[i] }))
    .filter(({ q, selected }) => selected !== q.answer);

  // 통계 저장 (회차 전체 완료 시)
  useEffect(() => {
    if (quiz.sessionId !== 'wrong_only') {
      addStat({
        subjectId,
        sessionId: quiz.sessionId,
        correct,
        total,
        timestamp: new Date().toISOString(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-full bg-orange-50">
      <div className="px-4 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={onBack} className="text-orange-400 hover:text-orange-600">← 회차 선택</button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className={`rounded-2xl shadow-sm p-8 text-center mb-5 ${passed ? 'bg-green-50' : 'bg-white'}`}>
          <div className="text-5xl font-black mb-2 text-gray-800">{pct}점</div>
          <p className="text-gray-500 mb-4">{correct} / {total} 정답</p>
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${passed ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
            {passed ? '✓ 합격권' : '✗ 재도전 필요'}
          </div>
        </div>

        {wrongItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <button
              onClick={() => setShowWrong(!showWrong)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-semibold text-gray-800">
                📒 오답 {wrongItems.length}문제
                <span className="text-xs text-gray-400 ml-2">(자동 저장됨)</span>
              </span>
              <span className="text-gray-400 text-sm">{showWrong ? '▲' : '▼'}</span>
            </button>

            {showWrong && (
              <div className="mt-4 flex flex-col gap-4">
                {wrongItems.map(({ q, selected }, i) => (
                  <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      <span className="text-orange-500 font-bold mr-1">Q</span>{q.question}
                    </p>
                    {q.choices.map((ch, idx) => (
                      <div key={idx} className={`text-xs py-1 px-2 rounded mb-0.5 ${
                        idx + 1 === q.answer ? 'bg-green-100 text-green-800 font-medium' :
                        idx + 1 === selected ? 'bg-red-100 text-red-700' : 'text-gray-500'
                      }`}>
                        {['①', '②', '③', '④'][idx]} {ch}
                        {idx + 1 === q.answer && ' ✓'}
                        {idx + 1 === selected && idx + 1 !== q.answer && ' ✗'}
                      </div>
                    ))}
                    {q.explanation && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-2">💡 {q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button onClick={onBack} className="w-full py-3.5 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition">
            다른 회차 풀기
          </button>
        </div>
      </div>
    </div>
  );
}
