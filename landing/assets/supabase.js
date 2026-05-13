// =============================================================
// HOLO 랜딩 — Supabase 클라이언트
//
// 사용법:
//   1. https://supabase.com 에서 프로젝트 생성
//   2. Settings → API 에서 URL과 anon key 복사
//   3. 아래 두 상수에 붙여넣기
//   4. landing/README.md 의 SQL 실행하여 waitlist 테이블 생성
// =============================================================

export const SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let _clientPromise = null;

// 항상 Promise 를 반환 → 호출 측에서 await 한 번이면 됨
export async function getSupabase() {
  if (_clientPromise) return _clientPromise;

  _clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
    .then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })
    );

  return _clientPromise;
}
