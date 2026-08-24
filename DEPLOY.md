# Vercel 배포 가이드

## 사전 준비

- GitHub에 코드 push 완료 ✅
- Supabase 프로젝트 운영 중 ✅ (`vqwezmcwewvebnqnoxrt`)

---

## 1. Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) 접속 → **Log in** (GitHub 계정으로)
2. **Add New → Project**
3. GitHub 저장소 목록에서 `railsafe-app` 선택 → **Import**

---

## 2. 환경 변수 설정 (중요!)

Vercel 배포 설정 화면에서 **Environment Variables** 섹션에 아래 두 값 입력:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vqwezmcwewvebnqnoxrt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(Supabase 대시보드 → Project Settings → API → anon public 키)_ |

> ⚠️ anon key를 입력하지 않으면 로그인·DB 연결이 전부 실패합니다.

---

## 3. 배포 실행

- **Framework Preset**: Next.js (자동 감지됨)
- **Build Command**: `next build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Deploy** 클릭

약 2~3분 후 `https://railsafe-app-xxx.vercel.app` 형태의 URL이 생성됩니다.

---

## 4. Supabase Auth URL 설정 (Google 로그인 필수)

배포 URL이 나오면 Supabase에서 허용 도메인을 추가해야 합니다.

1. [Supabase 대시보드](https://app.supabase.com) → 프로젝트 선택
2. **Authentication → URL Configuration**
3. **Site URL**: `https://railsafe-app-xxx.vercel.app` 로 변경
4. **Redirect URLs** 에 추가:
   ```
   https://railsafe-app-xxx.vercel.app/auth/callback
   ```
5. **Save**

---

## 5. 배포 후 확인 체크리스트

- [ ] `https://배포URL/login` 접속 → Google 로그인 정상 작동
- [ ] 로그인 후 `/dashboard` 이동 → 7과목 카드 표시
- [ ] 과목 카드 → CBT 클릭 → 문제 로드 (421문제)
- [ ] 과목 카드 → 스토리 클릭 → 챕터 1 스토리 표시
- [ ] 미들웨어 동작: 비로그인 상태에서 `/dashboard` 접속 시 `/login` 리다이렉트

---

## 이후 코드 변경 시

GitHub에 push하면 Vercel이 자동으로 재배포합니다. (CI/CD 자동 설정)

```bash
git add .
git commit -m "변경 내용"
git push origin main
```

---

## 📋 철도신호 핵심정리(6.html) 개선 로드맵

### 분석 기준
- CBT 기출·복원 282문항 (signal-exam-data.ts) vs 6.html 교차분석 (2026-08-23)
- 누락 키워드 46개, 함정 경고 미수록 52개 확인

### 현재 결정: A안 (부분 보강) 즉시 적용
기존 개념 44개 구조 유지, 누락 키워드를 기존 개념에 추가

#### 파트별 보강 우선순위
| 우선순위 | PART | 누락 수 | 핵심 보강 내용 |
|----------|------|---------|---------------|
| 🔴 1순위 | PART 1 신호기·차내신호 | 10개 | 차내신호 유형 4가지(15신호·정지·진행·야드), DMI, 철도차량운전규칙 83~85조 |
| 🔴 2순위 | PART 6 CBTC | 9개 | 양방향 무선통신, 통신두절 시 안전측 제어, ATO·ATP 연계, 통신지연 |
| 🔴 3순위 | PART 7 KTCS-2·3·LTE-R | 9개 | KTCS-3 궤도회로 미사용, LTE-R 위치검지, 이동폐색, 자동운전 |
| 🟠 4순위 | PART 3 궤도회로 | 7개 | 궤도계전기 여자/낙하, 절연이음매, 도상저항, Shunting 영문명 |
| 🟠 5순위 | PART 5 CTC·ATC | 5개 | ATP-ATO 관계, 운행권한(Movement Authority), 중앙원격제어 |
| 🟡 6순위 | PART 4 폐색 | 4개 | 운전시격(Headway), 이동폐색 필수정보, 고정폐색 경계 |
| 🟡 7순위 | PART 2 선로전환기 | 2개 | 전환 검지, 진로쇄정 |

#### 추가 예정 함정 경고 박스
- 유도신호기 정위 = 소등(무현시) ← "정지" 혼동 주의
- 중계신호기 = 종속신호기 (임시신호기 비해당)
- ATC=연속 속도제어 / ATS=불연속 경보 대비표
- CTC vs CBTC 약어 혼동 경고

### 장기 계획: C안 (전면 재편) — 추후 착수
- 기출 282문항 빈출 개념 우선순위로 섹션 재구성
- CBT PART 구조(1~8)에 맞게 6.html 섹션 재배치
- 각 개념에 "기출 함정 박스" 표준화
- 예상 작업량: 3~4주

> 📌 전면 재편 착수 전 확인사항:
> 1. 6.html A안 보강 완료 후 CBT 재풀이로 체감 개선 확인
> 2. 다른 과목(1~5·7.html) A안 보강도 병행 완료 후 전면 재편 착수
> 3. signal CBT 페이지 (#172·#173) 먼저 완료 필요
