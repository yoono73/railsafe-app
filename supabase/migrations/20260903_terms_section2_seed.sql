-- 철도용어 제2절: 제동·속도·폐색·제어 방식 관련 용어
-- term_section: brake-block
-- 총 31개 INSERT (신규 생성 기준 — 기존 concept_code 없음)
-- concept_code 패턴: subsection 약자 + 2자리 순번
--   BS = brake-speed, BK = block-safety, DC = drive-control, CC = coupling-consist
-- primary_visual_id: 전부 NULL (이번 작업 기준)
-- confusing_terms: NULL 허용 (후처리 예정)

-- ============================================================
-- A. 제동장치 및 운전속도 (brake-speed) — 8개
-- ============================================================

INSERT INTO public.concepts
  (concept_code, term_ko, term_en, term_abbr,
   term_definition, definition_short,
   term_section, term_subsection, term_order,
   visual_type, primary_visual_id, confusing_terms, source_html)
VALUES

('BS01', '공기제동기', 'Air Brake', NULL,
 '압축공기를 동력으로 사용해 브레이크 슈를 차축에 밀착시켜 감속·정지시키는 제동장치. 열차에 가장 널리 사용되며 관통제동기와 결합해 전 차량을 동시에 제동한다.',
 '압축공기로 브레이크 슈를 차축에 밀착시켜 감속·정지시키는 제동장치',
 'brake-block', 'brake-speed', 1,
 'TEXT', NULL, NULL, '3.html'),

('BS02', '관통제동', 'Through Brake', NULL,
 '기관차에서 발생한 압축공기를 열차 전체에 연결된 제동관(제동통)을 통해 공급, 전 차량이 동시에 제동되는 방식. 완급차에는 관통제동기용 제동통·압력계·차장변·수제동기가 반드시 설치된다.',
 '기관차 압축공기가 전 차량 제동관을 통해 동시에 작동하는 제동방식',
 'brake-block', 'brake-speed', 2,
 'TEXT', NULL, NULL, '3.html'),

('BS03', '제동축비율', NULL, NULL,
 '열차 전체 차축 수 중 제동기가 설치된 차축의 비율. 규정 비율 이상이어야 안전한 제동력이 확보된다.',
 '전체 차축 중 제동기가 설치된 차축의 비율',
 'brake-block', 'brake-speed', 3,
 'TEXT', NULL, NULL, '3.html'),

('BS04', '제동감도시험', NULL, NULL,
 '열차 출발 전 제동장치가 정상 작동하는지 감도를 확인하는 시험. 제동관 압력 저하 시 제동기가 즉시 작동하는지 점검한다.',
 '출발 전 제동장치 작동 감도를 확인하는 시험',
 'brake-block', 'brake-speed', 4,
 'TEXT', NULL, NULL, '3.html'),

('BS05', '비상제동거리', 'Emergency Braking Distance', NULL,
 '비상제동을 체결한 순간부터 열차가 완전히 정지할 때까지 주행한 거리. 도시철도의 경우 운행 최고속도에서의 비상제동거리가 법령으로 규정된다.',
 '비상제동 체결부터 완전정지까지 열차가 주행한 거리',
 'brake-block', 'brake-speed', 5,
 'TEXT', NULL, NULL, '3.html'),

('BS06', '속도제한', 'Speed Restriction', NULL,
 '선로 구조·곡선반경·구배·분기기 등 조건에 따라 열차의 최고속도를 제한하는 것. 임시속도제한(서행)과 상시 속도제한으로 구분된다.',
 '선로 조건에 따라 열차의 최고속도를 제한하는 것',
 'brake-block', 'brake-speed', 6,
 'TEXT', NULL, NULL, '3.html'),

('BS07', '서행신호', NULL, NULL,
 '열차에 서행(속도를 줄여 운행)을 명하는 신호. 임시신호기의 일종으로, 서행신호기·서행예고신호기·서행해제신호기 3종으로 구성된다.',
 '열차에 서행을 명하는 임시신호기',
 'brake-block', 'brake-speed', 7,
 'TEXT', NULL, NULL, '3.html'),

