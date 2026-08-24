'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KIBCHUL_SUBJECTS } from '@/lib/kibchul-data';

const LS_STATS = 'kibchul_stats';

interface StatEntry {
  subjectId: number;
  sessionId: string;
  correct: number;
  total: number;
  timestamp: string;
}

function loadStats(): StatEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_STATS) || '[]'); } catch { return []; }
}

function pctColor(pct: number) {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-orange-400';
  return 'bg-red-400';
}

function pctTextColor(pct: number) {
  if (pct >= 80) return 'text-green-700';
  if (pct >= 60) return 'text-orange-600';
  return 'text-red-600';
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStats(loadStats());
    setMounted(true);
  }, []);

  function clearStats() {
    if (confirm('통계를 모두 초기화할까요?')) {
      localStorage.removeItem(LS_STATS);
      setStats([]);
    }
  }

  if (!mounted) {
    return <div className="p-6 text-center text-gray-400">불러오는 중...</div>;
  }

  // 과목별 집계
  const subjectSummary = KIBCHUL_SUBJECTS.map(s => {
    const entries = stats.filter(e => e.subjectId === s.id);
    const totalCorrect = entries.reduce((a, e) => a + e.correct, 0);
    const totalQ = entries.reduce((a, e) => a + e.total, 0);
    const pct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : null;
    const latestEntry = entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return { subject: s, entries, totalCorrect, totalQ, pct, latestEntry };
  });

  const totalCorrectAll = subjectSummary.reduce((a, s) => a + s.totalCorrect, 0);
  const totalQAll = subjectSummary.reduce((a, s) => a + s.totalQ, 0);
  const overallPct = totalQAll > 0 ? Math.round((totalCorrectAll / totalQAll) * 100) : null;

  return (
    <div className="min-h-full bg-orange-50">
      {/* 헤더 */}
      <div className="px-4 py-3 flex items-center gap-2 text-sm border-b border-orange-100 bg-white">
        <button onClick={() => router.back()} className="text-orange-400 hover:text-orange-600 transition">← 뒤로</button>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-gray-700">📊 정답률 통계</span>
        {stats.length > 0 && (
          <button onClick={clearStats} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition">
            초기화
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 전체 요약 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <p className="text-sm text-gray-500 mb-1">전체 평균 정답률</p>
          {overallPct !== null ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className={`text-4xl font-black ${pctTextColor(overallPct)}`}>{overallPct}%</span>
                <span className="text-gray-400 text-sm mb-1">({totalCorrectAll}/{totalQAll}문제)</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pctColor(overallPct)}`}
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">아직 풀이 기록이 없어요.</p>
              <button
                onClick={() => router.push('/kibchul/1')}
                className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
              >
                기출문제 풀러 가기
              </button>
            </div>
          )}
        </div>

        {/* 과목별 통계 */}
        {overallPct !== null && (
          <>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">과목별 정답률</h2>
            <div className="flex flex-col gap-3 mb-6">
              {subjectSummary.map(({ subject, pct, totalCorrect, totalQ, entries }) => (
                <div key={subject.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{subject.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800">{subject.name}</p>
                        {pct !== null ? (
                          <span className={`text-sm font-bold ${pctTextColor(pct)}`}>{pct}%</span>
                        ) : (
                          <span className="text-xs text-gray-400">미응시</span>
                        )}
                      </div>
                      {pct !== null && (
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pctColor(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {entries.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <p className="text-xs text-gray-400 mb-2">회차별 기록</p>
                      <div className="flex flex-col gap-1.5">
                        {entries
                          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                          .map((e, i) => {
                            const ep = Math.round((e.correct / e.total) * 100);
                            const sessionLabel = KIBCHUL_SUBJECTS
                              .find(s => s.id === e.subjectId)
                              ?.sessions.find(ss => ss.id === e.sessionId)?.label ?? e.sessionId;
                            return (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{sessionLabel}</span>
                                <span className={`font-semibold ${pctTextColor(ep)}`}>
                                  {ep}점 ({e.correct}/{e.total})
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => router.push(`/kibchul/${subject.id}`)}
                    className="mt-3 w-full py-2 rounded-xl bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition"
                  >
                    {entries.length > 0 ? '다시 풀기 →' : '풀러 가기 →'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
