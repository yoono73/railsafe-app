'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ADMIN_EMAIL = 'yoono73@gmail.com';

interface Announcement {
  id: string; title: string; content: string;
  is_pinned: boolean; created_at: string;
}
interface FeedbackItem {
  id: number; type: string; rating: number | null;
  content: string; user_email: string | null;
  report_reason: string | null; question_id: number | null;
  status: string; created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'notices' | 'feedback'>('notices');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // 공지사항
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  // 피드백
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'general' | 'bug' | 'question_report'>('all');

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/dashboard');
        return;
      }
      setAuthorized(true);

      const [{ data: n }, { data: f }] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      ]);
      if (n) setNotices(n as Announcement[]);
      if (f) setFeedbackList(f as FeedbackItem[]);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleAddNotice = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from('announcements')
      .insert({ title: newTitle.trim(), content: newContent.trim(), is_pinned: isPinned })
      .select().single();
    if (data) setNotices(prev => [data as Announcement, ...prev]);
    setNewTitle(''); setNewContent(''); setIsPinned(false);
    setSaving(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('공지를 삭제할까요?')) return;
    const supabase = createClient();
    await supabase.from('announcements').delete().eq('id', id);
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  const handleTogglePin = async (id: string, current: boolean) => {
    const supabase = createClient();
    await supabase.from('announcements').update({ is_pinned: !current }).eq('id', id);
    setNotices(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !current } : n));
  };

  const handleFeedbackStatus = async (id: number, status: string) => {
    const supabase = createClient();
    await supabase.from('feedback').update({ status }).eq('id', id);
    setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const filteredFeedback = feedbackFilter === 'all'
    ? feedbackList
    : feedbackList.filter(f => f.type === feedbackFilter);

  const feedbackCounts = {
    all: feedbackList.length,
    general: feedbackList.filter(f => f.type === 'general').length,
    bug: feedbackList.filter(f => f.type === 'bug').length,
    question_report: feedbackList.filter(f => f.type === 'question_report').length,
    new: feedbackList.filter(f => f.status === 'new').length,
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <p className="text-purple-600">로딩 중...</p>
    </div>
  );
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <span className="font-bold">관리자 페이지</span>
          <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full font-bold">ADMIN</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-purple-300 hover:text-white transition">
          ← 대시보드
        </button>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6 max-w-4xl mx-auto">
          {([['notices', '📢 공지사항 관리'], ['feedback', `💬 피드백 (${feedbackCounts.new}건 신규)`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-3 text-sm font-semibold border-b-2 transition ${tab === key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ===== 공지사항 탭 ===== */}
        {tab === 'notices' && (
          <div className="space-y-6">
            {/* 새 공지 작성 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">새 공지 작성</h2>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="제목"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="내용"
                rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                  📌 상단 고정
                </label>
                <button
                  onClick={handleAddNotice}
                  disabled={!newTitle.trim() || !newContent.trim() || saving}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${
                    newTitle.trim() && newContent.trim() && !saving
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? '저장 중...' : '공지 등록'}
                </button>
              </div>
            </div>

            {/* 공지 목록 */}
            <div>
              <h2 className="font-bold text-gray-700 mb-3 text-sm">등록된 공지 ({notices.length}건)</h2>
              {notices.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">등록된 공지가 없어요</div>
              ) : (
                <div className="space-y-3">
                  {notices.map(n => (
                    <div key={n.id} className="bg-white rounded-2xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {n.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">📌 고정</span>}
                            <p className="font-semibold text-gray-800 text-sm truncate">{n.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{n.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleTogglePin(n.id, n.is_pinned)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${n.is_pinned ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >{n.is_pinned ? '고정 해제' : '고정'}</button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold transition"
                          >삭제</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 피드백 탭 ===== */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            {/* 요약 카드 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '전체', count: feedbackCounts.all, color: 'text-gray-700 bg-gray-100' },
                { label: '💡 의견', count: feedbackCounts.general, color: 'text-purple-700 bg-purple-50' },
                { label: '🐛 버그', count: feedbackCounts.bug, color: 'text-orange-700 bg-orange-50' },
                { label: '🚩 신고', count: feedbackCounts.question_report, color: 'text-red-700 bg-red-50' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs">{label}</p>
                </div>
              ))}
            </div>

            {/* 필터 */}
            <div className="flex gap-2 flex-wrap">
              {([['all', '전체'], ['general', '💡 의견'], ['bug', '🐛 버그'], ['question_report', '🚩 문제신고']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setFeedbackFilter(v)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${feedbackFilter === v ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* 피드백 목록 */}
            {filteredFeedback.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">피드백이 없어요</div>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map(f => (
                  <div key={f.id} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${f.status === 'new' ? 'border-purple-400' : f.status === 'reviewed' ? 'border-blue-300' : 'border-green-300'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            f.type === 'general' ? 'bg-purple-100 text-purple-700'
                            : f.type === 'bug' ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                          }`}>
                            {f.type === 'general' ? '💡 의견' : f.type === 'bug' ? '🐛 버그' : '🚩 신고'}
                          </span>
                          {f.rating && <span className="text-xs text-yellow-600">{'⭐'.repeat(f.rating)}</span>}
                          {f.question_id && <span className="text-xs text-gray-500">문제 #{f.question_id} · {f.report_reason}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'new' ? 'bg-red-50 text-red-500' : f.status === 'reviewed' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                            {f.status === 'new' ? '신규' : f.status === 'reviewed' ? '검토중' : '완료'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{f.content}</p>
                        <p className="text-xs text-gray-400">{f.user_email ?? '익명'} · {new Date(f.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                      <select
                        value={f.status}
                        onChange={e => handleFeedbackStatus(f.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg p-1 text-gray-600 focus:outline-none"
                      >
                        <option value="new">신규</option>
                        <option value="reviewed">검토중</option>
                        <option value="resolved">완료</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