('BS08', '정상속도', NULL, NULL,
 '열차가 해당 선구(선로 구간)에서 허용된 최고속도로 운행하는 속도. 서행이나 제한속도 구간이 아닌 평상시 운행속도.',
 '해당 선구에서 허용된 정규 최고속도',
 'brake-block', 'brake-speed', 8,
 'TEXT', NULL, NULL, '3.html');

-- ============================================================
-- B. 폐색 및 열차 간 안전 확보 (block-safety) — 9개
-- ============================================================

INSERT INTO public.concepts
  (concept_code, term_ko, term_en, term_abbr,
   term_definition, definition_short,
   term_section, term_subsection, term_order,
   visual_type, primary_visual_id, confusing_terms, source_html)
VALUES

('BK01', '폐색', 'Block', NULL,
 '선로를 일정 구간으로 나누어 한 구간에 열차 1대만 진입을 허용함으로써 열차 간 추돌을 방지하는 방식. 폐색 구간이 점유됐는지는 폐색신호기(진행·정지 현시)로 확인하며, 폐색방식에 따라 전화통보·지도표·지도권을 대신 사용하기도 한다.',
 '한 구간에 열차 1대만 허용해 추돌을 방지하는 방식',
 'brake-block', 'block-safety', 1,
 'TEXT', NULL, NULL, '3.html'),

('BK02', '폐색구간', 'Block Section', NULL,
 '폐색방식 적용을 위해 구분된 선로의 단위 구간. 구간의 시종점은 폐색신호기 또는 역 경계로 정한다.',
 '폐색 적용을 위해 구분된 선로 단위 구간',
 'brake-block', 'block-safety', 2,
 'TEXT', NULL, NULL, '3.html'),

('BK03', '폐색방식', 'Block System', NULL,
 '폐색구간을 관리하는 방법의 총칭. 상용폐색방식(자동폐색식·연동폐색식·차내신호폐색식·통표폐색식)과 대용폐색방식(통신식·지도통신식·지도식·지령식)으로 나뉜다.',
 '폐색구간 관리 방법의 총칭 (상용 4종 + 대용 4종)',
 'brake-block', 'block-safety', 3,
 'TEXT', NULL, NULL, '3.html'),

('BK04', '자동폐색식', 'Automatic Block System', 'ABS',
 '궤도회로를 이용해 열차의 구간 점유를 자동 감지하고 폐색신호기를 자동 제어하는 상용폐색방식. 신호기 정위는 진행(진행이 기본, 열차 진입 시 정지로 전환).',
 '궤도회로로 열차 점유를 자동 감지·제어하는 상용폐색방식',
 'brake-block', 'block-safety', 4,
 'TEXT', NULL, NULL, '3.html'),

('BK05', '연동폐색식', 'Interlocking Block System', NULL,
 '역 간 전화통보와 신호기 연동에 의해 폐색을 취급하는 상용폐색방식. 역장 간 전화로 출발 가능 여부를 확인 후 신호기를 조작한다.',
 '전화통보와 신호기 연동으로 폐색을 취급하는 상용폐색방식',
 'brake-block', 'block-safety', 5,
 'TEXT', NULL, NULL, '3.html'),

('BK06', '차내신호폐색식', 'Cab Signal Block System', NULL,
 '선로변 신호기 없이 운전실 내 차내신호(ATC 신호)로 폐색을 운용하는 방식. 고속철도 및 도시철도 일부 구간에 적용.',
 '운전실 차내신호로 폐색을 운용하는 상용폐색방식',
 'brake-block', 'block-safety', 6,
 'TEXT', NULL, NULL, '3.html'),

('BK07', '통표폐색식', 'Token Block System', NULL,
 '구간별 통표(금속 토큰)를 1개만 발행해 그것을 소지한 열차만 해당 구간에 진입할 수 있도록 하는 상용폐색방식. 단선 구간에서 주로 사용.',
 '구간 통표 1개를 소지한 열차만 진입 허용하는 상용폐색방식',
 'brake-block', 'block-safety', 7,
 'TEXT', NULL, NULL, '3.html'),

