import { createClient } from '@/lib/supabase/server';
import GuidePageClient from '@/components/GuidePageClient';

export default async function GuidePage() {
  const supabase = await createClient();

  // ── 시험 ID 조회 ──────────────────────────────────────────
  const { data: exam } = await supabase
    .from('exams')
    .select('id')
    .eq('name', '철도교통안전관리자')
    .single();

  // ── 과목 + 유형 + 진입가이드 (1층·2층) ───────────────────
  const { data: rawSubjects } = await supabase
    .from('exam_subjects')
    .select(`
      id, name, icon, question_count, display_order, theory_url,
      subject_types ( id, code, name, description ),
      subject_entry_guides (
        entry_difficulty, must_know_terms, must_know_terms_extended,
        three_walls, why_this_subject, real_world_context,
        foundation_steps, prep_days, day_one_guide, common_mistake
      )
    `)
    .eq('exam_id', exam?.id ?? 0)
    .order('display_order');

  const subjects = rawSubjects ?? [];

  // ── 전략 매트릭스 (3층·4층) ───────────────────────────────
  const typeIds = [...new Set(subjects.map(s => (s.subject_types as any)?.id).filter(Boolean))];

  const { data: rawStrategies } = await supabase
    .from('principle_strategies')
    .select(`
      subject_type_id, how_to_apply, priority,
      timing_guide, wrong_pattern, effect_timeline,
      brain_principles ( name, tagline, icon, application_type )
    `)
    .in('subject_type_id', typeIds.length ? typeIds : [0])
    .lte('priority', 2)
    .order('priority');

  const strategies = rawStrategies ?? [];

  return (
    <GuidePageClient
      subjects={subjects as any}
      strategies={strategies as any}
    />
  );
}
