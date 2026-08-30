'use client';

import { useParams, useRouter } from 'next/navigation';
import { findSection, findSubsection } from '@/lib/terms-types';

export default function TermDetailPage() {
  const params = useParams();
  const router = useRouter();
  const section    = params.section    as string;
  const subsection = params.subsection as string;
  const termCode   = params.termCode   as string;

  const sectionMeta    = findSection(section);
  const subsectionMeta = findSubsection(section, subsection);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 브레드크럼 */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 text-sm shrink-0 flex-wrap">
        <button
          onClick={() => router.push('/terms')}
          className="text-gray-400 hover:text-gray-600 transition"
        >
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
        <span className="font-mono text-xs text-gray-500">{termCode}</span>
      </div>

      {/* 용어 상세 — 플레이스홀더 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700">
            🚧 용어 상세 데이터가 준비 중입니다. concepts 테이블의 term_* 필드가 채워지면 자동으로 표시됩니다.
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 animate-pulse">
            {/* 용어명 */}
            <div>
              <div className="h-2 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-5 bg-gray-100 rounded w-1/2" />
            </div>
            {/* 영문 */}
            <div>
              <div className="h-2 bg-gray-100 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-50 rounded w-2/3" />
            </div>
            {/* 정의 */}
            <div>
              <div className="h-2 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-full mb-1" />
              <div className="h-3 bg-gray-50 rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
