-- ============================================================
-- HOLO 옛 글/댓글/메시지 작성자명 정정 (1회 실행)
-- 작성: 2026-06-16
--
-- ▶ 왜
--   과거 "프로필/닉네임 덮어쓰기 경합" 버그가 있던 기간에 작성된 글·댓글·메시지는
--   그때의 잘못된(빈/엉뚱한) 닉네임이 그대로 박제돼, 내 글이 남(가짜계정)처럼 보였다.
--   코드(프로필 부분저장)는 이미 고쳤으므로 "앞으로"는 정상이지만, 과거 데이터는
--   아래 SQL 로 전화번호(고정 ID) 기준 현재 올바른 닉네임으로 한 번에 정정한다.
--
-- ▶ 안전성
--   - 전화번호(author_phone / user_id / sender_phone)가 users 와 매칭될 때만 정정.
--   - users.nickname 이 비어 있으면 건드리지 않음(빈 값 덮어쓰기 방지).
--   - 이미 올바른 행은 변경하지 않음(is distinct from).
--   - 전화번호가 없는 아주 옛 데이터는 정정 대상에서 자동 제외(부득이).
--
-- ▶ 실행: Supabase SQL Editor 에 붙여넣고 RUN (1회면 충분, 여러 번 실행해도 안전)
-- ============================================================

-- 1) 게시글
update public.posts p
   set author_nickname = u.nickname
  from public.users u
 where p.author_phone = u.phone
   and u.nickname is not null and u.nickname <> ''
   and p.author_nickname is distinct from u.nickname;

-- 2) 댓글
update public.comments c
   set nickname = u.nickname
  from public.users u
 where c.user_id = u.phone
   and u.nickname is not null and u.nickname <> ''
   and c.nickname is distinct from u.nickname;

-- 3) 채팅 메시지
update public.messages m
   set sender_nickname = u.nickname
  from public.users u
 where m.sender_phone = u.phone
   and u.nickname is not null and u.nickname <> ''
   and m.sender_nickname is distinct from u.nickname;
