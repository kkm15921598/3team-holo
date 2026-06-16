/**
 * 비밀번호 해싱 — 평문 저장을 막기 위한 1단계 보안.
 *
 * 브라우저 내장 Web Crypto(SHA-256)로, 전화번호를 salt 로 섞어 해시한다.
 * 외부 의존성 없음.
 *
 * ⚠️ 이건 "평문 저장 제거"를 위한 1단계다. 클라이언트 해싱이라 완전한 보안은 아니며,
 *    정식 보안은 추후 서버측 인증(Supabase Auth / RPC)으로 옮길 때 완성된다.
 *
 * 사용법
 *  - 저장: hashPassword(phone, rawPassword) 결과를 users.password 에 넣는다.
 *  - 검증: verifyPassword(phone, rawInput, storedValue) 로 비교한다.
 *          (신규 해시 계정 + 기존 평문 계정 둘 다 받아준다 → 무중단 마이그레이션)
 */

const PEPPER = "holo:pw:v1"; // 고정 양념값 (코드와 분리되는 약한 추가 보호)

/** 전화번호를 salt 로 섞어 SHA-256 16진수 문자열을 만든다. */
export async function hashPassword(phone: string, raw: string): Promise<string> {
  const text = `${PEPPER}:${phone}:${raw}`;
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 저장된 값과 입력 비밀번호가 일치하는지 확인한다.
 * - 신규 계정: 저장값이 해시 → 입력 해시와 비교
 * - 기존 계정: 저장값이 평문 → 입력 원문과 비교(legacyPlaintext=true 로 알려, 호출부가 해시로 업그레이드)
 */
export async function verifyPassword(
  phone: string,
  raw: string,
  stored: string | null | undefined,
): Promise<{ ok: boolean; legacyPlaintext: boolean }> {
  if (stored == null || stored === "") return { ok: false, legacyPlaintext: false };
  const hashed = await hashPassword(phone, raw);
  if (stored === hashed) return { ok: true, legacyPlaintext: false };
  if (stored === raw) return { ok: true, legacyPlaintext: true }; // 기존 평문 계정
  return { ok: false, legacyPlaintext: false };
}