('BK08', '대용폐색방식', 'Substitute Block System', NULL,
 '상용폐색 고장·장애 발생 시 대신 사용하는 폐색방식. 통신식·지도통신식·지도식·지령식 4종이 있으며, 상용폐색보다 절차가 엄격하다.',
 '상용폐색 불가 시 사용하는 비상용 폐색방식 (4종)',
 'brake-block', 'block-safety', 8,
 'TEXT', NULL, NULL, '3.html'),

('BK09', '전령법', 'Pilotman System', NULL,
 '대용폐색 시행 중 특정 구간의 안전을 위해 전령원(Pilotman)을 지정, 전령원이 열차를 직접 동승·안내해 구간 운행 안전을 확보하는 방법. 가장 강력한 안전 확보 수단.',
 '전령원이 직접 열차를 동승·안내해 구간 안전을 확보하는 방법',
 'brake-block', 'block-safety', 9,
 'TEXT', NULL, NULL, '3.html');

-- ============================================================
-- C. 운전제어 및 관제 (drive-control) — 7개
-- ============================================================

INSERT INTO public.concepts
  (concept_code, term_ko, term_en, term_abbr,
   term_definition, definition_short,
   term_section, term_subsection, term_order,
   visual_type, primary_visual_id, confusing_terms, source_html)
VALUES

('DC01', '관제사', 'Traffic Controller', NULL,
 '종합관제실(CTC 센터)에서 열차 운행 전반을 지휘·통제하는 사람. 열차 출발 허가, 운전정리, 비상 시 지시 등의 권한을 갖는다.',
 '종합관제실에서 열차 운행을 지휘·통제하는 사람',
 'brake-block', 'drive-control', 1,
 'TEXT', NULL, NULL, '3.html'),

('DC02', '운전정리', 'Train Regulation', NULL,
 '열차 지연·장애 발생 시 운행 순서·시격(간격)·회송을 조정해 정상운행으로 회복시키는 조치. 관제사 또는 역장이 시행한다.',
 '지연·장애 발생 시 운행 순서·시격을 조정해 정상회복하는 조치',
 'brake-block', 'drive-control', 2,
 'TEXT', NULL, NULL, '3.html'),

('DC03', '조상운전', NULL, NULL,
 '열차가 열차운행계획표(다이아)상 정해진 시각보다 일찍 출발하는 운전 방식. 원칙적으로 금지되며 특별한 사유가 있는 경우에만 허용된다.',
 '정해진 출발 시각보다 일찍 출발하는 운전방식',
 'brake-block', 'drive-control', 3,
 'TEXT', NULL, NULL, '3.html'),

('DC04', '단선운전', 'Single Track Operation', NULL,
 '복선 구간에서 사고·공사·장애 등의 사유로 한쪽 선로만 사용해 양방향 열차를 운행하는 방식. 대용폐색방식을 병행한다.',
 '복선 구간에서 한 선로만 사용해 양방향을 운행하는 방식',
 'brake-block', 'drive-control', 4,
 'TEXT', NULL, NULL, '3.html'),

('DC05', '로컬제어', 'Local Control', NULL,
 '현장(역 또는 운전실)에서 직접 열차 및 신호·분기기 설비를 제어하는 방식. CTC 고장 시 또는 현장 조건에 따라 적용하며, 원격제어방식과 상대되는 개념.',
 '현장에서 직접 열차·설비를 제어하는 방식',
 'brake-block', 'drive-control', 5,
 'TEXT', NULL, NULL, '3.html'),

('DC06', '원격제어방식', 'Remote Control', 'RC',
 '관제실 또는 원격 지점에서 통신을 통해 역·선로의 열차 및 설비를 제어하는 방식. 무인역 운용, 원거리 분기기 조작 등에 사용.',
 '원격지에서 통신으로 열차·설비를 제어하는 방식',
 'brake-block', 'drive-control', 6,
 'TEXT', NULL, NULL, '3.html'),

