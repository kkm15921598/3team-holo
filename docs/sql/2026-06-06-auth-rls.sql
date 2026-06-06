-- ============================================================
-- HOLO 진짜 보안 적용: Supabase Auth 연동 + RLS(행 수준 보안)
-- 작성: 2026-06-06
--
-- ▶▶ 실행 전 필수 설정 (대시보드에서 먼저!) ◀◀
--   Supabase 대시보드 → Authentication → Sign In / Providers → Email
--   → "Confirm email" 을 OFF 로 변경.
--   (휴대폰 번호를 가상 이메일로 변환해 가입하므로 실제 메일 확인이 불가능.
--    이걸 안 끄면 가입/로그인이 전부 막힌다. ★가장 중요★)
--
-- ▶ 실행 방법: SQL Editor → 아래 전체 붙여넣고 RUN (여러 번 실행해도 안전)
-- ▶ 실행 순서: ① 위 대시보드 설정 → ② 이 SQL 실행 → ③ 새 클라이언트 코드 배포
--   (이 SQL 을 실행하는 순간 기존 배포본의 로그인/가입은 동작을 멈추므로
--    ②와 ③은 가능한 한 같은 시점에 진행할 것)
--
-- ▶ 동작 방식 요약
--   - 신규 가입: supabase.auth.signUp → users 행에 auth_id 저장
--   - 기존 회원: 첫 로그인 시 자동으로 Auth 계정 생성·연결되고
--     users.password(평문)는 그 자리에서 NULL 로 지워진다 (레이지 마이그레이션)
--   - 모든 테이블 RLS ON: 로그인(authenticated) 없이는 아무 데이터도 못 읽고,
--     개인 데이터(메시지/친구/알림 등)는 본인 것만 접근 가능
-- ============================================================

-- ── 0) 확장: 비밀번호 재설정 RPC 에서 bcrypt 해시 생성에 사용 ──────────
create extension if not exists pgcrypto with schema extensions;

-- ── 1) users ↔ auth.users 연결 컬럼 ─────────────────────────────────
alter table public.users add column if not exists auth_id uuid unique;

-- ── 2) 헬퍼 함수 ───────────────────────────────────────────────────
-- 현재 로그인한 사용자의 phone (RLS 정책의 기준값)
create or replace function public.current_phone()
returns text
language sql stable security definer
set search_path = public
as $$
  select phone from public.users where auth_id = auth.uid()
$$;

-- 채팅방 멤버 여부 — member_phones(jsonb/text 모두 대응) 또는
-- DM 방 id("dm_전화1_전화2")에 내 번호가 포함되는지로 판정.
create or replace function public.is_room_member(p_room_id text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_rooms r
    where r.id::text = p_room_id
      and (
        coalesce(r.member_phones::text, '') like '%' || public.current_phone() || '%'
        or r.id::text like '%' || public.current_phone() || '%'
      )
  )
$$;

-- ── 3) RPC 함수 (로그인 전 anon 상태에서 필요한 조회들) ──────────────
-- RLS 로 users 직접 조회가 막히므로, 가입/찾기 화면은 아래 함수를 사용한다.
-- security definer = 함수 안에서만 제한된 조회를 허용 (테이블 전체 노출 없음)

-- 가입 1단계: 휴대폰 중복 확인
create or replace function public.check_phone_exists(p_phone text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.users where phone = p_phone)
$$;

-- 가입: 닉네임 중복 확인
create or replace function public.check_nickname_exists(p_nickname text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.users where nickname = p_nickname)
$$;

