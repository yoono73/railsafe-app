-- kibchul_attempts: 기출문제 CBT 오답 동기화 테이블
-- 기존 attempts·questions 테이블 무손상 (별도 테이블)
-- 실행: Supabase Dashboard > SQL Editor > 붙여넣기 > Run

CREATE TABLE public.kibchul_attempts (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      int          NOT NULL,
  session_id      text         NOT NULL,
  kibchul_qid     text         NOT NULL,
  is_correct      bool         NOT NULL,
  selected        int,
  answer          int,
  attempted_at    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, kibchul_qid)
);

ALTER TABLE public.kibchul_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kibchul_attempts_select_own" ON public.kibchul_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "kibchul_attempts_insert_own" ON public.kibchul_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kibchul_attempts_update_own" ON public.kibchul_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "kibchul_attempts_delete_own" ON public.kibchul_attempts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_kibchul_attempts_user_subject
  ON public.kibchul_attempts(user_id, subject_id);

CREATE INDEX idx_kibchul_attempts_user_wrong
  ON public.kibchul_attempts(user_id) WHERE is_correct = false;

-- 실행 확인: SELECT * FROM kibchul_attempts LIMIT 1;