('DC07', '중앙집중제어', 'Centralized Traffic Control', 'CTC',
 '관제센터에서 광범위한 구간의 신호기·분기기·열차 운행을 일괄 감시·제어하는 시스템. 효율적인 열차 운행 관리와 신속한 운전정리가 가능하다.',
 '관제센터에서 광구간 신호·분기기·열차를 일괄 제어하는 시스템',
 'brake-block', 'drive-control', 7,
 'TEXT', NULL, NULL, '3.html');

-- ============================================================
-- D. 차량 연결 및 편성 (coupling-consist) — 7개
-- ============================================================

INSERT INTO public.concepts
  (concept_code, term_ko, term_en, term_abbr,
   term_definition, definition_short,
   term_section, term_subsection, term_order,
   visual_type, primary_visual_id, confusing_terms, source_html)
VALUES

('CC01', '조성', 'Train Make-up / Formation', NULL,
 '운행에 필요한 차량을 정해진 순서에 맞게 연결해 열차를 구성하는 작업. 조성 완료 후 제동감도시험 등 안전 확인 절차를 거친다.',
 '차량을 순서에 맞게 연결해 열차를 구성하는 작업',
 'brake-block', 'coupling-consist', 1,
 'TEXT', NULL, NULL, '3.html'),

('CC02', '편성차량', 'Train Set', NULL,
 '운행 단위로 조성된 차량 전체의 집합. 기관차·객차·화차 등이 조합된 1개 열차 단위.',
 '운행 단위로 조성된 차량 전체',
 'brake-block', 'coupling-consist', 2,
 'TEXT', NULL, NULL, '3.html'),

('CC03', '조성차수', NULL, NULL,
 '열차를 조성하는 차량의 수량(량수). 예: "10량 편성".',
 '열차 조성에 포함된 차량 수(량수)',
 'brake-block', 'coupling-consist', 3,
 'TEXT', NULL, NULL, '3.html'),

('CC04', '조성완료', NULL, NULL,
 '열차 조성 작업이 끝나 차량 연결·제동시험 등 출발 전 점검이 모두 완료된 상태.',
 '열차 조성 작업 완료, 출발 준비 완료 상태',
 'brake-block', 'coupling-consist', 4,
 'TEXT', NULL, NULL, '3.html'),

('CC05', '회송차량', 'Light Engine / Deadhead Car', NULL,
 '여객·화물 취급 없이 운행 위치 조정(입환·기지 복귀 등)을 위해서만 이동하는 차량 또는 열차.',
 '여객·화물 없이 위치 조정용으로만 이동하는 차량',
 'brake-block', 'coupling-consist', 5,
 'TEXT', NULL, NULL, '3.html'),

('CC06', '기관차의 연결위치', NULL, NULL,
 '열차 내 기관차를 연결하는 위치. 원칙은 열차 맨 앞. 예외(보조기관차·고장·특수열차 등)에 한해 다른 위치 허용.',
 '열차 내 기관차 연결 위치 (원칙: 맨 앞)',
 'brake-block', 'coupling-consist', 6,
 'TEXT', NULL, NULL, '3.html'),

('CC07', '발전차', 'Generator Car / Power Car', NULL,
 '열차 내 조명·냉난방·각종 설비에 필요한 전력을 공급하기 위한 발전기를 탑재한 차량. 전차선이 없는 비전철화 구간 열차에서 주로 사용.',
 '열차 전력 공급용 발전기를 탑재한 차량',
 'brake-block', 'coupling-consist', 7,
 'TEXT', NULL, NULL, '3.html');

-- ============================================================
-- 완료 보고 (주석)
-- 신규 INSERT: 31개
-- 기존 UPDATE: 0개 (기존 레코드 없음)
-- subsection별:
--   brake-speed      8개 (BS01~BS08)
--   block-safety     9개 (BK01~BK09)
--   drive-control    7개 (DC01~DC07)
--   coupling-consist 7개 (CC01~CC07)
-- visual_type: TEXT 31개
-- primary_visual_id: 전부 NULL
-- confusing_terms: 전부 NULL (후처리 예정)
-- 중복 회피: 기존 concept_code 없어 해당 없음
-- 보류 후보 (C.항목): 서행속도·상용폐색방식·통신식·지령식·지도식·조하운전·제어역·피제어역
-- ============================================================
