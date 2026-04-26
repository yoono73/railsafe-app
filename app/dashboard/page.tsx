import { createClient } from '@/lib/supabase/server';

const SUBJECTS = [
  { id: 1, name: '교통안전관리론', color: 'bg-purple-100 text-purple-900', icon: '📊' },
  { id: 2, name: '교통안전법', color: 'bg-blue-100 text-blue-900', icon: '⚖️' },
  { id: 3, name: '열차운전', color: 'bg-amber-100 text-amber-900', icon: '🚆' },
  { id: 4, name: '철도공학', color: 'bg-green-100 text-green-900', icon: '🔧' },
  { id: 5, name: '철도산업기본법', color: 'bg-teal-100 text-teal-900', icon: '📋' },
  { id: 6, name: '철도신호', color: 'bg-red-100 text-red-900', icon: '🚦' },
  { id: 7, name: '철도안전법', color: 'bg-slate-100 text-slate-900', icon: '🛡️' },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: progress } = await supabase
    .from('progress_tracking')
    .select('subject_id, chapter_number, status');

  const doneSet = new Set(
    (progress || []).filter(p => p.status === 'completed').map(p => p.subject_id)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-800 mb-2">학습 현황</h1>
      <p className="text-zinc-500 text-sm mb-6">시험일 D-56 · 2026.06.21</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SUBJECTS.map(s => (
          <div key={s.id} className={`bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 hover:shadow-md transition cursor-pointer`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              {doneSet.has(s.id) && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">완료</span>}
            </div>
            <p className="font-semibold text-zinc-800">{s.name}</p>
            <div className="mt-3 flex gap-2">
              <button className="text-xs bg-purple-900 text-white px-3 py-1.5 rounded-lg hover:bg-purple-800 transition">
                스토리
              </button>
              <button className="text-xs bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition">
                CBT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}