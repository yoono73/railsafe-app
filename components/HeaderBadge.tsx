'use client';

import { usePathname } from 'next/navigation';

export default function HeaderBadge() {
  const pathname = usePathname();

  // /kibchul/.../concept 경로는 핵심개념 문제
  const isConcept = pathname.includes('/concept');

  if (isConcept) {
    return (
      <span className="text-xs bg-orange-700 px-2 py-0.5 rounded-full ml-1">핵심개념</span>
    );
  }

  return (
    <span className="text-xs bg-orange-700 px-2 py-0.5 rounded-full ml-1">기출문제</span>
  );
}
