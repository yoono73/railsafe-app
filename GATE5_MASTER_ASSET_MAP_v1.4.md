# GATE5 MASTER ASSET MAP v1.3

> 작성일: 2026-10-04 (v1.0) / 정정일: 2026-10-04 (v1.1, v1.2, v1.3)  
> 기준: GATE5_RailwayEngineering_FullCoverageAudit_v2.2  
> 목적: 각 UNIT 제작 시 기존 자산 재사용·누락 방지  
> 퍼블리싱 금지 / 신규 이미지 제작 금지 / 기존 번호 일괄 변경 금지  
>  
> **v1.1 정정 사항 (2026-10-04)**  
> ① 총 UNIT 74개 전수카운트 확정 (표 68개 + 완료 6개 = 74개) / "7개" 오기 → 6개 정정  
> ② V-Y-16(EbliD1aZ160) PRIMARY ↔ V-Y-17(9THQ3JwQ5CE) RELATED 정정  
> ③ VIS-041: 파일 KEEP / 08-01 본문 NOT-USED (VIS-08A로 대체) 명기  
> ④ VIS-08A: PLACEHOLDER → PRIMARY VIS ✅ 파일명 확정  
> ⑤ engineering-exam-data.ts: 128개 확인 (기존 기록 127+1, 추가 id=127)  
>  
> **v1.2 구조 정합성 수정 (2026-10-04)**  
> ① 구 "PART 07 선로보수·관리 / 07-01 선로검사·보수" → PART 05 / **05-06** 편입 (기존 신호 07-01~07-10 번호 변경 없음)  
> ② 총 UNIT 74 → **75개** / 제작완료 6개(8.0%) / 잔여 69개  
> ③ PART 05 궤도구조 5개 → **6개** (05-01~05-06)  
> ④ VIS-001 신규 UNIT 01-08 → **01-06** 정정  
> ⑤ VIS-032 신규 UNIT 04-08 → **05-05** 정정  
> ⑥ VIS-036 신규 UNIT 04-03 → **05-02** 정정  
> ⑦ V-Y-09 레일 열팽창 신규 UNIT 후보 04-03 → **05-01/05-02** 정정  
> ⑧ 08-01: v1.1 / VIS-08A PRIMARY / VIS-041 KEEP-ASSET·NOT-USED / V-Y-16 PRIMARY RETROFIT 완료 / V-Y-17 CROSS-REF 전 문서 통일  
> ⑨ §9 VERIFY 잔여 — VIS-08A 제작 대기 · unit-08-01 영상 RETROFIT 미완료 항목 삭제  
>  
> **v1.3 추가 (2026-10-04)**  
> ① @page margin 전체 통일: `14mm 12mm 14mm 22mm` → `12mm 12mm 12mm 18mm` (7개 파일 적용, 잔존 0건 확인)  
> ② PRINT STANDARD 확정: `GATE5_PRINT_LOCK_v1 / 12/12/12/18mm`  
> ③ `public/theory/css/GATE5_PRINT_LOCK_v1.css` 신규 생성 (신규 UNIT 제작 기준 템플릿)

---

## §0. 전체 자산 현황 요약

| 자산 종류 | 수량 / 값 | 비고 |
|---|---|---|
| **PRINT STANDARD** | **GATE5_PRINT_LOCK_v1** | `12/12/12/18mm` · A4 Portrait · 링제본 · CSS: `public/theory/css/GATE5_PRINT_LOCK_v1.css` |
| 신규 UNIT (전체 목표) | **75개** | PART 01~14 / 전수카운트 확정 (05-06 편입 포함) |
| 기존 unit HTML 제작 완료 | **6개** (8.0%) | 07-06~07-10(5개), 08-01(1개) |
| 잔여 제작 UNIT | **69개** | (75-6) |
| 기존 핵심정리 HTML | 7개 | 1.html~7.html (과목별) |
| 총 고유 영상 수 | **19개** | 3.html 6개, 4.html 7개, 6.html 6개 |
| 총 VIS 이미지 수 | **150+개** | public/theory/images/ |
| signal 문항 | **276개** | Part 1~8 |
| engineering 문항 | **128개** | — |
| railway-king 문항 | **299개** | ch81·82·83·53 포함 |
| **문항 합계** | **703개** | — |

---

## §1. 영상 전체 목록 (19개 고유)

> 과거 기록 "7개"는 구 데이터. 실제 HTML 전수 추출 결과 19개.

### 그룹 A — 열차운전 (3.html) 6개

| ID | YouTube ID | 제목 | 현재 위치 | 신규 UNIT 후보 | 구분 |
|---|---|---|---|---|---|
| V-Y-01 | AvXL2WjhUys | 기차도 후진할 수 있을까? | 3.html | 08-04(운전이론) | RELATED |
| V-Y-02 | jkC_8_iCmJ0 | 열차 브레이크에선 왜 '끼이익~' 소리가? | 3.html | 12-04(제동방식) | PRIMARY |
| V-Y-03 | HxAU3AiTpzk | 기관사가 운행 중 잠이 올 땐? (데드맨) | 3.html | 08-02(운전보안장치) | PRIMARY |
| V-Y-04 | -c9H1vfEnoo | 폭설에도 멈추지 않는 기차! | 3.html | 08-04 혹은 일반 | RELATED |
| V-Y-05 | al7QbyZkEcM | GTX-A 대심도 터널 화재 대응훈련 | 3.html | 08-05(통신·안전) | RELATED |
| V-Y-06 | WbX73ZsudsA | 열차의 블랙박스 열차운행기록장치 | 3.html | 08-02(운전보안장치) | RELATED |

