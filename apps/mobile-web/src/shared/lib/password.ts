/**
 * ⚠️ 사용 중단(DEPRECATED) — 2026-06-16 부터 사용하지 않음.
 *
 * 비밀번호 해시/검증은 더 이상 클라이언트에서 하지 않는다.
 * 서버 함수로 이전했다:
 *   - 해시 생성:  supabase.rpc("hash_password", { p_password })
 *   - 로그인 검증: supabase.rpc("verify_login", { p_phone, p_password })
 * (SQL: docs/sql/2026-06-16-server-login.sql)
 *
 * 이 파일은 어디서도 import 하지 않는다. 새 코드에서 다시 만들지 말 것.
 */
export {};
