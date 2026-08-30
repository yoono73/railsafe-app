'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { findSection, findSubsection, TERM_SECTIONS } from '@/lib/terms-types';
import type { Term } from '@/lib/terms-types';
import { createClient } from '@/lib/supabase/client';

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
      .from('terms')
      .select('*')
      .eq('term_section', section)
      .eq('term_subsection', subsection)
      .order('term_ko')
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-2 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-2 bg-gray-50 rounded w-2/3" />
              </div>
            ))
          ) : terms.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              아직 등록된 용어가 없습니다.
            </div>
          ) : (
            terms.map((term) => (
              <Link
                key={term.id}
                href={`/terms/${section}/${subsection}/${term.id}`}
                className="block bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-2 hover:border-purple-200 hover:shadow transition-all"
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 text-sm">{term.term_ko}</span>
                  {term.term_abbr && (
                    <span className="text-xs font-mono text-purple-500">{term.term_abbr}</span>
                  )}
                  {term.term_en && (
                    <span className="text-xs text-gray-400">{term.term_en}</span>
                  )}
                </div>
                {term.term_definition && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{term.term_definition}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