### 그룹 B — 철도공학 (4.html) 7개

| ID | YouTube ID | 제목 | 현재 위치 | 신규 UNIT 후보 | 구분 |
|---|---|---|---|---|---|
| V-Y-07 | BF7x5Mrywb0 | 전기열차는 어떻게 움직이는가? | 4.html | 09-01(전력방식), 11-01(차량총론) | PRIMARY |
| V-Y-08 | DXkj-ZrhnpA | 기차 바퀴, 그냥 닳으면 바꾸는 걸까? | 4.html | 13-01(차체·대차) | PRIMARY |
| V-Y-09 | A30ZEf0KMi0 | 여름이 레일을 늘린다? (레일 열팽창) | 4.html | 05-01/05-02(레일·장대레일) | PRIMARY |
| V-Y-10 | fKijHBu3JFY | 철도에 쓰이는 자갈 (도상) | 4.html | 04-06(도상) | PRIMARY |
| V-Y-11 | TJDv3kPMHcg | 고무차륜 경량전철 주행장치 | 4.html | 14-01(특수차량) | PRIMARY |
| V-Y-12 | 0oXVOBum4cM | 전차선로 고장점 표정장치 | 4.html | 10-04(가선방식·부속) | RELATED |
| V-Y-13 | kM1BLVUb7rU | 강체 전차선로 세척시스템 | 4.html | 10-04(가선방식) | RELATED |

### 그룹 C — 철도신호 (6.html) 6개

| ID | YouTube ID | 제목 | 현재 위치 | 신규 UNIT 후보 | 구분 |
|---|---|---|---|---|---|
| V-Y-14 | 2to9QiopqO0 | 철도 신호기의 모든 것 | 6.html | 07-01~07-03(신호기) | PRIMARY |
| V-Y-15 | 2cqQ0yinaC0 | 철도 관제센터 — 열차 위치를 어떻게 알까? | 6.html | 07-06(궤도회로) | PRIMARY |
| V-Y-16 | EbliD1aZ160 | 초고속열차의 미래 — 신호체계·LTE-R·하이퍼튜브 | 6.html | 08-01(열차제어) | **PRIMARY** |
| V-Y-17 | 9THQ3JwQ5CE | LTE 기반 열차제어시스템 | 6.html | 08-01(열차제어) | **RELATED** (CROSS-REF, 본문 직접 삽입 금지) |
| V-Y-18 | T_bBQCNl0eI | 열차의 통신은 유선? 무선? | 6.html | 08-06(열차통신) | PRIMARY |
| V-Y-19 | hsPJl-IXSnY | 세계 최초 철도무선통신망(LTE-R) 국제인증 | 6.html | 08-06(열차통신) | RELATED |

### 영상 미연결 상태 (RETROFIT 필요)

| 파일 | 관련 영상 | 상태 |
|---|---|---|
| unit-07-06_FINAL_PUBLISH_v1.6.html | V-Y-15 (관제센터·궤도회로) | **RETROFIT** |
| unit-07-07_FINAL_PUBLISH_v1.1.html | V-Y-15 RELATED | **RETROFIT** |
| unit-07-08_FINAL_PUBLISH_v1.2.html | 해당 영상 없음 | 영상 없음 정상 |
| unit-07-09_FINAL_PUBLISH_v1.1.html | 해당 영상 없음 | 영상 없음 정상 |
| unit-07-10_FINAL_PUBLISH_v1.1.html | 해당 영상 없음 | 영상 없음 정상 |
| unit-08-01_FINAL_PUBLISH_v1.1.html | V-Y-16(EbliD1aZ160) PRIMARY ✅ / V-Y-17(9THQ3JwQ5CE) CROSS-REF | **RETROFIT 완료** (v1.1) |

---

## §2. VIS 이미지 전수 판정

### 이미지 목록 및 판정

> 기준: public/theory/images/ 전체  
> 판정: KEEP / REMAP / REVISE / DUPLICATE / DROP

#### PART 01~06 관련

