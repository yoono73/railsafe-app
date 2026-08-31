-- 철도용어 사전: concepts 테이블에 7개 필드 추가
-- ⚠️ 실행 전 현행 concepts 테이블 스키마를 확인할 것
-- (이미 컬럼이 있으면 IF NOT EXISTS 구문이 안전하게 처리)

ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS term_section       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term_subsection    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS term_order         INTEGER,
  ADD COLUMN IF NOT EXISTS definition_short   TEXT,
  ADD COLUMN IF NOT EXISTS visual_type        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS primary_visual_id  UUID,
  ADD COLUMN IF NOT EXISTS confusing_terms    TEXT[];

-- primary_visual_id 설계 메모:
--   현재는 nullable UUID만 추가. FK는 visuals 테이블 생성 시 추가 예정.
--   다대다 관계는 향후 concept_visuals(concept_code, visual_id, relation_type, sort_order)로 처리.
--   concepts.primary_visual_id = 상세 화면 대표 이미지 1장 빠른 참조용.

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_concepts_term_section
  ON concepts (term_section, term_subsection);
