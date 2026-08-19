// lib/kibchul-attempts.ts
// kibchul_attempts 테이블 CRUD 유틸리티 (브라우저 전용)
// ⚠️ 비로그인 시 모든 함수는 no-op(로컬 동작 유지)

import { createClient } from '@/lib/supabase/client';

const LS_WRONG = 'kibchul_wrong';

// ─── 타입 ────────────────────────────────────────────────────────
export interface AttemptPayload {
  subject_id: number;
  session_id: string;
  kibchul_qid: string;   // lib/kibchul-data.ts의 id (절대 변경 금지)
  is_correct: boolean;
  selected: number;
  answer: number;
}

interface LocalWrongEntry {
  subjectId: number;
  sessionId: string;
  questionId: string;
  question: string;
  choices: string[];
  answer: number;
  selected: number;
  explanation: string;
  caution?: string;
  savedAt: string;
}

// ─── 오답 저장 (upsert) ──────────────────────────────────────────
export async function saveAttempt(payload: AttemptPayload): Promise<{ error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};   // 비로그인: 로컬 로직에 위임

    const { error } = await supabase
      .from('kibchul_attempts')
      .upsert(
        {
          user_id: user.id,
          subject_id: payload.subject_id,
          session_id: payload.session_id,
          kibchul_qid: payload.kibchul_qid,
          is_correct: payload.is_correct,
          selected: payload.selected,
          answer: payload.answer,
          attempted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,kibchul_qid' }
      );
    if (error) { console.error('[kibchul-attempts] saveAttempt:', error.message); return { error: error.message }; }
    return {};
  } catch (e) {
    console.error('[kibchul-attempts] saveAttempt exception:', e);
    return { error: String(e) };
  }
}

// ─── 오답 제거 (정답으로 바뀔 때) ───────────────────────────────
export async function removeAttempt(kibchul_qid: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { error } = await supabase
      .from('kibchul_attempts')
      .delete()
      .eq('user_id', user.id)
      .eq('kibchul_qid', kibchul_qid);
    if (error) { console.error('[kibchul-attempts] removeAttempt:', error.message); return { error: error.message }; }
    return {};
  } catch (e) {
    console.error('[kibchul-attempts] removeAttempt exception:', e);
    return { error: String(e) };
  }
}

// ─── 오답 조회 ───────────────────────────────────────────────────
export async function loadWrongAttempts(subject_id?: number): Promise<{
  data: { kibchul_qid: string; subject_id: number; session_id: string; selected: number; answer: number }[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [] };

    let q = supabase
      .from('kibchul_attempts')
      .select('kibchul_qid, subject_id, session_id, selected, answer')
      .eq('user_id', user.id)
      .eq('is_correct', false);
    if (subject_id !== undefined) q = q.eq('subject_id', subject_id);

    const { data, error } = await q;
    if (error) { console.error('[kibchul-attempts] loadWrongAttempts:', error.message); return { data: [], error: error.message }; }
    return { data: data ?? [] };
  } catch (e) {
    console.error('[kibchul-attempts] loadWrongAttempts exception:', e);
    return { data: [], error: String(e) };
  }
}

// ─── 로컬 → 서버 이관 (최초 1회) ───────────────────────────────
export async function migrateLocalToServer(): Promise<{ count: number; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: '로그인 필요' };

    const raw = localStorage.getItem(LS_WRONG);
    if (!raw) return { count: 0 };
    const entries: LocalWrongEntry[] = JSON.parse(raw);
    if (!entries.length) return { count: 0 };

    const rows = entries.map(e => ({
      user_id: user.id,
      subject_id: e.subjectId,
      session_id: e.sessionId,
      kibchul_qid: e.questionId,
      is_correct: false,
      selected: e.selected,
      answer: e.answer,
      attempted_at: e.savedAt || new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('kibchul_attempts')
      .upsert(rows, { onConflict: 'user_id,kibchul_qid' });
    if (error) { console.error('[kibchul-attempts] migrateLocalToServer:', error.message); return { count: 0, error: error.message }; }

    localStorage.removeItem(LS_WRONG);
    return { count: rows.length };
  } catch (e) {
    console.error('[kibchul-attempts] migrateLocalToServer exception:', e);
    return { count: 0, error: String(e) };
  }
}
