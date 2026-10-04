'use client';
import { useState, useEffect } from 'react';

export default function NewTheoryPage() {
  const [cacheBuster] = useState(() => Date.now());
  const [urlHash, setUrlHash] = useState('');

  useEffect(() => {
    setUrlHash(window.location.hash);
    const onHashChange = () => setUrlHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <iframe
      key={cacheBuster}
      src={`/theory/new_4.html${urlHash}`}
      className="w-full border-0"
      style={{ height: 'calc(100vh - 56px)' }}
      title="GATE5 new_철도공학"
    />
  );
}