| VIS ID | 파일명 | 연결 개념 | 신규 UNIT | 판정 |
|---|---|---|---|---|
| VIS-001 | VIS-001_욕조곡선.jpg | RAMS | 01-06 | KEEP |
| VIS-009 | VIS-009_정지거리도해.jpg | 정지거리 | 08-04 | REMAP |
| VIS-010 | VIS-010_시야각도해.jpg | 시야 | 08-04 | REMAP |
| VIS-027 | VIS-027_철도종류분류.jpg/.png | 철도종류 | 01-02 | KEEP (DUPLICATE .jpg/.png) |
| VIS-028 | VIS-028_선로4종비교.jpg/.png | 선로종류 | 02-01 | KEEP (DUPLICATE 해소) |
| VIS-030 | VIS-030_궤도단면구조.jpg | 궤도단면 | 05-01(궤도) | KEEP |
| VIS-031 | VIS-031_레일종류단면비교.jpg/.png | 레일종류 | 04-01 | KEEP (DUPLICATE) |
| VIS-032 | VIS-032_분기기구성구조도.jpg/.png | 분기기 | 05-05 | KEEP |
| VIS-033 | VIS-033_건축한계차량한계.jpg/.png | 건축한계 | 02-03 | KEEP |
| VIS-035 | VIS-035_정거장형식비교.jpg/.png | 정거장 | 06-xx | KEEP |
| VIS-036 | VIS-036_장대레일부동구간.jpg/.png | 장대레일 | 05-02 | KEEP |
| VIS-037 | VIS-037_복진현상도해.jpg/.png | 복진현상 | 04-04 | KEEP |
| VIS-074 | VIS-074_구배체계수치비교도해.png | 구배 | 03-03 | KEEP |
| VIS-075 | VIS-075_주행저항4종합산도해.png | 주행저항 | 12-01 | KEEP |
| VIS-076 | VIS-076_완화곡선클로소이드도해.png | 완화곡선 | 03-01 | KEEP |
| VIS-077 | VIS-077_사행동1차2차비례관계도해.png | 사행동 | 13-05 | KEEP |
| VIS-092 | VIS-092_관절대차고정축거설명도.png | 대차 | 13-03 | KEEP |
| VIS-097 | VIS-097_철도_캔트.png | 캔트 | 03-02 | KEEP |
| VIS-098 | VIS-098_철도_제한구배_최대구배.png | 구배 | 03-03 | KEEP |
| VIS-099 | VIS-099_철도_선로용량과_포화도.png | 선로용량 | 02-05 | KEEP |
| VIS-100 | VIS-100_철도의_다양한_형태.png | 철도종류 | 01-02 | REMAP (VIS-027 DUPLICATE 후보) |

#### PART 07 신호 관련

| VIS ID | 파일명 | 연결 개념 | 신규 UNIT | 판정 |
|---|---|---|---|---|
| VIS-029 | VIS-029_신호기분류체계.jpg/.png | 신호기 | 07-01 | KEEP (DUPLICATE .jpg/.png) |
| VIS-038 | VIS-038_신호기기능별분류트리.jpg | 신호기 | 07-01 | KEEP |
| VIS-039 | VIS-039_신호기정위암기카드.jpg | 신호기 정위 | 07-01 | KEEP |
| VIS-042 | VIS-042_궤도회로종류비교.jpg | 궤도회로 | 07-06 | KEEP (07-06 이미 미사용 → RETROFIT) |
| VIS-043 | VIS-043_고속철도연속불연속정보.jpg | 고속철도신호 | 08-01 | REMAP→08-01 |
| VIS-044 | VIS-044_선로전환기분류체계트리.jpg/.png | 선로전환기 | 07-08 | KEEP |
| VIS-045 | VIS-045_전기선로전환기계통도.jpg | 선로전환기 | 07-08 | KEEP |
| VIS-046 | VIS-046_건널목경보장치수치암기카드.jpg | 건널목 | 07-04(혹은 05) | KEEP |
| VIS-047 | VIS-047_접근쇄정해정시분비교카드.jpg | 연동쇄정 | 07-08 | KEEP |
| VIS-048 | VIS-048_철도신호핵심수치통합암기표.jpg | 신호수치 | 07-xx 종합 | KEEP |
| VIS-062 | VIS-062_신호기정위비교암기카드.jpg | 신호기 | 07-01 | REMAP (VIS-039 DUPLICATE 후보) |
| VIS-063 | VIS-063_입환전호비교카드.jpg | 입환 | 07-05 | KEEP |
| VIS-064 | VIS-064_동시진출입기준수치카드.jpg | 연동 | 07-08 | KEEP |
| VIS-066 | VIS-066_임시신호기3종비교표.jpg | 신호기 | 07-01 수록(임시신호기 3종) / 07-02 배정 취소 | KEEP |
| VIS-085 | VIS-085_신호현시3종비교표.png | 신호현시 | 07-01 §9 사용 중 / 07-02 배정 취소 | KEEP |
| VIS-088 | VIS-088_절대허용신호기비교표.png | 신호기 | 07-01 | KEEP |
| VIS-090 | VIS-090_시계운전방식3종비교.png | 시계운전 | 07-05 | KEEP |
| VIS-091 | VIS-091_상치신호기전체배치도.png | 신호기 배치 | 07-01~03 | KEEP |
| VIS-07A | VIS-07A_track_circuit_FINAL.png | 기본궤도회로 | 07-06 | KEEP (이미 07-06 사용 중) |
| VIS-07B | VIS-07B_AF_track_circuit_FINAL.png | AF궤도회로 | 07-07 | KEEP (이미 07-07 사용 중) |
| VIS-07C | VIS-07C_신호제어_기능관계도_FINAL.png | 신호제어 | 07-08 | KEEP |
| VIS-07D | VIS-07D_Fail-Safe_정상vs열차점유vs고장_FINAL.png | Fail-Safe | 07-10 | KEEP (07-10 사용 예정) |
| VIS-09A | VIS-09A_time_space_interval_block_FINAL.png | 폐색·시격 | 07-09 | KEEP (07-09 사용 중) |
| VIS-102 | VIS-102_AF무절연궤도회로원리.png | AF궤도회로 | 07-07 | REMAP (VIS-07B DUPLICATE 후보) |
| VIS-104 | VIS-104_임피던스본드원리.png | 임피던스본드 | 07-06 or 09-05 | KEEP |
| VIS-061 | VIS-061_폐색방식8종분류표.jpg/.png | 폐색방식 | 07-05, 07-09 | KEEP (DUPLICATE .jpg/.png) |
| VIS-040_폐색 | VIS-040_폐색방식6종비교표.jpg | 폐색 | 07-09 | REMAP (VIS-061과 중복) |

