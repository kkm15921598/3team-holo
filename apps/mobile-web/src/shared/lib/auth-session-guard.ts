import { supabase } from "@/shared/lib/supabaseClient";

/**
 * [Auth 전환 3-2] 앱 시작 시 "죽은" Supabase Auth 세션을 정리한다.
 *
 * 로그인하면 Auth 세션(JWT)이 localStorage(sb-* 키)에 저장되고, 이후 supabase-js 는
 * anon 키 대신 이 JWT 를 모든 요청에 싣는다. 토큰이 만료되면 보통 autoRefreshToken
 * (기본 ON)이 자동 갱신하지만, 오래 방치돼 refresh 토큰까지 만료된 경우엔 갱신이 실패하고
 * 그래도 만료 토큰을 계속 보내 공개 읽기(oneline_news 등)까지 401 이 난다.
 *
 * 이 함수는 시작 시 한 번:
 *  - 세션 없으면(비로그인/anon) 아무것도 안 함.
 *  - 세션이 아직 유효하면 그대로 둔다(진행 중 갱신은 autoRefresh 담당).
 *  - 이미 만료됐으면 refresh 시도 → 실패하면 로컬 세션만 제거해 anon 으로 되돌린다.
 * 전부 best-effort(실패해도 로컬 정리 시도).
 */
export async function healAuthSession(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return; // 비로그인 — anon, 정상

    const now = Math.floor(Date.now() / 1000);
    // 아직 충분히 유효하면 손대지 않는다(진행 중 갱신은 autoRefresh 담당).
    if (session.expires_at && session.expires_at > now + 60) return;

    // 만료(또는 임박) → 갱신 시도.
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      // 갱신 실패 = 죽은 세션 → 서버 호출 없이 로컬만 정리해 anon 복귀.
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch {
    // 예외 시에도 죽은 세션이 남지 않도록 로컬 정리 시도.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* noop */
    }
  }
}
