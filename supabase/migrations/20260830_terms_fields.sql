-- 철도용어: concepts 테이블 term_* 필드 6개 추가
ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS term_ko         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS term_en         VARCHAR(300),
  ADD COLUMN IF NOT EXISTS term_abbr       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term_definition TEXT,
  ADD COLUMN IF NOT EXISTS term_section    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term_subsection VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_concepts_term_section
  ON concepts (term_section, term_subsection)
  WHERE term_section IS NOT NULL;