#### PART 08 열차제어 관련

| VIS ID | 파일명 | 연결 개념 | 신규 UNIT | 판정 |
|---|---|---|---|---|
| VIS-040_CTC | VIS-040_CTC_ATC비교도해.png | CTC/ATC | 08-01 CROSS-REF | KEEP |
| VIS-041 | VIS-041_열차제어시스템비교.jpg | ATS/ATC/ATO/ATP/CTC/CBTC | **08-01** | **KEEP** (파일 자산) / 08-01 본문 NOT-USED → VIS-08A로 대체 |
| VIS-087 | VIS-087_TTC_CTC비교표.png | TTC/CTC | 08-02 or 08-01 CROSS-REF | KEEP |
| VIS-08A | VIS-08A_ATS_ATP_ATC_ATO_종합비교_FINAL.png | ATS·ATP·ATC·ATO 역할 비교도 | **08-01** | **PRIMARY VIS** ✅ (파일 확인 완료, 08-01 본문 삽입 완료) |

#### PART 09~10 전기철도·전차선로 관련

| VIS ID | 파일명 | 연결 개념 | 신규 UNIT | 판정 |
|---|---|---|---|---|
| VIS-078 | VIS-078_교류직류전압비교카드.png | 전력방식 | 09-01 | KEEP |
| VIS-079 | VIS-079_열차운전3요소비교카드.png | 운전3요소 | 08-04 | REMAP |
| VIS-080 | VIS-080_전기제동기계제동비교표.png | 전기제동 | 12-04 | KEEP |
| VIS-103 | VIS-103_강체가선_커티너리가선.png | 가선방식 | 10-04 | KEEP |
| VIS-105 | VIS-105_AT방식전력공급시스템.png | AT급전 | 09-02 | KEEP |
| VIS-106 | VIS-106_복선화.png | 복선화 | 02-xx | KEEP |
| VIS-086 | VIS-086_전차선집전장치비교카드.png | 집전장치 | 10-06 | KEEP |
| VIS-034 | VIS-034_집전장치종류비교.jpg/.png | 집전장치 | 10-06 | REMAP (VIS-086 DUPLICATE 후보) |

#### PART 11~14 차량 관련

| VIS ID | 파일명 | 연결 개념 | 신규 UNIT | 판정 |
|---|---|---|---|---|
| VIS-065 | VIS-065_동력집중분산식비교표.jpg/.png | 동력방식 | 11-01 | KEEP |
| VIS-082 | VIS-082_점착력공식카드.png | 점착력 | 11-05(점착) | KEEP |
| VIS-083 | VIS-083_열차저항4종체계표.png | 열차저항 | 12-01 | KEEP |
| VIS-084 | VIS-084_공기제동3방식비교표.png | 제동방식 | 12-04 | KEEP |
| VIS-081 | VIS-081_차량진동3종비교표.png | 진동 | 13-05 | KEEP |
| VIS-093_차량 | VIS-093_철도차량_동력집중식_동력분산식.png | 동력방식 | 11-01 | REMAP (VIS-065 DUPLICATE 후보) |
| VIS-093_dup | VIS-093_철도차량_열차저항_체계_dup.png | 열차저항 | 12-01 | **DUPLICATE** → VIS-094 동일 |
| VIS-094 | VIS-094_철도차량_열차저항_체계.png | 열차저항 | 12-01 | KEEP (VIS-093_dup DROP) |
| VIS-095 | VIS-095_철도차량_제동_방식_비교.png | 제동방식 | 12-04 | KEEP (VIS-084 DUPLICATE 후보) |
| VIS-096 | VIS-096_철도차량_견인정수.png | 견인정수 | 12-03 | KEEP |
| VIS-101 | VIS-101_1차2차현가_위치도.png | 현가장치 | 13-04 | KEEP |
| VIS-107 | VIS-107_점착력과 공전_활주.png | 공전·활주 | 11-05 | KEEP |

### 판정 집계

| 판정 | 수 |
|---|---|
| **KEEP** | 약 90개 |
| **REMAP** | 약 15개 (신규 UNIT으로 재배치) |
| **DUPLICATE** | 8건 확인 (.jpg/.png 이중 등) |
| **REVISE** | 0건 (현재 확인 범위에서) |
| **REPLACE** | 0건 |
| **DROP** | 1건 (VIS-093_dup) |

