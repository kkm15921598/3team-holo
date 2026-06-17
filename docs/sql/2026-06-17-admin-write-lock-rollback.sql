-- ============================================================
-- HOLO 보안 되돌리기 — 2026-06-17-admin-write-lock.sql 의 롤백
-- 작성: 2026-06-17
--
-- ▶ 언제 쓰나
--   관리자 쓰기 제한 적용 후 공지/이벤트 작성이나 문의 답변이 안 되는 등
--   문제가 생기면, 이 파일을 RUN 하면 "누구나 허용(허용형)" 상태로 되돌린다.
--   (여러 번 실행해도 안전)
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['notices', 'events', 'inquiries'] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- admin-write-lock 이 만든 정책 제거
    execute format('drop policy if exists holo_read         on public.%I', t);
    execute format('drop policy if exists holo_admin_write  on public.%I', t);
    execute format('drop policy if exists inq_read          on public.%I', t);
    execute format('drop policy if exists inq_insert        on public.%I', t);
    execute format('drop policy if exists inq_admin_update  on public.%I', t);
    execute format('drop policy if exists inq_admin_delete  on public.%I', t);

    -- 허용형(누구나) 정책으로 복구
    execute format('drop policy if exists holo_app_all on public.%I', t);
    execute format(
      'create policy holo_app_all on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );

    raise notice '[rollback] % : 허용형(누구나) 정책으로 복구', t;
  end loop;
end $$;
