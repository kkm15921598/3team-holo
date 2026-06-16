-- ============================================================
-- HOLO 서버측 로그인(2단계) — 비밀번호 검증을 서버 함수로 이전
-- 작성: 2026-06-16
--
-- ▶ 왜
--   기존엔 앱이 users 행을 통째로 받아와 비밀번호를 "클라이언트에서" 비교했다.
--   → 비밀번호 해시가 클라이언트로 그대로 내려오고, anon 키로 누구나 조회 가능했다.
--   이 SQL 은 비밀번호 검증을 서버(아래 함수) 안에서만 수행하게 하고,
--   비밀번호는 강한 해시(bcrypt)로 저장/검증한다.
--
-- ▶ 무엇
--   1) pgcrypto 확장 (bcrypt 함수 crypt()/gen_salt() 제공)
--   2) hash_password(p_password)   : 회원가입/비번변경/비번찾기에서 bcrypt 해시 생성
--   3) verify_login(p_phone, p_password)
--        : 서버에서 비밀번호 검증. 성공 시 "비밀번호를 뺀" 사용자 행을 반환.
--          bcrypt / 기존 클라이언트 해시(1단계 SHA-256) / 평문 을 모두 받아주고,
--          성공하면 자동으로 bcrypt 로 업그레이드한다(무중단 마이그레이션).
--
-- ▶ 실행: Supabase SQL Editor 에 전체 붙여넣고 RUN (여러 번 실행해도 안전)
-- ▶ 순서: 이 SQL 을 먼저 실행한 뒤, 앱 코드를 배포해야 한다(함수가 없으면 로그인 실패).
--
-- ▶ 한계(다음 단계에서 보강)
--   - 이 단계는 "비밀번호 노출/약한 해시"를 해결한다.
--   - users 테이블을 anon 이 직접 SELECT 하는 문제(RLS), 세션 위조는 3단계에서 처리.
-- ============================================================

-- 1) bcrypt 함수 제공 확장
create extension if not exists pgcrypto;

-- 2) 비밀번호 해시 생성(서버) — bcrypt, cost 10
create or replace function public.hash_password(p_password text)
returns text
language sql
volatile
security definer
set search_path = public, extensions
as $$
  select crypt(p_password, gen_salt('bf', 10));
$$;

-- 3) 로그인 검증(서버) — 성공 시 비밀번호를 뺀 사용자 행 1건 반환, 실패 시 0건
create or replace function public.verify_login(p_phone text, p_password text)
returns setof public.users
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.users;
  legacy_sha text;
  is_bcrypt boolean;
  ok boolean := false;
begin
  select * into u from public.users where phone = p_phone limit 1;
  if not found then
    return;  -- 계정 없음 → 빈 결과(존재 여부를 노출하지 않음)
  end if;

  -- 1단계에서 쓰던 클라이언트측 해시 재현: SHA-256("holo:pw:v1:" || phone || ":" || raw)
  legacy_sha := encode(digest('holo:pw:v1:' || p_phone || ':' || p_password, 'sha256'), 'hex');
  is_bcrypt  := (u.password is not null and left(u.password, 4) in ('$2a$', '$2b$', '$2y$'));

  if u.password is null or u.password = '' then
    ok := false;
  elsif is_bcrypt then
    ok := (u.password = crypt(p_password, u.password));   -- bcrypt 검증
  elsif u.password = legacy_sha then
    ok := true;                                           -- 기존 클라이언트 해시
  elsif u.password = p_password then
    ok := true;                                           -- 레거시 평문
  end if;

  if not ok then
    return;  -- 비밀번호 불일치 → 빈 결과
  end if;

  -- 성공: 레거시(해시 아님)면 bcrypt 로 자동 업그레이드
  if not is_bcrypt then
    update public.users
       set password = crypt(p_password, gen_salt('bf', 10))
     where phone = p_phone;
  end if;

  -- 비밀번호 컬럼은 비워서 반환(클라이언트에 해시 노출 금지)
  u.password := null;
  return next u;
  return;
end;
$$;

-- 4) 실행 권한 부여
grant execute on function public.hash_password(text) to anon, authenticated;
grant execute on function public.verify_login(text, text) to anon, authenticated;
