-- ============================================================
-- HOLO 관리자 ↔ 앱 연동 한 방 SQL (공지/이벤트/1:1문의)
-- 작성: 2026-06-07
--
-- ▶ 이거 하나만 실행하면 공지·이벤트·문의 연동이 모두 작동한다.
--   (테이블 생성 + RLS 해제 + anon/authenticated 권한 부여까지 포함)
--
-- ▶ 왜 RLS 해제+grant 가 필요한가
--   테이블만 만들면 RLS/권한 때문에 관리자(앱)의 '쓰기/읽기'가 막혀
--   "관리자에서 공지 써도 앱에 안 뜨는" 증상이 난다(2026-06-07 실제 발생).
--   지금은 Plan A(비로그인 anon) 단계라 아래처럼 열어둔다.
--   ★정식 보안(RLS) 적용 시: notices/events=읽기 전체·쓰기 관리자,
--    inquiries=본인(phone)만 읽기/쓰기 로 다시 좁힐 것.
--
-- ▶ 실행: SQL Editor 에 전체 붙여넣고 RUN (여러 번 실행해도 안전)
-- ▶ 실행 후: 관리자에서 공지/이벤트를 "새로" 작성해야 서버에 들어간다
--   (테이블/권한 생기기 전에 쓴 글은 저장 실패했으므로 재작성 필요).
-- ============================================================

-- ── 1) 테이블 ──────────────────────────────────────────────────────
create table if not exists public.notices (
  id text primary key, title text not null, body text,
  created_at timestamptz not null default now()
);
create table if not exists public.events (
  id text primary key, title text not null, body text,
  created_at timestamptz not null default now()
);
create table if not exists public.inquiries (
  id text primary key, phone text, category text, title text not null,
  content text, status text not null default '답변 대기', reply text,
  created_at timestamptz not null default now()
);
create index if not exists notices_created_idx   on public.notices   (created_at desc);
create index if not exists events_created_idx     on public.events    (created_at desc);
create index if not exists inquiries_phone_idx    on public.inquiries (phone, created_at desc);

-- ── 2) RLS 해제 + 권한 (Plan A: anon 키로 읽기/쓰기 동작하게) ──────────
alter table public.notices   disable row level security;
alter table public.events    disable row level security;
alter table public.inquiries disable row level security;
grant all on public.notices, public.events, public.inquiries to anon, authenticated;
