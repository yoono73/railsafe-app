/**
 * 철도용어 타입 정의 — Concept 데이터 모델 기반
 *
 * 기존 Concept 테이블에 아래 6개 필드가 추가된 모델을 사용한다:
 *   term_section, term_subsection, term_order,
 *   definition_short, visual_type, confusing_terms
 *
 * termCode: UUID가 아닌 concept_code 사용
 */

export interface Term {
  /** concepts.concept_code — 문자열 코드 PK */
  concept_code: string;
  term_ko: string;
  term_en?: string | null;
  term_abbr?: string | null;
  term_definition?: string | null;
  /** 대분류 slug */
  term_section: string;
  /** 중분류 slug */
  term_subsection: string;
  /** 정렬 순서 */
  term_order?: number | null;
  /** 한 줄 요약 정의 (시험용) */
  definition_short?: string | null;
  /** 시각 자료 유형 (table / formula / diagram / null) */
  visual_type?: string | null;
  /** 혼동하기 쉬운 관련 용어 */
  confusing_terms?: string | null;
  /** 출처 HTML 파일 (예: "4.html") */
  source_html?: string | null;
  memo?: string | null;
}

export interface TermSectionMeta {
  slug: string;
  label: string;
  icon: string;
  subsections: TermSubsectionMeta[];
}

export interface TermSubsectionMeta {
  slug: string;
  label: string;
}

/** 4개 절 × 4개 중분류 = 16개 */
export const TERM_SECTIONS: TermSectionMeta[] = [
  {
    slug: 'track',
    label: '선로·시설',
    icon: '🛤️',
    subsections: [
      { slug: 'rail-structure', label: '레일·선로 구조' },
      { slug: 'curve-grade',   label: '곡선·구배·부대시설' },
      { slug: 'bridge-tunnel', label: '교량·터널·토공' },
      { slug: 'station',       label: '역·시설물' },
    ],
  },
  {
    slug: 'vehicle',
    label: '차량·전기',
    icon: '🚆',
    subsections: [
      { slug: 'traction',     label: '동력·견인·전기방식' },
      { slug: 'brake',        label: '제동 장치' },
      { slug: 'car-body',     label: '차체·대차·연결기' },
      { slug: 'performance',  label: '차량성능·저항' },
    ],
  },
  {
    slug: 'signal',
    label: '신호·운전',
    icon: '🚦',
    subsections: [
      { slug: 'signal-device', label: '신호기·폐색방식' },
      { slug: 'protection',    label: '열차방호·ATC·ATS' },
      { slug: 'driving',       label: '운전 기초·운행계획' },
      { slug: 'incident',      label: '사고·장애 대응' },
    ],
  },
  {
    slug: 'regulation',
    label: '법규·안전',
    icon: '📋',
    subsections: [
      { slug: 'safety-law',   label: '철도안전법 용어' },
      { slug: 'industry-law', label: '철도산업기본법 용어' },
      { slug: 'traffic-law',  label: '교통안전법 용어' },
      { slug: 'standard',     label: '기술 기준·규격' },
    ],
  },
];

export function findSection(slug: string): TermSectionMeta | undefined {
  return TERM_SECTIONS.find(s => s.slug === slug);
}

export function findSubsection(
  sectionSlug: string,
  subsectionSlug: string,
): TermSubsectionMeta | undefined {
  return findSection(sectionSlug)?.subsections.find(ss => ss.slug === subsectionSlug);
}
