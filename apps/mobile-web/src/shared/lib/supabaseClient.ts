import { createClient } from '@supabase/supabase-js'

// TODO(임시): Vercel 환경변수 정리 후 import.meta.env 사용으로 복원하기.
// Vercel에 옛날 키가 등록돼 있을 가능성이 있어서, env 우회하고 새 키를 강제로 씀.
// publishable key + private 저장소 조건이라 임시로 하드코딩.
const supabaseUrl = 'https://ysfcfqfpzrmihkrilixw.supabase.co'
const supabaseAnonKey = 'sb_publishable_0ogrzhMIqO6mYbp3oRM3Wg_q-Vqp2eR'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
