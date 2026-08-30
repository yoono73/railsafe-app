/** 철도용어 타입 정의 */

export interface Term {
  /** concepts.id — 기존 UUID 재사용 */
  id: string;
  /** 기존 concept_code 그대로 사용 */
  concept_code: string;
  subject_id: number;
  term_ko: string;
  term_en?: string | null;
  term_abbr?: string | null;
  term_definition?: string | null;
  term_section: string;
  term_subsection: string;
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

export const TERM_SECTIONS: TermSectionMeta[] = [
  {
    slug: 'track',
    label: '선로·시설',
    icon: '🛤️',
    subsections: [
      { slug: 'rail-structure', label: '레일·선로 구조' },
      { slug: 'facility',       label: '역·시설물' },
      { slug: 'earthwork',      label: '토공·교량·터널' },
    ],
  },
  {
    slug: 'vehicle',
    label: '차량·기계',
    icon: '🚆',
    subsections: [
      { slug: 'traction',  label: '동력·견인' },
      { slug: 'brake',     label: '제동 장치' },
      { slug: 'car-body',  label: '차체·대차' },
    ],
  },
  {
    slug: 'signal',
    label: '신호·통신',
    icon: '🚦',
    subsections: [
      { slug: 'track-circuit',  label: '궤도회로·검지' },
      { slug: 'signal-device',  label: '신호기·지시' },
      { slug: 'protection',     label: '열차방호·ATC·ATS' },
      { slug: 'telecom',        label: '통신·무선' },
    ],
  },
  {
    slug: 'operation',
    label: '운전·운행',
    icon: '🚇',
    subsections: [
      { slug: 'driving',   label: '운전 기초' },
      { slug: 'schedule',  label: '다이어·운행 계획' },
      { slug: 'incident',  label: '사고·장애 대응' },
    ],
  },
  {
    slug: 'regulation',
    label: '법규·안전',
    icon: '📋',
    subsections: [
      { slug: 'safety-law',   label: '철도안전법 용어' },
      { slug: 'industry-law', label: '철도산업기본법 용어' },
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
