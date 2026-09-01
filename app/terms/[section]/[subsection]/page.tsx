'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { findSection, findSubsection, TERM_SECTIONS } from '@/lib/terms-types';
import type { Term } from '@/lib/terms-types';
import { createClient } from '@/lib/supabase/client';

/* subsection별 대표 이미지 */
const SUBSECTION_IMAGES: Record<string, { src: string; alt: string }> = {
  'train-operation/track-station': {
    src: '/theory/images/railway-track-terms.png',
    alt: '철도 선로 용어 관계도',
  },
};

export default function TermsSubsectionPage() {
  const params = useParams();
  const router = useRouter();
  const section    = params.section    as string;
  const subsection = params.subsection as string;
  const sectionMeta    = findSection(section);
  const subsectionMeta = findSubsection(section, subsection);

  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('concepts')
      .select('*')
      .eq('term_section', section)
      .eq('term_subsection', subsection)
      .order('term_order', { ascending: true, nullsFirst: false })
      .order('term_ko', { ascending: true })
      .then(({ data }) => {
        setTerms((data as Term[]) || []);
        setLoading(false);
      });
  }, [section, subsection]);

  if (!sectionMeta || !subsectionMeta) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-sm">분류를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const heroImage = SUBSECTION_IMAGES[`${section}/${subsection}`];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 상단 breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 text-sm shrink-0">
        <button onClick={() => router.push('/terms')} className="text-gray-400 hover:text-gray-600 transition">
          ← 철도용어
        </button>
        <span className="text-gray-200">›</span>
        <span className="text-gray-500">{sectionMeta.icon} {sectionMeta.label}</span>
        <span className="text-gray-200">›</span>
        <span className="font-medium text-gray-700 truncate">{subsectionMeta.label}</span>
        <select
          className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer"
          value={`${section}/${subsection}`}
          onChange={(e) => router.push(`/terms/${e.target.value}`)}
        >
          {TERM_SECTIONS.flatMap((sec) =>
            sec.subsections.map((ss) => (
              <option key={`${sec.slug}/${ss.slug}`} value={`${sec.slug}/${ss.slug}`}>
                {sec.label} › {ss.label}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">

          {/* 대표 이미지 — 전체 너비, 여백 없음 */}
          {heroImage && (
            <div className="border-b border-gray-100 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage.src} alt={heroImage.alt} className="w-full h-auto" />
            </div>
          )}

          {/* 용어 카드 2열 그리드 */}
          <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-50 rounded w-2/3" />
                  <div className="h-10 bg-purple-50 rounded" />
                </div>
              ))}
            </div>
          ) : terms.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              아직 등록된 용어가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {terms.map((term) => (
                <div
                  key={term.concept_code}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3"
                >
                  {/* 용어명 */}
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">용어</p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl font-bold text-gray-800">{term.term_ko}</span>
                      {term.term_abbr && (
                        <span className="text-sm font-mono text-purple-500">{term.term_abbr}</span>
                      )}
                    </div>
                    {term.term_en && (
                      <p className="text-sm text-gray-400 mt-0.5">{term.term_en}</p>
                    )}
                  </div>

                  {/* 한 줄 정의 */}
                  {term.definition_short && (
                    <div className="bg-purple-50 rounded-lg px-3 py-2.5 border border-purple-100">
                      <p className="text-xs text-purple-400 mb-1">한 줄 정의</p>
                      <p className="text-base text-purple-800 font-medium leading-relaxed">
                        {term.definition_short}
                      </p>
                    </div>
                  )}

                  {/* 상세 정의 */}
                  {term.term_definition && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">상세 정의</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{term.term_definition}</p>
                    </div>
                  )}

                  {/* 혼동 주의 */}
                  {term.confusing_terms && (
                    <div className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                      <p className="text-xs text-orange-400 mb-0.5">⚠️ 혼동 주의</p>
                      <p className="text-sm text-orange-700">{term.confusing_terms}</p>
                    </div>
                  )}

                  {/* 메모 */}
                  {term.memo && (
                    <div className="bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-100">
                      <p className="text-sm text-yellow-700">{term.memo}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>

      </div>
    </div>
  );
}
