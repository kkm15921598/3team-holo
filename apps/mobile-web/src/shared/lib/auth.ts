import { supabase } from "./supabaseClient";

/**
 * Supabase Auth 연동 헬퍼.
 *
 * HOLO 는 휴대폰 번호+비밀번호 UX 를 유지하면서 Supabase Auth(이메일 방식)를
 * 쓰기 위해 번호를 "가상 이메일"로 변환한다. 실제 메일은 발송되지 않으므로
 * (대시보드에서 Confirm email OFF 필수) 도메인은 형식만 맞으면 된다.
 *
 * 기존(자체 users 테이블 평문 비교) 계정은 첫 로그인 때 자동으로 Auth 계정을
 * 만들어 연결하고, 서버의 평문 비밀번호는 그 자리에서 지워진다(레이지 마이그레이션).
 * 서버측 RPC: legacy_login_check / link_legacy_account
 * (docs/sql/2026-06-06-auth-rls.sql 참고)
 */
export const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, "")}@holo-user.app`;

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "no_account" | "wrong_password" | "error" };

export async function loginWithPhone(
  phone: string,
  password: string,
): Promise<LoginResult> {
  const email = phoneToEmail(phone);

  // 1) 정상 경로: 이미 Auth 로 이전된 계정.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) return { ok: true };

  // 2) 실패 시 계정 상태 분류 — 미가입 / 비번 불일치 / 구(미이전) 계정.
  const { data: status, error: rpcError } = await supabase.rpc(
    "legacy_login_check",
    { p_phone: phone, p_password: password },
  );
  if (rpcError) return { ok: false, reason: "error" };
  if (status === "no_account") return { ok: false, reason: "no_account" };
  if (status !== "migrate") return { ok: false, reason: "wrong_password" };

  // 3) 구 계정 자동 이전: Auth 계정 생성(즉시 세션 발급) → 기존 row 에 연결.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError || !signUpData.session) return { ok: false, reason: "error" };

  const { data: linked, error: linkError } = await supabase.rpc(
    "link_legacy_account",
    { p_phone: phone, p_password: password },
  );
  if (linkError || !linked) {
    // 연결 실패 시 어중간한 세션을 남기지 않는다.
    await supabase.auth.signOut().catch(() => {});
    return { ok: false, reason: "error" };
  }
  return { ok: true };
}

/** 로그아웃 — Auth 세션 종료(베스트에포트). 로컬 store 정리는 호출부 책임. */
export async function logoutAuth() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — 세션 정리는 베스트에포트
  }
}
