-- 철도용어 사전: terms 테이블 신규 생성
CREATE TABLE IF NOT EXISTS terms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_ko         VARCHAR(200) NOT NULL,
  term_en         VARCHAR(300),
  term_abbr       VARCHAR(50),
  term_definition TEXT,
  term_section    VARCHAR(50)  NOT NULL,
  term_subsection VARCHAR(50)  NOT NULL,
  source_html     VARCHAR(20),
  memo            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terms_section
  ON terms (term_section, term_subsection);

CREATE INDEX IF NOT EXISTS idx_terms_ko
  ON terms (term_ko);