---

## §3. 문제 데이터 → UNIT 역방향 매핑

### signal-exam-data.ts (276문항)

| Part | 문항 수 | 내용 | 주 UNIT |
|---|---|---|---|
| Part 1 | 43 | 신호기·전호·표지·차내신호 | 07-01~07-05 |
| Part 2 | 36 | 폐색방식·통신선로 | 07-05, 07-09 |
| Part 3 | 35 | 선로전환기·건널목 | 07-03~07-04 |
| Part 4 | 34 | 연동장치·쇄정 | 07-08 |
| Part 5 | 31 | CTC·TMS·ATS·ATC·ATP·ATO | **08-01**, 08-02 |
| Part 6 | 29 | CBTC | 08-03 |
| Part 7 | 31 | 궤도회로·AF궤도회로 | 07-06, 07-07 |
| Part 8 | 37 | Fail-Safe·기타 | 07-10 |

### engineering-exam-data.ts (128문항)

| 내용 | 주 UNIT |
|---|---|
| 선로·레일·궤도 | 03-xx, 04-xx, 05-xx |
| 전기철도·가선 | 09-xx, 10-xx |
| 차량·성능·제동 | 11-xx, 12-xx, 13-xx |
| 신호·CTC | 07-xx, 08-xx |

### railway-king-data.ts (299문항)

| 챕터 | 내용 | 주 UNIT |
|---|---|---|
| ch81 | 철도신호 (기출·신유형) | 07-01~07-10 |
| ch82 | 철도공학 (기출·신유형) | 04-xx, 09-xx, 10-xx, 11-xx~ |
| ch83 | 열차운전 (기출·신유형) | 08-04~08-07 |
| ch53 | 철도산업발전기본법 | PART 01 법제 |

---

## §4. 전체 신규 UNIT 목록 및 자산 현황

> Coverage Audit v2.2 기준 목표 구조 (현재 작업 번호 체계)

### PART 01 철도일반 (A-01~A-06)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 01-01 | 철도 특성·역할 | ❌미제작 | engineering 일부 | VIS-100 | — | PENDING |
| 01-02 | 철도 법제·분류 | ❌미제작 | railway-king ch53 | VIS-027, VIS-100 | — | PENDING |
| 01-03 | 철도 역사 | ❌미제작 | — | — | — | PENDING |
| 01-04 | 철도 계획·수요예측 | ❌미제작 | — | — | — | PENDING |
| 01-05 | 교통투자·경제성 | ❌미제작 | — | — | — | PENDING |
| 01-06 | RAMS·안전관리 | ❌미제작 | engineering 일부 | VIS-001 | — | PENDING |

### PART 02 선로계획·설계 (B-01)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 02-01 | 선로 계획·기준 | ❌미제작 | engineering 일부 | VIS-028 | — | PENDING |
| 02-02 | 건축한계·차량한계 | ❌미제작 | engineering 일부 | VIS-033 | — | PENDING |
| 02-03 | 선로용량·포화도 | ❌미제작 | engineering 일부 | VIS-099 | — | PENDING |
| 02-04 | 복선화 | ❌미제작 | — | VIS-106 | — | PENDING |
| 02-05 | 정거장·선로설비 개요 | ❌미제작 | engineering 일부 | VIS-035 | — | PENDING |

### PART 03 선로기하구조 (D-01~D-02)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 03-01 | 곡선·완화곡선 | ❌미제작 | engineering 일부 | VIS-076, VIS-097 | — | PENDING |
| 03-02 | 캔트·슬랙 | ❌미제작 | engineering 일부 | VIS-097 | — | PENDING |
| 03-03 | 구배·하중·선로저항 | ❌미제작 | engineering 일부 | VIS-074, VIS-098 | — | PENDING |

### PART 04 선로구조물·노반 (신 PART, ❌3개 공백)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 04-01 | 교량 | ❌미제작 | — | — | — | ❌공백 |
| 04-02 | 터널 | ❌미제작 | — | — | V-Y-05 RELATED | ❌공백 |
| 04-03 | 노반 | ❌미제작 | — | — | — | ❌공백 |
| 04-04 | 선로안전설비 | ❌미제작 | — | — | — | VERIFY후 |

### PART 05 궤도구조 (E-01~E-02)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 05-01 | 레일 | ❌미제작 | engineering 일부 | VIS-031, VIS-036 | V-Y-09 | PENDING |
| 05-02 | 레일이음매·장대레일 | ❌미제작 | engineering 일부 | VIS-036, VIS-037 | V-Y-09 | PENDING |
| 05-03 | 침목 | ❌미제작 | engineering 일부 | VIS-041_침목 | — | PENDING |
| 05-04 | 도상 | ❌미제작 | engineering 일부 | VIS-030 | V-Y-10 | PENDING |
| 05-05 | 분기기 | ❌미제작 | engineering 일부 | VIS-032 | — | PENDING |
| 05-06 | 선로검사·보수 | ❌미제작 | — | — | — | OPEN (레일탐상 포함 여부 확인) |

