'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTheoryPage() {
  const [cacheBuster] = useState(() => Date.now());
  const [urlHash, setUrlHash] = useState('');
  const router = useRouter();

  useEffect(() => {
    setUrlHash(window.location.hash);
    const onHashChange = () => setUrlHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* 상단 바 */}
      <div className="px-4 py-2 flex items-center gap-2 text-sm border-b border-gray-100 bg-white shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          ← 대시보드
        </button>
        <span className="text-gray-200 shrink-0">›</span>
        <span className="font-medium text-gray-700">🆕 new_철도공학</span>
      </div>

      {/* new_4.html iframe — flex-1로 뷰포트 맞춤 */}
      <iframe
        key={cacheBuster}
        src={`/theory/new_4.html${urlHash}`}
        className="flex-1 w-full border-none min-h-0"
        title="GATE5 new_철도공학"
        loading="eager"
      />
    </div>
  );
}