-- 아이디 찾기: 이름+번호 본인확인 후 최소 정보만 반환
create or replace function public.find_account_by_identity(p_name text, p_phone text)
returns table(phone text, nickname text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select u.phone, u.nickname, u.created_at
  from public.users u
  where u.name = p_name and u.phone = p_phone
$$;

-- 비밀번호 찾기 1단계: 이름+번호 일치 여부만 확인
create or replace function public.verify_identity(p_name text, p_phone text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.users where name = p_name and phone = p_phone)
$$;

-- 로그인 보조: Auth 로그인 실패 시 계정 상태 분류
--   'no_account'     : 가입된 적 없는 번호
--   'migrate'        : 구(자체 로그인) 계정 — 비번 일치 → 클라이언트가 Auth 계정 생성 후 연결
--   'wrong_password' : 계정은 있으나 비밀번호 불일치
create or replace function public.legacy_login_check(p_phone text, p_password text)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  u record;
begin
  select auth_id, password into u from public.users where phone = p_phone;
  if not found then
    return 'no_account';
  end if;
  if u.auth_id is null and u.password is not null and u.password = p_password then
    return 'migrate';
  end if;
  return 'wrong_password';
end
$$;

-- 구 계정 → Auth 계정 연결 (방금 signUp 으로 로그인된 상태에서 호출)
-- 연결 성공 시 평문 비밀번호를 즉시 NULL 로 지운다.
create or replace function public.link_legacy_account(p_phone text, p_password text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  update public.users
     set auth_id = auth.uid(),
         password = null
   where phone = p_phone
     and auth_id is null
     and password is not null
     and password = p_password;
  return found;
end
$$;

-- 비밀번호 찾기 2단계: 이름+번호 본인확인 후 비밀번호 재설정
--   - Auth 연동 계정: auth.users 의 해시 비밀번호를 직접 갱신
--   - 아직 미연동(구) 계정: users.password 갱신 → 다음 로그인 때 자동 이전
create or replace function public.reset_password_by_identity(
  p_name text, p_phone text, p_new_password text
)
returns boolean
language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare
  v_auth uuid;
begin
  select auth_id into v_auth
    from public.users
   where name = p_name and phone = p_phone;
  if not found then
    return false;
  end if;
  if v_auth is not null then
    update auth.users
       set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
     where id = v_auth;
  else
    update public.users
       set password = p_new_password
     where name = p_name and phone = p_phone;
  end if;
  return true;
end
$$;

-- 회원 탈퇴: 본인 데이터 삭제 + Auth 계정까지 삭제
create or replace function public.delete_my_account()
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_phone text;
begin
  if auth.uid() is null then
    return;
  end if;
  select phone into v_phone from public.users where auth_id = auth.uid();
  if v_phone is not null then
    update public.posts set is_deleted = true where author_phone = v_phone;
    delete from public.friends where user_phone = v_phone;
    delete from public.users where phone = v_phone;
  end if;
  delete from auth.users where id = auth.uid();
end
$$;

-- ── 4) RLS 활성화 + 정책 ───────────────────────────────────────────
-- 기본 원칙:
--   읽기  : 로그인한 사용자(authenticated)만. 개인 데이터는 본인 것만.
--   쓰기  : 본인 행(작성자/수신자/멤버)만. 단 좋아요수·참여자 등
--           "남의 글의 카운터"를 갱신해야 하는 곳은 authenticated 전체 허용.
--   anon : 아무 테이블도 직접 접근 불가 (위 RPC 함수만 사용 가능)

-- users ----------------------------------------------------------------
alter table public.users enable row level security;
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated using (true);
drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated with check (auth_id = (select auth.uid()));
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (auth_id = (select auth.uid()));
drop policy if exists users_delete_own on public.users;
create policy users_delete_own on public.users
  for delete to authenticated using (auth_id = (select auth.uid()));

-- posts ----------------------------------------------------------------
alter table public.posts enable row level security;
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select to authenticated using (true);
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated with check (author_phone = (select public.current_phone()));
-- update 는 전체 허용: 좋아요수/댓글수/조회수/참여자 명단을 다른 사용자가 갱신하기 때문.
-- (글 내용 자체의 보호가 필요해지면 카운터를 트리거/RPC 로 옮긴 뒤 본인 제한으로 좁힐 것)
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts
  for update to authenticated using (true);
drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete to authenticated using (author_phone = (select public.current_phone()));

-- comments -------------------------------------------------------------
alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (true);
drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated with check (author_phone = (select public.current_phone()));
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update to authenticated using (author_phone = (select public.current_phone()));
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete to authenticated using (author_phone = (select public.current_phone()));

-- notifications ----------------------------------------------------------
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (recipient_phone = (select public.current_phone()));
-- insert 는 전체 허용: 친구신청/참여 등으로 "남에게" 알림을 만들어 주기 때문.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (true);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated using (recipient_phone = (select public.current_phone()));
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (recipient_phone = (select public.current_phone()));

-- friends ----------------------------------------------------------------
alter table public.friends enable row level security;
drop policy if exists friends_select_own on public.friends;
create policy friends_select_own on public.friends
  for select to authenticated using (user_phone = (select public.current_phone()));
-- insert 는 전체 허용: 친구 수락 시 양쪽 행을 동시에 만들기 때문.
drop policy if exists friends_insert on public.friends;
create policy friends_insert on public.friends
  for insert to authenticated with check (true);
drop policy if exists friends_update_own on public.friends;
create policy friends_update_own on public.friends
  for update to authenticated using (user_phone = (select public.current_phone()));
drop policy if exists friends_delete_own on public.friends;
create policy friends_delete_own on public.friends
  for delete to authenticated using (user_phone = (select public.current_phone()));

-- friend_requests ----------------------------------------------------------
alter table public.friend_requests enable row level security;
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select to authenticated using (true);
drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert to authenticated with check (true);
drop policy if exists friend_requests_delete_own on public.friend_requests;
create policy friend_requests_delete_own on public.friend_requests
  for delete to authenticated using (user_phone = (select public.current_phone()));

-- messages ----------------------------------------------------------------
alter table public.messages enable row level security;
drop policy if exists messages_select_member on public.messages;
create policy messages_select_member on public.messages
  for select to authenticated using (public.is_room_member(room_id::text));
drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (
    sender_phone = (select public.current_phone())
    and public.is_room_member(room_id::text)
  );
-- update 는 같은 방 멤버까지 허용: 리액션(이모지)을 남의 메시지에 추가하기 때문.
drop policy if exists messages_update_member on public.messages;
create policy messages_update_member on public.messages
  for update to authenticated using (public.is_room_member(room_id::text));
drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages
  for delete to authenticated using (sender_phone = (select public.current_phone()));

-- chat_rooms ----------------------------------------------------------------
alter table public.chat_rooms enable row level security;
drop policy if exists chat_rooms_select_member on public.chat_rooms;
create policy chat_rooms_select_member on public.chat_rooms
  for select to authenticated using (public.is_room_member(id::text));
drop policy if exists chat_rooms_insert on public.chat_rooms;
create policy chat_rooms_insert on public.chat_rooms
  for insert to authenticated with check (true);
drop policy if exists chat_rooms_update_member on public.chat_rooms;
create policy chat_rooms_update_member on public.chat_rooms
  for update to authenticated using (public.is_room_member(id::text));
drop policy if exists chat_rooms_delete_member on public.chat_rooms;
create policy chat_rooms_delete_member on public.chat_rooms
  for delete to authenticated using (public.is_room_member(id::text));

-- ── 5) 있을 때만 적용하는 테이블들 (환경에 따라 미생성일 수 있음) ──────
do $$
begin
  -- post_likes: 좋아요 — 본인 것만 추가/삭제
  if to_regclass('public.post_likes') is not null then
    execute 'alter table public.post_likes enable row level security';
    execute 'drop policy if exists post_likes_select on public.post_likes';
    execute 'create policy post_likes_select on public.post_likes for select to authenticated using (true)';
    execute 'drop policy if exists post_likes_insert_own on public.post_likes';
    execute 'create policy post_likes_insert_own on public.post_likes for insert to authenticated with check (user_phone = (select public.current_phone()))';
    execute 'drop policy if exists post_likes_delete_own on public.post_likes';
    execute 'create policy post_likes_delete_own on public.post_likes for delete to authenticated using (user_phone = (select public.current_phone()))';
  end if;

  -- guestbook: 방명록 — 작성은 본인 명의, 삭제는 작성자/방 주인
  if to_regclass('public.guestbook') is not null then
    execute 'alter table public.guestbook enable row level security';
    execute 'drop policy if exists guestbook_select on public.guestbook';
    execute 'create policy guestbook_select on public.guestbook for select to authenticated using (true)';
    execute 'drop policy if exists guestbook_insert_own on public.guestbook';
    execute 'create policy guestbook_insert_own on public.guestbook for insert to authenticated with check (author_phone = (select public.current_phone()))';
    execute 'drop policy if exists guestbook_delete_own on public.guestbook';
    execute 'create policy guestbook_delete_own on public.guestbook for delete to authenticated using (author_phone = (select public.current_phone()) or target_phone = (select public.current_phone()))';
  end if;

  -- meetup_reviews: 모임 후기 — 본인 것만 작성/수정/삭제
  if to_regclass('public.meetup_reviews') is not null then
    execute 'alter table public.meetup_reviews enable row level security';
    execute 'drop policy if exists meetup_reviews_select on public.meetup_reviews';
    execute 'create policy meetup_reviews_select on public.meetup_reviews for select to authenticated using (true)';
    execute 'drop policy if exists meetup_reviews_insert_own on public.meetup_reviews';
    execute 'create policy meetup_reviews_insert_own on public.meetup_reviews for insert to authenticated with check (user_phone = (select public.current_phone()))';
    execute 'drop policy if exists meetup_reviews_update_own on public.meetup_reviews';
    execute 'create policy meetup_reviews_update_own on public.meetup_reviews for update to authenticated using (user_phone = (select public.current_phone()))';
    execute 'drop policy if exists meetup_reviews_delete_own on public.meetup_reviews';
    execute 'create policy meetup_reviews_delete_own on public.meetup_reviews for delete to authenticated using (user_phone = (select public.current_phone()))';
  end if;

  -- 공지/뉴스/이벤트: 읽기 전용 공개 콘텐츠 (로그인 전 화면에서도 보일 수 있어 anon 포함)
  if to_regclass('public.events') is not null then
    execute 'alter table public.events enable row level security';
    execute 'drop policy if exists events_select on public.events';
    execute 'create policy events_select on public.events for select to anon, authenticated using (true)';
  end if;
  if to_regclass('public.oneline_news') is not null then
    execute 'alter table public.oneline_news enable row level security';
    execute 'drop policy if exists oneline_news_select on public.oneline_news';
    execute 'create policy oneline_news_select on public.oneline_news for select to anon, authenticated using (true)';
  end if;
  if to_regclass('public.notices') is not null then
    execute 'alter table public.notices enable row level security';
    execute 'drop policy if exists notices_select on public.notices';
    execute 'create policy notices_select on public.notices for select to anon, authenticated using (true)';
  end if;
end
$$;

-- ── 6) 스토리지: post-photos 업로드는 로그인 사용자만 ────────────────
drop policy if exists post_photos_insert_authenticated on storage.objects;
create policy post_photos_insert_authenticated on storage.objects
  for insert to authenticated with check (bucket_id = 'post-photos');

-- ── 7) (나중에, 선택) 전원 이전 완료 후 평문 비밀번호 정리 ─────────────
-- 기존 회원이 모두 한 번씩 로그인해 Auth 로 이전된 뒤 실행:
--   update public.users set password = null where auth_id is not null;
-- 더 지나서 컬럼 자체를 없애려면:
--   alter table public.users drop column password;
