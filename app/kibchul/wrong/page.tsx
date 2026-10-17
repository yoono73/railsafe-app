'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { loadWrongAttempts, removeAttempt } from '@/lib/kibchul-attempts';
import { TRAFFIC_EXAM } from '@/lib/traffic-exam-data';
import { SAFETY_EXAM } from '@/lib/safety-exam-data';
import { INDUSTRY_EXAM } from '@/lib/industry-exam-data';
import { SIGNAL_EXAM } from '@/lib/signal-exam-data';
import { engineeringQuestions } from '@/lib/engineering-exam-data';
import { managementQuestions } from '@/lib/management-exam-data';
import { allRailwayKingQuestions } from '@/lib/railway-king-data';

// ─── 과목 정보 ───────────────────────────────────────────────────
const SUBJECT_LABELS: Record<number, string> = {
  300: '철도왕 철도공학',
  307: '철도왕 철도안전법',
  201: '교통안전관리론 개념',
  202: '교통안전법 개념',
  203: '열차운전 개념',
  204: '철도공학 개념',
  205: '철도산업기본법 개념',
  206: '철도신호 개념',
  207: '철도안전법 개념',
};

// sid(핵심정리 과목 id) → 해당하는 concept subject_ids + rk subject_ids
const SID_TO_SUBJECTS: Record<number, { conceptIds: number[]; rkIds: number[] }> = {
  1: { conceptIds: [201], rkIds: [] },
  2: { conceptIds: [202], rkIds: [] },
  3: { conceptIds: [203], rkIds: [] },
  4: { conceptIds: [204], rkIds: [300] },
  5: { conceptIds: [205], rkIds: [] },
  7: { conceptIds: [207], rkIds: [307] },
};

// ─── 내부 타입 ────────────────────────────────────────────────────
interface WrongItem {
  qid: string;
  subject_id: number;
  session_id: string;
  question: string;
  choices: string[];
  answer: number;   // 1-indexed for most, 0-indexed for RK
  selected: number;
  explanation: string;
  isRk: boolean;
}

// ─── 로컬 데이터 맵 빌드 ─────────────────────────────────────────
const trafficMap = new Map(TRAFFIC_EXAM.map(q => [q.id, q]));
const safetyMap = new Map(SAFETY_EXAM.map(q => [q.id, q]));
const industryMap = new Map(INDUSTRY_EXAM.map(q => [q.id, q]));
const signalMap = new Map(SIGNAL_EXAM.map(q => [q.id, q]));
const enggMap = new Map(engineeringQuestions.map(q => [`engg_${q.id}`, q]));
const mgmtMap = new Map(managementQuestions.map(q => [`mgmt_${q.id}`, q]));
const rkMap = new Map(allRailwayKingQuestions.map(q => [q.id, q]));

function lookupLocal(qid: string, selected: number, answer: number, session_id: string, subject_id: number): WrongItem | null {
  // RK 패턴 (rk_* 접두사)
  if (qid.startsWith('rk_')) {
    const q = rkMap.get(qid);
    if (!q) return null;
    return {
      qid, subject_id, session_id,
      question: q.question,
      choices: [...q.choices],
      answer: q.answer,    // 0-indexed
      selected,
      explanation: q.explanation,
      isRk: true,
    };
  }
  // 철도공학 (engg_*)
  if (qid.startsWith('engg_')) {
    const q = enggMap.get(qid);
    if (!q) return null;
    return {
      qid, subject_id, session_id,
      question: q.question,
      choices: [...q.choices],
      answer,
      selected,
      explanation: q.explanation ?? '',
      isRk: false,
    };
  }
  // 철도운행관리 (mgmt_*)
  if (qid.startsWith('mgmt_')) {
    const q = mgmtMap.get(qid);
    if (!q) return null;
    return {
      qid, subject_id, session_id,
      question: q.question,
      choices: [...q.choices],
      answer: q.answer,
      selected,
      explanation: q.explanation ?? '',
      isRk: false,
    };
  }
  // 교통안전법
  const tq = trafficMap.get(qid);
  if (tq) return { qid, subject_id, session_id, question: tq.question, choices: [...tq.choices], answer: tq.answer, selected, explanation: tq.explanation ?? '', isRk: false };
  // 철도안전법 기출
  const sq = safetyMap.get(qid);
  if (sq) return { qid, subject_id, session_id, question: sq.question, choices: [...sq.choices], answer: sq.answer, selected, explanation: sq.explanation ?? '', isRk: false };
  // 철도산업기본법 기출
  const iq = industryMap.get(qid);
  if (iq) return { qid, subject_id, session_id, question: iq.question, choices: [...iq.choices], answer: iq.answer, selected, explanation: iq.explanation ?? '', isRk: false };
  // 철도신호 기출
  const sigq = signalMap.get(qid);
  if (sigq) return { qid, subject_id, session_id, question: sigq.question, choices: [...sigq.choices], answer: sigq.answer, selected, explanation: sigq.explanation ?? '', isRk: false };

  return null;
}

