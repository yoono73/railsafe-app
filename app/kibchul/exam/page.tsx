'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { KIBCHUL_SUBJECTS, KibchulQuestion } from '@/lib/kibchul-data';

const LS_WRONG = 'kibchul_wrong';
const LS_STATS = 'kibchul_stats';

// ─────────────────────────────────────────
// 타입 & 유틸
// ─────────────────────────────────────────
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

interface StatEntry {
  subjectId: number;
  sessionId: string;
  correct: number;
  total: number;
  timestamp: string;
}

interface FlatQuestion {
  subjectId: number;
  subjectName: string;
  subjectIcon: string;
  q: KibchulQuestion;
}

function loadWrong(): WrongEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_WRONG) || '[]'); } catch { return []; }
}
function addWrong(entry: WrongEntry) {
  const all = loadWrong();
  const filtered = all.filter(e => e.questionId !== entry.questionId);
  localStorage.setItem(LS_WRONG, JSON.stringify([...filtered, entry]));
}
function removeWrong(questionId: string) {
  localStorage.setItem(LS_WRONG, JSON.stringify(loadWrong().filter(e => e.questionId !== questionId)));
}
function addStat(entry: StatEntry) {
  try {
    const all: StatEntry[] = JSON.parse(localStorage.getItem(LS_STATS) || '[]');
    const filtered = all.filter(e => !(e.subjectId === entry.subjectId && e.sessionId === entry.sessionId));
    localStorage.setItem(LS_STATS, JSON.stringify([...filtered, entry]));
  } catch { /* ignore */ }
}

// 전체 유니크 세션 목록 (복수 과목에 있는 것 우선)
function getAvailableSessions(): { id: string; label: string; subjectCount: number }[] {
  const sessionMap = new Map<string, { label: string; count: number }>();
  KIBCHUL_SUBJECTS.forEach(s => {
    s.sessions.forEach(sess => {
      const existing = sessionMap.get(sess.id);
      if (existing) {
        sessionMap.set(sess.id, { label: sess.label, count: existing.count + 1 });
      } else {
        sessionMap.set(sess.id, { label: sess.label, count: 1 });
      }
    });
  });
  return Array.from(sessionMap.entries())
    .map(([id, { label, count }]) => ({ id, label, subjectCount: count }))
    .sort((a, b) => {
      // 연도 내림차순 정렬
      const aYear = parseInt(a.id.split('.')[0]) || 0;
      const bYear = parseInt(b.id.split('.')[0]) || 0;
      if (bYear !== aYear) return bYear - aYear;
      const aMon = parseInt(a.id.split('.')[1] || '0');
      const bMon = parseInt(b.id.split('.')[1] || '0');
      return bMon - aMon;
    });
}

// 특정 세션의 전 과목 문제 수집 (손상 문항 필터 포함)
function buildExamQuestions(sessionId: string): FlatQuestion[] {
  const result: FlatQuestion[] = [];
  KIBCHUL_SUBJECTS.forEach(s => {
    const sess = s.sessions.find(ss => ss.id === sessionId);
    if (sess) {
      sess.questions
        .filter(q => q.question.trim().length > 5 && q.choices.every(c => c.trim().length > 0))
        .forEach(q => {
          result.push({ subjectId: s.id, subjectName: s.name, subjectIcon: s.icon, q });
        });
    }
  });
  return result;
}

type Screen = 'select' | 'quiz' | 'result';

interface ExamState {
  sessionId: string;
  sessionLabel: string;
  questions: FlatQuestion[];
  selected: (number | null)[];
  currentIdx: number;
}

