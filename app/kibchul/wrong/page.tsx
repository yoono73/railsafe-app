'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KIBCHUL_SUBJECTS } from '@/lib/kibchul-data';
import { migrateLocalToServer } from '@/lib/kibchul-attempts';

const LS_WRONG = 'kibchul_wrong';

interface WrongEntry {
  subjectId: number;
  sessionId: string;
  questionId: string;
  question: string;
  choices: string[];
  answer: number;
  selected: number;
  explanation: string;
  caution?: string;
  savedAt: string;
}

const SAFETY_SUBJECT = { id: 99, name: '철도안전법 기출', icon: '🚦' };
const INDUSTRY_SUBJECT = { id: 100, name: '철도산업발전기본법 기출', icon: '🚄' };

function loadWrong(): WrongEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_WRONG) || '[]'); } catch { return []; }
}

export default function KibchulWrongPage() {
  const router = useRouter();
  const [wrongs, setWrongs] = useState<WrongEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [migrateStatus, setMigrateStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [migrateError, setMigrateError] = useState<string>('');

  useEffect(() => {
    setWrongs(loadWrong());
    setMounted(true);
  }, []);

  function removeEntry(questionId: string) {
    const updated = wrongs.filter(e => e.questionId !== questionId);
    localStorage.setItem(LS_WRONG, JSON.stringify(updated));
    setWrongs(updated);
  }

  function clearAll() {
    if (confirm('오답노트를 모두 삭제할까요?')) {
      localStorage.removeItem(LS_WRONG);
      setWrongs([]);
    }
  }

  if (!mounted) {
    return <div className="p-6 text-center text-gray-400">불러오는 중...</div>;
  }

  const filtered = filterSubject
    ? wrongs.filter(e => e.subjectId === filterSubject)
    : wrongs;

  // 과목별 개수
  const allSubjects = [...KIBCHUL_SUBJECTS, SAFETY_SUBJECT, INDUSTRY_SUBJECT];
  const countBySubject = allSubjects.map(s => ({
    subject: s,
    count: wrongs.filter(e => e.subjectId === s.id).length,
  }));

  return (
    <div className="min-h-full bg-orange-50">
      {/* 헤더 */}
      <div className="px-4 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={() => router.back()} className="text-orange-400 hover:text-orange-600 transition">← 뒤로</button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">📒 기출 오답노트</span>
        <div className="ml-auto flex items-center gap-3">
          {migrateStatus === 'idle' && (
            <button
              onClick={async () => {
                setMigrateStatus('loading');
                const result = await migrateLocalToServer();
                if (result.error) {
                  setMigrateError(result.error);
                  setMigrateStatus('error');
                } else {
                  setMigrateStatus('done');
                }
              }}
              className="text-xs text-blue-500 hover:text-blue-700 transition border border-blue-200 rounded-lg px-2 py-1"
            >
              ☁️ 서버로 올리기
            </button>
          )}
          {migrateStatus === 'loading' && <span className="text-xs text-gray-400">업로드 중...</span>}
          {migrateStatus === 'done' && <span className="text-xs text-green-600">✓ 서버 저장 완료</span>}
          {migrateStatus === 'error' && (
            <span className="text-xs text-red-400" title={migrateError}>
              {migrateError === '로그인 필요' ? '⚠ 로그인 후 이용' : '⚠ SQL 미실행 또는 오류'}
            </span>
          )}
          {wrongs.length > 0 && (
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition">
              전체 삭제
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 요약 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">📒</div>
          <div>
            <p className="text-sm text-gray-500">저장된 오답</p>
            <p className="text-2xl font-black text-red-600">{wrongs.length}<span className="text-sm font-normal text-gray-500 ml-1">문제</span></p>
          </div>
          {wrongs.length > 0 && (
            <button
              onClick={() => {
                // 오답이 1개 과목에만 있으면 해당 과목으로, 복수면 뒤로
                const subjectIds = [...new Set(wrongs.map(e => e.subjectId))];
                if (subjectIds.length === 1) {
                  if (subjectIds[0] === 99) {
                    router.push('/kibchul/safety');
                  } else {
                    router.push(`/kibchul/${subjectIds[0]}`);
                  }
                } else {
                  router.back();
                }
              }}
              className="ml-auto px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
            >
              오답 복습 →
            </button>
          )}
        </div>

        {wrongs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-lg font-bold text-green-600 mb-2">오답이 없어요!</p>
            <p className="text-sm text-gray-500">기출문제를 풀면 틀린 문제가 여기에 저장됩니다.</p>
            <button onClick={() => router.push('/kibchul/1')} className="mt-6 px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition">
              기출문제 풀러 가기
            </button>
          </div>
        ) : (
          <>
            {/* 과목 필터 */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              <button
                onClick={() => setFilterSubject(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterSubject === null ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'
                }`}
              >
                전체 ({wrongs.length})
              </button>
              {countBySubject.filter(c => c.count > 0).map(({ subject, count }) => (
                <button
                  key={subject.id}
                  onClick={() => setFilterSubject(subject.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    filterSubject === subject.id ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'
                  }`}
                >
                  {subject.icon} {subject.name} ({count})
                </button>
              ))}
            </div>

            {/* 오답 목록 */}
            <div className="flex flex-col gap-3">
              {filtered
                .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
                .map(entry => {
                  const subjectInfo = allSubjects.find(s => s.id === entry.subjectId);
                  const sessionLabel = (subjectInfo as { sessions?: { id: string; label: string }[] })?.sessions?.find(ss => ss.id === entry.sessionId)?.label ?? entry.sessionId;
                  const isExpanded = expandedId === entry.questionId;

                  return (
                    <div key={entry.questionId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.questionId)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                {subjectInfo?.icon} {subjectInfo?.name}
                              </span>
                              <span className="text-xs text-gray-400">{sessionLabel}</span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium leading-snug">{entry.question}</p>
                          </div>
                          <span className="text-gray-300 text-sm mt-0.5 shrink-0">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="mt-3 flex flex-col gap-1">
                            {entry.choices.map((ch, idx) => (
                              <div key={idx} className={`text-xs py-1.5 px-3 rounded-lg ${
                                idx + 1 === entry.answer
                                  ? 'bg-green-100 text-green-800 font-semibold'
                                  : idx + 1 === entry.selected
                                  ? 'bg-red-100 text-red-700'
                                  : 'text-gray-500'
                              }`}>
                                {['①', '②', '③', '④'][idx]} {ch}
                                {idx + 1 === entry.answer && ' ✓ 정답'}
                                {idx + 1 === entry.selected && idx + 1 !== entry.answer && ' ✗ 내 선택'}
                              </div>
                            ))}
                          </div>

                          {entry.explanation && (
                            <div className="mt-3 bg-amber-50 rounded-xl p-3">
                              <p className="text-xs text-amber-700 leading-relaxed">💡 {entry.explanation}</p>
                            </div>
                          )}
                          {entry.caution && (
                            <div className="mt-2 bg-orange-50 rounded-xl p-3">
                              <p className="text-xs text-orange-700 leading-relaxed">⚠️ {entry.caution}</p>
                            </div>
                          )}

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => router.push(`/kibchul/${entry.subjectId}`)}
                              className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition"
                            >
                              해당 과목 풀기
                            </button>
                            <button
                              onClick={() => removeEntry(entry.questionId)}
                              className="px-3 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <p className="text-xs text-center text-gray-400 mt-6">항목을 클릭하면 상세 해설을 볼 수 있어요</p>
          </>
        )}
      </div>
    </div>
  );
}
