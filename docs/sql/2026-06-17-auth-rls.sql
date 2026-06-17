-- ============================================================
-- HOLO 보안 강화(Plan B 1단계) — 비밀번호 컬럼 잠금 + 전 테이블 RLS ON
-- 작성: 2026-06-17
--
-- ▶ 배경 (지금 구조)
--   이 앱은 Supabase Auth 를 쓰지 않고, 모든 DB 호출이 "anon 키" 하나로 나간다.
--   anon 키는 공개 키라 웹사이트를 여는 누구나 볼 수 있다(원래 그런 설계).
--   문제는 지금 테이블에 RLS(자물쇠)가 꺼져 있어서, 그 공개 키만으로
--   누구나 users 테이블의 'password' 해시까지 직접 조회할 수 있다는 점.
--
-- ▶ 이 SQL 이 하는 일
--   [1] users.password 컬럼을 anon/authenticated 가 직접 SELECT 못 하게 막는다.
--       (로그인/회원가입/비번변경은 서버 함수·다른 컬럼만 쓰므로 영향 없음)
--   [2] 앱이 쓰는 모든 테이블에 RLS 를 켠다. 단, 지금 동작이 안 깨지도록
--       "anon/authenticated 허용" 정책을 함께 만들어 둔다(현행 유지).
--
-- ▶ 이 SQL 이 "아직" 안 하는 일 (다음 단계 = Plan B 2단계, Supabase Auth 필요)
--   "본인 행만 수정 가능" 같은 행 단위 권한은 Postgres 가 호출자를 식별해야 하는데,
--   지금은 Auth 가 없어 auth.uid() 가 없다. 그건 Auth 전환 후 별도 작업으로 좁힌다.
--
-- ▶ 안전성
--   - 관리자(Next.js) 앱은 Service Role 키를 쓰며 RLS 를 "통과(bypass)" 하므로 영향 없음.
--   - verify_login / hash_password 는 SECURITY DEFINER 라 소유자 권한으로 동작 → 영향 없음.
--   - 여러 번 실행해도 안전(멱등). 되돌리려면 2026-06-17-auth-rls-rollback.sql 실행.
--
-- ▶ 실행: Supabase SQL Editor 에 전체 붙여넣고 RUN.
--   (운영 DB 에 바로 적용하기 전에 한 번 읽어보길 권장)
-- ============================================================


-- ── [1] users.password 컬럼 잠금 ─────────────────────────────
-- 표 단위 SELECT 를 회수하고, password 를 "제외한" 모든 컬럼만 다시 허용한다.
-- (information_schema 로 컬럼을 동적으로 읽어, 새 컬럼이 생겨도 자동 포함된다.)
-- INSERT/UPDATE/DELETE 권한은 건드리지 않으므로 회원가입(insert)·비번변경(update)은 그대로 동작.
do $$
declare
  v_cols text;
begin
  if to_regclass('public.users') is null then
    raise notice '[1] public.users 테이블이 없어 건너뜀';
    return;
  end if;

  -- 통째 조회 차단
  revoke select on public.users from anon, authenticated;

  -- password 만 빼고 다시 SELECT 허용
  select string_agg(quote_ident(column_name), ', ')
    into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'users'
     and column_name not in ('password');   -- ★ 숨길 민감 컬럼(추가하려면 여기에 나열)

  if v_cols is null then
    raise notice '[1] users 컬럼을 찾지 못함 — SELECT 권한 미부여';
  else
    execute format('grant select (%s) on public.users to anon, authenticated', v_cols);
    raise notice '[1] users: password 제외 컬럼만 SELECT 허용 완료';
  end if;
end $$;


-- ── [2] 전 테이블 RLS ON + 현행유지 정책 ──────────────────────
-- 자물쇠(RLS)를 켜되, 지금 기능이 멈추지 않도록 anon/authenticated 허용 정책을 같이 만든다.
-- (행 단위 권한 강화는 Auth 전환 후 이 정책을 좁히는 방식으로 진행한다.)
-- 주의: 랜딩의 waitlist 등 여기 목록에 없는 테이블은 일부러 건드리지 않는다.
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
      raise notice '[2] % 테이블 없음 — 건너뜀', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists holo_app_all on public.%I', t);
    execute format(
      'create policy holo_app_all on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
    raise notice '[2] % : RLS ON + 현행유지 정책 적용', t;
  end loop;
end $$;


-- ── [확인용] 아래 두 줄을 따로 실행하면 결과를 점검할 수 있다 ──
-- password 가 목록에 "없어야" 정상:
--   select column_name from information_schema.role_column_grants
--    where grantee = 'anon' and table_schema = 'public' and table_name = 'users'
--    order by 1;
-- 모든 대상 테이블의 rowsecurity 가 true 여야 정상:
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public' order by tablename;
