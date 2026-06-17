-- ============================================================
-- HOLO 보안 — 공지·이벤트·문의 "쓰기"를 로그인한 관리자만 가능하게 제한
-- 작성: 2026-06-17
--
-- ▶ 배경 (중요한 차이)
--   관리자 콘솔은 Supabase Auth 로 admin 계정(admin@holo.app)에 로그인한 뒤 동작한다.
--   → 관리자 요청은 익명(anon)이 아니라 "인증된 사용자(authenticated)" 이고,
--     JWT 안에 이메일(admin@holo.app)이 들어 있다.
--   반면 모바일 앱(일반 사용자)은 로그인 없이 anon 키로 동작한다.
--   이 차이를 이용해, 관리자만 해야 하는 쓰기를 관리자에게만 허용한다.
--
-- ▶ 무엇이 바뀌나
--   notices(공지) / events(이벤트)
--     - 읽기  : 누구나 (앱·관리자 모두)
--     - 작성/수정/삭제 : 로그인한 관리자(admin@holo.app)만
--   inquiries(1:1 문의)
--     - 읽기  : 누구나
--     - 등록  : 누구나 (앱에서 사용자가 문의 작성)
--     - 수정/삭제 : 로그인한 관리자만 (= 답변/상태변경)
--
-- ▶ 안전성 (앱 안 깨짐)
--   - 모바일 앱이 실제로 하는 것(공지·이벤트 읽기, 문의 작성·조회)은 그대로 동작.
--   - 관리자 콘솔이 하는 것(공지·이벤트 CRUD, 문의 답변)도 로그인 상태라 그대로 동작.
--   - 악의적 익명 사용자는 더 이상 공지를 위조·삭제하거나 문의 답변을 조작할 수 없다.
--   - 여러 번 실행해도 안전(멱등). 되돌리려면 2026-06-17-admin-write-lock-rollback.sql 실행.
--
-- ▶ 관리자 식별
--   아래 정책은 "로그인 사용자의 이메일 = admin@holo.app" 일 때만 쓰기를 허용한다.
--   관리자 이메일이 바뀌면 이 파일의 'admin@holo.app' 을 모두 바꿔 다시 실행하면 된다.
--
-- ▶ 실행: Supabase SQL Editor 에 전체 붙여넣고 RUN.
-- ============================================================


-- ── [1] notices / events : 읽기=전체, 쓰기=관리자만 ──────────────
do $$
declare
  t text;
begin
  foreach t in array array['notices', 'events'] loop
    if to_regclass('public.' || t) is null then
      raise notice '[1] % 테이블 없음 — 건너뜀', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- 기존 정책 정리(허용형 + 이 파일이 만드는 정책)
    execute format('drop policy if exists holo_app_all     on public.%I', t);
    execute format('drop policy if exists holo_read        on public.%I', t);
    execute format('drop policy if exists holo_admin_write on public.%I', t);

    -- 읽기: 누구나
    execute format(
      'create policy holo_read on public.%I for select to anon, authenticated using (true)',
      t
    );
    -- 작성/수정/삭제: 인증된 관리자(admin@holo.app)만
    execute format(
      'create policy holo_admin_write on public.%I for all to authenticated '
      || 'using ((auth.jwt() ->> ''email'') = %L) '
      || 'with check ((auth.jwt() ->> ''email'') = %L)',
      t, 'admin@holo.app', 'admin@holo.app'
    );

    raise notice '[1] % : 읽기=전체 / 쓰기=관리자 적용', t;
  end loop;
end $$;


-- ── [2] inquiries : 읽기·등록=전체, 수정·삭제=관리자만 ───────────
do $$
begin
  if to_regclass('public.inquiries') is null then
    raise notice '[2] inquiries 테이블 없음 — 건너뜀';
    return;
  end if;

  alter table public.inquiries enable row level security;

  drop policy if exists holo_app_all      on public.inquiries;
  drop policy if exists inq_read          on public.inquiries;
  drop policy if exists inq_insert        on public.inquiries;
  drop policy if exists inq_admin_update  on public.inquiries;
  drop policy if exists inq_admin_delete  on public.inquiries;

  -- 읽기: 누구나
  create policy inq_read on public.inquiries
    for select to anon, authenticated using (true);

  -- 등록: 누구나(앱에서 문의 작성)
  create policy inq_insert on public.inquiries
    for insert to anon, authenticated with check (true);

  -- 수정: 관리자만(답변/상태변경)
  create policy inq_admin_update on public.inquiries
    for update to authenticated
    using ((auth.jwt() ->> 'email') = 'admin@holo.app')
    with check ((auth.jwt() ->> 'email') = 'admin@holo.app');

  -- 삭제: 관리자만
  create policy inq_admin_delete on public.inquiries
    for delete to authenticated
    using ((auth.jwt() ->> 'email') = 'admin@holo.app');

  raise notice '[2] inquiries : 읽기·등록=전체 / 수정·삭제=관리자 적용';
end $$;


-- ── [확인용] 정책 목록 점검(따로 실행) ──────────────────────────
--   select tablename, policyname, cmd, roles
--     from pg_policies
--    where schemaname = 'public'
--      and tablename in ('notices', 'events', 'inquiries')
--    order by tablename, cmd;
