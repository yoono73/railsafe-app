'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { findSection, findSubsection, TERM_SECTIONS } from '@/lib/terms-types';

export default function TermsSubsectionPage() {
  const params = useParams();
  const router = useRouter();
  const section    = params.section    as string;
  const subsection = params.subsection as string;
  const sectionMeta    = findSection(section);
  const subsectionMeta = findSubsection(section, subsection);

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
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700">
            🚧 용어 데이터 준비 중. Supabase concepts 테이블에 term_* 필드 등록 후 표시됩니다.
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-2 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-2 bg-gray-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
