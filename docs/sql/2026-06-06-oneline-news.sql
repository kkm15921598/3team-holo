-- ============================================================
-- HOLO "동네 한 줄 소식" 서버 영속화 테이블 (oneline_news)
-- 작성: 2026-06-06
--
-- ▶ 왜 필요한가
--   한 줄 소식이 지금까지 브라우저 localStorage 에만 저장돼,
--   기기/브라우저를 바꾸거나 캐시를 지우면 영구히 사라졌다.
--   이 테이블을 만들면 oneline-store.ts 에 이미 짜여있는
--   insert/select(syncOnelineFromSupabase) 코드가 살아나 기기 간 유지된다.
--
-- ▶ auth-rls.sql 과의 관계 (★중요★)
--   2026-06-06-auth-rls.sql 은 oneline_news 가 "존재할 때만" RLS 를 켜고
--   SELECT 정책만 만든다(INSERT 정책 없음). 그 상태로는 RLS 때문에
--   한 줄 소식 "쓰기"가 전부 막힌다. → 이 파일이 INSERT/DELETE 정책까지 추가한다.
--   실행 순서는 무관(여러 번 실행해도 안전). auth-rls 먼저든 이거 먼저든 OK.
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
-- 읽기: 누구나(로그인 전 홈 티커 포함) — auth-rls.sql 의 select 정책과 동일(재실행 안전).
-- 쓰기/삭제: 로그인 사용자가 "본인 닉네임" 글에만. (닉네임은 가입 시 유일성 보장 →
--            전화번호 PII 를 저장하지 않고도 소유권 판정 가능)
alter table public.oneline_news enable row level security;

drop policy if exists oneline_news_select on public.oneline_news;
create policy oneline_news_select on public.oneline_news
  for select to anon, authenticated using (true);

drop policy if exists oneline_news_insert_own on public.oneline_news;
create policy oneline_news_insert_own on public.oneline_news
  for insert to authenticated
  with check (
    nickname = (select u.nickname from public.users u where u.auth_id = auth.uid())
  );

drop policy if exists oneline_news_delete_own on public.oneline_news;
create policy oneline_news_delete_own on public.oneline_news
  for delete to authenticated
  using (
    nickname = (select u.nickname from public.users u where u.auth_id = auth.uid())
  );

-- ── 3) (선택) 서버측 24h 자동 정리 ─────────────────────────────────
-- 남의 소식은 24h 휘발이 클라이언트에서 처리되지만, 서버에 쌓이는 것을 막고 싶으면
-- pg_cron 등으로 아래를 주기 실행:
--   delete from public.oneline_news where created_at < now() - interval '24 hours';
