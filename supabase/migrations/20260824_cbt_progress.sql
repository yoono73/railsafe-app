-- CBT 진행상황 클라우드 저장 테이블
-- 기기 간 이어풀기를 위해 Supabase에 저장
-- subject_id 기준: 200=교통안전관리론, 201=철도안전법, 202=철도산업기본법, ...

CREATE TABLE IF NOT EXISTS cbt_progress (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  subject_id    int  NOT NULL,
  question_ids  jsonb NOT NULL DEFAULT '[]',
  current_index int  NOT NULL DEFAULT 0,
  answers       jsonb NOT NULL DEFAULT '[]',
  filter_grade  text NOT NULL DEFAULT 'ALL',
  filter_part   int  NOT NULL DEFAULT 0,
  shuffle_q     boolean NOT NULL DEFAULT true,
  saved_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, subject_id)
);

ALTER TABLE cbt_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_progress"
  ON cbt_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
