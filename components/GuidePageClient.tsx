'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ── 타입 ──────────────────────────────────────────────────
type Term = { term: string; plain: string; analogy: string };
type FoundationStep = { step: number; action: string; duration_min: number };

type EntryGuide = {
  entry_difficulty: 'low' | 'medium' | 'high';
  must_know_terms: Term[];
  why_this_subject: string | null;
  real_world_context: string | null;
  foundation_steps: FoundationStep[];
  prep_days: number;
  day_one_guide: string | null;
  common_mistake: string | null;
};

type SubjectType = { id: number; code: string; name: string; description: string | null };

type Subject = {
  id: number;
  name: string;
  icon: string;
  question_count: number;
  theory_url: string | null;
  subject_types: SubjectType;
  subject_entry_guides: EntryGuide[];
};

type Strategy = {
  subject_type_id: number;
  how_to_apply: string;
  priority: number;
  timing_guide: string | null;
  wrong_pattern: string | null;
  effect_timeline: string | null;
  brain_principles: {
    name: string;
    tagline: string;
    icon: string | null;
    application_type: string;
  };
};

// ── 색상 맵 ───────────────────────────────────────────────
const TYPE_COLOR: Record<string, { bg: string; text: string; bar: string; tab: string }> = {
  law_memorization: { bg: 'bg-blue-50',   text: 'text-blue-800',   bar: 'bg-blue-400',   tab: 'bg-blue-100'   },
  technical_calc:   { bg: 'bg-yellow-50', text: 'text-yellow-800', bar: 'bg-yellow-400', tab: 'bg-yellow-100' },
  procedural:       { bg: 'bg-green-50',  text: 'text-green-800',  bar: 'bg-green-400',  tab: 'bg-green-100'  },
  conceptual:       { bg: 'bg-purple-50', text: 'text-purple-800', bar: 'bg-purple-400', tab: 'bg-purple-100' },
  essay_logic:      { bg: 'bg-indigo-50', text: 'text-indigo-800', bar: 'bg-indigo-400', tab: 'bg-indigo-100' },
  admin_policy:     { bg: 'bg-orange-50', text: 'text-orange-800', bar: 'bg-orange-400', tab: 'bg-orange-100' },
};

const DIFF_BADGE: Record<string, { label: string; cls: string; icon: string }> = {
  low:    { label: '바로 시작 가능', cls: 'bg-green-50 text-green-700 border-green-200',  icon: '🟢' },
  medium: { label: '약간 준비 필요', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '🟡' },
  high:   { label: '준비 필수',      cls: 'bg-red-50 text-red-700 border-red-200',         icon: '🔴' },
};

const APP_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  system_implementable: { label: '🟢 앱이 자동으로', cls: 'bg-green-50 text-green-700' },
  recommendation_only:  { label: '🟡 직접 실천',     cls: 'bg-yellow-50 text-yellow-700' },
  hybrid:               { label: '🔵 앱 + 직접',      cls: 'bg-blue-50 text-blue-700' },
};

// ── 상수 ──────────────────────────────────────────────────
const EXAM_DATE = new Date('2026-06-21T09:00:00');

const BRAIN_CARDS = [
  { front: '🧪 인출 효과', back: '시험이 곧 학습이다.\n읽는 것보다 "꺼내보기"가\n기억을 2~3배 강화한다.' },
  { front: '⏱️ 간격 반복', back: '망각이 기억을 강화한다.\n잊어갈 타이밍에 다시 보면\n기억 강도가 지수적으로 증가한다.' },
  { front: '🔀 교차 연습', back: '섞어야 실력이 는다.\n한 과목을 몰아치는 것보다\n여러 과목을 번갈아 학습해야 한다.' },
  { front: '🔗 정교화',    back: '연결할수록 기억된다.\n새 개념을 아는 것과 연결하면\n장기기억으로 고정된다.' },
  { front: '📍 구체화',    back: '추상은 구체로 살아난다.\n실제 사례·경험에 연결된 개념은\n시험장에서 떠오른다.' },
  { front: '😴 두뇌 휴식', back: '잠이 기억을 굳힌다.\n수면 중 해마가 당일 학습을\n장기기억으로 전환한다.' },
];

