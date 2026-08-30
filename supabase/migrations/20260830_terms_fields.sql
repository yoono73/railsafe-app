-- 철도용어 사전: concepts 테이블에 term_* 필드 6개 추가
-- 기존 concept_code / subject_id 그대로 재사용; 새 concept_code 생성 금지

ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS term_ko         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS term_en         VARCHAR(300),
  ADD COLUMN IF NOT EXISTS term_abbr       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term_definition TEXT,
  ADD COLUMN IF NOT EXISTS term_section    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term_subsection VARCHAR(50);

-- 인덱스: 분류별 목록 조회 성능
CREATE INDEX IF NOT EXISTS idx_concepts_term_section
  ON concepts (term_section, term_subsection)
  WHERE term_section IS NOT NULL;

-- 인덱스: 한국어 용어명 검색
CREATE INDEX IF NOT EXISTS idx_concepts_term_ko
  ON concepts (term_ko)
  WHERE term_ko IS NOT NULL;

COMMENT ON COLUMN concepts.term_ko         IS '한국어 용어명 (철도용어 사전용)';
COMMENT ON COLUMN concepts.term_en         IS '영어 용어명';
COMMENT ON COLUMN concepts.term_abbr       IS '약어 (예: ATS, ATC, ETCS)';
COMMENT ON COLUMN concepts.term_definition IS '용어 정의 — 1~2문장';
COMMENT ON COLUMN concepts.term_section    IS '대분류 slug (track/vehicle/signal/operation/regulation)';
COMMENT ON COLUMN concepts.term_subsection IS '중분류 slug (rail-structure/brake/track-circuit …)';
