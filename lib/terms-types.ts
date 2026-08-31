/**
 * 철도용어 타입 정의 — Concept 데이터 모델 기반
 *
 * 기존 Concept 테이블에 아래 6개 필드가 추가된 모델을 사용한다:
 *   term_section, term_subsection, term_order,
 *   definition_short, visual_type, confusing_terms
 *
 * termCode: UUID가 아닌 concept_code 사용
 * visual_type: 'TEXT' | 'VIS_GROUP' | 'VIS_SINGLE' | 'REUSE' | 'HOLD'
 * confusing_terms: concept_code 배열 (용어명 아님) / Supabase: text[]
 */

export type VisualType = 'TEXT' | 'VIS_GROUP' | 'VIS_SINGLE' | 'REUSE' | 'HOLD';

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
  /** 시각 자료 유형 */
  visual_type?: VisualType | null;
  /**
   * 대표 이미지 ID (visuals 테이블 PK, nullable UUID).
   * 상세 화면에서 대표 이미지 1장을 빠르게 렌더링하기 위한 용도.
   * 다대다 관계는 향후 concept_visuals 테이블에서 처리.
   * FK는 visuals 테이블 생성 시 추가 예정.
   */
  primary_visual_id?: string | null;
  /** 혼동하기 쉬운 관련 용어의 concept_code 배열 (Supabase: text[]) */
  confusing_terms?: string[] | null;
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

/**
 * 4절 / 16개 중분류 — 철도개론 제1장 목차 기준
 * 제1절 5개 + 제2절 4개 + 제3절 3개 + 제4절 4개 = 16개
 */
export const TERM_SECTIONS: TermSectionMeta[] = [
  {
    slug: 'train-operation',
    label: '열차·차량 및 열차운영',
    icon: '🚆',
    subsections: [
      { slug: 'train-vehicle',   label: '열차 및 차량' },
      { slug: 'track-station',   label: '선로 및 정거장' },
      { slug: 'operation-mode',  label: '운전방식 및 운전형태' },
      { slug: 'signal-control',  label: '신호 및 제어' },
      { slug: 'safety-device',   label: '안전장치 및 운전보안' },
    ],
  },
  {
    slug: 'brake-block',
    label: '제동·속도·폐색·제어',
    icon: '🛑',
    subsections: [
      { slug: 'brake-speed',       label: '제동장치 및 운전속도' },
      { slug: 'block-safety',      label: '폐색 및 열차 간 안전 확보' },
      { slug: 'drive-control',     label: '운전제어 및 관제' },
      { slug: 'coupling-consist',  label: '차량 연결 및 편성' },
    ],
  },
  {
    slug: 'signal-switch',
    label: '신호기·선로전환기·운전보안설비',
    icon: '🚦',
    subsections: [
      { slug: 'signal-type',       label: '신호기 및 신호' },
      { slug: 'switch-shunting',   label: '선로전환기 및 입환' },
      { slug: 'safety-equipment',  label: '운전보안설비' },
    ],
  },
  {
    slug: 'control-metro',
    label: '관제운영·운전명령·도시철도',
    icon: '🏙️',
    subsections: [
      { slug: 'control-operation', label: '관제운영' },
      { slug: 'order-timetable',   label: '운전명령 및 시격표' },
      { slug: 'metro-specific',    label: '도시철도 특화 용어' },
      { slug: 'unmanned',          label: '무인운전' },
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