### PART 06 선로설비·정거장 (F-01) ✅

| UNIT | 단원명 | HTML | 문제 | VIS | 상태 |
|---|---|---|---|---|---|
| 06-01 | 정거장 형식·설비 | ❌미제작 | — | VIS-035 | ✅ SOURCE 충족 |
| 06-02 | 건널목·보안설비 | ❌미제작 | railway-king ch81 일부 | VIS-046 | PENDING |

### PART 07 (신호) ← 현재 작업 번호 체계에서는 07-xx

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 07-01 | 신호기 분류·현시·색상 | ✅v1.2 완성 | sig Part1 43개 | VIS-029, 038, 039, 085, 088, 091 | V-Y-14 (PRIMARY) | ✅완성·불변 |
| 07-02 | **차내신호·위식신호기** | ❌미제작 | sig_001~024 (24개) | **VIS-043 PRIMARY** | — | PENDING |
| 07-03 | 선로전환기 | ❌미제작 | sig Part3 일부 | VIS-044, 045 | — | PENDING |
| 07-04 | 건널목 신호·보안 | ❌미제작 | sig Part3 일부 | VIS-046 | — | PENDING |
| 07-05 | 폐색방식 종류 | ❌미제작 | sig Part2 일부 | VIS-061, 040_폐색 | — | PENDING |
| **07-06** | **기본 궤도회로** | ✅v1.6 | sig Part7 일부 | VIS-07A, VIS-042, VIS-104 | V-Y-15 **RETROFIT** | ✅완성·영상RETROFIT |
| **07-07** | **무절연 AF궤도회로** | ✅v1.1 | sig Part7 일부 | VIS-07B, VIS-102 | V-Y-15 RELATED | ✅완성·영상RETROFIT |
| **07-08** | **연동장치·쇄정** | ✅v1.2 | sig Part4 34개 | VIS-07C, VIS-044, 047, 064 | — | ✅완성 |
| **07-09** | **폐색시스템** | ✅v1.1 | sig Part2 일부 | VIS-09A, VIS-061 | — | ✅완성 |
| **07-10** | **Fail-Safe** | ✅v1.1 | sig Part8 일부 | VIS-07D | — | ✅완성 |

### PART 08 열차제어·통신

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| **08-01** | **ATS·ATP·ATC·ATO** | ✅v1.5 | sig Part5 9개 | VIS-08A (PRIMARY) / VIS-041 KEEP-ASSET·NOT-USED / VIS-043 / VIS-040_CTC | V-Y-16 PRIMARY ✅ / V-Y-17 CROSS-REF (본문 직접 삽입 금지) | ⚠ **FINAL CHECK** (RETROFIT 완료 / YouTube Error 153 원인 미확정 — HTTP Referer·API Client ID 문제 추정, embed 금지 아님 / 배포 환경 확인 필요) |
| **08-02** | **TTC·운전보안장치** | ✅v1.2 FINAL | sig_101·102·103·104·108·110·112·122·183·211·278·279 (12개) | VIS-087 (PRIMARY) / VIS-040_CTC_ATC비교도해 (CROSS-REF) | V-Y-03, V-Y-06 | **PUBLISHED** |
| **08-03** | **CBTC·이동폐색** | ✅v1.1 FINAL | sig Part6 29개 (sig_126~150, 207, 213, 222, 234) | VIS-07E (CROSS-REF §3, 이미지 삽입) | V-Y-16 RELATED | **PUBLISHED** |
| **08-04** | **열차운전이론** | ✅v1.2 FINAL | railway-king ch83 18문항 (rk_ch83_01,04,08,11,13,15,16,17,18,29,32,34,35,36,37,38,39) ※rk_ch83_09·33 EXCLUDE(SOURCE C-23/C-29 근거없음) | VIS-079 (PRIMARY) / VIS-009 정지거리도해 (CROSS-REF) ※VIS-010 제외(본문 근거 없음) / 전기제동_3종_비교_인포그래픽 (§4) / VIS-08D_사행동 (§5) / 차체_3축_회전운동_인포그래픽 (§6) / 냉동사이클_압응팽증_인포그래픽 (§7) / LIM_구조와추진원리_인포그래픽 (§7) | V-Y-01, V-Y-04 | **PUBLISHED** |
| **08-05** | **열차운행 안전** | ✅v1.1 FINAL | 3.html PART 8 C-36~C-41 (railway-king 문항 없음) | VIS: 5장 (비상조치_4단계와_열차방호_안내 / 열차분리_시_자동정차_원리_인포그래픽 / 전차선 단선 시 취급 원칙 / 구원운전·추진운전·퇴행운전과 작업전호 / 터널 내 열차 화재 시 조치) | V-Y-05 | **PUBLISHED** |
| **08-06** | **열차통신·LTE-R** | ✅v1.1 FINAL | 이론: 6.html PART 15 개념 42 (LTE-R·KTCS-2·KTCS-3) + 개념 45 (CBTC) / 문제: 철도신호 CBT 기출문제 14문항 (LTE-R·KTCS 파트) | VIS-A·B·C placeholder (ChatGPT 이미지 대기) | V-Y-18 PRIMARY, V-Y-19 RELATED | **PUBLISHED** |
| **08-07** | **TTC와 CTC — 제어범위와 구성** | ✅v1.0 FINAL | 이론: 6.html 개념 29 (TTC 구성요소) + 보충 3 (TTC vs CTC 비교) / 문제: 철도왕 교재 ch82 rk_ch82_06 1문항 | VIS-A(TTC vs CTC 제어범위) VIS-B(TTC 구성요소 흐름) 실삽입 | 없음 | **PUBLISHED** |

