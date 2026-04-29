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