const PHASES = [
  { label: 'Phase 1', title: '기초',  date: '5/3 ~ 5/17',  desc: '7과목 핵심정리 1회독 + 스토리 학습',  color: 'bg-purple-500' },
  { label: 'Phase 2', title: '심화',  date: '5/18 ~ 5/31', desc: 'CBT 집중 + 오답 분석 + 인출훈련',     color: 'bg-blue-500'   },
  { label: 'Phase 3', title: '실전',  date: '6/1 ~ 6/14',  desc: '모의고사 반복 + 약점 과목 보완',      color: 'bg-green-500'  },
  { label: 'Phase 4', title: '최종',  date: '6/15 ~ 6/20', desc: '핵심 암기 점검 + 컨디션 관리',        color: 'bg-amber-500'  },
];

const SECTIONS = [
  { id: 's1', label: '시험이란?', icon: '🎯' },
  { id: 's2', label: '출제비중',  icon: '📊' },
  { id: 's3', label: '과목지도',  icon: '🗺️' },
  { id: 's4', label: '과목전략',  icon: '📚' },
  { id: 's5', label: 'D-Day',     icon: '📅' },
  { id: 's6', label: '학습과학',  icon: '🧠' },
  { id: 's7', label: '피드백',    icon: '💬' },
];

function getDday() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam  = new Date(EXAM_DATE); exam.setHours(0, 0, 0, 0);
  return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
}