// ─────────────────────────────────────────
// 메인
// ─────────────────────────────────────────
export default function ExamPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('select');
  const [exam, setExam] = useState<ExamState | null>(null);

  const startExam = useCallback((sessionId: string, sessionLabel: string) => {
    const questions = buildExamQuestions(sessionId);
    if (questions.length === 0) return;
    setExam({
      sessionId,
      sessionLabel,
      questions,
      selected: Array(questions.length).fill(null),
      currentIdx: 0,
    });
    setScreen('quiz');
  }, []);

  if (screen === 'select') {
    return <SelectScreen onStart={startExam} onBack={() => router.back()} />;
  }

  if (screen === 'quiz' && exam) {
    return (
      <QuizScreen
        exam={exam}
        setExam={setExam}
        onFinish={() => setScreen('result')}
        onBack={() => { setScreen('select'); setExam(null); }}
      />
    );
  }

  if (screen === 'result' && exam) {
    return (
      <ResultScreen
        exam={exam}
        onBack={() => { setScreen('select'); setExam(null); }}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────
// 세션 선택 화면
// ─────────────────────────────────────────
function SelectScreen({
  onStart, onBack,
}: {
  onStart: (sessionId: string, label: string) => void;
  onBack: () => void;
}) {
  const sessions = getAvailableSessions();

  return (
    <div className="min-h-full bg-orange-50">
      <div className="px-4 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={onBack} className="text-orange-400 hover:text-orange-600 transition">← 뒤로</button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">📝 회차별 전체 시험</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h1 className="text-base font-bold text-gray-800 mb-1">회차별 전체 시험 모드</h1>
          <p className="text-sm text-gray-500">특정 회차의 전 과목 문제를 한 번에 풀고 총점·과락 여부를 확인합니다.</p>
          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>합격: 총점 60% 이상 + 과목별 40% 이상</span>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">회차 선택</h2>
        <div className="flex flex-col gap-3">
          {sessions.map(sess => {
            const questions = buildExamQuestions(sess.id);
            const subjectsCovered = KIBCHUL_SUBJECTS.filter(s =>
              s.sessions.some(ss => ss.id === sess.id)
            );
            return (
              <div key={sess.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{sess.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {questions.length}문제 · {subjectsCovered.length}개 과목
                    </p>
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {subjectsCovered.map(s => (
                        <span key={s.id} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                          {s.icon} {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onStart(sess.id, sess.label)}
                    className="shrink-0 ml-3 px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition"
                  >
                    시작 →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 퀴즈 화면
// ─────────────────────────────────────────
function QuizScreen({
  exam, setExam, onFinish, onBack,
}: {
  exam: ExamState;
  setExam: React.Dispatch<React.SetStateAction<ExamState | null>>;
  onFinish: () => void;
  onBack: () => void;
}) {
  const fq = exam.questions[exam.currentIdx];
  const q = fq.q;
  const selected = exam.selected[exam.currentIdx];
  const isLast = exam.currentIdx === exam.questions.length - 1;
  const progress = ((exam.currentIdx + 1) / exam.questions.length) * 100;

  // 과목 구분선: 이전 문제와 과목이 다른 경우
  const prevFq = exam.currentIdx > 0 ? exam.questions[exam.currentIdx - 1] : null;
  const isNewSubject = !prevFq || prevFq.subjectId !== fq.subjectId;

  const handleSelect = (optNum: number) => {
    if (selected !== null) return;
    const newSelected = [...exam.selected];
    newSelected[exam.currentIdx] = optNum;
    setExam(prev => prev ? { ...prev, selected: newSelected } : null);
  };

  const goNext = () => {
    if (exam.currentIdx < exam.questions.length - 1) {
      setExam(prev => prev ? { ...prev, currentIdx: prev.currentIdx + 1 } : null);
    } else {
      // 시험 종료: 오답 저장 + 통계 저장
      const grouped = new Map<number, { correct: number; total: number }>();
      exam.questions.forEach((fq, i) => {
        const sel = exam.selected[i];
        const g = grouped.get(fq.subjectId) || { correct: 0, total: 0 };
        g.total++;
        if (sel === fq.q.answer) {
          g.correct++;
          removeWrong(fq.q.id);
        } else if (sel !== null) {
          addWrong({
            subjectId: fq.subjectId,
            sessionId: exam.sessionId,
            questionId: fq.q.id,
            question: fq.q.question,
            choices: [...fq.q.choices],
            answer: fq.q.answer,
            selected: sel,
            explanation: fq.q.explanation,
            savedAt: new Date().toISOString(),
          });
        }
        grouped.set(fq.subjectId, g);
      });

      // 과목별 통계 저장
      grouped.forEach((stat, subjectId) => {
        addStat({ subjectId, sessionId: exam.sessionId, correct: stat.correct, total: stat.total, timestamp: new Date().toISOString() });
      });

      onFinish();
    }
  };

  const goPrev = () => {
    if (exam.currentIdx > 0) {
      setExam(prev => prev ? { ...prev, currentIdx: prev.currentIdx - 1 } : null);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</button>
        <div className="flex-1">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-sm text-gray-500 font-medium shrink-0">
          {exam.currentIdx + 1}/{exam.questions.length}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-white">전체시험</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* 과목 배지 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
            {fq.subjectIcon} {fq.subjectName}
          </span>
          <span className="text-xs text-gray-400">{exam.sessionLabel}</span>
        </div>

        {/* 문제 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-xs text-orange-500 font-medium mb-2">Q{exam.currentIdx + 1}</p>
          <p className="text-gray-800 text-base leading-relaxed font-medium">{q.question}</p>
        </div>

        {/* 선택지 */}
        <div className="flex flex-col gap-2 mb-4">
          {q.choices.map((choice, idx) => {
            const optNum = idx + 1;
            const isSelected = selected === optNum;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(optNum)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm leading-snug ${
                  isSelected
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                }`}
              >
                <span className="font-bold mr-2 text-gray-400">{['①', '②', '③', '④'][idx]}</span>
                {choice}
              </button>
            );
          })}
        </div>

        {/* 네비게이션 */}
        <div className="flex gap-2">
          <button
            onClick={goPrev}
            disabled={exam.currentIdx === 0}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition"
          >
            ← 이전
          </button>
          <button
            onClick={goNext}
            disabled={selected === null}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-30 transition ${
              isLast ? 'bg-orange-700 hover:bg-orange-800' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {isLast ? '결과 보기 →' : '다음 →'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-3">시험 모드 — 마지막 문제 후 채점됩니다</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 결과 화면
// ─────────────────────────────────────────
function ResultScreen({ exam, onBack }: { exam: ExamState; onBack: () => void }) {
  const router = useRouter();
  const [showDetail, setShowDetail] = useState<number | null>(null);

  // 과목별 집계
  const subjectResults = KIBCHUL_SUBJECTS
    .map(s => {
      const items = exam.questions
        .map((fq, i) => ({ fq, sel: exam.selected[i] }))
        .filter(({ fq }) => fq.subjectId === s.id);
      if (items.length === 0) return null;
      const correct = items.filter(({ fq, sel }) => sel === fq.q.answer).length;
      const total = items.length;
      const pct = Math.round((correct / total) * 100);
      return { subject: s, correct, total, pct, items };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof KIBCHUL_SUBJECTS['map']>[0]>[];

  // TypeScript 를 위한 타입 정리
  type SubjectResult = {
    subject: typeof KIBCHUL_SUBJECTS[0];
    correct: number;
    total: number;
    pct: number;
    items: { fq: FlatQuestion; sel: number | null }[];
  };

  const subjectResultsTyped = subjectResults as unknown as SubjectResult[];

  const totalCorrect = subjectResultsTyped.reduce((a, s) => a + s.correct, 0);
  const totalQ = subjectResultsTyped.reduce((a, s) => a + s.total, 0);
  const totalPct = Math.round((totalCorrect / totalQ) * 100);

  // 합격 기준: 총점 60% 이상 AND 모든 과목 40% 이상
  const allSubjectPassed = subjectResultsTyped.every(s => s.pct >= 40);
  const totalPassed = totalPct >= 60;
  const passed = allSubjectPassed && totalPassed;

  return (
    <div className="min-h-full bg-orange-50">
      <div className="px-4 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={onBack} className="text-orange-400 hover:text-orange-600">← 회차 선택</button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 총점 카드 */}
        <div className={`rounded-2xl shadow-sm p-8 text-center mb-5 ${passed ? 'bg-green-50' : 'bg-white'}`}>
          <p className="text-sm text-gray-500 mb-1">{exam.sessionLabel} 전체 시험</p>
          <div className="text-5xl font-black mb-2 text-gray-800">{totalPct}점</div>
          <p className="text-gray-500 mb-4">{totalCorrect} / {totalQ} 정답</p>
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${
            passed ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
          }`}>
            {passed ? '✓ 합격' : allSubjectPassed ? '✗ 총점 부족' : '✗ 과락 과목 있음'}
          </div>
          {!allSubjectPassed && (
            <p className="text-xs text-red-500 mt-2">과락: 40점 미만 과목이 있습니다</p>
          )}
        </div>

        {/* 과목별 성적 */}
        <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">과목별 성적</h2>
        <div className="flex flex-col gap-3 mb-5">
          {subjectResultsTyped.map(({ subject, correct, total, pct, items }) => {
            const subjectPassed = pct >= 40;
            const isOpen = showDetail === subject.id;
            const wrongItems = items.filter(({ fq, sel }) => sel !== fq.q.answer);

            return (
              <div key={subject.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowDetail(isOpen ? null : subject.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{subject.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800">{subject.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${subjectPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {pct}점
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            subjectPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {subjectPassed ? '통과' : '과락'}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${subjectPassed ? 'bg-green-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{correct}/{total} 정답 {wrongItems.length > 0 && `· 오답 ${wrongItems.length}문제`}</p>
                    </div>
                    <span className="text-gray-300 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && wrongItems.length > 0 && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mt-3 mb-2">오답 목록</p>
                    <div className="flex flex-col gap-3">
                      {wrongItems.map(({ fq, sel }) => (
                        <div key={fq.q.id} className="border border-gray-100 rounded-xl p-3">
                          <p className="text-xs font-medium text-gray-800 mb-2">{fq.q.question}</p>
                          {fq.q.choices.map((ch, idx) => (
                            <div key={idx} className={`text-xs py-1 px-2 rounded mb-0.5 ${
                              idx + 1 === fq.q.answer ? 'bg-green-100 text-green-800 font-medium' :
                              idx + 1 === sel ? 'bg-red-100 text-red-700' : 'text-gray-400'
                            }`}>
                              {['①', '②', '③', '④'][idx]} {ch}
                              {idx + 1 === fq.q.answer && ' ✓'}
                              {idx + 1 === sel && idx + 1 !== fq.q.answer && ' ✗'}
                            </div>
                          ))}
                          {fq.q.explanation && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-2">
                              💡 {fq.q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/kibchul/stats')}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition"
          >
            📊 전체 통계 보기
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition"
          >
            다른 회차 풀기
          </button>
        </div>
      </div>
    </div>
  );
}
