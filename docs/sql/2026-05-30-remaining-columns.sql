-- ============================================================
-- HOLO 남은 기능버그(A안) 처리를 위한 Supabase 스키마 추가
-- 작성: 2026-05-30
--
-- ▶ 실행 방법: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣고 RUN
--   (모두 "있으면 건너뜀(IF NOT EXISTS)" 이라 여러 번 실행해도 안전)
--
-- ▶ 이 SQL 을 먼저 실행한 뒤 알려주시면, 해당 컬럼을 사용하는 코드를 붙입니다.
--   (컬럼이 없는 상태에서 코드부터 넣으면 메시지 전송/저장이 실패하므로 순서 중요)
-- ============================================================

-- ── 1) 채팅 메시지: 파일/위치/리액션/답장/전달/타입 저장 ──────────────
-- 현재 messages 는 텍스트/이미지(image_url)만 저장되고, 파일·위치·리액션·답장은
-- 화면에만 있다가 새로고침/상대방에게서 사라진다. 아래 컬럼으로 영속화한다.
alter table public.messages add column if not exists msg_type     text;     -- 'text'|'image'|'file'|'location'|'system'
alter table public.messages add column if not exists file_name    text;     -- 첨부 파일명
alter table public.messages add column if not exists file_size    bigint;   -- 첨부 파일 크기(byte)
alter table public.messages add column if not exists file_url      text;     -- 첨부 파일 URL(스토리지)
alter table public.messages add column if not exists lat          double precision; -- 위치 공유 위도
alter table public.messages add column if not exists lng          double precision; -- 위치 공유 경도
alter table public.messages add column if not exists place_name   text;     -- 위치 공유 장소명
alter table public.messages add column if not exists reply_to     jsonb;    -- 답장 대상 메시지 미리보기 {id,nickname,preview}
alter table public.messages add column if not exists reactions    jsonb;    -- 리액션 맵 {emoji: [phone,...]}
alter table public.messages add column if not exists forwarded_from text;   -- 전달 출처 방 id(선택)

-- ── 2) 채팅방: 그룹 여부/멤버 — 타기기 복원 시 1:1로 깨지는 문제 대비 ──
alter table public.chat_rooms add column if not exists is_group     boolean default false;
alter table public.chat_rooms add column if not exists member_phones jsonb;  -- 멤버 phone 배열(그룹)

-- ── 3) 댓글: 지도 첨부(위치) 저장 — 새로고침 시 지도 사라짐 방지 ──────
alter table public.comments add column if not exists lat        double precision;
alter table public.comments add column if not exists lng        double precision;
alter table public.comments add column if not exists place_name text;

-- ── 4) 회원 관심사 저장 — 가입 시 선택한 관심사가 서버에 안 남던 문제 ──
alter table public.users add column if not exists interests jsonb;  -- ["요리","러닝",...]

-- ── 5) (선택) posts.comments 댓글수 정합 — 트리거로 자동 유지하고 싶을 때 ──
--    지금은 코드에서 댓글 insert 후 카운트 업데이트로 처리 예정이라 필수는 아님.
--    원하면 아래처럼 함수/트리거로 서버측 자동 유지도 가능(주석 해제 후 실행):
-- create or replace function public.bump_post_comment_count() returns trigger as $$
-- begin
--   update public.posts set comments = (
--     select count(*) from public.comments c where c.post_id = new.post_id
--   ) where id = new.post_id;
--   return new;
-- end; $$ language plpgsql;
-- drop trigger if exists trg_bump_post_comment_count on public.comments;
-- create trigger trg_bump_post_comment_count after insert on public.comments
--   for each row execute function public.bump_post_comment_count();