function getCurrentPhase() {
  const today = new Date();
  const phases = [
    { start: new Date('2026-05-03'), end: new Date('2026-05-17') },
    { start: new Date('2026-05-18'), end: new Date('2026-05-31') },
    { start: new Date('2026-06-01'), end: new Date('2026-06-14') },
    { start: new Date('2026-06-15'), end: new Date('2026-06-20') },
  ];
  for (let i = 0; i < phases.length; i++) {
    if (today >= phases[i].start && today <= phases[i].end) return i;
  }
  return today < phases[0].start ? -1 : phases.length;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function GuidePageClient({
  subjects,
  strategies,
}: {
  subjects: Subject[];
  strategies: Strategy[];
}) {
  const [activeTab, setActiveTab]   = useState(subjects[0]?.id ?? 0);
  const [flipped, setFlipped]       = useState<Record<number, boolean>>({});
  const [feedback, setFeedback]     = useState('');
  const [fbStatus, setFbStatus]     = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [expandedTerm, setExpandedTerm] = useState<number | null>(null);

  const dday         = getDday();
  const currentPhase = getCurrentPhase();
  const totalQ       = subjects.reduce((s, x) => s + x.question_count, 0);

  // 전략을 subject_type_id별 맵으로 변환
  const strategyMap: Record<number, Strategy[]> = {};
  strategies.forEach(s => {
    if (!strategyMap[s.subject_type_id]) strategyMap[s.subject_type_id] = [];
    strategyMap[s.subject_type_id].push(s);
  });

  // 현재 탭의 과목
  const currentSubject = subjects.find(s => s.id === activeTab);
  const currentType    = currentSubject?.subject_types;
  const currentGuide   = currentSubject?.subject_entry_guides?.[0];
  const currentStrats  = currentType ? (strategyMap[currentType.id] ?? []) : [];
  const typeColor      = TYPE_COLOR[currentType?.code ?? ''] ?? TYPE_COLOR.conceptual;

  // ── 피드백 제출 ─────────────────────────────────────────
  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFbStatus('sending');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('feedback').insert({
        content: feedback.trim(), page: 'guide', user_id: user?.id ?? null,
      });
      if (error) throw error;
      setFbStatus('done');
      setFeedback('');
    } catch { setFbStatus('error'); }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-10">

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📘 학습가이드</h1>
        <p className="text-sm text-gray-500 mt-1">철도교통안전관리자 시험, 이렇게 준비하세요</p>
      </div>

      {/* 섹션 0: 앵커 네비 */}
      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-purple-100 hover:text-purple-700 text-xs font-medium text-gray-600 transition">
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </nav>

      {/* 섹션 1: 시험이란? */}
      <section id="s1" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>🎯</span> 이 시험이란 무엇인가</h2>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-purple-800 mb-1">시험 개요</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>철도교통안전관리자 자격시험</strong>은 국토교통부 주관 철도안전 분야 국가전문자격입니다.
              필기시험(7과목, {totalQ}문항)을 합격한 후 실무경력 요건을 갖추면 취득합니다.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800 mb-1">합격 기준</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              각 과목 40점 이상, 전 과목 평균 <strong>60점 이상</strong>이면 합격.<br/>
              한 과목이라도 40점 미만이면 <strong>과락</strong>으로 불합격.
            </p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 text-xs text-gray-500 border border-purple-100">
            ✏️ <em>상세 내용(시험 역사·DNA·출제 경향)은 5/15 업데이트 예정입니다.</em>
          </div>
        </div>
      </section>

      {/* 섹션 2: 출제 비중 바차트 */}
      <section id="s2" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>📊</span> 출제 비중 분석</h2>
        <p className="text-xs text-gray-400">총 {totalQ}문항 기준</p>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm">
          {subjects.map(s => {
            const pct   = Math.round((s.question_count / totalQ) * 100);
            const color = TYPE_COLOR[s.subject_types?.code ?? ''] ?? TYPE_COLOR.conceptual;
            return (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                    <span>{s.icon}</span>{s.name}
                  </span>
                  <span className="text-gray-400">{s.question_count}문항 ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 섹션 3: 과목 연결 지도 */}
      <section id="s3" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>🗺️</span> 과목 연결 지도</h2>
        <p className="text-xs text-gray-500">과목을 클릭하면 핵심정리로 이동합니다</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {subjects.map(s => {
            const color = TYPE_COLOR[s.subject_types?.code ?? ''] ?? TYPE_COLOR.conceptual;
            return (
              <Link key={s.id} href={s.theory_url ?? `/theory/${s.id}`}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center font-medium text-sm transition hover:scale-105 hover:shadow-md active:scale-95 ${color.bg} ${color.text}`}>
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs leading-tight">{s.name}</span>
                <span className="text-[10px] opacity-60">{s.question_count}문항</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 섹션 4: 과목별 전략 (4층 구조) ── */}
      <section id="s4" className="space-y-4 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>📚</span> 과목별 학습 전략</h2>

        {/* 탭 버튼 */}
        <div className="flex flex-wrap gap-1.5">
          {subjects.map(s => {
            const color = TYPE_COLOR[s.subject_types?.code ?? ''] ?? TYPE_COLOR.conceptual;
            return (
              <button key={s.id} onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  activeTab === s.id
                    ? 'bg-purple-700 text-white shadow-sm'
                    : `${color.tab} ${color.text} hover:opacity-80`
                }`}>
                {s.icon} {s.name.length > 5 ? s.name.slice(0, 5) + '…' : s.name}
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 — 4층 구조 */}
        {currentSubject && (
          <div className="space-y-3">

            {/* ── 1층: 교재 보기 전 진입 가이드 ── */}
            <div className={`rounded-2xl border p-5 space-y-4 ${typeColor.bg} border-opacity-30`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span>🎯</span> 1층 — 교재 보기 전
                </p>
                {currentGuide && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${DIFF_BADGE[currentGuide.entry_difficulty].cls}`}>
                    {DIFF_BADGE[currentGuide.entry_difficulty].icon} {DIFF_BADGE[currentGuide.entry_difficulty].label}
                    {currentGuide.prep_days > 0 && ` · 준비 ${currentGuide.prep_days}일`}
                  </span>
                )}
              </div>

              {/* 사전 용어 */}
              {currentGuide && currentGuide.must_know_terms?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">지금 당장 알아야 할 용어</p>
                  <div className="grid grid-cols-1 gap-2">
                    {currentGuide.must_know_terms.map((t, i) => (
                      <button key={i} onClick={() => setExpandedTerm(expandedTerm === i ? null : i)}
                        className="bg-white rounded-xl px-4 py-2.5 text-left border border-white hover:border-gray-200 transition w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-800">{t.term}</span>
                          <span className="text-[10px] text-gray-400">{expandedTerm === i ? '▲' : '▼'}</span>
                        </div>
                        {expandedTerm === i && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-xs text-gray-600">{t.plain}</p>
                            {t.analogy && (
                              <p className="text-[11px] text-gray-400 italic">비유: {t.analogy}</p>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 준비 단계 (high 난이도) */}
              {currentGuide && currentGuide.foundation_steps?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-600">교재 전 준비 단계</p>
                  {currentGuide.foundation_steps.map((step) => (
                    <div key={step.step} className="flex items-start gap-2 bg-white rounded-xl px-3 py-2 border border-white">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeColor.bg} ${typeColor.text} flex-shrink-0 mt-0.5`}>
                        {step.step}
                      </span>
                      <div>
                        <p className="text-xs text-gray-700">{step.action}</p>
                        {step.duration_min > 0 && (
                          <p className="text-[10px] text-gray-400">{step.duration_min}분</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 첫날 가이드 */}
              {currentGuide?.day_one_guide && (
                <div className="bg-white rounded-xl px-4 py-2.5 border border-white">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">📅 첫날 학습 순서</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{currentGuide.day_one_guide}</p>
                </div>
              )}

              {/* 흔한 실수 */}
              {currentGuide?.common_mistake && (
                <div className="bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                  <p className="text-xs text-red-700">
                    <span className="font-semibold">❌ 이렇게 시작하면 안 됩니다</span><br/>
                    {currentGuide.common_mistake}
                  </p>
                </div>
              )}

              {!currentGuide && (
                <p className="text-xs text-gray-400 italic">진입 가이드 콘텐츠 준비 중입니다.</p>
              )}
            </div>

            {/* ── 2층: 과목 성격 ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                <span>📊</span> 2층 — 이 과목의 성격
              </p>
              {currentType && (
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColor.bg} ${typeColor.text} flex-shrink-0`}>
                    {currentType.name}
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentType.description ?? '과목 성격 설명 준비 중입니다.'}
                  </p>
                </div>
              )}
            </div>

            {/* ── 3층 + 4층: 학습법 × 타이밍 ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span>📚</span> 3층 — 학습법 매핑
              </p>

              {currentStrats.length > 0 ? (
                <div className="space-y-3">
                  {currentStrats.map((st, i) => {
                    const bp      = st.brain_principles;
                    const badge   = APP_TYPE_BADGE[bp.application_type] ?? APP_TYPE_BADGE.hybrid;
                    const isFirst = i === 0;
                    return (
                      <div key={i} className={`rounded-xl border p-4 space-y-2 ${isFirst ? `${typeColor.bg} border-opacity-40` : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              {bp.icon && <span className="mr-1">{bp.icon}</span>}
                              {bp.name}
                              <span className="ml-1.5 text-gray-400 font-normal">— {bp.tagline}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{st.how_to_apply}</p>

                        {/* 4층: 타이밍 */}
                        {st.timing_guide && (
                          <div className="bg-white rounded-lg px-3 py-2 border border-gray-100 space-y-1">
                            <p className="text-[10px] font-semibold text-gray-500">⏱️ 언제 어떻게</p>
                            <p className="text-xs text-gray-600">{st.timing_guide}</p>
                          </div>
                        )}
                        {st.wrong_pattern && (
                          <p className="text-[11px] text-red-500">
                            <span className="font-semibold">❌ 잘못된 패턴:</span> {st.wrong_pattern}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">전략 데이터 준비 중입니다.</p>
              )}

              {currentSubject.theory_url && (
                <Link href={currentSubject.theory_url}
                  className="inline-block text-xs font-semibold text-purple-700 underline underline-offset-2">
                  {currentSubject.name} 핵심정리 바로가기 →
                </Link>
              )}
            </div>

          </div>
        )}
      </section>

      {/* 섹션 5: D-Day */}
      <section id="s5" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>📅</span> D-Day 플래너</h2>
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white text-center shadow-lg">
          <p className="text-xs opacity-70 mb-1">2026년 6월 21일 시험일까지</p>
          <p className="text-5xl font-bold tracking-tight">
            {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day!' : '시험 종료'}
          </p>
          <p className="text-xs opacity-60 mt-2">
            남은 날 {dday}일 · 약 {Math.floor(dday / 7)}주 {dday % 7}일
          </p>
        </div>
        <div className="space-y-2">
          {PHASES.map((p, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition ${
              i === currentPhase ? 'border-purple-300 bg-purple-50 shadow-sm' : 'border-gray-100 bg-white'}`}>
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${p.color} ${i === currentPhase ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-700">{p.label} · {p.title}</span>
                  <span className="text-[10px] text-gray-400">{p.date}</span>
                  {i === currentPhase && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">현재</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 섹션 6: 두뇌과학 플립카드 */}
      <section id="s6" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>🧠</span> 두뇌과학 학습법</h2>
        <p className="text-xs text-gray-500">카드를 탭하면 설명이 나옵니다</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BRAIN_CARDS.map((card, i) => (
            <button key={i} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
              className={`relative rounded-2xl min-h-[110px] p-4 text-left transition-all duration-300 shadow-sm border ${
                flipped[i] ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-gray-800 border-gray-100 hover:border-purple-200 hover:shadow-md'}`}>
              {!flipped[i] ? (
                <div className="flex flex-col h-full justify-between">
                  <span className="text-2xl">{card.front.split(' ')[0]}</span>
                  <span className="text-xs font-semibold mt-2 leading-tight">{card.front.split(' ').slice(1).join(' ')}</span>
                  <span className="text-[10px] text-gray-400 mt-1">탭해서 보기 →</span>
                </div>
              ) : (
                <div className="flex flex-col h-full justify-center">
                  <p className="text-xs leading-relaxed whitespace-pre-line">{card.back}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 섹션 7: 피드백 */}
      <section id="s7" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>💬</span> 피드백</h2>
        <p className="text-xs text-gray-500">의견, 오류 제보, 개선 요청을 남겨주세요</p>
        <form onSubmit={handleFeedback} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="예) ○○ 과목 내용에 오류가 있어요 / 이 기능이 있으면 좋겠어요"
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400 resize-none transition"
            disabled={fbStatus === 'sending' || fbStatus === 'done'} />
          <div className="flex items-center justify-between">
            {fbStatus === 'done' && <p className="text-xs text-green-600 font-medium">✅ 전송됐습니다. 감사합니다!</p>}
            {fbStatus === 'error' && <p className="text-xs text-red-500">오류가 발생했습니다. 다시 시도해주세요.</p>}
            {(fbStatus === 'idle' || fbStatus === 'sending') && <span className="text-xs text-gray-400">{feedback.length}자</span>}
            <button type="submit"
              disabled={!feedback.trim() || fbStatus === 'sending' || fbStatus === 'done'}
              className="ml-auto px-5 py-2 rounded-xl bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 disabled:opacity-40 transition">
              {fbStatus === 'sending' ? '전송 중…' : '보내기'}
            </button>
          </div>
        </form>
      </section>

    </div>
  );
}
