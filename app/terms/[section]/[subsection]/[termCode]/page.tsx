'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { findSection, findSubsection } from '@/lib/terms-types';
import type { Term } from '@/lib/terms-types';
import { createClient } from '@/lib/supabase/client';

export default function TermDetailPage() {
  const params = useParams();
  const router = useRouter();
  const section    = params.section    as string;
  const subsection = params.subsection as string;
  const termCode   = params.termCode   as string;
  const sectionMeta    = findSection(section);
  const subsectionMeta = findSubsection(section, subsection);

  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('concepts')
      .select('*')
      .eq('concept_code', termCode)
      .single()
      .then(({ data }) => {
        setTerm(data as Term | null);
        setLoading(false);
      });
  }, [termCode]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 text-sm shrink-0 flex-wrap">
        <button onClick={() => router.push('/terms')} className="text-gray-400 hover:text-gray-600 transition">
          ← 철도용어
        </button>
        <span className="text-gray-200">›</span>
        {sectionMeta && (
          <>
            <button
              onClick={() => router.push(`/terms/${section}/${subsection}`)}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              {sectionMeta.icon} {sectionMeta.label}
            </button>
            <span className="text-gray-200">›</span>
          </>
        )}
        {subsectionMeta && (
          <>
            <button
              onClick={() => router.push(`/terms/${section}/${subsection}`)}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              {subsectionMeta.label}
            </button>
            <span className="text-gray-200">›</span>
          </>
        )}
        <span className="font-medium text-gray-700 text-xs truncate">
          {term?.term_ko ?? '…'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-xl">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 animate-pulse">
              <div><div className="h-2 bg-gray-100 rounded w-16 mb-2" /><div className="h-5 bg-gray-100 rounded w-1/2" /></div>
              <div><div className="h-2 bg-gray-100 rounded w-20 mb-2" /><div className="h-4 bg-gray-50 rounded w-2/3" /></div>
              <div><div className="h-2 bg-gray-100 rounded w-16 mb-2" /><div className="h-3 bg-gray-50 rounded w-full mb-1" /><div className="h-3 bg-gray-50 rounded w-4/5" /></div>
            </div>
          ) : !term ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              용어를 찾을 수 없습니다.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">용어 (한국어)</p>
                <p className="text-xl font-bold text-gray-800">{term.term_ko}</p>
              </div>
              {term.term_en && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">영문명</p>
                  <p className="text-sm text-gray-600">{term.term_en}</p>
                </div>
              )}
              {term.term_abbr && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">약어</p>
                  <p className="text-sm font-mono text-purple-600">{term.term_abbr}</p>
                </div>
              )}
              {term.definition_short && (
                <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                  <p className="text-xs text-purple-500 mb-1">한 줄 정의</p>
                  <p className="text-sm text-purple-800 font-medium">{term.definition_short}</p>
                </div>
              )}
              {term.term_definition && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">상세 정의</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{term.term_definition}</p>
                </div>
              )}
              {term.confusing_terms && (
                <div className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                  <p className="text-xs text-orange-500 mb-1">⚠️ 혼동 주의</p>
                  <p className="text-xs text-orange-700">{term.confusing_terms}</p>
                </div>
              )}
              {term.memo && (
                <div className="bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-100">
                  <p className="text-xs text-yellow-700">{term.memo}</p>
                </div>
              )}
              {term.source_html && (
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-50">
                  출처: {term.source_html}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
