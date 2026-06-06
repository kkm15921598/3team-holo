-- ============================================================
-- HOLO "동네 한 줄 소식" 서버 영속화 테이블 (oneline_news)
-- 작성: 2026-06-06  (rev2: public.users 의존 제거 — 42P01 오류 수정)
--
-- ▶ 왜 필요한가
--   한 줄 소식이 지금까지 브라우저 localStorage 에만 저장돼,
--   기기/브라우저를 바꾸거나 캐시를 지우면 영구히 사라졌다.
--   이 테이블을 만들면 oneline-store.ts 에 이미 짜여있는
--   insert/select(syncOnelineFromSupabase) 코드가 살아나 기기 간 유지된다.
--
-- ▶ rev2 변경: 초기 버전은 "본인 닉네임만 쓰기/삭제" 정책에서 public.users 를
--   참조했는데, 현재 단계(Plan A: anon key, Supabase Auth 미적용)에선 users 기준
--   소유권 판정이 성립하지 않아 오류가 났다. → 소유권은 앱(클라이언트)에서 이미
--   강제(본인 글에만 삭제 버튼 + removeOnelineNews 닉네임 대조)하므로, 서버 정책은
--   현재 앱과 동일하게 열어두고 엄격한 서버 차단은 Plan B(auth-rls)에서 좁힌다.
--
-- ▶ auth-rls.sql 과의 관계
--   auth-rls.sql 은 oneline_news 가 존재하면 RLS 를 켜고 SELECT 정책만 만든다
--   (INSERT 없음 → 그대로면 쓰기가 막힘). 이 파일이 INSERT/DELETE 정책까지 채운다.
--   실행 순서 무관, 여러 번 실행해도 안전.
--
-- ▶ 실행: SQL Editor 에 붙여넣고 RUN
-- ============================================================

-- ── 1) 테이블 ──────────────────────────────────────────────────────
create table if not exists public.oneline_news (
  news_id    text primary key,
  nickname   text not null,
  content    text not null,
  created_at timestamptz not null default now()
);
-- 최신순 조회(티커)·24h 만료 판정을 위한 인덱스
create index if not exists oneline_news_created_idx
  on public.oneline_news (created_at desc);

-- ── 2) RLS ────────────────────────────────────────────────────────
-- 읽기/쓰기/삭제 모두 현재 앱(anon key)과 동일하게 허용한다.
-- 소유권(본인 글만 삭제)은 클라이언트에서 강제 — Plan B(auth-rls)에서 서버측으로 좁힐 것.
alter table public.oneline_news enable row level security;

drop policy if exists oneline_news_select on public.oneline_news;
create policy oneline_news_select on public.oneline_news
  for select to anon, authenticated using (true);

drop policy if exists oneline_news_insert on public.oneline_news;
create policy oneline_news_insert on public.oneline_news
  for insert to anon, authenticated with check (true);

drop policy if exists oneline_news_delete on public.oneline_news;
create policy oneline_news_delete on public.oneline_news
  for delete to anon, authenticated using (true);

-- ── 3) (선택) 서버측 24h 자동 정리 ─────────────────────────────────
-- 남의 소식은 24h 휘발이 클라이언트에서 처리되지만, 서버에 쌓이는 것을 막고 싶으면
-- pg_cron 등으로 아래를 주기 실행:
--   delete from public.oneline_news where created_at < now() - interval '24 hours';
