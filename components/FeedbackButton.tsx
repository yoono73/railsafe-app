'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'general' | 'bug'>('general');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      type,
      rating: type === 'general' ? (rating || null) : null,
      content: content.trim(),
    });
    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setOpen(false);
      setContent('');
      setRating(0);
      setType('general');
    }, 1800);
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 bg-purple-600 hover:bg-purple-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all hover:scale-110"
        title="의견 보내기"
      >
        <span className="text-xl">💬</span>
      </button>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            {done ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🙏</div>
                <p className="text-lg font-bold text-purple-700">감사합니다!</p>
                <p className="text-sm text-gray-500 mt-1">소중한 의견 잘 받았어요.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-base">의견 보내기</h3>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* 타입 선택 */}
                <div className="flex gap-2 mb-4">
                  {([['general', '💡 기능 의견'], ['bug', '🐛 버그 신고']] as const).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setType(v)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                        type === v ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'
                      }`}
                    >{label}</button>
                  ))}
                </div>

                {/* 별점 (general만) */}
                {type === 'general' && (
                  <div className="flex gap-1 mb-4 justify-center">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setRating(n)} className="text-2xl transition-transform hover:scale-125">
                        {n <= rating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                )}

                {/* 내용 */}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={type === 'general' ? '앱을 쓰면서 어떠셨나요? 개선할 점을 알려주세요.' : '어떤 버그가 있었나요? 상황을 설명해주세요.'}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 h-24"
                />

                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className={`mt-3 w-full py-3 rounded-xl text-sm font-bold transition ${
                    content.trim() && !submitting
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? '전송 중...' : '전송하기'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
