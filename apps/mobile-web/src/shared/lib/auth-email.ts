/**
 * 전화번호 ↔ Supabase Auth 용 "합성 이메일" 변환.
 *
 * HOLO 는 전화번호 + 비밀번호로 로그인하지만, Supabase Auth 는 이메일 + 비밀번호를 쓴다.
 * 실제 메일을 보낼 필요는 없으므로, 전화번호를 고정 규칙의 가짜 이메일로 바꿔 Auth 에 등록한다.
 *   예) "010-1234-5678" → "01012345678@holo.app"
 *
 * 가입(signUp)과 로그인(signInWithPassword)에서 같은 규칙을 써야 한다.
 */
export function phoneToAuthEmail(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return `${digits}@holo.app`;
}