### PART 09 전기철도·전력공급 (I-01~I-02)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 09-01 | 전력방식·급전계통 | ❌미제작 | engineering 일부 | VIS-078, VIS-105 | V-Y-07 | PENDING |
| 09-02 | 변전소·급전방식 | ❌미제작 | engineering 일부 | VIS-105 | — | PENDING |
| 09-03 | 전기철도 특성 | ❌미제작 | engineering 일부 | — | V-Y-07 | PENDING |
| 09-04 | 귀선·임피던스본드 | ❌미제작 | engineering 일부 | VIS-104 | — | PENDING |
| 09-05 | 절연구간·통과방법 | ❌미제작 | engineering 일부 | — | — | VERIFY |
| 09-06 | 급전선·전차선 전반 | ❌미제작 | engineering 일부 | — | — | VERIFY |

### PART 10 전차선로·가선·집전 (J-01~J-03)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 10-01 | 전차선로 구조·설치기준 | ❌미제작 | engineering 일부 | VIS-103 | — | PENDING |
| 10-02 | 전차선 높이·지지물 | ❌미제작 | engineering 일부 | — | — | OPEN |
| 10-03 | 구분장치 | ❌미제작 | engineering 일부 | — | — | DROP(→10-01 포함) |
| 10-04 | 가선방식·부속설비 | ❌미제작 | engineering 일부 | VIS-103 | V-Y-12, V-Y-13 | ✅SOURCE 충족 |
| 10-05 | 가선방식 비교·장단점 | ❌미제작 | engineering 일부 | VIS-103 | — | PENDING |
| 10-06 | 집전장치·팬터그래프 | ❌미제작 | engineering 일부 | VIS-034, VIS-086 | — | PENDING |
| 10-07 | ATD·이선현상 | ❌미제작 | engineering 일부 | P10_11_... | — | VERIFY |
| 10-08 | 전차선 마모·점검 | ❌미제작 | — | — | V-Y-13 | PENDING |
| 10-09 | 전차선 고장·사고 | ❌미제작 | — | — | V-Y-12 RELATED | PENDING |

### PART 11~14 차량 (K-01~K-05)

| UNIT | 단원명 | HTML | 문제 | VIS | 영상 | 상태 |
|---|---|---|---|---|---|---|
| 11-01 | 차량 분류·동력방식 | ❌미제작 | engineering 일부 | VIS-065, VIS-093 | V-Y-07 | PENDING |
| 11-02 | 추진·전동기 | ❌미제작 | engineering 일부 | — | V-Y-07 | PENDING |
| 11-03 | 집전·전기회로 | ❌미제작 | — | VIS-086 | — | PENDING |
| 11-04 | 차량 총론 보완 | ❌미제작 | — | — | — | PENDING |
| 11-05 | 점착·공전·활주 | ❌미제작 | engineering 일부 | VIS-082, VIS-107 | — | PENDING |
| 12-01 | 열차저항 4종 | ❌미제작 | engineering 일부 | VIS-083, VIS-094 | — | PENDING |
| 12-02 | 견인정수·견인력 | ❌미제작 | engineering 일부 | VIS-096 | — | PENDING |
| 12-03 | 주행저항·가속도 | ❌미제작 | engineering 일부 | VIS-075 | — | PENDING |
| 12-04 | 제동방식·공기제동 | ❌미제작 | engineering 일부 | VIS-080, VIS-084, VIS-095 | V-Y-02 (PRIMARY) | PENDING |
| 12-05 | 비상제동·제동거리 | ❌미제작 | engineering 일부 | — | — | OPEN |
| 13-01 | 차체·차체구조 | ❌미제작 | — | — | V-Y-08 | PENDING |
| 13-02 | 대차·윤축 | ❌미제작 | engineering 일부 | VIS-092 | V-Y-08 | PENDING |
| 13-03 | 현가장치 | ❌미제작 | — | VIS-101 | — | PENDING |
| 13-04 | 연결기·완충기 | ❌미제작 | — | — | — | PENDING |
| 13-05 | 진동·사행동·탈선 | ❌미제작 | engineering 일부 | VIS-077, VIS-081 | — | OPEN |
| 14-01 | 경량전철·고무차륜 | ❌미제작 | — | — | V-Y-11 (PRIMARY) | PENDING |
| 14-02 | 특수차량·부속설비 | ❌미제작 | — | — | — | PENDING |

---

## §5. 기존 unit HTML 역검수 (07-06~08-01)

