-- ============================================================
-- HOLO 보안 강화 되돌리기 — 2026-06-17-auth-rls.sql 의 롤백
-- 작성: 2026-06-17
--
-- ▶ 언제 쓰나
--   auth-rls.sql 적용 후 앱에서 예상치 못한 동작(데이터 안 보임/저장 안 됨)이 생기면
--   이 파일을 Supabase SQL Editor 에 붙여넣고 RUN 하면 적용 전 상태로 되돌아간다.
--   (여러 번 실행해도 안전)
-- ============================================================

-- [1] users.password 컬럼 잠금 해제 — 표 단위 SELECT 복구
do $$
begin
  if to_regclass('public.users') is not null then
    grant select on public.users to anon, authenticated;
    raise notice '[rollback 1] users SELECT 전체 복구';
  end if;
end $$;

-- [2] RLS 끄기 + 정책 제거
do $$
declare
  t    text;
  tbls text[] := array[
    'users','posts','comments','post_likes','messages','chat_rooms',
    'friends','friend_requests','notifications','guestbook',
    'meetup_reviews','oneline_news','inquiries','notices','events'
  ];
begin
  foreach t in array tbls loop
    if to_regclass('public.'||t) is null then
      continue;
    end if;
    execute format('drop policy if exists holo_app_all on public.%I', t);
    execute format('alter table public.%I disable row level security', t);
    raise notice '[rollback 2] % : RLS OFF + 정책 제거', t;
  end loop;
end $$;
