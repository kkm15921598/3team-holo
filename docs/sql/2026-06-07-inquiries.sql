-- ============================================================
-- HOLO 1:1 문의 테이블 (inquiries)
-- 작성: 2026-06-07
--
-- ▶ 흐름: 앱(고객센터 1:1 문의)에서 작성 → 이 테이블에 저장 →
--   관리자 페이지에서 읽고 답변(reply/status 업데이트) → 앱 사용자 화면에 답변 노출.
-- ▶ id 는 앱/관리자에서 text 로 생성해 넣으므로 text PK.
-- ▶ phone 으로 "내 문의"를 조회한다. status 는 '답변 대기' / '답변 완료'.
-- ▶ 지금은 RLS 비활성(Plan A). 추후 RLS 시 select/insert=본인(phone), update=관리자 로 좁힐 것.
-- ▶ 실행: SQL Editor 붙여넣고 RUN (여러 번 실행해도 안전)
-- ============================================================

create table if not exists public.inquiries (
  id         text primary key,
  phone      text,
  category   text,
  title      text not null,
  content    text,
  status     text not null default '답변 대기',
  reply      text,
  created_at timestamptz not null default now()
);

create index if not exists inquiries_phone_idx   on public.inquiries (phone, created_at desc);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
