-- 롤백: kibchul_attempts 테이블 및 정책 제거
DROP POLICY IF EXISTS "kibchul_attempts_select_own" ON public.kibchul_attempts;
DROP POLICY IF EXISTS "kibchul_attempts_insert_own" ON public.kibchul_attempts;
DROP POLICY IF EXISTS "kibchul_attempts_update_own" ON public.kibchul_attempts;
DROP POLICY IF EXISTS "kibchul_attempts_delete_own" ON public.kibchul_attempts;
DROP TABLE IF EXISTS public.kibchul_attempts;
