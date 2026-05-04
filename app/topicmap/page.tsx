'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SUBJECTS = [
  {
    id: 1, name: '교통안전관리론', icon: '📊',
    tier1: [
      '안전관리체계 구성 요소 (PDCA 사이클)',
      '위험성평가 5단계 절차 (도입→파악→추정→결정→감소)',
      '하인리히 법칙 (1 : 29 : 300)',
      '버드 법칙 (1 : 10 : 30 : 600)',
      '안전관리규정 포함 사항 (7가지)',
      '안전관리자 직무 범위',
    ],
    tier2: [
      '안전관리계획 수립 기준',
      '안전문화 구성 요소',
      '교통안전담당자 업무',
      '사고조사 절차 (4단계)',
      '안전성 인증 심사 종류',
    ],
    tier3: [
      '국제 안전 기준 (EN 50126/50128/50129)',
      'OHSAS 18001 / ISO 45001 비교',
      'RAM 분석 개념',
    ],
  },
  {
    id: 2, name: '교통안전법', icon: '⚖️',
    tier1: [
      '교통안전관리자 선임 대상·기준·신고 기한',
      '교통안전진단 대상 (10년 이상 시설 등)',
      '교통수단 안전점검 주기·방법',
      '교통안전기본계획 수립 주기 (5년)',
      '위반 시 과태료·벌칙 조항',
    ],
    tier2: [
      '교통안전지수 평가 항목',
      '교통안전시설 설치기준',
      '교통사고 통계 관리',
      '지역교통안전계획 수립 의무',
    ],
    tier3: [
      '교통안전공단 역할',
      '교통안전 관련 기관 협력',
    ],
  },
  {
    id: 3, name: '열차운전', icon: '🚇',
    tier1: [
      '폐색방식 4종류와 특징 (절대/허가/통신/자동)',
      '신호 현시 종류 (진행/주의/경계/정지/유도)',
      '열차 비상정차 절차 및 전호 방법',
      '운전취급 금지사항',
      '충돌·탈선 사고 시 조치 절차',
      '출발 전 확인 사항',
    ],
    tier2: [
      '선로전환기 취급 방법',
      '통신 폐색 사용 조건',
      '특수 신호 종류 (발뇌, 화염, 폭음)',
      '열차 분리 시 조치',
    ],
    tier3: [
      '보조 기관차 운전 취급',
      '공사 열차 특수 운전',
    ],
  },
  {
    id: 4, name: '철도공학', icon: '🔧',
    tier1: [
      '궤간 종류 (표준궤 1435mm / 광궤 / 협궤)',
      '곡선 통과 저항 공식 (R = 800/r kg/t)',
      '구배 저항 공식 (g = 구배 ‰ × 1 kg/t)',
      '열차 제동 거리 계산 공식',
      '레일 종류 및 규격 (50N, 60kg)',
    ],
    tier2: [
      '침목 종류 및 특징 (목침목/PC침목/합성침목)',
      '전차선로 구조 (가선 방식)',
      '분기기 구성 (포인트/리드/크로싱)',
      '교량 종류 및 특징',
    ],
    tier3: [
      '터널 환기 방식',
      '궤도 틀림 종류 및 허용 기준',
      '선로 유지보수 기준',
    ],
  },
  {
    id: 5, name: '철도산업기본법', icon: '📋',
    tier1: [
      '철도 사업자 종류 (여객/화물/철도시설관리자)',
      '국가철도망구축계획 수립 주기 (10년)',
      '면허 취소 사유',
      '철도 운임 기준 및 신고',
      '한국철도공사 vs 국가철도공단 역할 구분',
    ],
    tier2: [
      '철도서비스 기준 설정',
      '철도발전기금 재원',
      '철도산업위원회 구성',
      '민자철도 운영 기준',
    ],
    tier3: [
      '철도 통계 작성 의무',
      '국가철도공단 설립 목적',
    ],
  },
  {
    id: 6, name: '철도신호', icon: '🚦',
    tier1: [
      '신호기 분류 (주신호기 / 종속신호기 / 임시신호기)',
      'ATC / ATS / ATP 개념과 차이점',
      '연동장치 원리 (조건 충족 시만 신호 현시)',
      '폐색 신호기 종류 및 현시',
      '선로전환기 종류 (수동/전기/스프링)',
    ],
    tier2: [
      'CBTC 구성 요소 및 특징',
      '자동열차운전장치(ATO) 기능',
      '열차집중제어장치(CTC) 역할',
      '신호 케이블 종류',
    ],
    tier3: [
      'ETCS Level 1/2/3 비교',
      '위치검지 방식 (궤도회로/발리스)',
    ],
  },
  {
    id: 7, name: '철도안전법', icon: '🛡️',
    tier1: [
      '철도안전관리체계 승인 및 변경 절차',
      '철도종사자 면허 종류 (운전면허 등급별 차이)',
      '중대사고 보고 기준 (즉시/48시간 이내)',
      '운행 제한 사유 및 절차',
      '안전관리자 선임 기준 및 자격',
    ],
    tier2: [
      '음주 측정 기준 (0.02%)',
      '위험물 취급 기준',
      '철도안전교육 대상 및 시간',
      '안전투자 의무화 규정',
    ],
    tier3: [
      '철도안전 종합계획 수립',
      '철도안전 감독 체계',
    ],
  },
];

