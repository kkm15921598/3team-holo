-- ============================================================
-- HOLO 공지사항 / 이벤트 테이블 (notices / events)
-- 작성: 2026-06-07
--
-- ▶ 왜 필요한가
--   앱 고객센터(공지사항·이벤트 화면)는 이미 Supabase notices/events 테이블을
--   읽도록 만들어져 있다(컬럼: id, title, body, created_at). 그런데 테이블이
--   없으면 항상 "빈 상태"로 보였다. 이 SQL 로 테이블을 만들면:
--     - 관리자 페이지에서 공지/이벤트를 저장하면 → 이 테이블에 기록되고
--     - 앱 고객센터에 그대로 노출된다 (양방향 연동 완성)
--
-- ▶ id 는 관리자에서 'b_<시각>_<랜덤>' 형태의 text 로 생성해 넣으므로 text PK.
-- ▶ 지금은 RLS 비활성(Plan A) 이라 anon 키로 읽기/쓰기가 동작한다.
--   추후 보안(RLS) 적용 시 notices/events 는 '읽기=전체, 쓰기=관리자' 로 좁힐 것.
--
-- ▶ 실행: SQL Editor 에 붙여넣고 RUN (여러 번 실행해도 안전)
-- ============================================================

create table if not exists public.notices (
  id         text primary key,
  title      text not null,
  body       text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id         text primary key,
  title      text not null,
  body       text,
  created_at timestamptz not null default now()
);

create index if not exists notices_created_idx on public.notices (created_at desc);
create index if not exists events_created_idx  on public.events  (created_at desc);