| 파일 | 버전 | 본문 | 문제 | VIS | 영상 | CROSS-REF | 상태 |
|---|---|---|---|---|---|---|---|
| unit-07-06 | v1.6 | ✅ | ✅ sig Part7 | ✅ VIS-07A | ❌ **RETROFIT** (V-Y-15) | ✅ | ⚠ 영상 보완 |
| unit-07-07 | v1.1 | ✅ | ✅ sig Part7 | ✅ VIS-07B | ❌ **RETROFIT** (V-Y-15 RELATED) | ✅ | ⚠ 영상 보완 |
| unit-07-08 | v1.2 | ✅ | ✅ sig Part4 | ✅ VIS-07C | — (정상) | ✅ | ✅ |
| unit-07-09 | v1.1 | ✅ | ✅ sig Part2 | ✅ VIS-09A | — (정상) | ✅ | ✅ |
| unit-07-10 | v1.1 | ✅ | ✅ sig Part8 | ✅ VIS-07D | — (정상) | ✅ | ✅ |
| unit-08-01 | **v1.5** | ✅ | ✅ sig Part5 9개 | ✅ VIS-08A (PRIMARY) | ✅ V-Y-16 PRIMARY / V-Y-17 CROSS-REF | ✅ | ⚠ **FINAL CHECK** (RETROFIT 완료 / YouTube Error 153 원인 미확정 — HTTP Referer·API Client ID 문제 추정, embed 금지 아님 / 배포 환경 확인 필요) |

---

## §6. 다음 제작 READY 목록

> 아래 UNIT은 SOURCE가 확인되어 즉시 착수 가능

| 우선순위 | UNIT | 이유 |
|---|---|---|
| ★★★ | 08-02 TTC·운전보안장치 | sig Part5 문항 있음, VIS-087 있음, 영상 V-Y-03 있음 |
| ★★★ | 08-03 CBTC·이동폐색 | sig Part6 29문항 전량 대응 |
| ★★ | 07-01~07-05 신호기·폐색 | sig Part1~3 전량 있음, VIS 다수, V-Y-14 있음 |
| ★★ | 08-07 CTC·TMS | sig Part5 일부, VIS-087, 6.html SOURCE 확인 |
| ★ | 05-01~05-05 궤도구조 | engineering 문항 있음, VIS 다수, V-Y-09~10 있음 |
| ★ | 09-01~09-02 전기철도 | engineering 문항, VIS-078·105, V-Y-07 있음 |

---

## §7. DUPLICATE 이미지 목록 (우선 정리 대상)

| 이미지 A | 이미지 B | 권고 |
|---|---|---|
| VIS-027_철도종류분류.jpg | VIS-027_철도종류분류.png | .png KEEP, .jpg DROP |
| VIS-028_선로4종비교.jpg | VIS-028_선로4종비교.png | .png KEEP, .jpg DROP |
| VIS-031_레일종류단면비교.jpg | VIS-031_레일종류단면비교.png | .png KEEP |
| VIS-032_분기기구성구조도.jpg | VIS-032_분기기구성구조도.png | .png KEEP |
| VIS-033_건축한계차량한계.jpg | VIS-033_건축한계차량한계.png | .png KEEP |
| VIS-029_신호기분류체계.jpg | VIS-029_신호기분류체계.png | .png KEEP |
| VIS-093_dup | VIS-094 | VIS-093_dup DROP |
| VIS-034_집전장치.jpg/.png | VIS-086_전차선집전장치비교카드.png | 용도 확인 후 판정 |

---

## §8. 파일 위치

| 파일 | 경로 |
|---|---|
| 이 MAP | `GATE5_MASTER_ASSET_MAP_v1.3.md` |
| Coverage Audit | `GATE5_RailwayEngineering_FullCoverageAudit_v2.2.md` |
| unit HTML | `public/theory/unit-07-06*.html ~ unit-08-01*.html` |
| **PRINT LOCK CSS** | **`public/theory/css/GATE5_PRINT_LOCK_v1.css`** |
| 통합 인쇄 UI | `public/theory/GATE5_PRINT_ALL_v1.1.html` |
| VIS 이미지 | `public/theory/images/` |
| signal 문항 | `lib/signal-exam-data.ts` |
| engineering 문항 | `lib/engineering-exam-data.ts` |
| railway-king 문항 | `lib/railway-king-data.ts` |

---

## §9. VERIFY 잔여 항목

| 항목 | 내용 | 우선도 |
|---|---|---|
| unit-07-06 영상 RETROFIT | V-Y-15 삽입 여부 결정·반영 | 중간 |
| unit-07-07 영상 RETROFIT | V-Y-15 RELATED 삽입 여부 결정·반영 | 중간 |
| 3.html 영상 6개 | 신규 UNIT 적용 가능 여부 판정 추가 필요 | 낮음 |
| engineering 문항 UNIT 세분 매핑 | 현재 대략 매핑 — 제작 전 상세 확인 필요 | 낮음 |

---

> 이 MAP을 기준으로 08-01 이후 각 UNIT 제작 착수.  
> 제작 시 SOURCE·VIS·영상 항목을 이 MAP에서 조회 → 자료 재수집 최소화.
