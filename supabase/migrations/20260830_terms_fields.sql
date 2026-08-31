-- 철도용어 사전: concepts 테이블 신규 생성
-- ⚠️ 실행 전 확인: public.concepts 테이블이 없는지 확인할 것
-- PK: concept_code (문자열 코드, UUID 아님)

CREATE TABLE IF NOT EXISTS public.concepts (
  concept_code        VARCHAR(50)  PRIMARY KEY,
  term_ko             VARCHAR(200) NOT NULL,
  term_en             VARCHAR(300),
  term_abbr           VARCHAR(50),
  term_definition     TEXT,
  -- 철도용어 분류
  term_section        VARCHAR(50),
  term_subsection     VARCHAR(50),
  term_order          INTEGER,
  -- 시험용 한 줄 정의
  definition_short    TEXT,
  -- 시각 자료 유형: TEXT | VIS_GROUP | VIS_SINGLE | REUSE | HOLD
  visual_type         VARCHAR(20),
  -- 대표 이미지 참조 (FK는 visuals 테이블 생성 시 추가 예정)
  primary_visual_id   UUID,
  -- 혼동 용어: concept_code 배열
  confusing_terms     TEXT[],
  -- 메타
  source_html         VARCHAR(20),
  memo                TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_concepts_term_section
  ON public.concepts (term_section, term_subsection);

CREATE INDEX IF NOT EXISTS idx_concepts_term_order
  ON public.concepts (term_section, term_subsection, term_order);

-- 설계 메모:
--   primary_visual_id: nullable UUID, 대표 이미지 빠른 참조용
--   다대다 관계: 향후 concept_visuals(concept_code, visual_id, relation_type, sort_order) 테이블 추가 예정
--   confusing_terms: concept_code 배열 (용어명 아님)
--   terms 테이블(구버전): 방치 — 추후 필요 시 DROP