const TIER_CONFIG = [
  {
    key: 'tier1' as const,
    label: '🔴 Tier 1',
    sublabel: '필수 암기 — 매회 출제',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  {
    key: 'tier2' as const,
    label: '🟡 Tier 2',
    sublabel: '자주 출제 — 확실히 알기',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-400',
  },
  {
    key: 'tier3' as const,
    label: '🟢 Tier 3',
    sublabel: '보충 학습 — 여유 있으면',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-400',
  },
];

export default function TopicMapPage() {
  const router = useRouter();
  const [openSubject, setOpenSubject] = useState<number | null>(1);
  const [openTier, setOpenTier] = useState<Record<number, string>>({ 1: 'tier1' });

  const toggleSubject = (id: number) => {
    setOpenSubject(prev => prev === id ? null : id);
  };

  const toggleTier = (subjectId: number, tierKey: string) => {
    setOpenTier(prev => ({
      ...prev,
      [subjectId]: prev[subjectId] === tierKey ? '' : tierKey,
    }));
  };

  return (
    <div className="min-h-full bg-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 안내 배너 */}
        <div className="bg-purple-900 text-white rounded-2xl p-5 mb-6">
          <p className="font-bold text-base mb-1">시험 전 반드시 확인하세요</p>
          <p className="text-xs text-purple-200 leading-relaxed">
            기출 분석 기반으로 출제 빈도순 정리했어요.<br/>
            🔴 Tier 1 → 🟡 Tier 2 → 🟢 Tier 3 순으로 학습하세요.
          </p>
        </div>

        {/* 과목별 아코디언 */}
        <div className="space-y-3">
          {SUBJECTS.map((subject) => {
            const isOpen = openSubject === subject.id;
            const tier1Count = subject.tier1.length;
            const totalCount = subject.tier1.length + subject.tier2.length + subject.tier3.length;

            return (
              <div key={subject.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* 과목 헤더 */}
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{subject.icon}</span>
                    <div className="text-left">
                      <p className="font-bold text-gray-800 text-sm">{subject.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Tier 1 핵심 {tier1Count}개 · 전체 {totalCount}개
                      </p>
                    </div>
                  </div>
                  <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>

                {/* 펼쳐진 내용 */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4">
                    {/* CBT 바로가기 */}
                    <div className="flex justify-end pt-3 pb-1">
                      <button
                        onClick={() => router.push(`/cbt/${subject.id}`)}
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-semibold hover:bg-purple-200 transition"
                      >
                        ✏️ CBT 문제풀기
                      </button>
                    </div>

                    {/* Tier 아코디언 */}
                    <div className="space-y-2 mt-1">
                      {TIER_CONFIG.map((tier) => {
                        const items = subject[tier.key];
                        const isTierOpen = openTier[subject.id] === tier.key;

                        return (
                          <div key={tier.key} className={`rounded-xl border ${tier.border} overflow-hidden`}>
                            <button
                              onClick={() => toggleTier(subject.id, tier.key)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 ${tier.bg} transition`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.badge}`}>
                                  {tier.label}
                                </span>
                                <span className="text-xs text-gray-500">{tier.sublabel}</span>
                              </div>
                              <span className="text-xs text-gray-400 font-semibold">{items.length}개 {isTierOpen ? '▲' : '▼'}</span>
                            </button>

                            {isTierOpen && (
                              <div className="px-4 py-3 space-y-2 bg-white">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <span className={`w-2 h-2 rounded-full ${tier.dot} mt-1.5 shrink-0`} />
                                    <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 하단 학습 팁 */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-700 text-sm mb-3">📌 학습 전략</p>
          <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
            <p>🔴 <span className="font-semibold text-gray-700">Tier 1 먼저:</span> 전 과목 Tier 1만 빠르게 1회독 → 40점 이상 보장</p>
            <p>🟡 <span className="font-semibold text-gray-700">Tier 2 병행:</span> 스토리 학습 후 CBT로 Tier 2 확인 → 60점 달성</p>
            <p>🟢 <span className="font-semibold text-gray-700">Tier 3 여유:</span> 시험 전날 빠르게 훑기 → 80점 목표</p>
          </div>
        </div>
      </div>
    </div>
  );
}
