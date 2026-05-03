'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ── 상수 ──────────────────────────────────────────────────
const EXAM_DATE = new Date('2026-06-21T09:00:00');

const SUBJECTS = [
  { id: 1, name: '교통안전관리론', icon: '📊', color: 'bg-purple-100 text-purple-800', bar: 'bg-purple-400', count: 80 },
  { id: 2, name: '교통안전법',    icon: '⚖️', color: 'bg-blue-100 text-blue-800',   bar: 'bg-blue-400',   count: 60 },
  { id: 3, name: '열차운전',      icon: '🚇', color: 'bg-green-100 text-green-800', bar: 'bg-green-400',  count: 60 },
  { id: 4, name: '철도공학',      icon: '🔧', color: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-400', count: 60 },
  { id: 5, name: '철도산업기본법', icon: '📋', color: 'bg-orange-100 text-orange-800', bar: 'bg-orange-400', count: 40 },
  { id: 6, name: '철도신호',      icon: '🚦', color: 'bg-red-100 text-red-800',    bar: 'bg-red-400',    count: 61 },
  { id: 7, name: '철도안전법',    icon: '🛡️', color: 'bg-teal-100 text-teal-800',  bar: 'bg-teal-400',   count: 60 },
];
const TOTAL_Q = SUBJECTS.reduce((s, x) => s + x.count, 0); // 421

const BRAIN_CARDS = [
  { front: '🧪 인출 효과', back: '시험이 곧 학습이다.\n읽는 것보다 "꺼내보기"가\n기억을 2~3배 강화한다.' },
  { front: '⏱️ 간격 반복', back: '망각이 기억을 강화한다.\n잊어갈 타이밍에 다시 보면\n기억 강도가 지수적으로 증가한다.' },
  { front: '🔀 교차 연습', back: '섞어야 실력이 는다.\n한 과목을 몰아치는 것보다\n여러 과목을 번갈아 학습해야 한다.' },
  { front: '🔗 정교화',   back: '연결할수록 기억된다.\n새 개념을 아는 것과 연결하면\n장기기억으로 고정된다.' },
  { front: '📍 구체화',   back: '추상은 구체로 살아난다.\n실제 사례·경험에 연결된 개념은\n시험장에서 떠오른다.' },
  { front: '😴 두뇌 휴식', back: '잠이 기억을 굳힌다.\n수면 중 해마가 당일 학습을\n장기기억으로 전환한다.' },
];

const PHASES = [
  { label: 'Phase 1', title: '기초',   date: '5/3 ~ 5/17',  desc: '7과목 핵심정리 1회독 + 스토리 학습',   color: 'bg-purple-500' },
  { label: 'Phase 2', title: '심화',   date: '5/18 ~ 5/31', desc: 'CBT 집중 + 오답 분석 + 인출훈련',      color: 'bg-blue-500'   },
  { label: 'Phase 3', title: '실전',   date: '6/1 ~ 6/14',  desc: '모의고사 반복 + 약점 과목 보완',       color: 'bg-green-500'  },
  { label: 'Phase 4', title: '최종',   date: '6/15 ~ 6/20', desc: '핵심 암기 점검 + 컨디션 관리',         color: 'bg-amber-500'  },
];

const STRATEGIES: Record<number, { tips: string[]; focus: string }> = {
  1: { focus: '안전관리 체계·개념 이해', tips: ['안전관리 PDCA 사이클 암기', '재해통계 계산 공식 집중', '비용-편익 개념 반복'] },
  2: { focus: '법 조문 구조 파악',       tips: ['조문 번호보단 내용 핵심', '벌칙 체계 비교표 작성', '개정 조항 우선 확인'] },
  3: { focus: '운전 절차·신호 체계',     tips: ['운전취급 절차 순서 암기', '제동 계산 공식 반복', '비상 시나리오 시뮬레이션'] },
  4: { focus: '궤도·차량 구조 원리',     tips: ['궤도 종류별 특성 비교', '차량 주요 장치 기능 암기', '공학 계산문제 유형 정리'] },
  5: { focus: '법 목적·기관 역할',       tips: ['법 제정 목적 먼저 이해', '관련 기관별 역할 비교', '용어 정의 조항 집중'] },
  6: { focus: '신호 방식·체계 원리',     tips: ['ATS/ATC/ATP 차이 완벽 암기', '폐색 구간 개념 시각화', '신호기 종류·의미 암기'] },
  7: { focus: '안전 기준·점검 절차',     tips: ['안전관리체계 승인 절차', '사고 보고 기간·경로 암기', '검사 종류별 주기 정리'] },
};

// ── getDday ──────────────────────────────────────────────
function getDday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(EXAM_DATE);
  exam.setHours(0, 0, 0, 0);
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

// ── 섹션 앵커 id 목록 ─────────────────────────────────────
const SECTIONS = [
  { id: 's1', label: '시험이란?',  icon: '🎯' },
  { id: 's2', label: '출제비중',   icon: '📊' },
  { id: 's3', label: '과목지도',   icon: '🗺️' },
  { id: 's4', label: '과목전략',   icon: '📚' },
  { id: 's5', label: 'D-Day',      icon: '📅' },
  { id: 's6', label: '학습과학',   icon: '🧠' },
  { id: 's7', label: '피드백',     icon: '💬' },
];

// ── 컴포넌트 ──────────────────────────────────────────────
export default function GuidePage() {
  const [activeTab, setActiveTab] = useState(1);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState('');
  const [fbStatus, setFbStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const dday = getDday();
  const currentPhase = getCurrentPhase();

  // ── 피드백 제출 ─────────────────────────────────────────
  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFbStatus('sending');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('feedback').insert({
        content: feedback.trim(),
        page: 'guide',
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      setFbStatus('done');
      setFeedback('');
    } catch {
      setFbStatus('error');
    }
  }

  // ── 앵커 스크롤 ─────────────────────────────────────────
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-10">

      {/* ── 페이지 헤더 ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📘 학습가이드</h1>
        <p className="text-sm text-gray-500 mt-1">철도교통안전관리자 시험, 이렇게 준비하세요</p>
      </div>

      {/* ── 섹션 0: 앵커 네비게이션 ── */}
      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-purple-100 hover:text-purple-700 text-xs font-medium text-gray-600 transition"
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* ── 섹션 1: 시험이란? ── */}
      <section id="s1" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🎯</span> 이 시험이란 무엇인가
        </h2>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-purple-800 mb-1">시험 개요</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>철도교통안전관리자 자격시험</strong>은 국토교통부 주관으로 시행되는
              철도안전 분야의 국가전문자격입니다. 필기시험(7과목, 421문항)을 합격한 후
              실무경력 요건을 갖추면 자격을 취득할 수 있습니다.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800 mb-1">합격 기준</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              각 과목 40점 이상, 전 과목 평균 <strong>60점 이상</strong>이면 합격입니다.
              과락(40점 미만) 과목이 하나라도 있으면 불합격이므로 고른 학습이 중요합니다.
            </p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 text-xs text-gray-500 border border-purple-100">
            ✏️ <em>이 섹션의 상세 내용은 5/15 업데이트 예정입니다. — 시험의 역사, DNA, 출제 경향 분석 포함</em>
          </div>
        </div>
      </section>

      {/* ── 섹션 2: 출제 비중 바차트 ── */}
      <section id="s2" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>📊</span> 출제 비중 분석
        </h2>
        <p className="text-xs text-gray-400">총 {TOTAL_Q}문항 기준</p>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm">
          {SUBJECTS.map(s => {
            const pct = Math.round((s.count / TOTAL_Q) * 100);
            return (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                    <span>{s.icon}</span>{s.name}
                  </span>
                  <span className="text-gray-400">{s.count}문항 ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${s.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">
            * 교통안전관리론(19%)이 가장 높고, 철도산업기본법(9.5%)이 가장 낮습니다.
          </p>
        </div>
      </section>

      {/* ── 섹션 3: 과목 연결 지도 ── */}
      <section id="s3" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🗺️</span> 과목 연결 지도
        </h2>
        <p className="text-xs text-gray-500">과목을 클릭하면 핵심정리로 이동합니다</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {SUBJECTS.map(s => (
            <Link
              key={s.id}
              href={`/theory/${s.id}`}
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center font-medium text-sm transition hover:scale-105 hover:shadow-md active:scale-95 ${s.color}`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs leading-tight">{s.name}</span>
              <span className="text-[10px] opacity-60">{s.count}문항</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 섹션 4: 과목별 학습 전략 (탭) ── */}
      <section id="s4" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>📚</span> 과목별 학습 전략
        </h2>
        {/* 탭 버튼 */}
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeTab === s.id
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.icon} {s.name.length > 5 ? s.name.slice(0, 5) + '…' : s.name}
            </button>
          ))}
        </div>
        {/* 탭 콘텐츠 */}
        {SUBJECTS.filter(s => s.id === activeTab).map(s => {
          const st = STRATEGIES[s.id];
          return (
            <div key={s.id} className={`rounded-2xl p-5 space-y-3 ${s.color} bg-opacity-50`}>
              <p className="text-sm font-bold">{s.icon} {s.name}</p>
              <p className="text-xs text-gray-600">
                <span className="font-semibold">핵심 포커스:</span> {st.focus}
              </p>
              <ul className="space-y-1.5">
                {st.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="mt-0.5 text-purple-500 font-bold">▸</span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href={`/theory/${s.id}`}
                className="inline-block mt-1 text-xs font-semibold text-purple-700 underline underline-offset-2"
              >
                핵심정리 바로가기 →
              </Link>
            </div>
          );
        })}
      </section>

      {/* ── 섹션 5: D-Day 플래너 ── */}
      <section id="s5" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>📅</span> D-Day 플래너
        </h2>
        {/* D-Day 위젯 */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white text-center shadow-lg">
          <p className="text-xs opacity-70 mb-1">2026년 6월 21일 시험일까지</p>
          <p className="text-5xl font-bold tracking-tight">
            {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day!' : '시험 종료'}
          </p>
          <p className="text-xs opacity-60 mt-2">
            남은 날 {dday}일 · 약 {Math.floor(dday / 7)}주 {dday % 7}일
          </p>
        </div>
        {/* 학습 단계 */}
        <div className="space-y-2">
          {PHASES.map((p, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition ${
                i === currentPhase
                  ? 'border-purple-300 bg-purple-50 shadow-sm'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${p.color} ${i === currentPhase ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
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

      {/* ── 섹션 6: 두뇌과학 학습법 (플립카드) ── */}
      <section id="s6" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🧠</span> 두뇌과학 학습법
        </h2>
        <p className="text-xs text-gray-500">카드를 탭하면 설명이 나옵니다</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BRAIN_CARDS.map((card, i) => (
            <button
              key={i}
              onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
              className={`relative rounded-2xl min-h-[110px] p-4 text-left transition-all duration-300 shadow-sm border ${
                flipped[i]
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white text-gray-800 border-gray-100 hover:border-purple-200 hover:shadow-md'
              }`}
            >
              {!flipped[i] ? (
                <div className="flex flex-col h-full justify-between">
                  <span className="text-2xl">{card.front.split(' ')[0]}</span>
                  <span className="text-xs font-semibold mt-2 leading-tight">
                    {card.front.split(' ').slice(1).join(' ')}
                  </span>
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

      {/* ── 섹션 7: 피드백 ── */}
      <section id="s7" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>💬</span> 피드백
        </h2>
        <p className="text-xs text-gray-500">학습 앱에 대한 의견, 오류 제보, 개선 요청을 남겨주세요</p>
        <form onSubmit={handleFeedback} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="예) ○○ 과목 문제가 너무 적어요 / ○○ 내용에 오류가 있는 것 같아요"
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400 resize-none transition"
            disabled={fbStatus === 'sending' || fbStatus === 'done'}
          />
          <div className="flex items-center justify-between">
            {fbStatus === 'done' && (
              <p className="text-xs text-green-600 font-medium">✅ 피드백이 전송되었습니다. 감사합니다!</p>
            )}
            {fbStatus === 'error' && (
              <p className="text-xs text-red-500">전송 중 오류가 발생했습니다. 다시 시도해주세요.</p>
            )}
            {(fbStatus === 'idle' || fbStatus === 'sending') && (
              <span className="text-xs text-gray-400">{feedback.length}자</span>
            )}
            <button
              type="submit"
              disabled={!feedback.trim() || fbStatus === 'sending' || fbStatus === 'done'}
              className="ml-auto px-5 py-2 rounded-xl bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {fbStatus === 'sending' ? '전송 중…' : '보내기'}
            </button>
          </div>
        </form>
      </section>

    </div>
  );
}
