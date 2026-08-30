'use client';

import Link from 'next/link';
import { TERM_SECTIONS } from '@/lib/terms-types';

export default function TermsIndexPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 shrink-0">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>📖</span> 철도용어 사전
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          철도교통안전관리자 시험 핵심 용어 — 5대 분류 · 13개 중분류
        </p>
      </div>

      {/* 분류 카드 목록 */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        {TERM_SECTIONS.map((sec) => (
          <div key={sec.slug} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* 섹션 헤더 */}
            <div className="bg-purple-50 px-4 py-3 flex items-center gap-2 border-b border-purple-100">
              <span className="text-xl">{sec.icon}</span>
              <span className="font-semibold text-purple-800 text-sm">{sec.label}</span>
              <span className="ml-auto text-xs text-purple-400">
                {sec.subsections.length}개 분류
              </span>
            </div>

            {/* 중분류 링크 */}
            <ul className="divide-y divide-gray-50">
              {sec.subsections.map((ss) => (
                <li key={ss.slug}>
                  <Link
                    href={`/terms/${sec.slug}/${ss.slug}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-sm text-gray-700 group-hover:text-purple-700">
                      {ss.label}
                    </span>
                    <span className="text-gray-300 group-hover:text-purple-400 text-xs">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