// ─── 개념문제: Supabase question_versions 조회 ───────────────────
async function fetchConceptQuestions(records: { qid: string; selected: number; answer: number; session_id: string; subject_id: number }[]): Promise<WrongItem[]> {
  if (!records.length) return [];
  const supabase = createClient();
  // qid is concept_UUID or concept_op_UUID; strip prefix to get actual UUID
  const idPairs = records.map(r => {
    const raw = r.qid.startsWith('concept_op_') ? r.qid.slice('concept_op_'.length)
               : r.qid.startsWith('concept_') ? r.qid.slice('concept_'.length)
               : r.qid;
    return { ...r, rawId: raw };
  });
  const rawIds = idPairs.map(p => p.rawId);
  const { data } = await supabase
    .from('question_versions')
    .select('id, question_text, choices, answer_idx, core_explanation')
    .in('id', rawIds);
  if (!data) return [];
  const qMap = new Map(data.map((d: { id: string; question_text: string; choices: { text: string }[]; answer_idx: number; core_explanation: string }) => [d.id, d]));
  return idPairs.flatMap(r => {
    const q = qMap.get(r.rawId);
    if (!q) return [];
    const choices: string[] = Array.isArray(q.choices)
      ? q.choices.map((c: { text: string } | string) => typeof c === 'string' ? c : c.text)
      : [];
    return [{
      qid: r.qid,
      subject_id: r.subject_id,
      session_id: r.session_id,
      question: q.question_text,
      choices,
      answer: q.answer_idx,
      selected: r.selected,
      explanation: q.core_explanation ?? '',
      isRk: false,
    }];
  });
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function WrongPage() {
  const searchParams = useSearchParams();
  const sid = Number(searchParams.get('sid') ?? '0') || null;
  const sidInfo = sid ? SID_TO_SUBJECTS[sid] ?? null : null;

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WrongItem[]>([]);
  const [filterSubject, setFilterSubject] = useState<number | 'ALL'>('ALL');
  const [retryQid, setRetryQid] = useState<string | null>(null);
  const [retrySelected, setRetrySelected] = useState<number | null>(null);
  const [retryRevealed, setRetryRevealed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);

    const { data: attempts } = await loadWrongAttempts();
    if (!attempts.length) { setItems([]); setLoading(false); return; }

    const conceptRecords: { qid: string; selected: number; answer: number; session_id: string; subject_id: number }[] = [];
    const localItems: WrongItem[] = [];

    for (const a of attempts) {
      const qid = a.kibchul_qid;
      // 핵심개념(concept_) + 철도왕(rk_)만 — 일반 기출 CBT 제외
      const isConcept = qid.startsWith('concept_');
      const isRk = qid.startsWith('rk_');
      if (!isConcept && !isRk) continue;

      // sid 필터: 해당 과목 subject_id 범위만
      if (sidInfo) {
        const allowed = isConcept
          ? sidInfo.conceptIds.includes(a.subject_id)
          : sidInfo.rkIds.includes(a.subject_id);
        if (!allowed) continue;
      }

      if (isConcept) {
        conceptRecords.push({ qid, selected: a.selected, answer: a.answer, session_id: a.session_id, subject_id: a.subject_id });
      } else {
        const item = lookupLocal(qid, a.selected, a.answer, a.session_id, a.subject_id);
        if (item) localItems.push(item);
      }
    }

    const conceptItems = await fetchConceptQuestions(conceptRecords);
    setItems([...localItems, ...conceptItems]);
    setLoading(false);
  }, [sidInfo]);

  useEffect(() => { load(); }, [load]);

  const handleRetry = (qid: string) => {
    setRetryQid(qid);
    setRetrySelected(null);
    setRetryRevealed(false);
  };

  const handleReveal = async () => {
    if (retrySelected === null || !retryQid) return;
    setRetryRevealed(true);
    const item = items.find(i => i.qid === retryQid);
    if (!item) return;
    const correct = retrySelected === item.answer;
    if (correct) {
      await removeAttempt(retryQid);
      setItems(prev => prev.filter(i => i.qid !== retryQid));
      setRetryQid(null);
      setRetrySelected(null);
      setRetryRevealed(false);
    }
  };

  const subjects = ['ALL' as const, ...Array.from(new Set(items.map(i => i.subject_id))).sort((a, b) => a - b)];
  const filtered = filterSubject === 'ALL' ? items : items.filter(i => i.subject_id === filterSubject);
  const retryItem = retryQid ? items.find(i => i.qid === retryQid) ?? null : null;

  // ─── 로그인 필요 ───────────────────────────────────────────────
  if (isLoggedIn === false) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '3em', marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: 8, color: '#374151' }}>로그인이 필요합니다</div>
        <div style={{ fontSize: '.9em', color: '#6b7280', marginBottom: 24 }}>오답 노트는 로그인 후 이용할 수 있습니다.<br/>오답 데이터가 서버에 자동 저장됩니다.</div>
        <a href="/auth/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#059669', color: '#fff', borderRadius: 8, fontWeight: 'bold', textDecoration: 'none', fontSize: '.95em' }}>
          로그인하기
        </a>
      </div>
    );
  }

  // ─── 로딩 ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '.95em' }}>오답 불러오는 중...</div>
      </div>
    );
  }

  // ─── 재풀기 모드 ───────────────────────────────────────────────
  if (retryItem) {
    const { choices, answer, isRk } = retryItem;
    const correctIdx = answer; // 0-indexed for RK, 1-indexed for others
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px', background: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => { setRetryQid(null); setRetrySelected(null); setRetryRevealed(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '.85em' }}>
            ← 목록으로
          </button>
          <span style={{ fontSize: '.8em', color: '#9ca3af' }}>{SUBJECT_LABELS[retryItem.subject_id] ?? `과목 ${retryItem.subject_id}`}</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: '.8em', color: '#6b7280', marginBottom: 8 }}>{retryItem.session_id}</div>
          <div style={{ fontSize: '1em', lineHeight: 1.7, fontWeight: 500 }}>{retryItem.question}</div>
        </div>

        {choices.map((c, i) => {
          const idx = isRk ? i : i + 1;
          let bg = '#fff', border = '#e5e7eb', color = '#1f2937', fontWeight: 'normal' | 'bold' = 'normal';
          if (retryRevealed) {
            if (idx === correctIdx) { bg = '#166534'; border = '#14532d'; color = '#fff'; fontWeight = 'bold'; }
            else if (idx === retrySelected) { bg = '#7f1d1d'; border = '#991b1b'; color = '#fff'; fontWeight = 'bold'; }
            else { bg = '#f3f4f6'; border = '#e5e7eb'; color = '#9ca3af'; }
          } else if (retrySelected === idx) {
            bg = '#ecfdf5'; border = '#059669'; color = '#065f46'; fontWeight = 'bold';
          }
          return (
            <button key={idx} disabled={retryRevealed}
              onClick={() => setRetrySelected(idx)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: 8,
                background: bg, border: `2px solid ${border}`, borderRadius: 8,
                cursor: retryRevealed ? 'default' : 'pointer', color, fontSize: '.92em', lineHeight: 1.5, fontWeight }}>
              <span style={{ fontWeight: 'bold', marginRight: 6 }}>
                {retryRevealed && idx === correctIdx ? '✅ ' : retryRevealed && idx === retrySelected ? '❌ ' : ''}{isRk ? `${i + 1}` : `${idx}`}.
              </span>{c}
            </button>
          );
        })}

        {retryRevealed && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', marginTop: 8, fontSize: '.88em', color: '#14532d' }}>
            <strong>정답: {isRk ? correctIdx + 1 : correctIdx}번 — {choices[isRk ? correctIdx : correctIdx - 1]}</strong>
            {retryItem.explanation && <div style={{ marginTop: 6 }}>{retryItem.explanation}</div>}
          </div>
        )}

        {!retryRevealed && (
          <button onClick={handleReveal} disabled={retrySelected === null}
            style={{ marginTop: 16, width: '100%', padding: '13px', background: retrySelected === null ? '#d1d5db' : '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: retrySelected === null ? 'default' : 'pointer', fontSize: '.95em' }}>
            정답 확인
          </button>
        )}
        {retryRevealed && retrySelected !== correctIdx && (
          <button onClick={() => { setRetrySelected(null); setRetryRevealed(false); }}
            style={{ marginTop: 8, width: '100%', padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: '.95em' }}>
            다시 풀기
          </button>
        )}
      </div>
    );
  }

  // ─── 목록 뷰 ──────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: 4 }}>
          📕 오답 재풀기
          {sid && sidInfo && (
            <span style={{ fontSize: '.75em', fontWeight: 'normal', marginLeft: 10, opacity: .9 }}>
              {sid === 1 ? '교통안전관리론' : sid === 2 ? '교통안전법' : sid === 3 ? '열차운전' : sid === 4 ? '철도공학' : sid === 5 ? '철도산업기본법' : '철도안전법'}
            </span>
          )}
        </div>
        <div style={{ fontSize: '.85em', opacity: .85 }}>핵심개념 + 철도왕 틀린 문제를 다시 풀어 마스터하세요</div>
        <div style={{ fontSize: '.8em', opacity: .7, marginTop: 4 }}>총 {items.length}문항 오답</div>
      </div>

      {/* 과목 필터 탭 */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {subjects.map(s => {
            const label = s === 'ALL' ? `전체 (${items.length})` : `${SUBJECT_LABELS[s] ?? `과목${s}`} (${items.filter(i => i.subject_id === s).length})`;
            const active = filterSubject === s;
            return (
              <button key={s} onClick={() => setFilterSubject(s)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${active ? '#7c3aed' : '#d1d5db'}`,
                  background: active ? '#7c3aed' : '#fff', color: active ? '#fff' : '#374151',
                  fontWeight: active ? 'bold' : 'normal', cursor: 'pointer', fontSize: '.82em' }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* 오답 없음 */}
      {items.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5em', marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 'bold', fontSize: '1.05em', color: '#15803d', marginBottom: 6 }}>오답이 없습니다!</div>
          <div style={{ fontSize: '.85em', color: '#6b7280' }}>모든 문제를 정확히 풀었거나 아직 시작하지 않았습니다.</div>
        </div>
      )}

      {/* 오답 목록 */}
      {filtered.map(item => {
        const { qid, question, choices, answer, selected, isRk, subject_id, session_id } = item;
        const selText = isRk ? choices[selected] : choices[selected - 1];
        const ansText = isRk ? choices[answer] : choices[answer - 1];
        return (
          <div key={qid} style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: '.75em', color: '#7c3aed', fontWeight: 'bold', marginBottom: 2 }}>
                  {SUBJECT_LABELS[subject_id] ?? `과목${subject_id}`}
                </div>
                <div style={{ fontSize: '.72em', color: '#9ca3af' }}>{session_id}</div>
              </div>
              <button onClick={() => handleRetry(qid)}
                style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.82em', fontWeight: 'bold', flexShrink: 0, marginLeft: 8 }}>
                다시 풀기
              </button>
            </div>
            <div style={{ fontSize: '.9em', fontWeight: 500, marginBottom: 10, lineHeight: 1.6 }}>
              {question.length > 80 ? question.slice(0, 80) + '…' : question}
            </div>
            <div style={{ fontSize: '.82em', color: '#ef4444', marginBottom: 2 }}>
              내 답: {isRk ? selected + 1 : selected}번 — {selText ?? '-'}
            </div>
            <div style={{ fontSize: '.82em', color: '#15803d' }}>
              정답: {isRk ? answer + 1 : answer}번 — {ansText ?? '-'}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && items.length > 0 && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px', fontSize: '.9em' }}>
          해당 과목의 오답이 없습니다.
        </div>
      )}
    </div>
  );
}
