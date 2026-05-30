import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수가 비어 있으면 createClient 가 throw 해서 앱 전체가 백지(런타임 크래시)가 된다.
// (특히 Vercel 등 배포 환경에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 안 넣은 경우)
// → 환경변수가 없어도 throw 하지 않고 placeholder 로 생성해 UI 는 렌더되게 하고,
//   콘솔에 명확한 안내를 남긴다. (실제 Supabase 호출은 실패하지만 best-effort 라 화면은 뜸)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[HOLO] Supabase 환경변수가 없습니다. 배포 환경(Vercel 등)에 ' +
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정한 뒤 재배포하세요. ' +
      '지금은 백엔드 없이 화면만 렌더됩니다.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
